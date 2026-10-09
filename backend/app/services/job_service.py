import json
import logging
import httpx
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import models
import schemas
from app.agents.job_discovery_agent import JobDiscoveryAgent

logger = logging.getLogger(__name__)

CURATED_TECH_JOBS = [
    {
        "title": "Full Stack Engineer (Python & React)",
        "company": "Nexus AI Labs",
        "location": "San Francisco, CA / Remote",
        "work_arrangement": "remote",
        "job_type": "full-time",
        "salary_range": "$120,000 - $160,000",
        "description": "We are seeking a Full Stack Engineer to architect modern AI web applications. You will build high-throughput FastAPI backends, integrate LLM agents, and craft responsive React/Vite interfaces.",
        "requirements": "3+ years Python & FastAPI; React & Tailwind CSS; PostgreSQL database design; Experience with LLMs and REST APIs; Docker and Git.",
        "url": "https://nexus-ai-careers.example.com/apply",
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
        "url": "https://deepvanguard.example.com/jobs/ml-eng",
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
        "url": "https://stratosdata.example.com/apply/backend",
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
        "url": "https://innospark.example.com/careers/jr-dev",
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
        "url": "https://cloudscale.example.com/jobs/devops",
        "source": "curated"
    }
]

class JobService:
    @staticmethod
    def seed_initial_jobs(db: Session):
        """Seeds initial curated tech jobs if table is empty"""
        count = db.query(models.JobListing).count()
        if count == 0:
            for job_dict in CURATED_TECH_JOBS:
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
        if search:
            search_fmt = f"%{search}%"
            query = query.filter(
                (models.JobListing.title.ilike(search_fmt)) |
                (models.JobListing.company.ilike(search_fmt)) |
                (models.JobListing.description.ilike(search_fmt)) |
                (models.JobListing.requirements.ilike(search_fmt))
            )
        if location:
            query = query.filter(models.JobListing.location.ilike(f"%{location}%"))
        if work_arrangement and work_arrangement != "all":
            query = query.filter(models.JobListing.work_arrangement == work_arrangement)
        return query.order_by(models.JobListing.id.desc()).offset(offset).limit(limit).all()

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
        query: str,
        location: Optional[str] = "remote",
        limit: int = 5
    ) -> List[models.JobListing]:
        """
        Discovers jobs via supported APIs (RemoteOK public API) and standardizes them with JobDiscoveryAgent.
        """
        discovered = []
        try:
            url = f"https://remoteok.com/api?tag={query.lower().replace(' ', '-')}"
            headers = {"User-Agent": "Resumio-AI-Job-Engine/1.0"}
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    raw_data = resp.json()
                    # RemoteOK returns metadata in first element
                    items = [item for item in raw_data if isinstance(item, dict) and item.get("position")][:limit]
                    
                    raw_postings = []
                    for item in items:
                        raw_postings.append({
                            "title": item.get("position", "Software Engineer"),
                            "company": item.get("company", "Remote Company"),
                            "location": item.get("location", "Remote"),
                            "work_arrangement": "remote",
                            "job_type": "full-time",
                            "salary_range": item.get("salary", "Competitive"),
                            "description": item.get("description", "")[:1500],
                            "requirements": ", ".join(item.get("tags", [])),
                            "url": item.get("url", ""),
                            "source": "remoteok"
                        })
                    
                    if raw_postings:
                        agent = JobDiscoveryAgent()
                        standardized = await agent.parse_and_standardize(raw_postings)
                        for item in standardized:
                            # Check duplicate
                            exists = db.query(models.JobListing).filter(
                                models.JobListing.title == item.get("title"),
                                models.JobListing.company == item.get("company")
                            ).first()
                            if not exists:
                                job = models.JobListing(
                                    title=item.get("title", "Software Engineer"),
                                    company=item.get("company", "Tech Corp"),
                                    location=item.get("location", "Remote"),
                                    work_arrangement=item.get("work_arrangement", "remote"),
                                    job_type=item.get("job_type", "full-time"),
                                    salary_range=item.get("salary_range"),
                                    description=item.get("description", ""),
                                    requirements=item.get("requirements", ""),
                                    url=item.get("url", ""),
                                    source="remoteok"
                                )
                                db.add(job)
                                db.commit()
                                db.refresh(job)
                                discovered.append(job)
                            else:
                                discovered.append(exists)
        except Exception as e:
            logger.warning(f"External job discovery fetch failed: {e}. Falling back to internal search.")

        # If no external listings were added, return matching internal jobs
        if not discovered:
            discovered = JobService.get_jobs(db, search=query, limit=limit)
        return discovered
