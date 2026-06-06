import re
import uuid
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ...database import get_db
from ...models import Company, IntentScore, Signal, OutreachMessage
from ...schemas import CompanyOut, CompanyDetail
from ...services.discovery import enrich_company
from ...services.scoring import score_company, _buying_stage_from_score
from ...services.claude_client import reason_intent, validate_score
from ...services.gemini_client import research_company_by_url
from ...models.batch_run import BatchRun

router = APIRouter(prefix="/companies", tags=["companies"])


class AnalyzeUrlRequest(BaseModel):
    url: str


class AnalyzeSignal(BaseModel):
    signal_type: str
    signal_description: str
    source_url: str | None = None
    source_name: str | None = None
    signal_weight: int | None = None


class AnalyzeResult(BaseModel):
    company_name: str
    company_domain: str
    industry: str | None = None
    employee_count_estimate: int | None = None
    headquarters_country: str | None = None
    detected_current_crm: str | None = None
    raw_score: int
    validated_score: int
    buying_stage: str
    confidence_level: str
    intent_summary: str | None = None
    pain_points: list[str] = []
    outreach_message: str | None = None
    signals: list[AnalyzeSignal] = []
    saved_company_id: str | None = None


@router.get("", response_model=list[CompanyOut])
def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    min_score: int = Query(0, ge=0, le=100),
    buying_stage: str | None = None,
    industry: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Company, IntentScore)
        .join(IntentScore, (IntentScore.company_id == Company.id) & (IntentScore.is_current == True))
        .filter(IntentScore.decayed_score >= min_score)
    )

    if buying_stage:
        query = query.filter(IntentScore.buying_stage == buying_stage)
    if industry:
        query = query.filter(Company.industry.ilike(f"%{industry}%"))

    results = query.order_by(desc(IntentScore.decayed_score)).offset(skip).limit(limit).all()

    companies_out = []
    for company, score in results:
        out = CompanyOut.model_validate(company)
        out.current_score = score.decayed_score
        out.current_confidence = score.confidence_level
        out.current_buying_stage = score.buying_stage
        companies_out.append(out)

    return companies_out


@router.get("/{company_id}", response_model=CompanyDetail)
def get_company(company_id: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter_by(id=company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    current_score = (
        db.query(IntentScore)
        .filter_by(company_id=company.id, is_current=True)
        .first()
    )

    detail = CompanyDetail.model_validate(company)
    if current_score:
        detail.current_score = current_score.decayed_score
        detail.current_confidence = current_score.confidence_level
        detail.current_buying_stage = current_score.buying_stage

    return detail


@router.post("/{company_id}/refresh")
def refresh_company(company_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    company = db.query(Company).filter_by(id=company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    def _refresh():
        from ...database import SessionLocal
        refresh_db = SessionLocal()
        try:
            batch = BatchRun(id=str(uuid.uuid4()), status="running")
            refresh_db.add(batch)
            refresh_db.commit()
            enriched = enrich_company({"name": company.name, "domain": company.domain, "raw_signals": []})
            score_company(enriched, refresh_db, batch)
            batch.status = "completed"
            refresh_db.commit()
        finally:
            refresh_db.close()

    background_tasks.add_task(_refresh)
    return {"message": f"Refresh triggered for {company.name}", "company_id": company_id}


@router.post("/analyze", response_model=AnalyzeResult)
def analyze_company_url(body: AnalyzeUrlRequest, db: Session = Depends(get_db)):
    """
    Manually analyze a company by URL. Runs the full 3-stage pipeline:
    Gemini research → Claude intent reasoning → Claude validation.
    Saves the company to DB and returns the full analysis.
    """
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    # 1. Gemini deep research
    try:
        enriched = research_company_by_url(url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Research failed: {e}")

    signals = enriched.get("signals", [])
    if not signals:
        # No signals found but we can still score with empty evidence
        signals = []

    # 2. Claude Stage 2 — intent reasoning
    try:
        stage2 = reason_intent(enriched, signals)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Intent reasoning failed: {e}")

    # 3. Claude Stage 3 — validation
    try:
        stage3 = validate_score(stage2, signals)
    except Exception as e:
        stage3 = {"validated_score": stage2.get("raw_score", 0), "confidence_level": "Medium"}

    raw_score = stage2.get("raw_score", 0)
    validated_score = max(0, min(100, stage3.get("validated_score", raw_score)))
    confidence = stage3.get("confidence_level", "Medium")
    buying_stage = _buying_stage_from_score(validated_score)
    firmographics = stage2.get("firmographics", {})
    domain = enriched.get("confirmed_domain", "")
    name = enriched.get("confirmed_name", domain)

    # 4. Persist to DB (upsert by domain)
    saved_id = None
    try:
        existing = db.query(Company).filter_by(domain=domain).first()
        if existing:
            company = existing
            company.name = name
            company.industry = firmographics.get("industry") or company.industry
            company.employee_count_estimate = firmographics.get("employee_count") or company.employee_count_estimate
            company.headquarters_country = firmographics.get("headquarters_country") or company.headquarters_country
            company.headquarters_city = firmographics.get("headquarters_city") or company.headquarters_city
            company.detected_current_crm = stage2.get("detected_crm") or company.detected_current_crm
            company.last_updated_at = datetime.now(timezone.utc)
        else:
            company = Company(
                id=str(uuid.uuid4()),
                name=name,
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
        db.add(IntentScore(
            id=str(uuid.uuid4()),
            company_id=company.id,
            raw_score=raw_score,
            decayed_score=validated_score,
            confidence_level=confidence,
            buying_stage=buying_stage,
            score_date=date.today(),
            is_current=True,
        ))

        for sig in signals:
            db.add(Signal(
                id=str(uuid.uuid4()),
                company_id=company.id,
                signal_type=sig.get("signal_type", "web_discussion"),
                signal_description=sig.get("signal_description", ""),
                source_url=sig.get("source_url"),
                source_name=sig.get("source_name"),
                signal_weight=sig.get("signal_weight", 10),
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

        db.commit()
        saved_id = company.id
    except Exception as e:
        db.rollback()
        # Non-fatal — still return the analysis even if DB save fails
        import logging
        logging.getLogger(__name__).error(f"DB save failed for {name}: {e}")

    return AnalyzeResult(
        company_name=name,
        company_domain=domain,
        industry=firmographics.get("industry") or enriched.get("industry"),
        employee_count_estimate=firmographics.get("employee_count") or enriched.get("employee_count_estimate"),
        headquarters_country=firmographics.get("headquarters_country") or enriched.get("headquarters_country"),
        detected_current_crm=stage2.get("detected_crm") or enriched.get("detected_current_crm"),
        raw_score=raw_score,
        validated_score=validated_score,
        buying_stage=buying_stage,
        confidence_level=confidence,
        intent_summary=stage2.get("intent_summary"),
        pain_points=stage2.get("pain_points", []),
        outreach_message=stage2.get("outreach_message"),
        signals=[
            AnalyzeSignal(
                signal_type=s.get("signal_type", "web_discussion"),
                signal_description=s.get("signal_description", ""),
                source_url=s.get("source_url"),
                source_name=s.get("source_name"),
                signal_weight=s.get("signal_weight"),
            )
            for s in signals
        ],
        saved_company_id=saved_id,
    )
