import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class BatchRun(Base):
    __tablename__ = "batch_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, running, completed, failed
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    companies_discovered: Mapped[int] = mapped_column(Integer, default=0)
    companies_scored: Mapped[int] = mapped_column(Integer, default=0)
    signals_collected: Mapped[int] = mapped_column(Integer, default=0)
    gemini_tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    claude_tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    error_log: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
