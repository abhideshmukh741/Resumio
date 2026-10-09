from typing import List, Optional
from sqlalchemy.orm import Session
import models
import schemas

class CoverLetterService:
    @staticmethod
    def get_user_cover_letters(db: Session, user_id: int) -> List[models.CoverLetter]:
        return db.query(models.CoverLetter).filter(
            models.CoverLetter.user_id == user_id
        ).order_by(models.CoverLetter.created_at.desc()).all()

    @staticmethod
    def get_by_id(db: Session, cover_letter_id: int, user_id: int) -> Optional[models.CoverLetter]:
        return db.query(models.CoverLetter).filter(
            models.CoverLetter.id == cover_letter_id,
            models.CoverLetter.user_id == user_id
        ).first()

    @staticmethod
    def create_cover_letter(
        db: Session,
        user_id: int,
        target_role: str,
        company: str,
        content: str,
        title: Optional[str] = None,
        job_id: Optional[int] = None
    ) -> models.CoverLetter:
        letter = models.CoverLetter(
            user_id=user_id,
            job_id=job_id,
            title=title or f"Cover Letter - {target_role} at {company}",
            target_role=target_role,
            company=company,
            content=content
        )
        db.add(letter)
        db.commit()
        db.refresh(letter)
        return letter

    @staticmethod
    def update_cover_letter(
        db: Session,
        cover_letter_id: int,
        user_id: int,
        update_in: schemas.CoverLetterUpdate
    ) -> Optional[models.CoverLetter]:
        letter = CoverLetterService.get_by_id(db, cover_letter_id, user_id)
        if not letter:
            return None
        if update_in.title is not None:
            letter.title = update_in.title
        letter.content = update_in.content
        db.commit()
        db.refresh(letter)
        return letter

    @staticmethod
    def delete_cover_letter(db: Session, cover_letter_id: int, user_id: int) -> bool:
        letter = CoverLetterService.get_by_id(db, cover_letter_id, user_id)
        if not letter:
            return False
        db.delete(letter)
        db.commit()
        return True
