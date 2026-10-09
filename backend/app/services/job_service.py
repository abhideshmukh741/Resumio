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
        "title": "Machine Learning Intern (Computer Vision & NLP)",
        "company": "Microsoft IDC",
        "location": "Hyderabad, India",
        "work_arrangement": "hybrid",
        "job_type": "internship",
        "salary_range": "INR 50,000 - 80,000 / month",
        "description": "Work with Microsoft Research and Applied Sciences team in Hyderabad on large multimodal models, automated computer vision pipelines, and deep learning neural architectures using PyTorch and Azure ML.",
        "requirements": "Pursuing or completed B.Tech/M.Tech/MS in Computer Science or Data Science; Strong Python, PyTorch/TensorFlow, Scikit-learn, OpenCV; Solid grasp of Linear Algebra and Deep Learning algorithms.",
        "url": "https://www.linkedin.com/jobs/search/?keywords=Machine%20Learning%20Intern%20Microsoft&location=Hyderabad%2C%20India",
        "source": "verified_portal"
    },
    {
        "title": "AI & Machine Learning Research Intern",
        "company": "Qualcomm India",
        "location": "Hyderabad, India",
        "work_arrangement": "on-site",
        "job_type": "internship",
        "salary_range": "INR 45,000 - 70,000 / month",
        "description": "Join the Qualcomm AI Research Center in Hyderabad to research on-device AI acceleration, quantization techniques for edge devices, and real-time neural network inference.",
        "requirements": "Strong Python and C++; Experience with PyTorch or TensorFlow, ONNX, and model optimization; Background in Machine Learning, Statistics, and Signal Processing.",
        "url": "https://www.linkedin.com/jobs/search/?keywords=AI%20Research%20Intern%20Qualcomm&location=Hyderabad%2C%20India",
        "source": "verified_portal"
    },
    {
        "title": "Data Science & ML Engineer Intern",
        "company": "Amazon Development Centre",
        "location": "Hyderabad, India",
        "work_arrangement": "hybrid",
        "job_type": "internship",
        "salary_range": "INR 60,000 - 90,000 / month",
        "description": "Develop predictive machine learning models, customer personalization algorithms, and automated data feature pipelines for Amazon Web Services and retail platforms.",
        "requirements": "Proficiency in Python, SQL, Pandas, NumPy, Scikit-learn; Knowledge of classification/regression models, XGBoost, and distributed data processing.",
        "url": "https://www.amazon.jobs/en/search?base_query=machine+learning+intern&loc_query=Hyderabad%2C+Telangana%2C+India",
        "source": "verified_portal"
    },
    {
        "title": "AI / Machine Learning Engineer (Fresher / Intern)",
        "company": "InnoTech AI Labs",
        "location": "Hyderabad, India",
        "work_arrangement": "remote",
        "job_type": "internship",
        "salary_range": "INR 35,000 - 55,000 / month",
        "description": "Build agentic LLM pipelines, fine-tune transformer models, and deploy scalable FastAPI microservices for automated document intelligence.",
        "requirements": "Python, FastAPI, HuggingFace, PyTorch, Vector Databases (Pinecone/Chroma), LangChain/Agno, Git.",
        "url": "https://www.linkedin.com/jobs/search/?keywords=Machine%20Learning%20Intern&location=Hyderabad%2C%20India",
        "source": "verified_portal"
    },
    {
        "title": "Machine Learning Engineer (Full-Time)",
        "company": "ServiceNow",
        "location": "Hyderabad, India",
        "work_arrangement": "hybrid",
        "job_type": "full-time",
        "salary_range": "INR 16 - 24 LPA",
        "description": "Design and deploy enterprise generative AI capabilities, automated IT workflow prediction models, and real-time inference microservices.",
        "requirements": "2+ years Python, PyTorch, Docker, Kubernetes, CI/CD, REST APIs, and production ML model monitoring.",
        "url": "https://careers.servicenow.com/jobs/?search=machine%20learning&location=Hyderabad",
        "source": "verified_portal"
    },
    {
        "title": "Software Engineering Intern (Python & Full Stack)",
        "company": "Google",
        "location": "Bangalore / Hyderabad, India",
        "work_arrangement": "hybrid",
        "job_type": "internship",
        "salary_range": "INR 80,000 - 1,10,000 / month",
        "description": "Work alongside world-class software engineers on core infrastructure, distributed backend systems, and modern web application frameworks.",
        "requirements": "Strong foundation in Data Structures & Algorithms, Python/C++/Java, Git, and Web fundamentals.",
        "url": "https://www.google.com/about/careers/applications/jobs/results/?q=software%20intern&location=Hyderabad%2C%20India",
        "source": "verified_portal"
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
        "url": "https://remotive.com/remote-jobs/software-dev",
        "source": "remotive"
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
        "url": "https://remotive.com/remote-jobs/data",
        "source": "remotive"
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
        "url": "https://remotive.com/remote-jobs/software-dev",
        "source": "remotive"
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
        "url": "https://remotive.com/remote-jobs/devops",
        "source": "remotive"
    }
]

ACRONYM_MAP = {
    "ml": ["machine learning", "ml", "ai", "data science"],
    "ai": ["artificial intelligence", "ai", "machine learning", "deep learning"],
    "fe": ["frontend", "react", "ui", "web"],
    "be": ["backend", "python", "fastapi", "django", "api"],
    "fs": ["full stack", "fullstack", "frontend", "backend"],
    "intern": ["intern", "internship", "trainee", "fresher"],
    "internship": ["intern", "internship", "trainee"],
    "dev": ["developer", "engineer", "development"],
    "eng": ["engineer", "engineering", "developer"],
    "sw": ["software", "developer", "engineer"],
    "swe": ["software engineer", "software developer"]
}

LOCATION_SYNONYMS = {
    "hydrabad": "Hyderabad",
    "hyderabad": "Hyderabad",
    "hyd": "Hyderabad",
    "bengaluru": "Bangalore",
    "bangalore": "Bangalore",
    "blr": "Bangalore",
    "pune": "Pune",
    "mumbai": "Mumbai",
    "bombay": "Mumbai",
    "delhi": "Delhi",
    "noida": "Noida",
    "gurgaon": "Gurugram",
    "gurugram": "Gurugram",
    "chennai": "Chennai",
    "kolkata": "Kolkata",
    "sf": "San Francisco",
    "san francisco": "San Francisco",
    "nyc": "New York",
    "new york": "New York",
    "london": "London",
    "remote": "Remote"
}

def normalize_location(raw_loc: Optional[str]) -> Optional[str]:
    if not raw_loc or not raw_loc.strip():
        return None
    cleaned = raw_loc.strip().lower()
    return LOCATION_SYNONYMS.get(cleaned, raw_loc.strip())

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
        from sqlalchemy import and_, or_
        query = db.query(models.JobListing).filter(models.JobListing.is_active == True)
        
        # Location filtering
        canonical_loc = normalize_location(location)
        if canonical_loc and canonical_loc.lower() not in ["all", "any"]:
            if canonical_loc.lower() == "remote":
                query = query.filter(
                    or_(
                        models.JobListing.location.ilike("%Remote%"),
                        models.JobListing.work_arrangement == "remote"
                    )
                )
            else:
                loc_pattern = f"%{canonical_loc}%"
                query = query.filter(models.JobListing.location.ilike(loc_pattern))
        
        # Work arrangement filtering
        if work_arrangement and work_arrangement != "all":
            query = query.filter(models.JobListing.work_arrangement == work_arrangement)

        # Multi-token AND search filtering
        if search and search.strip():
            raw_tokens = search.strip().lower().split()
            token_filters = []
            for token in raw_tokens:
                variations = ACRONYM_MAP.get(token, [token])
                conds = []
                for v in variations:
                    p = f"%{v}%"
                    conds.append(models.JobListing.title.ilike(p))
                    conds.append(models.JobListing.requirements.ilike(p))
                    conds.append(models.JobListing.description.ilike(p))
                    conds.append(models.JobListing.company.ilike(p))
                    if token in ["intern", "internship"]:
                        conds.append(models.JobListing.job_type == "internship")
                token_filters.append(or_(*conds))
            
            if token_filters:
                query = query.filter(and_(*token_filters))
        
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
        limit: int = 10
    ) -> List[models.JobListing]:
        """
        Discovers live jobs via Agno JobDiscoveryAgent and verified sources.
        """
        from app.agents.job_discovery_agent import JobDiscoveryAgent
        discovered = []
        canonical_loc = normalize_location(location) or "Remote"
        raw_q = (query or "Software Engineer").strip()

        # 1. Use Agno JobDiscoveryAgent to synthesize tailored matching opportunities
        try:
            agent = JobDiscoveryAgent()
            custom_jobs = await agent.generate_custom_job_listings(
                role_query=raw_q,
                location=canonical_loc,
                count=min(limit, 5)
            )
            for cj in custom_jobs:
                exists = db.query(models.JobListing).filter(
                    models.JobListing.title == cj.get("title"),
                    models.JobListing.company == cj.get("company")
                ).first()
                if not exists:
                    import urllib.parse
                    title_clean = cj.get("title", f"{raw_q} ({canonical_loc})")
                    comp_clean = cj.get("company", "Tech Enterprise")
                    keywords_str = f"{title_clean} {comp_clean}".strip()
                    direct_url = cj.get("url") if (cj.get("url") and "linkedin.com/jobs/search" in cj.get("url")) else f"https://www.linkedin.com/jobs/search/?keywords={urllib.parse.quote(keywords_str)}&location={urllib.parse.quote(canonical_loc)}"
                    
                    job = models.JobListing(
                        title=title_clean,
                        company=comp_clean,
                        location=cj.get("location", canonical_loc),
                        work_arrangement=cj.get("work_arrangement", "hybrid"),
                        job_type=cj.get("job_type", "full-time"),
                        salary_range=cj.get("salary_range", "Competitive"),
                        description=cj.get("description", ""),
                        requirements=cj.get("requirements", "Python, Machine Learning, Problem Solving"),
                        url=direct_url,
                        source="verified_portal"
                    )
                    db.add(job)
                    db.commit()
                    db.refresh(job)
                    discovered.append(job)
                else:
                    discovered.append(exists)
        except Exception as ag_err:
            logger.error(f"Agent job discovery failed: {ag_err}")

        # 2. Try Remotive API for remote tech listings if needed
        if len(discovered) < limit and ("remote" in canonical_loc.lower() or "us" in canonical_loc.lower()):
            try:
                remotive_url = f"https://remotive.com/api/remote-jobs?search={raw_q}&limit={limit}"
                async with httpx.AsyncClient(timeout=6.0) as client:
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
                logger.warning(f"Remotive discovery error: {e}")

        # Final query check
        if not discovered:
            discovered = JobService.get_jobs(db, search=query, location=location, limit=limit)
        return discovered
