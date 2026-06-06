from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from ...database import get_db
from ...services.decay import apply_decay

router = APIRouter(prefix="/decay", tags=["decay"])


@router.post("/apply")
def trigger_decay(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    def _run():
        from ...database import SessionLocal
        decay_db = SessionLocal()
        try:
            updated = apply_decay(decay_db)
            return updated
        finally:
            decay_db.close()

    background_tasks.add_task(_run)
    return {"message": "Decay job triggered in background"}
