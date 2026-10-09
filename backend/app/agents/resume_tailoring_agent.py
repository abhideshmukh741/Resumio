import json
import logging
from typing import Dict, Any, Optional
from agno.agent import Agent
from app.config import get_agent_model

logger = logging.getLogger(__name__)

class ResumeTailoringAgent:
    """
    Agno Agent 3: Resume Tailoring Agent
    Generates tailored, ATS-optimized resume snapshots tailored to specific job listings.
    """
    def __init__(self, model_id: Optional[str] = None):
        self.model = get_agent_model(model_id)
        self.agent = Agent(
            model=self.model,
            name="ResumeTailoringAgent",
            description="Expert Career Architect who crafts customized, ATS-winning resume versions for target jobs.",
            instructions=[
                "You are an Elite Resume Strategist and ATS Specialist.",
                "Tailor candidate master resumes to maximize ATS score and recruiter engagement for specific jobs.",
                "Re-frame the Professional Summary to directly speak to the target role and key requirements.",
                "Organize Technical Skills into clean, distinct categories (Programming Languages, Web Technologies, Machine Learning & AI, Databases, Cloud & DevOps, Tools & Platforms) with matching skills prioritized.",
                "Rewrite project and experience bullets using the Google XYZ formula ('Accomplished [X] as measured by [Y] by doing [Z]') and strong action verbs.",
                "CRITICAL: Never fabricate fake employment, fake degrees, or false metrics. Always preserve truthful candidate background while optimizing language and emphasis.",
                "Return complete, valid JSON matching the exact Resumio resume schema."
            ],
            markdown=False,
        )

    async def tailor_resume(
        self,
        master_resume: Dict[str, Any],
        job_data: Dict[str, Any],
        analysis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Creates a tailored resume JSON for the target job without mutating the original.
        """
        prompt = f"""
        Tailor the candidate's master resume specifically for this target job.

        TARGET JOB:
        - Title: {job_data.get('title')}
        - Company: {job_data.get('company')}
        - Description: {job_data.get('description', '')[:2000]}
        - Requirements: {job_data.get('requirements', '')[:1200]}

        ATS ANALYSIS CONTEXT:
        - Matched Skills: {json.dumps(analysis.get('matched_skills', []) if analysis else [])}
        - Missing Target Keywords: {json.dumps(analysis.get('missing_skills', []) if analysis else [])}
        - Recommendations: {json.dumps(analysis.get('recommendations', []) if analysis else [])}

        CANDIDATE MASTER RESUME:
        {json.dumps(master_resume)[:3500]}

        INSTRUCTIONS:
        1. Write an impactful 2-3 sentence summary tailored for "{job_data.get('title')}".
        2. Categorize technical skills into 4-6 balanced ATS buckets, emphasizing relevant technologies.
        3. Optimize project and experience bullets using Google XYZ format and strong action verbs (engineered, architected, streamlined, deployed, optimized).
        4. Maintain existing personalInfo, education, certifications, and links.
        5. Return the full structured resume JSON object.

        Return a JSON object with this exact structure:
        {{
            "personalInfo": {json.dumps(master_resume.get("personalInfo", {}))},
            "summary": "Tailored 2-3 sentence summary emphasizing target role competencies...",
            "education": {json.dumps(master_resume.get("education", []))},
            "technicalSkills": [
                {{"id": "lang", "category": "Programming Languages", "skills": "..."}},
                {{"id": "web", "category": "Web Technologies & Frameworks", "skills": "..."}},
                {{"id": "ml", "category": "Machine Learning & AI", "skills": "..."}},
                {{"id": "db", "category": "Databases", "skills": "..."}},
                {{"id": "cloud", "category": "Cloud & DevOps", "skills": "..."}},
                {{"id": "tools", "category": "Tools & Platforms", "skills": "..."}}
            ],
            "projects": [
                {{
                    "title": "Project Name",
                    "technologies": "Stack used",
                    "bullets": [
                        "Action verb + accomplishment + metric + technology utilized",
                        "Engineered scalable solution resulting in..."
                    ]
                }}
            ],
            "experience": {json.dumps(master_resume.get("experience", []))},
            "certifications": {json.dumps(master_resume.get("certifications", []))},
            "strengths": {json.dumps(master_resume.get("strengths", []))},
            "languages": {json.dumps(master_resume.get("languages", "English"))},
            "customSections": {json.dumps(master_resume.get("customSections", []))}
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
            
            # Ensure critical keys exist
            for k in ["personalInfo", "summary", "education", "technicalSkills", "projects"]:
                if k not in parsed and k in master_resume:
                    parsed[k] = master_resume[k]
            return parsed
        except Exception as e:
            logger.error(f"Error in ResumeTailoringAgent: {e}")
            return master_resume
