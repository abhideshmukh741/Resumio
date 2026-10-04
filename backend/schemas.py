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
        orm_mode = True

class ResumeDataUpdate(BaseModel):
    data: Dict[str, Any]

class ResumeData(BaseModel):
    id: int
    user_id: int
    data: Dict[str, Any]
    class Config:
        orm_mode = True

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
        orm_mode = True
