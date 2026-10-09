import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import schemas
from app.agents.orchestrator import AgnoOrchestrator
from app.services.resume_service import ResumeService
from app.services.cover_letter_service import CoverLetterService

logger = logging.getLogger(__name__)

# In-memory controls for pause/cancel signals
_RUN_SIGNALS: Dict[int, str] = {} # bulk_run_id -> 'running' | 'paused' | 'cancelled'

class BulkProcessingService:
    @staticmethod
    def get_user_bulk_runs(db: Session, user_id: int) -> List[models.BulkRun]:
        return db.query(models.BulkRun).filter(
            models.BulkRun.user_id == user_id
        ).order_by(models.BulkRun.created_at.desc()).all()

    @staticmethod
    def get_run_by_id(db: Session, run_id: int, user_id: int) -> Optional[models.BulkRun]:
        return db.query(models.BulkRun).filter(
            models.BulkRun.id == run_id,
            models.BulkRun.user_id == user_id
        ).first()

    @staticmethod
    def set_run_signal(run_id: int, signal: str):
        _RUN_SIGNALS[run_id] = signal

    @staticmethod
    def get_run_signal(run_id: int) -> str:
        return _RUN_SIGNALS.get(run_id, 'running')

    @staticmethod
    async def start_bulk_run_background(
        run_id: int,
        user_id: int,
        min_match_score: int = 50,
        auto_cover_letters: bool = True
    ):
        """
        Background task executing Agno agents for all queued jobs in a bulk run.
        Uses bounded concurrency (semaphore=2) and robust database transactions.
        """
        db = SessionLocal()
        orchestrator = AgnoOrchestrator()
        semaphore = asyncio.Semaphore(2)

        try:
            bulk_run = db.query(models.BulkRun).filter(models.BulkRun.id == run_id).first()
            if not bulk_run:
                return

            bulk_run.status = "running"
            db.commit()
            BulkProcessingService.set_run_signal(run_id, "running")

            master_resume = ResumeService.get_master_resume(db, user_id)
            items = db.query(models.BulkRunItem).filter(
                models.BulkRunItem.bulk_run_id == run_id
            ).all()

            for item in items:
                # Check for pause / cancel signals
                signal = BulkProcessingService.get_run_signal(run_id)
                if signal == "cancelled":
                    bulk_run.status = "cancelled"
                    db.commit()
                    return
                while signal == "paused":
                    await asyncio.sleep(2)
                    signal = BulkProcessingService.get_run_signal(run_id)
                    if signal == "cancelled":
                        bulk_run.status = "cancelled"
                        db.commit()
                        return

                if item.status in ["approved", "tailored", "cover_letter_generated", "ready_for_review"]:
                    continue

                async with semaphore:
                    job = db.query(models.JobListing).filter(models.JobListing.id == item.job_id).first()
                    if not job:
                        item.status = "failed"
                        item.error_message = "Job listing not found"
                        bulk_run.failed_jobs += 1
                        bulk_run.processed_jobs += 1
                        db.commit()
                        continue

                    job_dict = {
                        "title": job.title,
                        "company": job.company,
                        "location": job.location,
                        "work_arrangement": job.work_arrangement,
                        "description": job.description,
                        "requirements": job.requirements,
                        "url": job.url
                    }

                    try:
                        # Execute Orchestrator
                        pipeline_res = await orchestrator.run_single_job_pipeline(
                            job_data=job_dict,
                            master_resume=master_resume,
                            generate_cover_letter=auto_cover_letters,
                            min_match_score=min_match_score
                        )

                        analysis = pipeline_res.get("analysis")
                        if analysis:
                            item.match_score = analysis.get("match_score", 0)
                            # Save or update JobAnalysis record
                            existing_an = db.query(models.JobAnalysis).filter(
                                models.JobAnalysis.user_id == user_id,
                                models.JobAnalysis.job_id == job.id
                            ).first()
                            if not existing_an:
                                new_an = models.JobAnalysis(
                                    user_id=user_id,
                                    job_id=job.id,
                                    match_score=analysis.get("match_score", 0),
                                    match_verdict=analysis.get("match_verdict", "Evaluated"),
                                    matched_skills=json.dumps(analysis.get("matched_skills", [])),
                                    missing_skills=json.dumps(analysis.get("missing_skills", [])),
                                    eligibility_status=analysis.get("eligibility_status", "eligible"),
                                    eligibility_warnings=json.dumps(analysis.get("eligibility_warnings", [])),
                                    recommendations=json.dumps(analysis.get("recommendations", []))
                                )
                                db.add(new_an)

                        if not pipeline_res.get("is_eligible"):
                            item.status = "skipped"
                            item.error_message = pipeline_res.get("error", "Score below threshold")
                            bulk_run.processed_jobs += 1
                            db.commit()
                            continue

                        # Save Tailored Resume Version
                        tailored_res = pipeline_res.get("tailored_resume")
                        if tailored_res:
                            version = ResumeService.save_tailored_version(
                                db=db,
                                user_id=user_id,
                                target_role=job.title,
                                company=job.company,
                                resume_data=tailored_res
                            )
                            item.resume_version_id = version.id

                        # Save Cover Letter
                        cover_res = pipeline_res.get("cover_letter")
                        if cover_res:
                            cover_letter = CoverLetterService.create_cover_letter(
                                db=db,
                                user_id=user_id,
                                job_id=job.id,
                                title=cover_res.get("title"),
                                target_role=cover_res.get("target_role", job.title),
                                company=cover_res.get("company", job.company),
                                content=cover_res.get("content", "")
                            )
                            item.cover_letter_id = cover_letter.id

                        item.status = "ready_for_review"
                        bulk_run.successful_jobs += 1
                        bulk_run.processed_jobs += 1
                        db.commit()

                    except Exception as item_err:
                        logger.error(f"Bulk item error on job {item.job_id}: {item_err}")
                        item.status = "failed"
                        item.error_message = str(item_err)
                        bulk_run.failed_jobs += 1
                        bulk_run.processed_jobs += 1
                        db.commit()

                    # Brief non-blocking buffer between items
                    await asyncio.sleep(0.2)

            bulk_run.status = "completed"
            db.commit()

        except Exception as run_err:
            logger.error(f"Bulk run {run_id} failed: {run_err}")
            bulk_run = db.query(models.BulkRun).filter(models.BulkRun.id == run_id).first()
            if bulk_run:
                bulk_run.status = "failed"
                bulk_run.error_message = str(run_err)
                db.commit()
        finally:
            db.close()
