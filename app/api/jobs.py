from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.core.database import get_db
from app.models.models import Job
from app.core.auth import verify_jwt
from app.schemas.schemas import JobCreateRequest, JobCreateResponse, JobListItem

router = APIRouter(prefix="/api/v1/jobs")

@router.post("", response_model=JobCreateResponse)
async def create_job(
    job_data: JobCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_jwt)  # Admin role check (mocked for now)
) -> JobCreateResponse:
    """Create a new job posting. Requires authentication."""
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
    return JobCreateResponse(status="success", job_id=str(new_job.id))

@router.get("", response_model=list[JobListItem])
async def list_jobs(db: AsyncSession = Depends(get_db)) -> list[JobListItem]:
    """List all available job postings."""
    jobs = (await db.execute(select(Job))).scalars().all()
    return [
        JobListItem(
            id=str(j.id),
            title=j.title,
            department=j.department,
            type=j.interview_type
        )
        for j in jobs
    ]
