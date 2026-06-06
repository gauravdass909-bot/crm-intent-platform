from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class BatchRunOut(BaseModel):
    id: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    companies_discovered: int
    companies_scored: int
    signals_collected: int
    gemini_tokens_used: int
    claude_tokens_used: int
    error_log: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class BatchRunStatus(BaseModel):
    run_id: str
    status: str
    progress_pct: float
    companies_discovered: int
    companies_scored: int
    message: str
