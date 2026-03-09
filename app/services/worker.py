import asyncio
from datetime import datetime, timedelta
from sqlalchemy import insert, select
from sqlalchemy.exc import DBAPIError
from app.core.database import AsyncSessionLocal
from app.models.models import Transcript, Interview, InterviewStatus


class TranscriptWorker:
    """
    Drains the transcript queue in batches of up to 10,
    flushing every 3 seconds even if the batch is smaller.
    """
    def __init__(self):
        self.q: asyncio.Queue = asyncio.Queue()
        self.run_flag = True

    async def run(self, db_factory=AsyncSessionLocal):
        while self.run_flag:
            buf = []
            try:
                while len(buf) < 10:
                    buf.append(await asyncio.wait_for(self.q.get(), timeout=3.0))
            except asyncio.TimeoutError:
                pass
            if not buf:
                continue
            await self._insert(buf, db_factory)
            for _ in buf:
                self.q.task_done()

    async def flush(self, db_factory=AsyncSessionLocal):
        self.run_flag = False
        buf = []
        while not self.q.empty():
            buf.append(self.q.get_nowait())
        if buf:
            await self._insert(buf, db_factory)

    async def _insert(self, buf: list, db_factory):
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
    """
    Every 15 minutes: find interviews stuck in_progress for >2 hours,
    force-complete the Twilio room, and mark them as failed.
    """
    while True:
        await asyncio.sleep(15 * 60)          # 15-minute cadence
        threshold = datetime.utcnow() - timedelta(hours=2)
        try:
            from app.services.twilio import twilio_service
            async with db_factory() as db:
                res = await db.execute(
                    select(Interview).where(
                        Interview.status == InterviewStatus.in_progress,
                        Interview.started_at < threshold,
                    )
                )
                for interview in res.scalars():
                    if interview.twilio_room_sid:
                        try:
                            await twilio_service.complete_video_room(interview.twilio_room_sid)
                        except Exception:
                            pass
                    interview.status = InterviewStatus.failed
                await db.commit()
        except Exception:
            pass
