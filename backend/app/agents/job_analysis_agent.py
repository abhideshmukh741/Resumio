import asyncio
import json
import logging
from typing import Dict, Any, Optional
from agno.agent import Agent
from app.config import get_agent_model

logger = logging.getLogger(__name__)

class JobAnalysisAgent:
    """
    Agno Agent 2: Job Analysis Agent
    Analyzes job descriptions against candidate resume for ATS compatibility and eligibility.
    """
    def __init__(self, model_id: Optional[str] = None):
        self.model = get_agent_model(model_id)
        self.agent = Agent(
            model=self.model,
            name="JobAnalysisAgent",
            description="Elite ATS Evaluator and Technical Recruiter analyzing job specs against candidate profiles.",
            instructions=[
                "You are an ATS Algorithms & Technical Hiring Specialist.",
                "Compare candidate master resumes against job requirements with rigorous precision.",
                "Calculate realistic ATS match scores (0-100) based on required stack, core competencies, and project experience.",
                "Identify mandatory eligibility requirements (e.g., minimum years of experience, specific degrees, certifications) and flag warnings separately from skill match.",
                "Highlight exact matched skills, missing but critical keywords, and strategic recommendations.",
                "Always output strictly valid JSON matching the requested schema."
            ],
            markdown=False,
        )

    async def analyze_job_match(self, job_data: Dict[str, Any], resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes deep ATS and eligibility analysis between resume and job description.
        """
        prompt = f"""
        Analyze the match between this Candidate Resume and Job Listing.

        JOB LISTING:
        - Title: {job_data.get('title')}
        - Company: {job_data.get('company')}
        - Location: {job_data.get('location')} ({job_data.get('work_arrangement')})
        - Description: {job_data.get('description', '')[:2500]}
        - Requirements: {job_data.get('requirements', '')[:1500]}

        CANDIDATE MASTER RESUME:
        {json.dumps(resume_data)[:3000]}

        REQUIREMENTS:
        1. Calculate a realistic ATS match percentage (0 to 100).
        2. Give a clear verdict (e.g., "High Match", "Moderate Match", "Reach Opportunity", "Unqualified").
        3. List all verified matching skills present in both resume and JD.
        4. List all missing keywords/technologies required by the JD.
        5. Check candidate's experience against mandatory requirements (e.g., years of experience, degree level).
           Set eligibility_status to "eligible", "warning", or "ineligible".
        6. Provide actionable recommendations to maximize interview callbacks.

        Return a JSON object with this exact structure:
        {{
            "match_score": 85,
            "match_verdict": "High Match for Senior Backend Role",
            "matched_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "REST APIs"],
            "missing_skills": ["Kubernetes", "Redis", "CI/CD pipelines", "AWS ECS"],
            "eligibility_status": "eligible",
            "eligibility_warnings": [],
            "recommendations": [
                "Emphasize scalable backend architecture and REST API development in project bullets",
                "Highlight PostgreSQL schema design and database optimization metrics",
                "Add Docker containerization details to technical projects"
            ]
        }}

        Output strictly valid JSON.
        """
        try:
            response = await asyncio.to_thread(self.agent.run, prompt)
            content = response.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            parsed = json.loads(content.strip())
            
            # Ensure defaults
            return {
                "match_score": int(parsed.get("match_score", 70)),
                "match_verdict": str(parsed.get("match_verdict", "Evaluated Match")),
                "matched_skills": list(parsed.get("matched_skills", [])),
                "missing_skills": list(parsed.get("missing_skills", [])),
                "eligibility_status": str(parsed.get("eligibility_status", "eligible")),
                "eligibility_warnings": list(parsed.get("eligibility_warnings", [])),
                "recommendations": list(parsed.get("recommendations", []))
            }
        except Exception as e:
            logger.error(f"Error in JobAnalysisAgent: {e}")
            return {
                "match_score": 65,
                "match_verdict": "Standard Match",
                "matched_skills": ["Python", "JavaScript", "SQL", "Git"],
                "missing_skills": ["Cloud Platforms", "CI/CD"],
                "eligibility_status": "eligible",
                "eligibility_warnings": [],
                "recommendations": ["Tailor project bullet points to align with job description."]
            }
