import asyncio
from sqlalchemy import insert
from sqlalchemy.exc import DBAPIError
from app.core.database import AsyncSessionLocal
from app.models.models import Transcript


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


