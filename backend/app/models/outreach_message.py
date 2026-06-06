import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class OutreachMessage(Base):
    __tablename__ = "outreach_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    message_type: Mapped[str] = mapped_column(String(30), default="linkedin_email")
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    personalization_hooks: Mapped[dict | None] = mapped_column(JSON)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)

    company: Mapped["Company"] = relationship("Company", back_populates="outreach_messages")
