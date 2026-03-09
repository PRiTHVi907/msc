import asyncio
import websockets
import json
import jwt
import sqlite3

# Get the latest interview ID from the database
conn = sqlite3.connect('test.db')
cursor = conn.cursor()
cursor.execute("SELECT id FROM interviews LIMIT 1")
row = cursor.fetchone()
conn.close()

def log(msg):
    with open("client_out.txt", "a") as f: f.write(str(msg) + "\n")

if not row:
    log("Error: No interviews found in the database. Please generate one via Candidate login first.")
    exit(1)

interview_id = row[0]
log(f"Using interview ID: {interview_id}")

# Generate a real token using the dummy secret
secret_key = "super_secret" # the default dummy secret in .env
token = jwt.encode(
    {"user_id": "11111111-1111-1111-1111-111111111111", "role": "candidate"}, 
    secret_key, 
    algorithm="HS256"
)

async def test_ws():
    uri = f"ws://localhost:8004/ws/interviews/{interview_id}/stream"
    try:
        async with websockets.connect(uri) as ws:
            log("Connected")
            await ws.send(json.dumps({"type": "authenticate", "token": token}))
            await asyncio.sleep(1)
            await ws.send(json.dumps({"type": "start_stream", "sample_rate": 16000}))
            
            async def receive():
                try:
                    while True:
                        response = await ws.recv()
                        log(f"Received: {response}")
                except Exception as e:
                    log(f"Receive loop ended: {e}")

            async def send():
                try:
                    while True:
                        await asyncio.sleep(0.5)
                        await ws.send(b"dummy_audio_bytes")
                except Exception:
                    pass

            await asyncio.gather(receive(), send())

    except Exception as e:
        log(f"Connection failed: {e}")

asyncio.run(test_ws())
