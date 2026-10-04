from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
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
