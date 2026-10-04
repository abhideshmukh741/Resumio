import json
import os
import bcrypt

# Monkeypatch bcrypt for passlib compatibility (passlib looks for bcrypt.__about__.__version__)
class __About:
    __version__ = bcrypt.__version__
bcrypt.__about__ = __About

from fastapi import FastAPI, Depends, HTTPException, status
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
from database import engine, get_db

load_dotenv()

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://resumio-sage.vercel.app",
    "https://resumio.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "my_secret_key_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = AsyncOpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)
MODEL_NAME = "openai/gpt-oss-20b"

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

@app.get("/resume", response_model=schemas.ResumeData)
def get_resume(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(models.ResumeData).filter(models.ResumeData.user_id == current_user.id).first()
    if resume:
        return {"id": resume.id, "user_id": resume.user_id, "data": json.loads(resume.data)}
    return {"id": 0, "user_id": current_user.id, "data": {}}

@app.post("/resume", response_model=schemas.ResumeData)
def update_resume(update: schemas.ResumeDataUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(models.ResumeData).filter(models.ResumeData.user_id == current_user.id).first()
    if not resume:
        resume = models.ResumeData(user_id=current_user.id, data=json.dumps(update.data))
        db.add(resume)
    else:
        resume.data = json.dumps(update.data)
    db.commit()
    db.refresh(resume)
    return {"id": resume.id, "user_id": resume.user_id, "data": json.loads(resume.data)}

@app.post("/ai/optimize-job")
async def optimize_job(req: dict, current_user: models.User = Depends(get_current_user)):
    target_role = req.get("target_role")
    job_description = req.get("job_description")
    resume_data = req.get("resume_data") or {}

    prompt = f"""
    You are a world-class ATS Resume Strategist and Senior Technical Recruiter.
    Target Role: {target_role}
    Job Description: {job_description}
    Current Candidate Resume: {json.dumps(resume_data)}

    Your mission is to tailor and optimize the candidate's entire resume to achieve high ATS compliance and impress hiring managers for "{target_role}".
    Do NOT fabricate fake employment history or false degrees. Enhance and align their actual projects, summary, and skills to the job requirements.

    ATS Optimization Requirements:
    1. SUMMARY: Write a focused, high-impact 2-3 sentence Professional Summary tailored for "{target_role}", emphasizing candidate's relevant background, core stack, and target value.
    2. TECHNICAL SKILLS: Categorize candidate skills into 4 to 6 clean, standard categories ("Programming Languages", "Web Technologies & Frameworks", "Machine Learning & AI", "Databases", "Cloud & DevOps", "Tools & Platforms"). Incorporate matching technologies from the JD into their legitimate categories. NEVER put all skills into "Tools".
    3. PROJECTS: Rewrite project bullet points using Google XYZ format ("Accomplished [X] as measured by [Y] by doing [Z]") and action verbs. Naturally integrate target keywords (e.g. data preprocessing, model evaluation, REST APIs, deployment) directly into project bullets where relevant.
    4. EXPERIENCE: If experience entries exist, rewrite bullets with active verbs and keyword integration.
    5. ATS METRICS: Provide realistic match percentage, matched keywords, missing keywords, and optimization notes.

    Return a JSON object with this exact structure:
    {{
        "match_score": 85,
        "match_verdict": "Strong Match for {target_role}",
        "summary_before": "{resume_data.get('summary', '')}",
        "summary_after": "Tailored 2-3 sentence summary...",
        "tailored_summary": "Tailored 2-3 sentence summary...",
        "tailored_technical_skills": [
            {{"id": "lang", "category": "Programming Languages", "skills": "C, Java, Python"}},
            {{"id": "web", "category": "Web Technologies & Frameworks", "skills": "HTML5, CSS, JavaScript, Node.js, Flask, FastAPI, Streamlit"}},
            {{"id": "ml", "category": "Machine Learning & AI", "skills": "NumPy, Pandas, Scikit-learn, TensorFlow, Data Preprocessing, Feature Engineering, Model Optimization, NLP"}},
            {{"id": "db", "category": "Databases", "skills": "MySQL, Supabase, SQL"}},
            {{"id": "cloud", "category": "Cloud & DevOps", "skills": "Docker, Kubernetes, AWS/GCP, CI/CD pipelines, Cloud Deployment"}},
            {{"id": "tools", "category": "Tools & Platforms", "skills": "Git, GitHub, VS Code, Postman"}}
        ],
        "tailored_projects": [
            {{
                "title": "Project Title",
                "technologies": "Technologies Used",
                "original_bullets": ["Original bullet 1", "Original bullet 2"],
                "improved_bullets": ["Enhanced bullet 1 with action verb and naturally integrated keywords", "Enhanced bullet 2..."]
            }}
        ],
        "tailored_experience": [],
        "already_present": ["Python", "Streamlit", "MySQL"],
        "missing_but_relevant": ["Git", "Data preprocessing", "Feature engineering", "Model evaluation and optimization", "MLflow", "Flask"],
        "key_optimizations": [
            "Tailored professional summary specifically for {target_role}",
            "Organized technical skills into 6 distinct, balanced ATS categories",
            "Naturally integrated key technologies into project bullet points with measurable impact"
        ]
    }}
    IMPORTANT: Output strictly valid JSON.
    """

    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)

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
    
    Rules:
    - Never dump everything into "Tools & Platforms". Distribute each technology to its proper category (e.g. Flask/Node -> Web Technologies; PyTorch/Scikit-learn/ML -> Machine Learning & AI; Docker/Kubernetes/AWS -> Cloud & DevOps; Git/VS Code -> Tools & Platforms).
    - Deduplicate skills and fix spacing.
    - Keep each category clean, balanced, and readable.
    
    Return a JSON object:
    {{
        "organized_skills": [
            {{"id": "lang", "category": "Programming Languages", "skills": "..."}},
            {{"id": "web", "category": "Web Technologies & Frameworks", "skills": "..."}},
            {{"id": "ml", "category": "Machine Learning & AI", "skills": "..."}},
            {{"id": "db", "category": "Databases", "skills": "..."}},
            {{"id": "cloud", "category": "Cloud & DevOps", "skills": "..."}},
            {{"id": "tools", "category": "Tools & Platforms", "skills": "..."}}
        ]
    }}
    Output only valid JSON.
    """
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

@app.post("/ai/parse-resume")
async def parse_resume(req: dict, current_user: models.User = Depends(get_current_user)):
    raw_content = req.get("content") or ""
    prompt = f"""
    You are an expert ATS Resume Parser.
    Extract the candidate's resume information from the following raw text / HTML content into structured JSON:
    {raw_content[:9000]}
    
    Return a JSON object with this EXACT structure:
    {{
        "personalInfo": {{
            "name": "...",
            "phone": "...",
            "email": "...",
            "linkedin": "...",
            "github": "..."
        }},
        "summary": "...",
        "education": [
            {{
                "degree": "...",
                "college": "...",
                "university": "...",
                "cgpa": "...",
                "graduationYear": "..."
            }}
        ],
        "technicalSkills": [
            {{
                "id": "cat-1",
                "category": "Programming Languages",
                "skills": "..."
            }}
        ],
        "projects": [
            {{
                "title": "...",
                "technologies": "...",
                "bullets": ["..."]
            }}
        ],
        "experience": [
            {{
                "company": "...",
                "role": "...",
                "duration": "...",
                "bullets": ["..."]
            }}
        ],
        "certifications": ["..."],
        "strengths": ["..."],
        "languages": "...",
        "customSections": [
            {{
                "id": "custom-1",
                "title": "Academic Achievements",
                "content": "..."
            }}
        ]
    }}
    Output only valid JSON.
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
    Improve this project description for a resume to be more ATS friendly and impact-driven.
    Project: {json.dumps(project)}
    
    Return a JSON object:
    {{
        "original": "Original text",
        "improved": "Improved text"
    }}
    Do not invent technologies they didn't use. Output valid JSON.
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

@app.post("/ai/parse-resume")
async def parse_resume(req: dict, current_user: models.User = Depends(get_current_user)):
    raw_text = req.get("text", "")
    prompt = f"""
    Parse the following raw resume text into a structured JSON format.
    Raw Text: {raw_text}
    
    Return ONLY a JSON object with this exact structure:
    {{
        "personalInfo": {{
            "name": "",
            "email": "",
            "phone": "",
            "linkedin": ""
        }},
        "summary": "",
        "skills": "",
        "experience": ""
    }}
    Extract as much information as possible and place it in the correct fields.
    """
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

@app.get("/versions")
def get_versions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    versions = db.query(models.ResumeVersion).filter(models.ResumeVersion.user_id == current_user.id).order_by(models.ResumeVersion.created_at.desc()).all()
    res = []
    for v in versions:
        res.append({
            "id": v.id,
            "version_name": v.version_name,
            "target_role": v.target_role,
            "resume_data": json.loads(v.resume_data),
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
