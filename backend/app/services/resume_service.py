import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import models

class ResumeService:
    @staticmethod
    def get_master_resume(db: Session, user_id: int) -> Dict[str, Any]:
        """
        Retrieves the user's master resume data dictionary.
        """
        resume = db.query(models.ResumeData).filter(models.ResumeData.user_id == user_id).first()
        if resume and resume.data:
            try:
                return json.loads(resume.data)
            except Exception:
                return {}
        return {}

    @staticmethod
    def save_tailored_version(
        db: Session,
        user_id: int,
        target_role: str,
        company: str,
        resume_data: Dict[str, Any]
    ) -> models.ResumeVersion:
        """
        Saves a tailored resume version snapshot without mutating master resume.
        """
        from datetime import datetime
        time_str = datetime.now().strftime("%b %d, %I:%M %p")
        version_title = f"{target_role} @ {company} ({time_str})"

        new_version = models.ResumeVersion(
            user_id=user_id,
            version_name=version_title,
            target_role=target_role,
            resume_data=json.dumps(resume_data)
        )
        db.add(new_version)
        db.commit()
        db.refresh(new_version)
        return new_version
