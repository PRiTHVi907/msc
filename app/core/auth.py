import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

def verify_jwt(c: HTTPAuthorizationCredentials = Security(HTTPBearer())):
    try: return jwt.decode(c.credentials, settings.JWT_SECRET_KEY, algorithms=["HS256"])["user_id"]
    except Exception: raise HTTPException(status_code=401, detail="Invalid token")
