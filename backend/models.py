from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    resume_data = relationship("ResumeData", back_populates="user", uselist=False)
    versions = relationship("ResumeVersion", back_populates="user")
    analyses = relationship("JobAnalysis", back_populates="user")
    cover_letters = relationship("CoverLetter", back_populates="user")
    bulk_runs = relationship("BulkRun", back_populates="user")
    applications = relationship("Application", back_populates="user")

class ResumeData(Base):
    __tablename__ = "resume_data"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    data = Column(Text) # Stored as JSON string
    
    user = relationship("User", back_populates="resume_data")

class ResumeVersion(Base):
    __tablename__ = "resume_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    version_name = Column(String)
    target_role = Column(String)
    resume_data = Column(Text) # Stored as JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="versions")

class JobListing(Base):
    __tablename__ = "job_listings"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    company = Column(String, index=True)
    location = Column(String)
    work_arrangement = Column(String, default="remote") # remote, hybrid, on-site
    job_type = Column(String, default="full-time") # full-time, contract, internship
    salary_range = Column(String, nullable=True)
    description = Column(Text)
    requirements = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    source = Column(String, default="curated") # curated, remoteok, github, custom
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    analyses = relationship("JobAnalysis", back_populates="job")
    applications = relationship("Application", back_populates="job")
    bulk_items = relationship("BulkRunItem", back_populates="job")

class JobAnalysis(Base):
    __tablename__ = "job_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    job_id = Column(Integer, ForeignKey("job_listings.id"), index=True)
    match_score = Column(Integer, default=0)
    match_verdict = Column(String)
    matched_skills = Column(Text) # JSON string
    missing_skills = Column(Text) # JSON string
    eligibility_status = Column(String, default="eligible") # eligible, warning, ineligible
    eligibility_warnings = Column(Text, nullable=True) # JSON string
    recommendations = Column(Text, nullable=True) # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="analyses")
    job = relationship("JobListing", back_populates="analyses")

class CoverLetter(Base):
    __tablename__ = "cover_letters"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    job_id = Column(Integer, ForeignKey("job_listings.id"), nullable=True)
    title = Column(String)
    target_role = Column(String)
    company = Column(String)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="cover_letters")
    job = relationship("JobListing")

class BulkRun(Base):
    __tablename__ = "bulk_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    run_name = Column(String)
    target_roles = Column(Text) # JSON string list
    target_locations = Column(Text) # JSON string list
    status = Column(String, default="pending") # pending, running, completed, paused, cancelled, failed
    total_jobs = Column(Integer, default=0)
    processed_jobs = Column(Integer, default=0)
    successful_jobs = Column(Integer, default=0)
    failed_jobs = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="bulk_runs")
    items = relationship("BulkRunItem", back_populates="bulk_run", cascade="all, delete-orphan")

class BulkRunItem(Base):
    __tablename__ = "bulk_run_items"
    
    id = Column(Integer, primary_key=True, index=True)
    bulk_run_id = Column(Integer, ForeignKey("bulk_runs.id"), index=True)
    job_id = Column(Integer, ForeignKey("job_listings.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    status = Column(String, default="pending") # pending, analyzed, tailored, cover_letter_generated, ready_for_review, approved, applied, failed, skipped
    match_score = Column(Integer, default=0)
    resume_version_id = Column(Integer, ForeignKey("resume_versions.id"), nullable=True)
    cover_letter_id = Column(Integer, ForeignKey("cover_letters.id"), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    bulk_run = relationship("BulkRun", back_populates="items")
    job = relationship("JobListing", back_populates="bulk_items")
    user = relationship("User")
    resume_version = relationship("ResumeVersion")
    cover_letter = relationship("CoverLetter")

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    job_id = Column(Integer, ForeignKey("job_listings.id"), index=True)
    resume_version_id = Column(Integer, ForeignKey("resume_versions.id"), nullable=True)
    cover_letter_id = Column(Integer, ForeignKey("cover_letters.id"), nullable=True)
    status = Column(String, default="draft") # draft, ready_to_apply, applied, interviewing, offered, rejected
    submission_type = Column(String, default="assisted") # manual_url, assisted, automated_api
    applied_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="applications")
    job = relationship("JobListing", back_populates="applications")
    resume_version = relationship("ResumeVersion")
    cover_letter = relationship("CoverLetter")
    events = relationship("ApplicationEvent", back_populates="application", cascade="all, delete-orphan")

class ApplicationEvent(Base):
    __tablename__ = "application_events"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), index=True)
    event_type = Column(String) # status_changed, note_added, interview_scheduled, reminder
    description = Column(Text)
    event_time = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="events")
