import json
import os
import bcrypt
import asyncio
from typing import List, Optional, Dict, Any

# Monkeypatch bcrypt for passlib compatibility
class __About:
    __version__ = bcrypt.__version__
bcrypt.__about__ = __About

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from openai import AsyncOpenAI
from dotenv import load_dotenv

import models
import schemas
from database import engine, get_db, SessionLocal
from app.config import get_agent_model, GROQ_API_KEY, DEFAULT_MODEL
from app.agents.job_discovery_agent import JobDiscoveryAgent
from app.agents.job_analysis_agent import JobAnalysisAgent
from app.agents.resume_tailoring_agent import ResumeTailoringAgent
from app.agents.cover_letter_agent import CoverLetterAgent
from app.agents.application_assistant_agent import ApplicationAssistantAgent
from app.agents.orchestrator import AgnoOrchestrator
from app.services.job_service import JobService
from app.services.resume_service import ResumeService
from app.services.cover_letter_service import CoverLetterService
from app.services.bulk_processing_service import BulkProcessingService
from app.services.application_service import ApplicationService

load_dotenv()

MODEL_NAME = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
client = AsyncOpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY
)

# Create all database tables
models.Base.metadata.create_all(bind=engine)

# Seed initial curated jobs
with SessionLocal() as init_db:
    JobService.seed_initial_jobs(init_db)

app = FastAPI(title="Resumio AI - Agentic Resume & Career Platform")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://resumio-sage.vercel.app",
    "https://resumio.vercel.app",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "my_secret_key_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Fallback direct async client
client = AsyncOpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)
MODEL_NAME = DEFAULT_MODEL

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# ==========================================
# AUTHENTICATION & CORE USER ROUTES
# ==========================================

@app.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    # Initialize empty resume
    empty_resume = models.ResumeData(user_id=new_user.id, data=json.dumps({}))
    db.add(empty_resume)
    db.commit()
    return new_user

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# ==========================================
# RESUME EDITOR & VERSIONS ROUTES
# ==========================================

@app.get("/resume", response_model=schemas.ResumeData)
def get_resume(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(models.ResumeData).filter(models.ResumeData.user_id == current_user.id).first()
    if resume and resume.data:
        try:
            return {"id": resume.id, "user_id": resume.user_id, "data": json.loads(resume.data)}
        except Exception:
            return {"id": resume.id, "user_id": resume.user_id, "data": {}}
    return {"id": 0, "user_id": current_user.id, "data": {}}

@app.post("/resume", response_model=schemas.ResumeData)
def update_resume(update: schemas.ResumeDataUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    data_json = json.dumps(update.data)
    resume = db.query(models.ResumeData).filter(models.ResumeData.user_id == current_user.id).first()
    if not resume:
        resume = models.ResumeData(user_id=current_user.id, data=data_json)
        db.add(resume)
    else:
        resume.data = data_json

    # Automatically create a version history snapshot
    personal_info = update.data.get("personalInfo", {}) if isinstance(update.data, dict) else {}
    cand_name = personal_info.get("name") or current_user.username

    target_role = ""
    edu = update.data.get("education", [])
    if edu and isinstance(edu, list) and len(edu) > 0 and isinstance(edu[0], dict):
        target_role = edu[0].get("degree", "")

    time_str = datetime.now().strftime("%b %d, %I:%M %p")
    version_title = f"{cand_name} (Saved {time_str})"

    new_version = models.ResumeVersion(
        user_id=current_user.id,
        version_name=version_title,
        target_role=target_role or "Resume Snapshot",
        resume_data=data_json
    )
    db.add(new_version)

    db.commit()
    db.refresh(resume)
    return {"id": resume.id, "user_id": resume.user_id, "data": json.loads(resume.data)}

@app.get("/versions")
def get_versions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    versions = db.query(models.ResumeVersion).filter(models.ResumeVersion.user_id == current_user.id).order_by(models.ResumeVersion.created_at.desc()).all()
    res = []
    for v in versions:
        res.append({
            "id": v.id,
            "version_name": v.version_name,
            "target_role": v.target_role,
            "resume_data": json.loads(v.resume_data) if v.resume_data else {},
            "created_at": v.created_at
        })
    return res

@app.post("/versions")
def create_version(version: schemas.ResumeVersionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_version = models.ResumeVersion(
        user_id=current_user.id,
        version_name=version.version_name,
        target_role=version.target_role,
        resume_data=json.dumps(version.resume_data)
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    return {
        "id": new_version.id,
        "version_name": new_version.version_name,
        "target_role": new_version.target_role,
        "resume_data": json.loads(new_version.resume_data),
        "created_at": new_version.created_at
    }

@app.delete("/versions/{version_id}")
def delete_version(version_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    v = db.query(models.ResumeVersion).filter(models.ResumeVersion.id == version_id, models.ResumeVersion.user_id == current_user.id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    db.delete(v)
    db.commit()
    return {"message": "Deleted"}

# ==========================================
# AGNO AGENT: AI RESUME & ATS TOOLS
# ==========================================

@app.post("/ai/optimize-job")
async def optimize_job(req: dict, current_user: models.User = Depends(get_current_user)):
    target_role = req.get("target_role", "Software Engineer")
    job_description = req.get("job_description", "")
    resume_data = req.get("resume_data") or {}

    agent = JobAnalysisAgent()
    job_payload = {
        "title": target_role,
        "company": "Target Company",
        "location": "Remote",
        "work_arrangement": "remote",
        "description": job_description,
        "requirements": ""
    }
    analysis = await agent.analyze_job_match(job_payload, resume_data)

    tailoring_agent = ResumeTailoringAgent()
    tailored_resume = await tailoring_agent.tailor_resume(resume_data, job_payload, analysis)

    return {
        "match_score": analysis.get("match_score", 85),
        "match_verdict": analysis.get("match_verdict", "Strong Match"),
        "summary_before": resume_data.get("summary", ""),
        "summary_after": tailored_resume.get("summary", ""),
        "tailored_summary": tailored_resume.get("summary", ""),
        "tailored_technical_skills": tailored_resume.get("technicalSkills", []),
        "tailored_projects": [
            {
                "title": p.get("title", ""),
                "technologies": p.get("technologies", ""),
                "original_bullets": p.get("bullets", []),
                "improved_bullets": p.get("bullets", [])
            } for p in tailored_resume.get("projects", [])
        ],
        "already_present": analysis.get("matched_skills", []),
        "missing_but_relevant": analysis.get("missing_skills", []),
        "key_optimizations": analysis.get("recommendations", [])
    }

@app.post("/ai/organize-skills")
async def organize_skills(req: dict, current_user: models.User = Depends(get_current_user)):
    technical_skills = req.get("technical_skills")
    prompt = f"""
    You are an expert ATS resume coach.
    Here is the current technical skills data from a candidate's resume:
    {json.dumps(technical_skills)}
    
    Re-organize, categorize, and clean up these skills into 4 to 6 clean, professional, ATS-standard categories:
    - "Programming Languages"
    - "Web Technologies & Frameworks"
    - "Machine Learning & AI" (if applicable)
    - "Databases"
    - "Cloud & DevOps" (if applicable)
    - "Tools & Platforms"
    
    Return JSON object with key "organized_skills" as a list of {{"id": "...", "category": "...", "skills": "..."}}.
    """
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

@app.post("/ai/parse-resume")
async def parse_resume(req: dict, current_user: models.User = Depends(get_current_user)):
    raw_content = req.get("content") or req.get("text") or ""
    prompt = f"""
    You are an expert ATS Resume Parser.
    Extract the candidate's resume information from the following raw text / HTML content into structured JSON:
    {raw_content[:9000]}
    
    Return a JSON object matching Resumio format with personalInfo, summary, education, technicalSkills, projects, experience, certifications, strengths, languages, customSections.
    """
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

@app.post("/ai/optimize-project")
async def optimize_project(req: dict, current_user: models.User = Depends(get_current_user)):
    project = req.get("project")
    prompt = f"""
    Improve this project description for a resume to be more ATS friendly and impact-driven using Google XYZ format.
    Project: {json.dumps(project)}
    
    Return a JSON object with "original" and "improved" strings.
    """
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

@app.post("/ai/quick-edit")
async def quick_edit(req: dict, current_user: models.User = Depends(get_current_user)):
    instruction = req.get("instruction")
    resume_data = req.get("resume_data")
    prompt = f"""
    Modify the provided resume JSON based on the user's instruction.
    Instruction: {instruction}
    Resume JSON: {json.dumps(resume_data)}
    
    Return ONLY the updated complete Resume JSON object.
    """
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

# ==========================================
# AGNO AGENT: JOB DISCOVERY & LISTINGS API
# ==========================================

@app.get("/api/jobs", response_model=List[schemas.JobListing])
def list_jobs(
    search: Optional[str] = None,
    location: Optional[str] = None,
    work_arrangement: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return JobService.get_jobs(db, search=search, location=location, work_arrangement=work_arrangement, limit=limit, offset=offset)

@app.get("/api/jobs/{job_id}", response_model=schemas.JobListing)
def get_job_detail(
    job_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = JobService.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.post("/api/jobs", response_model=schemas.JobListing)
def create_custom_job(
    job_in: schemas.JobListingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return JobService.create_job(db, job_in)

@app.post("/api/jobs/discover", response_model=List[schemas.JobListing])
async def discover_jobs(
    req: Dict[str, Any],
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = req.get("query", "Python")
    location = req.get("location", "remote")
    limit = int(req.get("limit", 5))
    return await JobService.discover_external_jobs(db, query=query, location=location, limit=limit)

@app.post("/api/jobs/{job_id}/analyze")
async def analyze_job_for_user(
    job_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = JobService.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    master_resume = ResumeService.get_master_resume(db, current_user.id)
    
    agent = JobAnalysisAgent()
    job_dict = {
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "work_arrangement": job.work_arrangement,
        "description": job.description,
        "requirements": job.requirements
    }
    analysis = await agent.analyze_job_match(job_dict, master_resume)

    # Save to database
    an_record = db.query(models.JobAnalysis).filter(
        models.JobAnalysis.user_id == current_user.id,
        models.JobAnalysis.job_id == job.id
    ).first()
    if not an_record:
        an_record = models.JobAnalysis(
            user_id=current_user.id,
            job_id=job.id,
            match_score=analysis.get("match_score", 70),
            match_verdict=analysis.get("match_verdict", "Evaluated"),
            matched_skills=json.dumps(analysis.get("matched_skills", [])),
            missing_skills=json.dumps(analysis.get("missing_skills", [])),
            eligibility_status=analysis.get("eligibility_status", "eligible"),
            eligibility_warnings=json.dumps(analysis.get("eligibility_warnings", [])),
            recommendations=json.dumps(analysis.get("recommendations", []))
        )
        db.add(an_record)
    else:
        an_record.match_score = analysis.get("match_score", 70)
        an_record.match_verdict = analysis.get("match_verdict", "Evaluated")
        an_record.matched_skills = json.dumps(analysis.get("matched_skills", []))
        an_record.missing_skills = json.dumps(analysis.get("missing_skills", []))
        an_record.eligibility_status = analysis.get("eligibility_status", "eligible")
        an_record.eligibility_warnings = json.dumps(analysis.get("eligibility_warnings", []))
        an_record.recommendations = json.dumps(analysis.get("recommendations", []))
    db.commit()
    db.refresh(an_record)

    return {
        "analysis_id": an_record.id,
        "job_id": job.id,
        **analysis
    }

@app.post("/api/jobs/{job_id}/tailor-resume")
async def tailor_resume_for_job(
    job_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = JobService.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    master_resume = ResumeService.get_master_resume(db, current_user.id)

    # Fetch existing ATS analysis so missing keywords are passed to the tailoring agent
    existing_analysis = db.query(models.JobAnalysis).filter(
        models.JobAnalysis.user_id == current_user.id,
        models.JobAnalysis.job_id == job_id
    ).first()

    analysis_context = None
    if existing_analysis:
        analysis_context = {
            "match_score": existing_analysis.match_score,
            "matched_skills": json.loads(existing_analysis.matched_skills or "[]"),
            "missing_skills": json.loads(existing_analysis.missing_skills or "[]"),
            "recommendations": json.loads(existing_analysis.recommendations or "[]")
        }

    agent = ResumeTailoringAgent()
    job_dict = {
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "requirements": job.requirements
    }
    # Pass analysis so agent explicitly weaves in missing ATS keywords
    tailored = await agent.tailor_resume(master_resume, job_dict, analysis=analysis_context)

    # Save as role snapshot version
    version = ResumeService.save_tailored_version(
        db=db,
        user_id=current_user.id,
        target_role=job.title,
        company=job.company,
        resume_data=tailored
    )

    return {
        "version_id": version.id,
        "version_name": version.version_name,
        "tailored_resume": tailored,
        "applied_keywords": analysis_context.get("missing_skills", []) if analysis_context else [],
        "job_url": job.url or ""
    }

@app.post("/api/jobs/{job_id}/cover-letter")
async def generate_cover_letter_for_job(
    job_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = JobService.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    master_resume = ResumeService.get_master_resume(db, current_user.id)

    agent = CoverLetterAgent()
    job_dict = {
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "work_arrangement": job.work_arrangement,
        "description": job.description,
        "requirements": job.requirements
    }
    letter_res = await agent.generate_cover_letter(job_dict, master_resume)

    cover_letter = CoverLetterService.create_cover_letter(
        db=db,
        user_id=current_user.id,
        job_id=job.id,
        title=letter_res.get("title"),
        target_role=letter_res.get("target_role", job.title),
        company=letter_res.get("company", job.company),
        content=letter_res.get("content", "")
    )

    return {
        "id": cover_letter.id,
        "title": cover_letter.title,
        "target_role": cover_letter.target_role,
        "company": cover_letter.company,
        "content": cover_letter.content,
        "created_at": cover_letter.created_at
    }

# ==========================================
# AGNO AGENT: BULK PROCESSING RUNS API
# ==========================================

@app.post("/api/bulk/start", response_model=schemas.BulkRunOut)
async def start_bulk_run(
    req: schemas.BulkRunCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find matching jobs from target roles or recent jobs
    query_roles = req.target_roles or ["Software Engineer"]
    selected_jobs = []
    for role in query_roles:
        jobs = JobService.get_jobs(db, search=role, limit=req.max_jobs)
        for j in jobs:
            if j not in selected_jobs:
                selected_jobs.append(j)
    if not selected_jobs:
        selected_jobs = JobService.get_jobs(db, limit=req.max_jobs or 10)

    # Create BulkRun
    bulk_run = models.BulkRun(
        user_id=current_user.id,
        run_name=req.run_name or f"Bulk Run ({', '.join(query_roles)})",
        target_roles=json.dumps(req.target_roles),
        target_locations=json.dumps(req.target_locations or ["Remote"]),
        status="pending",
        total_jobs=len(selected_jobs),
        processed_jobs=0,
        successful_jobs=0,
        failed_jobs=0
    )
    db.add(bulk_run)
    db.commit()
    db.refresh(bulk_run)

    # Create items
    for job in selected_jobs:
        item = models.BulkRunItem(
            bulk_run_id=bulk_run.id,
            job_id=job.id,
            user_id=current_user.id,
            status="pending"
        )
        db.add(item)
    db.commit()

    # Launch background orchestration
    background_tasks.add_task(
        BulkProcessingService.start_bulk_run_background,
        run_id=bulk_run.id,
        user_id=current_user.id,
        min_match_score=req.min_match_score or 50,
        auto_cover_letters=req.auto_generate_cover_letters if req.auto_generate_cover_letters is not None else True
    )

    db.refresh(bulk_run)
    return {
        "id": bulk_run.id,
        "user_id": bulk_run.user_id,
        "run_name": bulk_run.run_name,
        "target_roles": json.loads(bulk_run.target_roles),
        "target_locations": json.loads(bulk_run.target_locations),
        "status": bulk_run.status,
        "total_jobs": bulk_run.total_jobs,
        "processed_jobs": bulk_run.processed_jobs,
        "successful_jobs": bulk_run.successful_jobs,
        "failed_jobs": bulk_run.failed_jobs,
        "created_at": bulk_run.created_at,
        "updated_at": bulk_run.updated_at,
        "items": []
    }

@app.get("/api/bulk/runs", response_model=List[schemas.BulkRunOut])
def list_bulk_runs(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    runs = BulkProcessingService.get_user_bulk_runs(db, current_user.id)
    res = []
    for r in runs:
        res.append({
            "id": r.id,
            "user_id": r.user_id,
            "run_name": r.run_name,
            "target_roles": json.loads(r.target_roles) if r.target_roles else [],
            "target_locations": json.loads(r.target_locations) if r.target_locations else [],
            "status": r.status,
            "total_jobs": r.total_jobs,
            "processed_jobs": r.processed_jobs,
            "successful_jobs": r.successful_jobs,
            "failed_jobs": r.failed_jobs,
            "error_message": r.error_message,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "items": []
        })
    return res

@app.get("/api/bulk/runs/{run_id}", response_model=schemas.BulkRunOut)
def get_bulk_run_detail(
    run_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = BulkProcessingService.get_run_by_id(db, run_id, current_user.id)
    if not r:
        raise HTTPException(status_code=404, detail="Bulk run not found")

    items_out = []
    for item in r.items:
        items_out.append({
            "id": item.id,
            "bulk_run_id": item.bulk_run_id,
            "job_id": item.job_id,
            "job": item.job,
            "status": item.status,
            "match_score": item.match_score,
            "resume_version_id": item.resume_version_id,
            "cover_letter_id": item.cover_letter_id,
            "error_message": item.error_message,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        })

    return {
        "id": r.id,
        "user_id": r.user_id,
        "run_name": r.run_name,
        "target_roles": json.loads(r.target_roles) if r.target_roles else [],
        "target_locations": json.loads(r.target_locations) if r.target_locations else [],
        "status": r.status,
        "total_jobs": r.total_jobs,
        "processed_jobs": r.processed_jobs,
        "successful_jobs": r.successful_jobs,
        "failed_jobs": r.failed_jobs,
        "error_message": r.error_message,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
        "items": items_out
    }

@app.post("/api/bulk/runs/{run_id}/pause")
def pause_bulk_run(
    run_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = BulkProcessingService.get_run_by_id(db, run_id, current_user.id)
    if not r:
        raise HTTPException(status_code=404, detail="Bulk run not found")
    BulkProcessingService.set_run_signal(run_id, "paused")
    r.status = "paused"
    db.commit()
    return {"message": "Run paused"}

@app.post("/api/bulk/runs/{run_id}/resume")
def resume_bulk_run(
    run_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = BulkProcessingService.get_run_by_id(db, run_id, current_user.id)
    if not r:
        raise HTTPException(status_code=404, detail="Bulk run not found")
    BulkProcessingService.set_run_signal(run_id, "running")
    r.status = "running"
    db.commit()

    background_tasks.add_task(
        BulkProcessingService.start_bulk_run_background,
        run_id=r.id,
        user_id=current_user.id
    )
    return {"message": "Run resumed"}

@app.post("/api/bulk/runs/{run_id}/cancel")
def cancel_bulk_run(
    run_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = BulkProcessingService.get_run_by_id(db, run_id, current_user.id)
    if not r:
        raise HTTPException(status_code=404, detail="Bulk run not found")
    BulkProcessingService.set_run_signal(run_id, "cancelled")
    r.status = "cancelled"
    db.commit()
    return {"message": "Run cancelled"}

# ==========================================
# COVER LETTERS API
# ==========================================

@app.get("/api/cover-letters", response_model=List[schemas.CoverLetter])
def list_cover_letters(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return CoverLetterService.get_user_cover_letters(db, current_user.id)

@app.get("/api/cover-letters/{id}", response_model=schemas.CoverLetter)
def get_cover_letter(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    letter = CoverLetterService.get_by_id(db, id, current_user.id)
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return letter

@app.post("/api/cover-letters", response_model=schemas.CoverLetter)
def create_cover_letter(
    letter_in: schemas.CoverLetterCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return CoverLetterService.create_cover_letter(
        db=db,
        user_id=current_user.id,
        target_role=letter_in.target_role,
        company=letter_in.company,
        content=letter_in.content or "Draft cover letter...",
        title=letter_in.title,
        job_id=letter_in.job_id
    )

@app.put("/api/cover-letters/{id}", response_model=schemas.CoverLetter)
def update_cover_letter(
    id: int,
    update_in: schemas.CoverLetterUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = CoverLetterService.update_cover_letter(db, id, current_user.id, update_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return updated

@app.delete("/api/cover-letters/{id}")
def delete_cover_letter(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted = CoverLetterService.delete_cover_letter(db, id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return {"message": "Deleted"}

# ==========================================
# APPLICATION TRACKER API
# ==========================================

@app.get("/api/applications", response_model=List[schemas.ApplicationOut])
def list_applications(
    status: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ApplicationService.get_user_applications(db, current_user.id, status=status)

@app.post("/api/applications", response_model=schemas.ApplicationOut)
def create_application(
    app_in: schemas.ApplicationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ApplicationService.create_application(db, current_user.id, app_in)

@app.put("/api/applications/{id}/status", response_model=schemas.ApplicationOut)
def update_application_status(
    id: int,
    update_in: schemas.ApplicationStatusUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = ApplicationService.update_status(db, id, current_user.id, update_in.status, update_in.notes)
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found")
    return updated

@app.post("/api/applications/{id}/submit", response_model=schemas.ApplicationOut)
def submit_application(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = ApplicationService.get_by_id(db, id, current_user.id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Mark as applied and log audit event
    updated = ApplicationService.update_status(
        db, id, current_user.id, "applied", 
        notes=f"Auto-dispatched via Agno Application Assistant. Target Portal: {app.job.company if app.job else 'Company'}"
    )
    return updated

@app.delete("/api/applications/{id}")
def delete_application(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted = ApplicationService.delete_application(db, id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Deleted"}

