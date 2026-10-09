import logging
import asyncio
from typing import Dict, Any, Optional
from app.agents.job_discovery_agent import JobDiscoveryAgent
from app.agents.job_analysis_agent import JobAnalysisAgent
from app.agents.resume_tailoring_agent import ResumeTailoringAgent
from app.agents.cover_letter_agent import CoverLetterAgent
from app.agents.application_assistant_agent import ApplicationAssistantAgent

logger = logging.getLogger(__name__)

class AgnoOrchestrator:
    """
    Agno Multi-Agent Orchestrator
    Coordinates specialized agents through an intelligent, deterministic pipeline.
    """
    def __init__(self, model_id: Optional[str] = None):
        self.discovery_agent = JobDiscoveryAgent(model_id)
        self.analysis_agent = JobAnalysisAgent(model_id)
        self.tailoring_agent = ResumeTailoringAgent(model_id)
        self.cover_letter_agent = CoverLetterAgent(model_id)
        self.assistant_agent = ApplicationAssistantAgent(model_id)

    async def run_single_job_pipeline(
        self,
        job_data: Dict[str, Any],
        master_resume: Dict[str, Any],
        generate_cover_letter: bool = True,
        min_match_score: int = 50
    ) -> Dict[str, Any]:
        """
        Runs the full 5-stage agent workflow for a single job opportunity.
        """
        result = {
            "job": job_data,
            "analysis": None,
            "tailored_resume": None,
            "cover_letter": None,
            "application_package": None,
            "is_eligible": True,
            "status": "pending",
            "error": None
        }

        try:
            # Stage 1: Job Analysis
            logger.info(f"Orchestrator: Analyzing job '{job_data.get('title')}' at '{job_data.get('company')}'")
            analysis = await self.analysis_agent.analyze_job_match(job_data, master_resume)
            result["analysis"] = analysis

            match_score = analysis.get("match_score", 0)
            if match_score < min_match_score:
                result["is_eligible"] = False
                result["status"] = "skipped"
                result["error"] = f"Match score {match_score}% below threshold ({min_match_score}%)"
                return result

            # Stage 2: Resume Tailoring
            logger.info("Orchestrator: Tailoring resume")
            tailored_resume = await self.tailoring_agent.tailor_resume(master_resume, job_data, analysis)
            result["tailored_resume"] = tailored_resume

            # Stage 3: Cover Letter Generation
            if generate_cover_letter:
                logger.info("Orchestrator: Generating customized cover letter")
                cover_letter = await self.cover_letter_agent.generate_cover_letter(job_data, tailored_resume)
                result["cover_letter"] = cover_letter

            # Stage 4: Application Preparation
            package = await self.assistant_agent.prepare_application_package(
                job_data=job_data,
                resume_data=tailored_resume,
                cover_letter=result.get("cover_letter")
            )
            result["application_package"] = package
            result["status"] = "ready_for_review"

        except Exception as e:
            logger.error(f"Orchestrator failed on job {job_data.get('title')}: {e}")
            result["status"] = "failed"
            result["error"] = str(e)

        return result
