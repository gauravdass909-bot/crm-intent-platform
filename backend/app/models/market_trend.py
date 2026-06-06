import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Integer, Date, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class MarketTrend(Base):
    __tablename__ = "market_trends"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trend_date: Mapped[date] = mapped_column(Date, nullable=False)
    industry: Mapped[str | None] = mapped_column(String(100))
    geography: Mapped[str | None] = mapped_column(String(100))
    avg_intent_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    company_count: Mapped[int | None] = mapped_column(Integer)
    high_intent_count: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
