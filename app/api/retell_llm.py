from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
from app.core.llm import client as openai_client
from app.services.system_instruction import build_recruiter_prompt

print("DEBUG: Loading retell_llm module...")
router = APIRouter()
print("DEBUG: Router initialized in retell_llm")
logger = logging.getLogger(__name__)

@router.websocket("/llm-websocket/{call_id}")
async def llm_websocket(websocket: WebSocket, call_id: str):
    print(f"DEBUG: Retell websocket upgrade for call: {call_id}")
    await websocket.accept()
    
    # Track state for the session
    job_title = "Candidate"
    candidate_name = "AI Intern"
    
    try:
        while True:
            try:
                data = await websocket.receive_text()
                event = json.loads(data)
                interaction_type = event.get("interaction_type")
                
                if interaction_type == "config":
                    # Extract dynamic variables from Retell
                    config_vars = event.get("retell_llm_dynamic_variables", {})
                    job_title = config_vars.get("job_title", "Software Engineer")
                    candidate_name = config_vars.get("candidate_name", "Candidate")
                    
                    print(f"DEBUG: Configured for {candidate_name} as {job_title}")
                    
                    # Initial greeting
                    await websocket.send_json({
                        "response_id": 0,
                        "content": f"Hello {candidate_name}! I am your interviewer for the {job_title} role. Shall we begin?",
                        "content_complete": True
                    })
                    continue
                    
                if interaction_type == "update_only":
                    continue
                    
                if interaction_type in ["response_required", "reminder_required"]:
                    response_id = event.get("response_id")
                    transcript = event.get("transcript", [])
                    
                    messages = [{"role": "system", "content": build_recruiter_prompt(job_title, candidate_name)}]
                    for turn in transcript:
                        role = "assistant" if turn.get("role") == "agent" else "user"
                        messages.append({"role": role, "content": turn.get("content", "")})
                        
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
                        await websocket.send_json({"response_id": response_id, "content": "", "content_complete": True})
                    except Exception as e:
                        logger.error(f"LLM Error: {e}")
            except json.JSONDecodeError:
                continue
            except Exception as e:
                logger.error(f"Inner loop error: {e}")
                break
    except WebSocketDisconnect:
        print(f"DEBUG: Retell WebSocket disconnected")
    except Exception as e:
        print(f"DEBUG: WebSocket outer exception: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass
