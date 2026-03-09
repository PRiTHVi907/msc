import asyncio
import base64
import json
import traceback
from google import genai
from google.genai import types
from fastapi import WebSocket, WebSocketDisconnect
from app.services.system_instruction import build_recruiter_prompt

_SYSTEM_INSTRUCTION = build_recruiter_prompt(
    job_description=(
        "Senior Software Engineer role requiring deep expertise in distributed systems, "
        "cloud architecture (AWS/GCP), Python backend development, REST API design, "
        "SQL/NoSQL databases, system design, and strong CS fundamentals."
    ),
    candidate_name="the candidate",
    required_skills=[
        "Python", "FastAPI", "Distributed Systems", "AWS", "PostgreSQL",
        "System Design", "REST APIs", "Algorithms & Data Structures"
    ]
)

_MODEL = "gemini-2.0-flash"

def _glog(msg: str):
    with open("gemini_log.txt", "a") as f:
        f.write(str(msg) + "\n")


class AIEngineService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        if api_key != "dummy":
            self.client = genai.Client(
                api_key=api_key
            )

    # ------------------------------------------------------------------
    # MOCK MODE (api_key == "dummy")
    # ------------------------------------------------------------------
    async def _run_mock(self, ws: WebSocket, q: asyncio.Queue, interview_id):
        async def mock_ingress():
            try:
                while True:
                    msg = await ws.receive()
                    if msg.get("text"):
                        payload = json.loads(msg["text"])
                        if payload.get("type") == "stop_stream":
                            break
            except (WebSocketDisconnect, Exception):
                pass

        async def mock_egress():
            questions = [
                "Hello! I'm your AI interviewer today. Could you start by walking me through your background?",
                "Describe a distributed system you've designed end-to-end. What were the key trade-offs?",
                "How do you approach database schema design for high-throughput write workloads?",
            ]
            try:
                for idx, q_text in enumerate(questions):
                    await asyncio.sleep(6)
                    await ws.send_json({"type": "transcript", "speaker": "ai", "text": q_text})
                    await q.put({"interview_id": interview_id, "speaker": "ai", "text_content": q_text})
                while True:
                    await asyncio.sleep(30)
            except (WebSocketDisconnect, Exception):
                pass

        t1 = asyncio.create_task(mock_ingress())
        t2 = asyncio.create_task(mock_egress())
        done, pending = await asyncio.wait([t1, t2], return_when=asyncio.FIRST_COMPLETED)
        for t in pending:
            t.cancel()

    # ------------------------------------------------------------------
    # LIVE MODE — Gemini Multimodal Live API
    # ------------------------------------------------------------------
    async def run(self, ws: WebSocket, sr: int, q: asyncio.Queue, interview_id=None):
        if self.api_key == "dummy":
            return await self._run_mock(ws, q, interview_id)

        cfg = types.LiveConnectConfig(
            response_modalities=["AUDIO", "TEXT"],
            system_instruction=types.Content(
                parts=[types.Part.from_text(text=_SYSTEM_INSTRUCTION)]
            ),
        )

        for attempt in range(2):
            try:
                async with self.client.aio.live.connect(model=_MODEL, config=cfg) as session:
                    _glog("[GEMINI] Session connected")

                    # Seed the conversation so Gemini speaks first
                    await session.send(
                        input="Hello! I am the candidate. Please introduce yourself briefly and ask me the first interview question.",
                        end_of_turn=True,
                    )

                    # --------------------------------------------------
                    # INGRESS: Frontend → Gemini
                    # Expects JSON: {"type": "audio", "data": "<base64 PCM16>"}
                    # --------------------------------------------------
                    async def ingress():
                        _glog("[INGRESS] Task started")
                        try:
                            async for raw in ws.iter_text():
                                try:
                                    msg = json.loads(raw)
                                except json.JSONDecodeError:
                                    _glog(f"[INGRESS] Bad JSON: {raw[:120]}")
                                    continue

                                msg_type = msg.get("type")

                                if msg_type == "audio":
                                    raw_bytes = base64.b64decode(msg["data"])
                                    _glog(f"[INGRESS] Audio chunk {len(raw_bytes)}B → Gemini")
                                    await session.send(
                                        input={
                                            "mime_type": f"audio/pcm;rate={sr}",
                                            "data": raw_bytes,
                                        }
                                    )

                                elif msg_type == "stop_stream":
                                    _glog("[INGRESS] stop_stream received")
                                    break

                                elif msg_type == "user_transcript":
                                    # text-only fallback (browser SpeechRecognition)
                                    text = msg.get("text", "")
                                    if text:
                                        _glog(f"[INGRESS] User transcript → Gemini: {text[:80]}")
                                        await session.send(input=text, end_of_turn=True)

                        except WebSocketDisconnect:
                            _glog("[INGRESS] Client disconnected")
                        except Exception as e:
                            _glog(f"[INGRESS] Fatal: {type(e).__name__}: {e}")

                    # --------------------------------------------------
                    # EGRESS: Gemini → Frontend
                    # Audio → ws.send_bytes; Text → transcript queue + ws JSON
                    # --------------------------------------------------
                    async def egress():
                        _glog("[EGRESS] Task started")
                        try:
                            async for response in session.receive():
                                sc = response.server_content
                                if not sc or not sc.model_turn:
                                    continue
                                for part in sc.model_turn.parts:
                                    if part.inline_data:
                                        audio = part.inline_data.data
                                        _glog(f"[EGRESS] Audio {len(audio)}B → client")
                                        await ws.send_bytes(audio)
                                    if part.text:
                                        _glog(f"[EGRESS] Text → queue+client: {part.text[:80]}")
                                        await q.put({
                                            "interview_id": interview_id,
                                            "speaker": "ai",
                                            "text_content": part.text,
                                        })
                                        await ws.send_json({
                                            "type": "ai_response",
                                            "transcript": part.text,
                                        })
                        except WebSocketDisconnect:
                            _glog("[EGRESS] Client disconnected")
                        except Exception as e:
                            _glog(f"[EGRESS] Fatal: {type(e).__name__}: {e}")

                    tasks = [
                        asyncio.create_task(ingress()),
                        asyncio.create_task(egress()),
                    ]
                    done, pending = await asyncio.wait(
                        tasks, return_when=asyncio.FIRST_COMPLETED
                    )
                    for t in pending:
                        t.cancel()
                    break  # success — don't retry

            except Exception as e:
                _glog(f"[GEMINI] Connection error (attempt {attempt}): {type(e).__name__}: {e}")
                traceback.print_exc()
                if attempt == 0:
                    await ws.send_json({"type": "ai_disconnect", "reason": "upstream_timeout"})
                    await asyncio.sleep(2)
                else:
                    raise


ai_engine = AIEngineService
