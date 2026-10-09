import os
import sys
import asyncio
from dotenv import load_dotenv

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from app.config import get_agent_model
from app.agents.job_discovery_agent import JobDiscoveryAgent
from app.agents.job_analysis_agent import JobAnalysisAgent
from app.agents.resume_tailoring_agent import ResumeTailoringAgent
from app.agents.cover_letter_agent import CoverLetterAgent
from app.agents.application_assistant_agent import ApplicationAssistantAgent
from app.agents.orchestrator import AgnoOrchestrator

SAMPLE_RESUME = {
    "personalInfo": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+1 555-0199",
        "linkedin": "linkedin.com/in/janedoe",
        "github": "github.com/janedoe"
    },
    "summary": "Experienced Python Engineer building scalable web APIs and backend microservices with PostgreSQL and Docker.",
    "education": [
        {
            "degree": "B.S. in Computer Science",
            "college": "State University",
            "cgpa": "3.9",
            "graduationYear": "2024"
        }
    ],
    "technicalSkills": [
        {"id": "lang", "category": "Programming Languages", "skills": "Python, JavaScript, SQL"},
        {"id": "web", "category": "Web Technologies", "skills": "FastAPI, Flask, React, Node.js"},
        {"id": "db", "category": "Databases", "skills": "PostgreSQL, SQLite, Redis"},
        {"id": "tools", "category": "Tools & Platforms", "skills": "Git, Docker, VS Code, Postman"}
    ],
    "projects": [
        {
            "title": "AI Cloud Gateway",
            "technologies": "FastAPI, PostgreSQL, Docker, Redis",
            "bullets": [
                "Engineered high-throughput API gateway serving 500k daily requests with <30ms latency.",
                "Containerized services with Docker and managed automated CI/CD deployments."
            ]
        }
    ]
}

SAMPLE_JOB = {
    "title": "Senior Python Backend Engineer",
    "company": "Stratos Cloud",
    "location": "Remote",
    "work_arrangement": "remote",
    "description": "We are seeking a Senior Python Engineer to build high-performance FastAPI backends, optimize PostgreSQL queries, and containerize microservices using Docker.",
    "requirements": "Strong Python, FastAPI, PostgreSQL, Docker, CI/CD, Redis.",
    "url": "https://stratos.example.com/apply"
}

async def test_job_analysis_agent():
    agent = JobAnalysisAgent()
    analysis = await agent.analyze_job_match(SAMPLE_JOB, SAMPLE_RESUME)
    
    assert "match_score" in analysis
    assert isinstance(analysis["match_score"], int)
    assert analysis["match_score"] >= 0
    assert "matched_skills" in analysis
    assert "missing_skills" in analysis
    assert "eligibility_status" in analysis
    assert "recommendations" in analysis
    print(f"[1/5 PASSED] JobAnalysisAgent: Match Score {analysis['match_score']}% ({analysis['match_verdict']})")

async def test_resume_tailoring_agent():
    agent = ResumeTailoringAgent()
    tailored = await agent.tailor_resume(SAMPLE_RESUME, SAMPLE_JOB)
    
    assert "summary" in tailored
    assert "technicalSkills" in tailored
    assert "projects" in tailored
    assert tailored["personalInfo"]["name"] == "Jane Doe"
    print(f"[2/5 PASSED] ResumeTailoringAgent: Summary tailored")

async def test_cover_letter_agent():
    agent = CoverLetterAgent()
    letter = await agent.generate_cover_letter(SAMPLE_JOB, SAMPLE_RESUME)
    
    assert "content" in letter
    assert len(letter["content"]) > 50
    print(f"[3/5 PASSED] CoverLetterAgent: Letter generated for {letter['company']}")

async def test_application_assistant_agent():
    agent = ApplicationAssistantAgent()
    package = await agent.prepare_application_package(SAMPLE_JOB, SAMPLE_RESUME, {"content": "Sample letter"})
    
    assert package["is_ready"] is True
    assert package["checklist"]["candidate_name"] is True
    assert package["status"] == "ready_to_apply"
    print("[4/5 PASSED] ApplicationAssistantAgent: Application Package Verified")

async def test_orchestrator_pipeline():
    orchestrator = AgnoOrchestrator()
    res = await orchestrator.run_single_job_pipeline(
        job_data=SAMPLE_JOB,
        master_resume=SAMPLE_RESUME,
        generate_cover_letter=True,
        min_match_score=40
    )
    assert res["status"] == "ready_for_review"
    assert res["analysis"] is not None
    assert res["tailored_resume"] is not None
    assert res["cover_letter"] is not None
    print(f"[5/5 PASSED] AgnoOrchestrator: Full 5-stage pipeline executed successfully!")

async def main():
    print("--- Running Agno Multi-Agent Integration Tests ---\n")
    await test_job_analysis_agent()
    await test_resume_tailoring_agent()
    await test_cover_letter_agent()
    await test_application_assistant_agent()
    await test_orchestrator_pipeline()
    print("\n ALL AGNO MULTI-AGENT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
