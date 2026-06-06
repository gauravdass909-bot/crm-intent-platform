from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from .intent_score import IntentScoreOut
from .signal import SignalOut
from .outreach_message import OutreachMessageOut


class CompanyOut(BaseModel):
    id: str
    name: str
    domain: str
    industry: Optional[str]
    employee_count_estimate: Optional[int]
    revenue_estimate_usd: Optional[int]
    headquarters_country: Optional[str]
    headquarters_city: Optional[str]
    detected_current_crm: Optional[str]
    current_score: Optional[int] = None
    current_confidence: Optional[str] = None
    current_buying_stage: Optional[str] = None
    first_detected_at: datetime
    last_updated_at: datetime

    model_config = {"from_attributes": True}


class CompanyDetail(CompanyOut):
    intent_scores: list[IntentScoreOut] = []
    signals: list[SignalOut] = []
    outreach_messages: list[OutreachMessageOut] = []
