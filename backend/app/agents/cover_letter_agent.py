import json
import logging
from typing import Dict, Any, Optional
from agno.agent import Agent
from app.config import get_agent_model

logger = logging.getLogger(__name__)

class CoverLetterAgent:
    """
    Agno Agent 4: Cover Letter Agent
    Generates personalized, high-converting cover letters for target job listings.
    """
    def __init__(self, model_id: Optional[str] = None):
        self.model = get_agent_model(model_id)
        self.agent = Agent(
            model=self.model,
            name="CoverLetterAgent",
            description="Expert Executive Ghostwriter crafting compelling, authentic cover letters.",
            instructions=[
                "You are an Elite Career Copywriter.",
                "Write persuasive, authentic, and professional cover letters tailored to the target company and role.",
                "Highlight the candidate's genuine achievements, projects, and skills that directly solve the company's core challenges.",
                "Tone: Professional, enthusiastic, articulate, and confident.",
                "Structure: Clear opening stating the role, 2 punchy body paragraphs connecting background with job responsibilities, and a strong call to action.",
                "Never invent false degrees, companies, or fictional qualifications.",
                "Output strictly valid JSON."
            ],
            markdown=False,
        )

    async def generate_cover_letter(
        self,
        job_data: Dict[str, Any],
        resume_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generates a structured cover letter object.
        """
        cand_name = resume_data.get("personalInfo", {}).get("name", "Candidate")
        cand_email = resume_data.get("personalInfo", {}).get("email", "")
        cand_phone = resume_data.get("personalInfo", {}).get("phone", "")

        prompt = f"""
        Draft a high-impact cover letter for {cand_name} applying to {job_data.get('company')} for the role of {job_data.get('title')}.

        JOB DETAILS:
        - Role: {job_data.get('title')}
        - Company: {job_data.get('company')}
        - Location: {job_data.get('location')} ({job_data.get('work_arrangement')})
        - Description & Requirements: {job_data.get('description', '')[:2000]}

        CANDIDATE BACKGROUND:
        - Name: {cand_name}
        - Email: {cand_email} | Phone: {cand_phone}
        - Summary: {resume_data.get('summary', '')}
        - Skills: {json.dumps(resume_data.get('technicalSkills', []))}
        - Key Projects: {json.dumps(resume_data.get('projects', [])[:3])}

        Return a JSON object with this exact structure:
        {{
            "title": "Cover Letter - {job_data.get('title')} at {job_data.get('company')}",
            "target_role": "{job_data.get('title')}",
            "company": "{job_data.get('company')}",
            "content": "Dear Hiring Team at {job_data.get('company')},\\n\\nI am writing to express my strong interest in the {job_data.get('title')} position...\\n\\n[Paragraph 1: Relevant experience & technical stack]...\\n\\n[Paragraph 2: Impactful project demonstration & value to the team]...\\n\\n[Closing & Call to action]\\n\\nSincerely,\\n{cand_name}"
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
            return {
                "title": parsed.get("title", f"Cover Letter - {job_data.get('title')}"),
                "target_role": parsed.get("target_role", job_data.get("title")),
                "company": parsed.get("company", job_data.get("company")),
                "content": parsed.get("content", f"Dear Hiring Team,\n\nI am excited to apply for the {job_data.get('title')} role at {job_data.get('company')}.\n\nSincerely,\n{cand_name}")
            }
        except Exception as e:
            logger.error(f"Error in CoverLetterAgent: {e}")
            return {
                "title": f"Cover Letter - {job_data.get('title')} at {job_data.get('company')}",
                "target_role": job_data.get("title"),
                "company": job_data.get("company"),
                "content": f"Dear Hiring Manager at {job_data.get('company')},\n\nI am thrilled to submit my application for the {job_data.get('title')} position. With my solid background in software engineering, technical problem solving, and modern development practices, I am confident in my ability to make an immediate positive contribution to your team.\n\nThank you for your time and consideration.\n\nSincerely,\n{cand_name}"
            }
