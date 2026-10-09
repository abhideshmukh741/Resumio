import json
import logging
import re
import httpx
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
import models
import schemas

logger = logging.getLogger(__name__)

def clean_html(raw_html: str) -> str:
    """Removes HTML tags and cleans up whitespace."""
    if not raw_html:
        return ""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, ' ', raw_html)
    return " ".join(cleantext.split())

CURATED_TECH_JOBS = [
    {
        "title": "Machine Learning Intern (AI & Computer Vision)",
        "company": "DeepVision AI Labs",
        "location": "Remote / San Francisco, CA",
        "work_arrangement": "remote",
        "job_type": "internship",
        "salary_range": "$40 - $60 / hr",
        "description": "Join our ML research team to train PyTorch neural networks, build data preprocessing pipelines, and implement object detection and NLP models.",
        "requirements": "Pursuing or completed B.S./M.S. in CS or Data Science; Python, PyTorch/TensorFlow, Scikit-learn, OpenCV; Passion for ML/AI algorithms.",
        "url": "https://remotive.com",
        "source": "curated"
    },
    {
        "title": "Full Stack Engineer (Python & React)",
        "company": "Nexus AI Labs",
        "location": "San Francisco, CA / Remote",
        "work_arrangement": "remote",
        "job_type": "full-time",
        "salary_range": "$120,000 - $160,000",
        "description": "We are seeking a Full Stack Engineer to architect modern AI web applications. You will build high-throughput FastAPI backends, integrate LLM agents, and craft responsive React/Vite interfaces.",
        "requirements": "3+ years Python & FastAPI; React & Tailwind CSS; PostgreSQL database design; Experience with LLMs and REST APIs; Docker and Git.",
        "url": "https://www.arbeitnow.com",
        "source": "curated"
    },
    {
        "title": "AI / Machine Learning Engineer",
        "company": "DeepVanguard Technologies",
        "location": "New York, NY / Remote",
        "work_arrangement": "remote",
        "job_type": "full-time",
        "salary_range": "$135,000 - $180,000",
        "description": "Join our AI Platform team to build agentic workflows, fine-tune models, and deploy high-performance inference pipelines on cloud infrastructure.",
        "requirements": "Proficiency in Python, PyTorch/TensorFlow, Scikit-learn, LangChain/Agno; Experience with vector databases (Pinecone/Milvus), FastAPI, and Docker.",
        "url": "https://remotive.com",
        "source": "curated"
    },
    {
        "title": "Software Engineering Intern (Summer / Fall)",
        "company": "Apex NextGen Systems",
        "location": "Remote",
        "work_arrangement": "remote",
        "job_type": "internship",
        "salary_range": "$35 - $50 / hr",
        "description": "Exciting internship opportunity for early-career developers. Work directly with senior engineers on full stack web features, backend APIs, and automated test suites.",
        "requirements": "Foundational knowledge of Python, JavaScript, HTML/CSS, and Git; Eager to learn modern frameworks like FastAPI and React.",
        "url": "https://www.arbeitnow.com",
        "source": "curated"
    },
    {
        "title": "Backend Python Developer",
        "company": "Stratos Data Systems",
        "location": "Austin, TX / Hybrid",
        "work_arrangement": "hybrid",
        "job_type": "full-time",
        "salary_range": "$110,000 - $145,000",
        "description": "Develop scalable microservices, manage PostgreSQL and Redis clusters, and optimize data ingestion pipelines for enterprise analytics.",
        "requirements": "Strong Python (FastAPI/Django); SQL performance tuning and database modeling; Docker containerization; AWS/GCP cloud deployments; CI/CD pipelines.",
        "url": "https://www.arbeitnow.com",
        "source": "curated"
    },
    {
        "title": "Junior Software Developer (Fresher)",
        "company": "InnoSpark Software",
        "location": "Remote",
        "work_arrangement": "remote",
        "job_type": "full-time",
        "salary_range": "$75,000 - $95,000",
        "description": "Great opportunity for recent graduates or early career engineers. You will contribute to frontend user interfaces, write clean backend APIs, and collaborate on code reviews.",
        "requirements": "Bachelor's in Computer Science or related field; Solid foundation in Python, JavaScript/React, and SQL; Passion for learning modern AI tools and clean code principles.",
        "url": "https://remotive.com",
        "source": "curated"
    },
    {
        "title": "DevOps & Cloud Engineer",
        "company": "CloudScale Global",
        "location": "Remote",
        "work_arrangement": "remote",
        "job_type": "full-time",
        "salary_range": "$130,000 - $170,000",
        "description": "Manage Kubernetes clusters, automate multi-region deployments with Terraform, and ensure 99.99% uptime across production cloud environments.",
        "requirements": "Hands-on experience with AWS, Kubernetes, Terraform, Docker, GitHub Actions, Prometheus, and Grafana.",
        "url": "https://www.arbeitnow.com",
        "source": "curated"
    }
]

ACRONYM_MAP = {
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "fe": "frontend",
    "be": "backend",
    "fs": "full stack",
    "intern": "internship",
    "dev": "developer",
    "eng": "engineer",
    "sw": "software"
}

class JobService:
    @staticmethod
    def seed_initial_jobs(db: Session):
        """Seeds initial curated tech jobs into the database"""
        for job_dict in CURATED_TECH_JOBS:
            exists = db.query(models.JobListing).filter(
                models.JobListing.title == job_dict["title"],
                models.JobListing.company == job_dict["company"]
            ).first()
            if not exists:
                job = models.JobListing(**job_dict)
                db.add(job)
        db.commit()

    @staticmethod
    def get_jobs(
        db: Session,
        search: Optional[str] = None,
        location: Optional[str] = None,
        work_arrangement: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[models.JobListing]:
        query = db.query(models.JobListing).filter(models.JobListing.is_active == True)
        
        if search and search.strip():
            raw_tokens = search.strip().lower().split()
            expanded_tokens = []
            for t in raw_tokens:
                expanded_tokens.append(t)
                if t in ACRONYM_MAP:
                    expanded_tokens.append(ACRONYM_MAP[t])
            
            # Match any expanded keyword
            conditions = []
            for token in expanded_tokens:
                pattern = f"%{token}%"
                conditions.append(models.JobListing.title.ilike(pattern))
                conditions.append(models.JobListing.company.ilike(pattern))
                conditions.append(models.JobListing.description.ilike(pattern))
                conditions.append(models.JobListing.requirements.ilike(pattern))
            
            query = query.filter(or_(*conditions))

        if location and location.strip():
            query = query.filter(models.JobListing.location.ilike(f"%{location.strip()}%"))
        
        if work_arrangement and work_arrangement != "all":
            query = query.filter(models.JobListing.work_arrangement == work_arrangement)
        
        results = query.order_by(models.JobListing.id.desc()).offset(offset).limit(limit).all()
        return results

    @staticmethod
    def get_job_by_id(db: Session, job_id: int) -> Optional[models.JobListing]:
        return db.query(models.JobListing).filter(models.JobListing.id == job_id).first()

    @staticmethod
    def create_job(db: Session, job_in: schemas.JobListingCreate) -> models.JobListing:
        job = models.JobListing(**job_in.dict())
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    async def discover_external_jobs(
        db: Session,
        query: str = "python",
        location: Optional[str] = "remote",
        limit: int = 15
    ) -> List[models.JobListing]:
        """
        Discovers live jobs via open public APIs (Arbeitnow & Remotive) and saves new unique listings.
        """
        discovered = []
        raw_q = (query or "developer").strip().lower()
        search_terms = raw_q.split()
        if raw_q in ACRONYM_MAP:
            search_terms.append(ACRONYM_MAP[raw_q])

        # 1. Fetch from Arbeitnow Public Job API (300+ live tech jobs)
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get("https://www.arbeitnow.com/api/job-board-api")
                if r.status_code == 200:
                    data = r.json().get("data", [])
                    for item in data:
                        title = item.get("title", "")
                        desc = clean_html(item.get("description", ""))
                        tags = ", ".join(item.get("tags", []))
                        combined = f"{title} {desc} {tags}".lower()
                        
                        # Check match
                        if any(term in combined for term in search_terms) or raw_q in ["all", "job", "developer", "engineer"]:
                            company = item.get("company_name", "Tech Company")
                            exists = db.query(models.JobListing).filter(
                                models.JobListing.title == title,
                                models.JobListing.company == company
                            ).first()
                            if not exists:
                                tags_list = item.get("tags", [])
                                job = models.JobListing(
                                    title=title,
                                    company=company,
                                    location=item.get("location", "Remote"),
                                    work_arrangement="remote" if item.get("remote") else "on-site",
                                    job_type=item.get("job_types", ["full-time"])[0] if item.get("job_types") else "full-time",
                                    salary_range=None,
                                    description=clean_html(item.get("description", ""))[:2000],
                                    requirements=", ".join(tags_list) if tags_list else "Software Engineering competencies",
                                    url=item.get("url", ""),
                                    source="arbeitnow"
                                )
                                db.add(job)
                                db.commit()
                                db.refresh(job)
                                discovered.append(job)
                            else:
                                discovered.append(exists)
                            if len(discovered) >= limit:
                                break
        except Exception as e:
            logger.warning(f"Arbeitnow job discovery error: {e}")

        # 2. Fetch from Remotive API (Remote tech jobs)
        if len(discovered) < limit:
            try:
                remotive_url = f"https://remotive.com/api/remote-jobs?search={raw_q}&limit={limit}"
                async with httpx.AsyncClient(timeout=8.0) as client:
                    r = await client.get(remotive_url)
                    if r.status_code == 200:
                        jobs_list = r.json().get("jobs", [])
                        for item in jobs_list:
                            title = item.get("title", "Developer")
                            company = item.get("company_name", "Remote Company")
                            exists = db.query(models.JobListing).filter(
                                models.JobListing.title == title,
                                models.JobListing.company == company
                            ).first()
                            if not exists:
                                tags_list = item.get("tags", [])
                                job = models.JobListing(
                                    title=title,
                                    company=company,
                                    location=item.get("candidate_required_location", "Remote"),
                                    work_arrangement="remote",
                                    job_type=item.get("job_type", "full-time"),
                                    salary_range=item.get("salary") or "Competitive",
                                    description=clean_html(item.get("description", ""))[:2000],
                                    requirements=", ".join(tags_list) if tags_list else "Software Engineering competencies",
                                    url=item.get("url", ""),
                                    source="remotive"
                                )
                                db.add(job)
                                db.commit()
                                db.refresh(job)
                                discovered.append(job)
                            else:
                                discovered.append(exists)
                            if len(discovered) >= limit:
                                break
            except Exception as e:
                logger.warning(f"Remotive job discovery error: {e}")

        # Fallback to database query if APIs returned fewer items
        if not discovered:
            discovered = JobService.get_jobs(db, search=query, limit=limit)
        return discovered
