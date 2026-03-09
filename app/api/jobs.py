from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.core.database import get_db
from app.models.models import Job
from app.core.auth import verify_jwt
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/jobs")

class QuestionSchema(BaseModel):
    id: str
    text: str
    allowFollowup: bool

class NotificationsSchema(BaseModel):
    email: bool
    sms: bool
    wa: bool

class JobCreateSchema(BaseModel):
    title: str
    dept: str
    skills: str
    type: str # 'async' or 'live'
    minScore: int
    qs: list[QuestionSchema]
    notifs: NotificationsSchema

@router.post("")
async def create_job(job_data: JobCreateSchema, db: AsyncSession = Depends(get_db)):
    # Mocking verify_jwt for now or assuming the frontend sends auth headers properly.
    new_job = Job(
        title=job_data.title,
        department=job_data.dept,
        skills=job_data.skills,
        interview_type=job_data.type,
        min_score=job_data.minScore,
        questions=[q.model_dump() for q in job_data.qs],
        notifications=job_data.notifs.model_dump()
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    return {"status": "success", "job_id": str(new_job.id)}

@router.get("")
async def get_jobs(db: AsyncSession = Depends(get_db)):
    jobs = (await db.execute(select(Job))).scalars().all()
    return [{"id": str(j.id), "title": j.title, "department": j.department, "type": j.interview_type} for j in jobs]
