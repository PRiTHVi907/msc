import asyncio
from datetime import datetime, timedelta
from sqlalchemy import insert, select
from sqlalchemy.exc import DBAPIError
from app.core.database import AsyncSessionLocal
from app.models.models import Transcript, Interview, InterviewStatus

class TranscriptWorker:
    def __init__(self):
        self.q = asyncio.Queue()
        self.run_flag = True

    async def run(self, db_factory=AsyncSessionLocal):
        while self.run_flag:
            buf = []
            try:
                while len(buf) < 20: buf.append(await asyncio.wait_for(self.q.get(), timeout=5.0))
            except asyncio.TimeoutError: pass
            if not buf: continue
            await self._insert(buf, db_factory)
            for _ in buf: self.q.task_done()

    async def flush(self, db_factory=AsyncSessionLocal):
        self.run_flag = False
        buf = []
        while not self.q.empty(): buf.append(self.q.get_nowait())
        if buf: await self._insert(buf, db_factory)

    async def _insert(self, buf, db_factory):
        async with db_factory() as db:
            for _ in range(3):
                try:
                    await db.execute(insert(Transcript).values(buf))
                    await db.commit()
                    break
                except DBAPIError:
                    await db.rollback()
                    await asyncio.sleep(0.5)

transcript_worker = TranscriptWorker()

async def cleanup_orphans(db_factory=AsyncSessionLocal):
    while True:
        await asyncio.sleep(300)
        from app.services.twilio import twilio_service
        async with db_factory() as db:
            dt = datetime.utcnow() - timedelta(minutes=60)
            res = await db.execute(select(Interview).where(Interview.status == InterviewStatus.in_progress, Interview.started_at < dt))
            for i in res.scalars():
                try: await twilio_service.complete_video_room(i.twilio_room_sid)
                except Exception: pass
                i.status = InterviewStatus.failed
            await db.commit()
