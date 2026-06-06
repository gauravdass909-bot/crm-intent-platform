import logging
import uuid
from datetime import datetime, date, timezone
from collections import defaultdict
from sqlalchemy.orm import Session
from .discovery import discover_intent_companies, enrich_company
from .scoring import score_company
from ..models import BatchRun, Company, IntentScore, MarketTrend
from ..database import SessionLocal

logger = logging.getLogger(__name__)

_current_run_id: str | None = None


def get_current_run_id() -> str | None:
    return _current_run_id


def run_batch() -> str:
    """Entry point for the scheduled batch job. Returns the batch run ID."""
    global _current_run_id

    db: Session = SessionLocal()
    try:
        batch = BatchRun(
            id=str(uuid.uuid4()),
            status="running",
            started_at=datetime.now(timezone.utc),
        )
        db.add(batch)
        db.commit()
        _current_run_id = batch.id
        logger.info(f"Batch run started: {batch.id}")

        qualified = discover_intent_companies()
        batch.companies_discovered = len(qualified)
        batch.signals_collected = sum(len(c.get("raw_signals", [])) for c in qualified)
        db.commit()

        for company_data in qualified:
            try:
                enriched = enrich_company(company_data)
                score_company(enriched, db, batch)
            except Exception as e:
                logger.error(f"Failed to process {company_data.get('name')}: {e}")

        _aggregate_market_trends(db)

        batch.status = "completed"
        batch.completed_at = datetime.now(timezone.utc)
        batch.summary = {
            "companies_discovered": batch.companies_discovered,
            "companies_scored": batch.companies_scored,
            "signals_collected": batch.signals_collected,
            "claude_tokens": batch.claude_tokens_used,
        }
        db.commit()
        logger.info(f"Batch run completed: {batch.id} | Scored {batch.companies_scored} companies")
        return batch.id

    except Exception as e:
        if _current_run_id:
            try:
                b = db.query(BatchRun).filter_by(id=_current_run_id).first()
                if b:
                    b.status = "failed"
                    b.error_log = str(e)
                    b.completed_at = datetime.now(timezone.utc)
                    db.commit()
            except Exception:
                pass
        logger.exception(f"Batch run failed: {e}")
        raise
    finally:
        _current_run_id = None
        db.close()


def _aggregate_market_trends(db: Session) -> None:
    """Roll up company scores into market_trends for the heatmap."""
    today = date.today()
    companies = (
        db.query(Company, IntentScore)
        .join(IntentScore, IntentScore.company_id == Company.id)
        .filter(IntentScore.is_current == True)
        .all()
    )

    buckets: dict[tuple, list[int]] = defaultdict(list)
    for company, score in companies:
        industry = company.industry or "Unknown"
        geo = company.headquarters_country or "Unknown"
        buckets[(industry, geo)].append(score.decayed_score)

    for (industry, geo), scores in buckets.items():
        avg = sum(scores) / len(scores)
        high_count = sum(1 for s in scores if s >= 61)
        db.add(MarketTrend(
            id=str(uuid.uuid4()),
            trend_date=today,
            industry=industry,
            geography=geo,
            avg_intent_score=round(avg, 2),
            company_count=len(scores),
            high_intent_count=high_count,
        ))

    db.commit()
    logger.info(f"Market trends aggregated: {len(buckets)} industry-geo buckets")
