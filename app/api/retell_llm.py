from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
from app.core.llm import client as openai_client
from app.services.system_instruction import build_recruiter_prompt, SAMPLE_CV

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/llm-websocket/{call_id}")
async def llm_websocket(websocket: WebSocket, call_id: str):
    logger.info(f"Retell connected. Call: {call_id}")
    await websocket.accept()
    
    # Track state for the session
    job_title = "Candidate"
    candidate_name = "AI Intern"
    
    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            interaction_type = event.get("interaction_type")
            
            if interaction_type == "config":
                # Extract dynamic variables from Retell
                config_vars = event.get("retell_llm_dynamic_variables", {})
                job_title = config_vars.get("job_title", "Software Engineer")
                candidate_name = config_vars.get("candidate_name", "Candidate")
                
                logger.debug(f"Configured for {candidate_name} as {job_title}")
                
                # Initial greeting
                await websocket.send_json({
                    "response_id": 0,
                    "content": f"Hello {candidate_name}! I'm looking forward to our interview for the {job_title} position. Shall we start?",
                    "content_complete": True
                })
                continue
                
            if interaction_type == "update_only":
                continue
                
            if interaction_type in ["response_required", "reminder_required"]:
                response_id = event.get("response_id")
                transcript = event.get("transcript", [])
                
                messages = [
                    {"role": "system", "content": build_recruiter_prompt(job_title, candidate_name)}
                ]
                
                for turn in transcript:
                    role = "assistant" if turn.get("role") == "agent" else "user"
                    messages.append({"role": role, "content": turn.get("content", "")})
                    
                # Call OpenAI with streaming
                try:
                    stream = await openai_client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=messages,
                        stream=True
                    )
                    
                    async for chunk in stream:
                        content = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
                        if content:
                            await websocket.send_json({
                                "response_id": response_id,
                                "content": content,
                                "content_complete": False
                            })
                            
                    # Send final completion frame
                    await websocket.send_json({
                        "response_id": response_id,
                        "content": "",
                        "content_complete": True
                    })
                except Exception as e:
                    logger.error(f"OpenAI error: {e}")
                    
    except WebSocketDisconnect:
        logger.info(f"Retell LLM WebSocket disconnected for call_id: {call_id}")
    except Exception as e:
        logger.error(f"WebSocket error for call_id {call_id}: {e}")
        try:
            await websocket.close()
        except:
            pass
