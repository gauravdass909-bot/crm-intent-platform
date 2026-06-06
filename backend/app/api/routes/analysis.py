import threading
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ...database import get_db
from ...models.batch_run import BatchRun
from ...schemas import BatchRunOut, BatchRunStatus
from ...services import batch as batch_service

router = APIRouter(prefix="/analysis", tags=["analysis"])

_running = False


@router.post("/run")
def trigger_batch(background_tasks: BackgroundTasks):
    global _running
    if _running:
        return {"message": "A batch run is already in progress", "status": "running"}

    def _run():
        global _running
        _running = True
        try:
            batch_service.run_batch()
        finally:
            _running = False

    background_tasks.add_task(_run)
    return {"message": "Batch discovery started", "status": "started"}


@router.get("/status", response_model=BatchRunStatus)
def get_status(db: Session = Depends(get_db)):
    run_id = batch_service.get_current_run_id()
    if run_id:
        batch = db.query(BatchRun).filter_by(id=run_id).first()
        if batch:
            progress = 0.0
            if batch.companies_discovered > 0:
                progress = min(99.0, (batch.companies_scored / batch.companies_discovered) * 100)
            return BatchRunStatus(
                run_id=run_id,
                status="running",
                progress_pct=progress,
                companies_discovered=batch.companies_discovered,
                companies_scored=batch.companies_scored,
                message=f"Scoring {batch.companies_scored}/{batch.companies_discovered} companies...",
            )

    return BatchRunStatus(
        run_id="",
        status="idle",
        progress_pct=0.0,
        companies_discovered=0,
        companies_scored=0,
        message="No batch run in progress",
    )


@router.get("/history", response_model=list[BatchRunOut])
def get_history(limit: int = 10, db: Session = Depends(get_db)):
    return db.query(BatchRun).order_by(desc(BatchRun.created_at)).limit(limit).all()
