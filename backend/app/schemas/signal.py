from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class SignalOut(BaseModel):
    id: str
    company_id: str
    signal_type: str
    signal_description: str
    source_url: Optional[str]
    source_name: Optional[str]
    detected_at: datetime
    signal_weight: Optional[int]

    model_config = {"from_attributes": True}
