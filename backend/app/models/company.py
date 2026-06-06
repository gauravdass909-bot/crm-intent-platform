import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, BigInteger, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    industry: Mapped[str | None] = mapped_column(String(100))
    employee_count_estimate: Mapped[int | None] = mapped_column(Integer)
    revenue_estimate_usd: Mapped[int | None] = mapped_column(BigInteger)
    headquarters_country: Mapped[str | None] = mapped_column(String(100))
    headquarters_city: Mapped[str | None] = mapped_column(String(100))
    detected_current_crm: Mapped[str | None] = mapped_column(String(100))
    first_detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    intent_scores: Mapped[list["IntentScore"]] = relationship("IntentScore", back_populates="company", cascade="all, delete-orphan")
    signals: Mapped[list["Signal"]] = relationship("Signal", back_populates="company", cascade="all, delete-orphan")
    outreach_messages: Mapped[list["OutreachMessage"]] = relationship("OutreachMessage", back_populates="company", cascade="all, delete-orphan")
