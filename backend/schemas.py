from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class ResumeDataUpdate(BaseModel):
    data: Dict[str, Any]

class ResumeData(BaseModel):
    id: int
    user_id: int
    data: Dict[str, Any]
    class Config:
        from_attributes = True

class ResumeVersionCreate(BaseModel):
    version_name: str
    target_role: str
    resume_data: Dict[str, Any]

class ResumeVersion(BaseModel):
    id: int
    user_id: int
    version_name: str
    target_role: str
    resume_data: Dict[str, Any]
    created_at: datetime
    class Config:
        from_attributes = True

# Job Schemas
class JobListingBase(BaseModel):
    title: str
    company: str
    location: str
    work_arrangement: Optional[str] = "remote"
    job_type: Optional[str] = "full-time"
    salary_range: Optional[str] = None
    description: str
    requirements: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = "curated"

class JobListingCreate(JobListingBase):
    pass

class JobListing(JobListingBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Job Analysis Schemas
class JobAnalysisCreate(BaseModel):
    job_id: int

class JobAnalysis(BaseModel):
    id: int
    user_id: int
    job_id: int
    match_score: int
    match_verdict: str
    matched_skills: List[str]
    missing_skills: List[str]
    eligibility_status: str
    eligibility_warnings: List[str]
    recommendations: List[str]
    created_at: datetime
    class Config:
        from_attributes = True

# Cover Letter Schemas
class CoverLetterCreate(BaseModel):
    job_id: Optional[int] = None
    target_role: str
    company: str
    title: Optional[str] = None
    content: Optional[str] = None

class CoverLetterUpdate(BaseModel):
    title: Optional[str] = None
    content: str

class CoverLetter(BaseModel):
    id: int
    user_id: int
    job_id: Optional[int] = None
    title: str
    target_role: str
    company: str
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

# Bulk Run Schemas
class BulkRunCreate(BaseModel):
    run_name: Optional[str] = "Bulk Job Application Run"
    target_roles: List[str]
    target_locations: Optional[List[str]] = ["Remote"]
    min_match_score: Optional[int] = 60
    max_jobs: Optional[int] = 10
    auto_generate_cover_letters: Optional[bool] = True

class BulkRunItemOut(BaseModel):
    id: int
    bulk_run_id: int
    job_id: int
    job: Optional[JobListing] = None
    status: str
    match_score: int
    resume_version_id: Optional[int] = None
    cover_letter_id: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class BulkRunOut(BaseModel):
    id: int
    user_id: int
    run_name: str
    target_roles: List[str]
    target_locations: List[str]
    status: str
    total_jobs: int
    processed_jobs: int
    successful_jobs: int
    failed_jobs: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: Optional[List[BulkRunItemOut]] = []
    class Config:
        from_attributes = True

# Application Tracking Schemas
class ApplicationCreate(BaseModel):
    job_id: int
    resume_version_id: Optional[int] = None
    cover_letter_id: Optional[int] = None
    status: Optional[str] = "ready_to_apply"
    submission_type: Optional[str] = "assisted"
    notes: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class ApplicationEventOut(BaseModel):
    id: int
    application_id: int
    event_type: str
    description: str
    event_time: datetime
    class Config:
        from_attributes = True

class ApplicationOut(BaseModel):
    id: int
    user_id: int
    job_id: int
    job: Optional[JobListing] = None
    resume_version_id: Optional[int] = None
    cover_letter_id: Optional[int] = None
    status: str
    submission_type: str
    applied_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    events: Optional[List[ApplicationEventOut]] = []
    class Config:
        from_attributes = True
