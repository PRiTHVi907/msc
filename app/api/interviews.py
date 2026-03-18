import asyncio
import uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import Interview, InterviewStatus
from app.schemas.schemas import JoinResponse
from app.services.scoring import calculate_ai_score
from app.core.auth import verify_jwt
from app.core.limiter import join_limiter

router = APIRouter(prefix="/api/v1/interviews")

@router.get("")
async def get_interviews(db: AsyncSession = Depends(get_db)):
    from app.models.models import User, Job
    query = select(Interview, User.full_name, Job.title).join(User, Interview.user_id == User.id, isouter=True).join(Job, Interview.job_id == Job.id, isouter=True)
    results = (await db.execute(query)).all()
    
    out = []
    for interview, user_name, job_title in results:
        status_str = "Invited"
        if interview.status.value == "completed":
            status_str = "Scored"
        elif interview.status.value == "in_progress":
            status_str = "Recorded"
        
        out.append({
            "id": str(interview.id),
            "name": user_name or "Unknown Candidate",
            "role": job_title or "Frontend Engineer",
            "status": status_str,
            "score": getattr(interview, "ai_score", None) or (85 if status_str == "Scored" else None)
        })
    return out

@router.post("/{interview_id}/join", response_model=JoinResponse)
async def join_interview(interview_id: UUID, db: AsyncSession = Depends(get_db), uid: str = Depends(verify_jwt)):
    join_limiter(uid)
    try:
        from app.models.models import User, Job
        query = (
            select(Interview, User, Job)
            .join(User, Interview.user_id == User.id, isouter=True)
            .join(Job, Interview.job_id == Job.id, isouter=True)
            .where(Interview.id == interview_id)
        )
        result = (await db.execute(query)).first()
        
        if not result:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview")
            
        interview, user, job = result
        
        if interview.status in (InterviewStatus.completed, InterviewStatus.failed):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview")
            
        candidate_name = user.full_name if user else "Unknown Candidate"
        job_title = job.title if job else "Unknown Role"
        required_skills = [s.strip() for s in job.skills.split(",")] if job and job.skills else []
        
        try:
            from app.services.retell_service import retell_service
            access_token = "rejoin_token_unavailable"
            if not interview.retell_call_id:
                call_info = retell_service.create_web_call(
                    interview_id=str(interview_id),
                    candidate_name=candidate_name,
                    job_title=job_title,
                    required_skills=required_skills
                )
                interview.retell_call_id = call_info["call_id"]
                access_token = call_info["access_token"]
        except Exception as e:
            print(f"[RETELL API ERROR] Unexpected error during provisioning: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal provisioning error")
            
        interview.status = InterviewStatus.in_progress
        await db.commit()
        return JoinResponse(access_token=access_token, retell_call_id=interview.retell_call_id, interview_id=interview_id)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Database conflict")

