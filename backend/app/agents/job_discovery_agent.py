import json
import logging
from typing import List, Dict, Any, Optional
from agno.agent import Agent
from app.config import get_agent_model

logger = logging.getLogger(__name__)

class JobDiscoveryAgent:
    """
    Agno Agent 1: Job Discovery Agent
    Searches, normalizes, and validates job listings from supported sources.
    """
    def __init__(self, model_id: Optional[str] = None):
        self.model = get_agent_model(model_id)
        self.agent = Agent(
            model=self.model,
            name="JobDiscoveryAgent",
            description="Specialized agent that parses, filters, and standardizes job opportunities for tech professionals.",
            instructions=[
                "You are an expert Job Intelligence Specialist.",
                "Extract and standardize job listings from text, job postings, or structured feeds.",
                "Filter jobs based on target roles, technical skills, location, and experience levels.",
                "Always normalize job data into strict JSON format with title, company, location, work_arrangement, job_type, salary_range, description, and requirements.",
                "Never invent fictional requirements that contradict the posting."
            ],
            markdown=False,
        )

    async def parse_and_standardize(self, raw_postings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes raw job posts and standardizes them using Agno Agent reasoning.
        """
        if not raw_postings:
            return []

        prompt = f"""
        Extract and standardize these raw job opportunities into a clean JSON array of normalized job listings.
        
        Raw Data:
        {json.dumps(raw_postings[:10])}
        
        Return a JSON object with key "jobs" containing a list of objects with:
        - "title": Standardized job title (e.g. "Senior Python Engineer")
        - "company": Company name
        - "location": City/Country or "Remote"
        - "work_arrangement": "remote", "hybrid", or "on-site"
        - "job_type": "full-time", "contract", or "internship"
        - "salary_range": String or null
        - "description": Comprehensive summary of the job
        - "requirements": Bullet points of core technical skills and qualifications
        - "url": Application URL if present or empty string
        - "source": Source identifier

        Output strictly valid JSON with key "jobs".
        """
        try:
            response = self.agent.run(prompt)
            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            parsed = json.loads(content.strip())
            return parsed.get("jobs", [])
        except Exception as e:
            logger.error(f"Error in JobDiscoveryAgent: {e}")
            # Fallback to normalized raw listings
            standardized = []
            for item in raw_postings:
                standardized.append({
                    "title": item.get("title", "Software Engineer"),
                    "company": item.get("company", "Tech Corp"),
                    "location": item.get("location", "Remote"),
                    "work_arrangement": item.get("work_arrangement", "remote"),
                    "job_type": item.get("job_type", "full-time"),
                    "salary_range": item.get("salary_range"),
                    "description": item.get("description", ""),
                    "requirements": item.get("requirements", ""),
                    "url": item.get("url", ""),
                    "source": item.get("source", "curated")
                })
            return standardized
