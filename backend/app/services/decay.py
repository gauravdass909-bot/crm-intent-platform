import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import Company, IntentScore, Signal

logger = logging.getLogger(__name__)

DECAY_DAYS_PER_5_POINTS = {
    "job_posting": 7,
    "competitor_dissatisfaction": 14,
    "news": 14,
    "review_site": 21,
    "web_discussion": 10,
}
DEFAULT_DECAY_DAYS = 14


def apply_decay(db: Session) -> int:
    """
    Apply gradual score decay to all current intent scores.
    Decay rate is determined by the most recent signal type for each company.
    Returns the number of companies whose scores were updated.
    """
    now = datetime.now(timezone.utc)
    updated = 0

    current_scores = db.query(IntentScore).filter_by(is_current=True).all()

    for score in current_scores:
        latest_signal = (
            db.query(Signal)
            .filter_by(company_id=score.company_id)
            .order_by(Signal.detected_at.desc())
            .first()
        )

        if not latest_signal:
            continue

        days_since = (now - latest_signal.detected_at).days
        if days_since <= 0:
            continue

        signal_type = latest_signal.signal_type
        decay_interval = DECAY_DAYS_PER_5_POINTS.get(signal_type, DEFAULT_DECAY_DAYS)

        decay_amount = int(days_since / decay_interval) * 5
        new_score = max(0, score.raw_score - decay_amount)

        if new_score != score.decayed_score:
            score.decayed_score = new_score
            score.decay_applied_at = now
            updated += 1
            logger.debug(f"Decay applied: {score.company_id} {score.raw_score} -> {new_score} ({days_since} days since last signal)")

    db.commit()
    logger.info(f"Decay job complete: {updated} companies updated")
    return updated
