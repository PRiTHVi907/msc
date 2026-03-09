import asyncio
import json
import traceback
from google import genai
from google.genai import types
from fastapi import WebSocket, WebSocketDisconnect

class AIEngineService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        if api_key != "dummy":
            self.client = genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})
        self.sys_inst = "You are an expert technical recruiter conducting a professional engineering interview. Ask concise, progressive questions. Wait for the candidate to finish speaking. Do not use filler words."

    async def run(self, ws: WebSocket, sr: int, q: asyncio.Queue, interview_id=None):
        if self.api_key == "dummy":
            async def mock_ingress():
                try:
                    with open("debug_ws.txt", "a") as f: f.write("Mock Ingress Started\n")
                    while True:
                        msg = await ws.receive()
                        if "text" in msg:
                            payload = json.loads(msg["text"])
                            if payload.get("type") == "stop_stream": break
                except WebSocketDisconnect:
                    with open("debug_ws.txt", "a") as f: f.write("Mock Ingress Disconnected\n")
                except Exception as e:
                    with open("debug_ws.txt", "a") as f: f.write(f"Mock Ingress Error: {e}\n")

            async def mock_egress():
                try:
                    with open("debug_ws.txt", "a") as f: f.write("Mock Egress Started\n")
                    msgs = [
                        "Hello! I am your AI Interviewer. How are you today? I am fully mocked without an API key.",
                        "Can you tell me about your experience with React?",
                        "That sounds great. Let's move on to the next topic."
                    ]
                    for idx, m in enumerate(msgs):
                        await asyncio.sleep(8)
                        await ws.send_json({"type": "question", "id": idx + 1, "is_followup": False})
                        await q.put({"interview_id": interview_id, "speaker": "ai", "text_content": m})
                        await ws.send_json({"type": "transcript", "speaker": "ai", "text": m})
                    while True:
                        await asyncio.sleep(10)
                except WebSocketDisconnect:
                    with open("debug_ws.txt", "a") as f: f.write("Mock Egress Disconnected\n")
                except Exception as e:
                    with open("debug_ws.txt", "a") as f: f.write(f"Mock Egress Error: {e}\n")
            
            t1 = asyncio.create_task(mock_ingress())
            t2 = asyncio.create_task(mock_egress())
            done, pending = await asyncio.wait([t1, t2], return_when=asyncio.FIRST_COMPLETED)
            for t in pending:
                t.cancel()
            with open("debug_ws.txt", "a") as f: f.write(f"Tasks finished: {done}\n")
            return
            
        def glog(msg):
            with open("gemini_log.txt", "a") as f: f.write(str(msg) + "\n")

        cfg = types.LiveConnectConfig(
            response_modalities=["AUDIO", "TEXT"],
            system_instruction=types.Content(parts=[types.Part.from_text(text=self.sys_inst)])
        )
        for i in range(2):
            try:
                async with self.client.aio.live.connect(model="gemini-2.0-flash", config=cfg) as sess:
                    glog("[DEBUG - GEMINI IN] Sending initial introductory prompt to Gemini")
                    await sess.send(input="Hello! I am the candidate. Please introduce yourself briefly and ask me the first interview question.")
                    
                    async def ingress():
                        b = bytearray()
                        glog("Gemini Ingress Started")
                        while True:
                            try:
                                msg = await ws.receive()
                                glog(f"[DEBUG - BACKEND INGRESS] Received data of type: {type(msg)} | Keys: {msg.keys() if isinstance(msg, dict) else 'N/A'}")
                                
                                if msg.get("bytes") is not None:
                                    glog(f"[DEBUG - BACKEND INGRESS] Binary Size: {len(msg['bytes'])} bytes")
                                    b.extend(msg["bytes"])
                                    if len(b) >= 1024:
                                        payload_size = len(b)
                                        glog(f"[DEBUG - GEMINI IN] Sending payload length: {payload_size} to model.")
                                        await sess.send(input={"realtime_input": {"media_chunks": [{"mime_type": f"audio/pcm;rate={sr}", "data": bytes(b)}]}})
                                        b.clear()
                                        
                                elif msg.get("text") is not None:
                                    try:
                                        m = json.loads(msg["text"])
                                        glog(f"[DEBUG - BACKEND INGRESS] Text JSON Payload: {m}")
                                        if m.get("type") == "stop_stream": break
                                        
                                        # Handle new Browser SpeechRecognition text pipeline
                                        if m.get("type") == "user_transcript" and m.get("text"):
                                            txt_payload = m["text"]
                                            glog(f"[DEBUG - GEMINI IN] Forwarding explicit transcribed text to model: {txt_payload}")
                                            await sess.send(input=txt_payload)
                                            
                                    except json.JSONDecodeError as e:
                                        glog(f"[DEBUG - BACKEND ERROR] JSON Decode Error on text payload: {e}")
                                else:
                                    glog(f"[DEBUG - BACKEND ERROR] Unknown payload type. Raw msg: {msg}")
                                    
                            except Exception as e:
                                glog(f"[DEBUG - BACKEND INGRESS FATAL] {type(e).__name__}: {str(e)}")
                                break
                    async def egress():
                        glog("Gemini Egress Started")
                        try:
                            async for r in sess.receive():
                                if r.server_content and r.server_content.model_turn:
                                    for p in r.server_content.model_turn.parts:
                                        if p.inline_data: 
                                            glog(f"[DEBUG - GEMINI OUT] Received Audio from Gemini: {len(p.inline_data.data)} bytes")
                                            await ws.send_bytes(p.inline_data.data)
                                        if p.text: 
                                            glog(f"[DEBUG - GEMINI OUT] Received Text from Gemini. Length: {len(p.text)}")
                                            await q.put({"interview_id": interview_id, "speaker": "ai", "text_content": p.text})
                                            await ws.send_json({"type": "ai_response", "transcript": p.text})
                        except Exception as e:
                           glog(f"[DEBUG - GEMINI ERROR] Exception: {type(e).__name__}: {str(e)}")
                    tasks = [asyncio.create_task(ingress()), asyncio.create_task(egress())]
                    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                    for t in pending: t.cancel()
                    break
            except Exception as e:
                print(f"DEBUG GEMINI ERROR: {e}")
                traceback.print_exc()
                if i == 0:
                    await ws.send_json({"type": "ai_disconnect", "reason": "upstream_timeout"})
                    await asyncio.sleep(2**i)
                else: raise

ai_engine = AIEngineService
