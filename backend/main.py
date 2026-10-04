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
    "http://127.0.0.1:3000"
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
    resume_data = req.get("resume_data")

    prompt = f"""
    You are an expert ATS resume optimizer.
    Target Role: {target_role}
    Job Description: {job_description}
    Current Resume JSON: {json.dumps(resume_data)}
    
    Identify keywords, technical skills, and tools present in the job description.
    Compare with the current resume.
    Return a JSON object with:
    {{
        "already_present": ["skill1", "skill2"],
        "missing_but_relevant": ["skill3", "skill4"],
        "suggested_changes": [
            {{"original": "Worked on...", "suggested": "Developed..."}}
        ]
    }}
    IMPORTANT: Do not invent experience. Only suggest improvements based on provided experience. Output only valid JSON.
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
