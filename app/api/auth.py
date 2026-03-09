import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import User, Interview, InterviewStatus
from app.core.config import settings

router = APIRouter(prefix="/api/v1/auth")

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Simplified login logic: Check if user exists, else create for demo purposes
    user = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    
    if not user:
        # Create a new user if they don't exist for the demo
        user = User(email=req.email, full_name=req.email.split('@')[0])
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # In a real app, verify password hash here. For demo, we skip.
    
    # Sign JWT securely
    token = jwt.encode(
        {"user_id": str(user.id), "role": req.role}, 
        settings.JWT_SECRET_KEY, 
        algorithm="HS256"
    )

    interview_id = None
    if req.role == "candidate":
        # Check if they have a pending interview, if not create one for the demo
        pending_interview = (await db.execute(
            select(Interview).where(
                Interview.user_id == user.id, 
                Interview.status == InterviewStatus.scheduled
            )
        )).scalar_one_or_none()

        if not pending_interview:
            pending_interview = Interview(user_id=user.id, status=InterviewStatus.scheduled)
            db.add(pending_interview)
            await db.commit()
            await db.refresh(pending_interview)
        
        interview_id = str(pending_interview.id)
    
    return {"token": token, "role": req.role, "user_id": str(user.id), "interview_id": interview_id}
