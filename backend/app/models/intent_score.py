import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Integer, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class IntentScore(Base):
    __tablename__ = "intent_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    raw_score: Mapped[int] = mapped_column(Integer, nullable=False)
    decayed_score: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence_level: Mapped[str | None] = mapped_column(String(20))
    buying_stage: Mapped[str | None] = mapped_column(String(30))
    score_date: Mapped[date] = mapped_column(Date, nullable=False)
    decay_applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    company: Mapped["Company"] = relationship("Company", back_populates="intent_scores")
