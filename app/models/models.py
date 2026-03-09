import enum
from uuid import UUID, uuid4
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum, Text, Float, func, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class InterviewStatus(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"

class SpeakerType(str, enum.Enum):
    human = "human"
    ai = "ai"

class User(Base):
    __tablename__ = "users"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String)
    department: Mapped[str] = mapped_column(String)
    skills: Mapped[str] = mapped_column(String)
    interview_type: Mapped[str] = mapped_column(String) # 'async' or 'live'
    min_score: Mapped[int] = mapped_column(Integer)
    questions: Mapped[list[dict]] = mapped_column(JSON)
    notifications: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class Interview(Base):
    __tablename__ = "interviews"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    twilio_room_sid: Mapped[str | None] = mapped_column(String, unique=True)
    status: Mapped[InterviewStatus] = mapped_column(Enum(InterviewStatus), default=InterviewStatus.scheduled)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)
    s3_video_url: Mapped[str | None] = mapped_column(String)
    job_id: Mapped[UUID | None] = mapped_column(ForeignKey("jobs.id"), index=True)
    ai_score: Mapped[float | None] = mapped_column(Float)

class Transcript(Base):
    __tablename__ = "transcripts"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    interview_id: Mapped[UUID] = mapped_column(ForeignKey("interviews.id"), index=True)
    speaker: Mapped[SpeakerType] = mapped_column(Enum(SpeakerType))
    text_content: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    confidence_score: Mapped[float | None] = mapped_column(Float)
