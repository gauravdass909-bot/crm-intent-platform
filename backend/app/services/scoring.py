import logging
import uuid
from datetime import datetime, date, timezone
from sqlalchemy.orm import Session
from .claude_client import reason_intent, validate_score
from ..models import Company, IntentScore, Signal, OutreachMessage, BatchRun

logger = logging.getLogger(__name__)

SIGNAL_TYPE_WEIGHTS = {
    "job_posting": 30,
    "competitor_dissatisfaction": 25,
    "news": 20,
    "review_site": 15,
    "web_discussion": 10,
}


def _buying_stage_from_score(score: int) -> str:
    if score >= 86:
        return "Decision-Ready"
    if score >= 61:
        return "Evaluation"
    if score >= 31:
        return "Research"
    return "Awareness"


def score_company(enriched: dict, db: Session, batch_run: BatchRun) -> Company | None:
    """
    Run Stages 2 and 3 on an enriched company dict, persist everything to DB.
    Returns the Company ORM object or None on failure.
    """
    signals = enriched.get("signals", []) + enriched.get("_discovery_signals", [])
    if not signals:
        logger.warning(f"No signals for {enriched.get('confirmed_name')} — skipping")
        return None

    try:
        stage2 = reason_intent(enriched, signals)
        stage3 = validate_score(stage2, signals)
    except Exception as e:
        logger.error(f"AI pipeline failed for {enriched.get('confirmed_name')}: {e}")
        return None

    final_score = max(0, min(100, stage3.get("validated_score", stage2.get("raw_score", 0))))
    confidence = stage3.get("confidence_level", "Medium")
    buying_stage = _buying_stage_from_score(final_score)

    firmographics = stage2.get("firmographics", {})
    domain = enriched.get("confirmed_domain", "")

    existing = db.query(Company).filter_by(domain=domain).first()
    if existing:
        company = existing
        company.name = enriched.get("confirmed_name", company.name)
        company.industry = firmographics.get("industry") or company.industry
        company.employee_count_estimate = firmographics.get("employee_count") or company.employee_count_estimate
        company.revenue_estimate_usd = firmographics.get("revenue_estimate_usd") or company.revenue_estimate_usd
        company.headquarters_country = firmographics.get("headquarters_country") or company.headquarters_country
        company.headquarters_city = firmographics.get("headquarters_city") or company.headquarters_city
        company.detected_current_crm = stage2.get("detected_crm") or company.detected_current_crm
        company.last_updated_at = datetime.now(timezone.utc)
    else:
        company = Company(
            id=str(uuid.uuid4()),
            name=enriched.get("confirmed_name", domain),
            domain=domain,
            industry=firmographics.get("industry"),
            employee_count_estimate=firmographics.get("employee_count"),
            revenue_estimate_usd=firmographics.get("revenue_estimate_usd"),
            headquarters_country=firmographics.get("headquarters_country"),
            headquarters_city=firmographics.get("headquarters_city"),
            detected_current_crm=stage2.get("detected_crm"),
        )
        db.add(company)

    db.flush()

    db.query(IntentScore).filter_by(company_id=company.id, is_current=True).update({"is_current": False})
    intent_score = IntentScore(
        id=str(uuid.uuid4()),
        company_id=company.id,
        raw_score=stage2.get("raw_score", final_score),
        decayed_score=final_score,
        confidence_level=confidence,
        buying_stage=buying_stage,
        score_date=date.today(),
        is_current=True,
    )
    db.add(intent_score)

    for sig in signals:
        db.add(Signal(
            id=str(uuid.uuid4()),
            company_id=company.id,
            signal_type=sig.get("signal_type", "web_discussion"),
            signal_description=sig.get("signal_description", ""),
            source_url=sig.get("source_url"),
            source_name=sig.get("source_name"),
            signal_weight=sig.get("signal_weight", SIGNAL_TYPE_WEIGHTS.get(sig.get("signal_type", ""), 10)),
            raw_payload=sig,
        ))

    if stage2.get("outreach_message"):
        db.query(OutreachMessage).filter_by(company_id=company.id, is_current=True).update({"is_current": False})
        db.add(OutreachMessage(
            id=str(uuid.uuid4()),
            company_id=company.id,
            message_type="linkedin_email",
            message_content=stage2["outreach_message"],
            personalization_hooks={
                "pain_points": stage2.get("pain_points", []),
                "detected_crm": stage2.get("detected_crm"),
                "buying_stage": buying_stage,
            },
            is_current=True,
        ))

    batch_run.companies_scored += 1
    batch_run.claude_tokens_used += (
        stage2.get("_input_tokens", 0) + stage2.get("_output_tokens", 0) +
        stage3.get("_input_tokens", 0) + stage3.get("_output_tokens", 0)
    )
    db.commit()

    logger.info(f"Scored: {company.name} | {final_score}/100 | {buying_stage} | {confidence}")
    return company
