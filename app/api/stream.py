import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import Interview, InterviewStatus
from app.services.ai import ai_engine
from app.services.worker import transcript_worker
from app.core.config import settings
from app.core.auth import verify_jwt
from app.core.limiter import ws_limiter

def log(msg):
    with open("debug_ws.txt", "a") as f: f.write(msg + "\n")

router = APIRouter(prefix="/ws/interviews")
ai_svc = ai_engine(settings.GEMINI_API_KEY)
active_connections: set[WebSocket] = set()

@router.websocket("/{interview_id}/stream")
async def stream(ws: WebSocket, interview_id: str, db: AsyncSession = Depends(get_db)):
    log("WS Hit Endpoint")
    try: ws_limiter(ws.client.host if ws.client else "unknown")
    except Exception: return await ws.close(1008)
    
    log("Accepting websocket")
    await ws.accept()
    log("Websocket accepted")
    
    m1 = await ws.receive_json()
    log(f"Received M1: {m1}")
    if m1.get("type") != "authenticate": return await ws.close(4003)
    try: 
        verify_jwt(HTTPAuthorizationCredentials(scheme="Bearer", credentials=m1.get("token", "")))
        log("JWT Verified")
    except Exception as e: 
        log(f"DEBUG WS AUTH FAILED: {e}")
        return await ws.close(4003)

    log(f"DEBUG INCOMING INTERVIEW ID: {interview_id}")
    try:
        from uuid import UUID
        interview_uuid = UUID(interview_id) if isinstance(interview_id, str) else interview_id
        log(f"DEBUG UUID PARSED: {interview_uuid}")
        v = (await db.execute(select(Interview.id).where(Interview.id == interview_uuid, Interview.status.not_in([InterviewStatus.completed, InterviewStatus.failed])))).scalar()
        log(f"DEBUG DB RESULT: {v}")
    except Exception as e:
        log(f"DEBUG DB EXCEPTION: {e}")
        v = None
        
    if not v:
        log("Invalid interview, closing")
        await ws.send_json({"type": "error", "message": "Invalid interview"})
        return await ws.close(1008)
    
    m2 = await ws.receive_json()
    log(f"Received M2: {m2}")
    if m2.get("type") != "start_stream":
        log("Expected start_stream")
        await ws.send_json({"type": "error", "message": "Expected start_stream"})
        return await ws.close(1003)
    
    active_connections.add(ws)
    try:
        log("Calling ai_svc.run")
        await ai_svc.run(ws, m2.get("sample_rate", 16000), transcript_worker.q, interview_id=interview_uuid)
        log("ai_svc.run finished cleanly")
    except WebSocketDisconnect: 
        log(f"Client disconnected - {interview_id}")
    except Exception as e:
        log(f"AI ENGINE FATAL EXCEPTION: {type(e).__name__} - {str(e)}")
    finally: 
        log("Discarding connection")
        active_connections.discard(ws)
