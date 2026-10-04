import sys
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import bcrypt
from passlib.context import CryptContext

class __About:
    __version__ = bcrypt.__version__
bcrypt.__about__ = __About
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()
try:
    hashed_password = pwd_context.hash("test")
    new_user = models.User(username="test_db_conn@gmail.com", hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    print("Success")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
