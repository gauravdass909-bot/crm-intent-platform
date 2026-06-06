from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class OutreachMessageOut(BaseModel):
    id: str
    company_id: str
    message_type: str
    message_content: str
    generated_at: datetime
    is_current: bool

    model_config = {"from_attributes": True}
