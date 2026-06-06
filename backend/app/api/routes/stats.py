from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ...database import get_db
from ...models import Company, IntentScore, BatchRun

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    total_companies = db.query(func.count(Company.id)).scalar()

    score_dist = (
        db.query(IntentScore.buying_stage, func.count(IntentScore.id))
        .filter(IntentScore.is_current == True)
        .group_by(IntentScore.buying_stage)
        .all()
    )

    avg_score = db.query(func.avg(IntentScore.decayed_score)).filter(IntentScore.is_current == True).scalar()

    last_batch = db.query(BatchRun).order_by(BatchRun.created_at.desc()).first()

    return {
        "total_companies_tracked": total_companies,
        "average_intent_score": round(float(avg_score or 0), 1),
        "buying_stage_distribution": {stage: count for stage, count in score_dist},
        "last_batch_run": {
            "id": last_batch.id if last_batch else None,
            "status": last_batch.status if last_batch else None,
            "completed_at": last_batch.completed_at.isoformat() if last_batch and last_batch.completed_at else None,
            "companies_scored": last_batch.companies_scored if last_batch else 0,
        },
    }
