from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.core.database import get_db
from app.core.auth import create_jwt
from app.models.models import User

router = APIRouter(prefix="/api/v1/auth")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    user = User(
        email=req.email,
        full_name=req.full_name,
        password_hash=hash_password(req.password),
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    token = create_jwt(str(user.id))
    return AuthResponse(token=token, user_id=str(user.id), email=user.email)

@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == req.email))).scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")
    
    token = create_jwt(str(user.id))
    return AuthResponse(token=token, user_id=str(user.id), email=user.email)
