import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resumio.db")

def create_resilient_engine():
    try:
        if DATABASE_URL.startswith("sqlite"):
            eng = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        else:
            eng = create_engine(DATABASE_URL, pool_pre_ping=True)
        # Test connection
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        logger.warning(f"Could not connect to configured DATABASE_URL ({e}). Falling back to local SQLite database.")
        return create_engine("sqlite:///./resumio.db", connect_args={"check_same_thread": False})

engine = create_resilient_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
