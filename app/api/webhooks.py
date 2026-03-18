import hmac
import hashlib
import json
import asyncio
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import Interview, InterviewStatus, Transcript, SpeakerType
from app.core.config import settings
from app.services.scoring import calculate_ai_score

router = APIRouter(prefix="/api/v1/retell")

def verify_retell_signature(payload_bytes: bytes, signature: str) -> bool:
    if not signature:
        return False
    # Use RETELL_API_KEY as the HMAC secret (or a dedicated Webhook Secret if you have one configured)
    secret = settings.RETELL_API_KEY.encode('utf-8')
    computed_signature = hmac.new(
        secret,
        msg=payload_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, signature)

@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def retell_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload_bytes = await request.body()
    signature = request.headers.get("X-Retell-Signature", "")
    
    if not verify_retell_signature(payload_bytes, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
        
    try:
        payload = json.loads(payload_bytes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event")
    if event != "call_analyzed":
        # Ignore other events
        return
        
    data = payload.get("data", {})
    call_id = data.get("call_id")
    
    if not call_id:
        return
        
    interview = (await db.execute(
        select(Interview).where(Interview.retell_call_id == call_id)
    )).scalar_one_or_none()
    
    if not interview:
        return
        
    transcript_objects = data.get("transcript_object", [])
    
    if transcript_objects:
        new_transcripts = []
        for index, item in enumerate(transcript_objects):
            speaker_str = item.get("role")
            text = item.get("content", "")
            
            # Map Retell role to SpeakerType
            if speaker_str == "agent":
                speaker = SpeakerType.ai
            else:
                speaker = SpeakerType.human
                
            new_transcripts.append(
                Transcript(
                    interview_id=interview.id,
                    speaker=speaker,
                    text_content=text,
                    timestamp=func.now() # Using current DB timestamp, or we could parse exact times if available
                )
            )
        
        if new_transcripts:
            db.add_all(new_transcripts)
            
    interview.status = InterviewStatus.completed
    interview.ended_at = func.now()
    
    await db.commit()
    
    # Trigger AI scoring asynchronously
    asyncio.create_task(calculate_ai_score(interview.id))
    
    return
