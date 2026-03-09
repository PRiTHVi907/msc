import asyncio
from app.services.ai import ai_engine
from app.core.config import settings

class DummyWS:
    def __init__(self):
        self.count = 0
    async def receive(self):
        await asyncio.sleep(2)
        self.count += 1
        if self.count == 1:
            return {"text": '{"type": "start_stream"}'}
        return {"text": '{"type": "stop_stream"}'}
    async def send_json(self, data):
        print(f"WS Send JSON: {data}")
    async def send_bytes(self, data):
        pass

async def test_ai():
    print(f"Using GEMINI_API_KEY: {settings.GEMINI_API_KEY[:5]}...")
    svc = ai_engine(settings.GEMINI_API_KEY)
    ws = DummyWS()
    q = asyncio.Queue()
    await svc.run(ws, 16000, q)

if __name__ == "__main__":
    asyncio.run(test_ai())
