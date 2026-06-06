from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional


class MarketTrendOut(BaseModel):
    id: str
    trend_date: date
    industry: Optional[str]
    geography: Optional[str]
    avg_intent_score: Optional[float]
    company_count: Optional[int]
    high_intent_count: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
