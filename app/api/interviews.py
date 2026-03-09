from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import Interview, InterviewStatus
from app.schemas.schemas import JoinResponse, VideoUploadRequest, VideoFinalizeRequest
from app.services.twilio import twilio_service
from app.services.storage import storage_service
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
        interview = (await db.execute(select(Interview).where(Interview.id == interview_id))).scalar_one_or_none()
        if not interview or interview.status in (InterviewStatus.completed, InterviewStatus.failed):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview")
        room_name = f"room_{interview_id}"
        
        from app.core.config import settings
        if settings.TWILIO_ACCOUNT_SID == "dummy":
            token = "mock_token"
        else:
            interview.twilio_room_sid = await twilio_service.create_video_room(str(interview_id))
            token = twilio_service.generate_client_token(room_name, str(interview.user_id))
            
        interview.status = InterviewStatus.in_progress
        await db.commit()
        return JoinResponse(token=token, room_name=room_name, interview_id=interview_id)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Database conflict")

@router.post("/{interview_id}/video-upload-url")
async def get_upload_url(interview_id: UUID, req: VideoUploadRequest, db: AsyncSession = Depends(get_db), _: str = Depends(verify_jwt)):
    i = (await db.execute(select(Interview.id).where(Interview.id == interview_id))).scalar()
    if not i: raise HTTPException(status_code=404, detail="Not found")
    
    # Check if dummy values are still used
    from app.core.config import settings
    if settings.AWS_ACCESS_KEY_ID == "dummy":
        return {"upload_url": "http://localhost:8000/mock-upload", "resource_url": f"mock://{req.filename}"}
        
    return await storage_service.generate_presigned_upload_url(str(interview_id), req.filename, req.content_type)

@router.post("/{interview_id}/finalize-video")
async def finalize_video(interview_id: UUID, req: VideoFinalizeRequest, db: AsyncSession = Depends(get_db), _: str = Depends(verify_jwt)):
    i = (await db.execute(select(Interview).where(Interview.id == interview_id))).scalar_one_or_none()
    if not i: raise HTTPException(status_code=404, detail="Not found")
    i.status = InterviewStatus.completed
    i.ended_at = func.now()
    i.s3_video_url = req.s3_resource_url
    await db.commit()
    return {"status": "ok"}
