from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import date, timedelta
from ...database import get_db
from ...models import MarketTrend
from ...schemas import MarketTrendOut

router = APIRouter(prefix="/market-trends", tags=["market-trends"])


@router.get("", response_model=list[MarketTrendOut])
def get_market_trends(
    days: int = Query(30, ge=1, le=365),
    industry: str | None = None,
    geography: str | None = None,
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    query = db.query(MarketTrend).filter(MarketTrend.trend_date >= since)

    if industry:
        query = query.filter(MarketTrend.industry.ilike(f"%{industry}%"))
    if geography:
        query = query.filter(MarketTrend.geography.ilike(f"%{geography}%"))

    return query.order_by(desc(MarketTrend.avg_intent_score)).all()


@router.get("/heatmap")
def get_heatmap(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    """Return aggregated heatmap data: latest score per industry-geo pair."""
    since = date.today() - timedelta(days=days)

    latest_date_subq = (
        db.query(
            MarketTrend.industry,
            MarketTrend.geography,
            func.max(MarketTrend.trend_date).label("latest_date"),
        )
        .filter(MarketTrend.trend_date >= since)
        .group_by(MarketTrend.industry, MarketTrend.geography)
        .subquery()
    )

    rows = (
        db.query(MarketTrend)
        .join(
            latest_date_subq,
            (MarketTrend.industry == latest_date_subq.c.industry)
            & (MarketTrend.geography == latest_date_subq.c.geography)
            & (MarketTrend.trend_date == latest_date_subq.c.latest_date),
        )
        .order_by(desc(MarketTrend.avg_intent_score))
        .all()
    )

    return [
        {
            "industry": r.industry,
            "geography": r.geography,
            "avg_intent_score": float(r.avg_intent_score or 0),
            "company_count": r.company_count,
            "high_intent_count": r.high_intent_count,
            "trend_date": r.trend_date.isoformat(),
        }
        for r in rows
    ]


@router.get("/timeline")
def get_timeline(days: int = Query(90, ge=7, le=365), db: Session = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    rows = (
        db.query(
            MarketTrend.trend_date,
            func.avg(MarketTrend.avg_intent_score).label("global_avg"),
            func.sum(MarketTrend.company_count).label("total_companies"),
            func.sum(MarketTrend.high_intent_count).label("high_intent_companies"),
        )
        .filter(MarketTrend.trend_date >= since)
        .group_by(MarketTrend.trend_date)
        .order_by(MarketTrend.trend_date)
        .all()
    )

    return [
        {
            "date": r.trend_date.isoformat(),
            "global_avg_score": round(float(r.global_avg or 0), 2),
            "total_companies": r.total_companies or 0,
            "high_intent_companies": r.high_intent_companies or 0,
        }
        for r in rows
    ]
