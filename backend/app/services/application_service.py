from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import models
import schemas

class ApplicationService:
    @staticmethod
    def get_user_applications(
        db: Session,
        user_id: int,
        status: Optional[str] = None
    ) -> List[models.Application]:
        query = db.query(models.Application).filter(models.Application.user_id == user_id)
        if status and status != "all":
            query = query.filter(models.Application.status == status)
        return query.order_by(models.Application.updated_at.desc()).all()

    @staticmethod
    def get_by_id(db: Session, app_id: int, user_id: int) -> Optional[models.Application]:
        return db.query(models.Application).filter(
            models.Application.id == app_id,
            models.Application.user_id == user_id
        ).first()

    @staticmethod
    def create_application(
        db: Session,
        user_id: int,
        app_in: schemas.ApplicationCreate
    ) -> models.Application:
        app = models.Application(
            user_id=user_id,
            job_id=app_in.job_id,
            resume_version_id=app_in.resume_version_id,
            cover_letter_id=app_in.cover_letter_id,
            status=app_in.status or "ready_to_apply",
            submission_type=app_in.submission_type or "assisted",
            notes=app_in.notes
        )
        db.add(app)
        db.commit()
        db.refresh(app)

        # Record initial event
        event = models.ApplicationEvent(
            application_id=app.id,
            event_type="application_created",
            description=f"Application created with status '{app.status}'"
        )
        db.add(event)
        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def update_status(
        db: Session,
        app_id: int,
        user_id: int,
        status: str,
        notes: Optional[str] = None
    ) -> Optional[models.Application]:
        app = ApplicationService.get_by_id(db, app_id, user_id)
        if not app:
            return None

        old_status = app.status
        app.status = status
        if notes:
            app.notes = notes
        if status == "applied" and not app.applied_at:
            app.applied_at = datetime.utcnow()

        event = models.ApplicationEvent(
            application_id=app.id,
            event_type="status_changed",
            description=f"Status transitioned from '{old_status}' to '{status}'" + (f" (Notes: {notes})" if notes else "")
        )
        db.add(event)
        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def delete_application(db: Session, app_id: int, user_id: int) -> bool:
        app = ApplicationService.get_by_id(db, app_id, user_id)
        if not app:
            return False
        db.delete(app)
        db.commit()
        return True
