import json
import logging
from typing import Dict, Any, Optional
from agno.agent import Agent
from app.config import get_agent_model

logger = logging.getLogger(__name__)

class ApplicationAssistantAgent:
    """
    Agno Agent 5: Application Assistant Agent
    Prepares application payloads, verifies document integrity, and validates application readiness.
    """
    def __init__(self, model_id: Optional[str] = None):
        self.model = get_agent_model(model_id)
        self.agent = Agent(
            model=self.model,
            name="ApplicationAssistantAgent",
            description="Autonomous application dispatcher ensuring data validation and compliance before submission.",
            instructions=[
                "You are an Application Dispatch & Verification Specialist.",
                "Review the assembled job application package (tailored resume, cover letter, candidate details, target job URL).",
                "Identify any required screening fields (e.g. sponsorship required, expected salary, notice period).",
                "Ensure candidate approval is strictly required prior to final dispatch.",
                "Output strictly valid JSON."
            ],
            markdown=False,
        )

    async def prepare_application_package(
        self,
        job_data: Dict[str, Any],
        resume_data: Dict[str, Any],
        cover_letter: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Validates completeness of application materials.
        """
        cand_info = resume_data.get("personalInfo", {})
        has_name = bool(cand_info.get("name"))
        has_email = bool(cand_info.get("email"))
        has_phone = bool(cand_info.get("phone"))
        has_resume = bool(resume_data.get("education") or resume_data.get("projects"))
        has_cover = bool(cover_letter and cover_letter.get("content"))

        ready = has_name and has_email and has_resume

        return {
            "is_ready": ready,
            "job_title": job_data.get("title"),
            "company": job_data.get("company"),
            "application_url": job_data.get("url"),
            "checklist": {
                "candidate_name": has_name,
                "contact_email": has_email,
                "contact_phone": has_phone,
                "tailored_resume_attached": has_resume,
                "cover_letter_attached": has_cover
            },
            "status": "ready_to_apply" if ready else "draft",
            "submission_mode": "assisted",
            "notes": "Application package assembled and verified. Awaiting user submission."
        }
