import asyncio
import websockets
import json

async def test_websocket():
    url = "ws://localhost:8000/api/v1/retell/llm-websocket/test_call_id"
    try:
        async with websockets.connect(url) as ws:
            print("Connected to WebSocket")
            
            # 1. Send Config
            config_msg = {
                "interaction_type": "config",
                "retell_llm_dynamic_variables": {
                    "job_title": "Python Developer",
                    "candidate_name": "Test User"
                }
            }
            await ws.send(json.dumps(config_msg))
            print("Sent Config")
            
            # Wait for greeting
            greeting = await ws.recv()
            print(f"Received greeting: {greeting}")
            
            # 2. Send Response Required
            response_req = {
                "interaction_type": "response_required",
                "response_id": 1,
                "transcript": [
                    {"role": "agent", "content": "How are you?"},
                    {"role": "user", "content": "I am great, let's start!"}
                ]
            }
            await ws.send(json.dumps(response_req))
            print("Sent Response Required")
            
            # Wait for stream
            while True:
                response = await ws.recv()
                print(f"Stream chunk: {response}")
                if json.loads(response).get("content_complete"):
                    break
            print("Test complete!")
            
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
