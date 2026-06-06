from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional


class IntentScoreOut(BaseModel):
    id: str
    company_id: str
    raw_score: int
    decayed_score: int
    confidence_level: Optional[str]
    buying_stage: Optional[str]
    score_date: date
    decay_applied_at: Optional[datetime]
    is_current: bool
    created_at: datetime

    model_config = {"from_attributes": True}
