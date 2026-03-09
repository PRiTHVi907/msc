import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

def create_jwt(user_id: str, expires_delta: timedelta | None = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(hours=settings.JWT_EXPIRY_HOURS)
    
    exp = datetime.utcnow() + expires_delta
    payload = {"user_id": user_id, "exp": exp}
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def verify_jwt(c: HTTPAuthorizationCredentials = Security(HTTPBearer())):
    try:
        payload = jwt.decode(c.credentials, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload["user_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
