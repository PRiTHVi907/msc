import asyncio
from fastapi import FastAPI
from twilio.base.exceptions import TwilioRestException
from app.api.interviews import router as interviews_router
from app.api.stream import router as stream_router
from app.api.auth import router as auth_router
from app.api.jobs import router as jobs_router
from app.api.stream import active_connections
from app.core.exceptions import twilio_exception_handler
from app.services.worker import transcript_worker, cleanup_orphans
from app.core.database import engine

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interviews_router)
app.include_router(stream_router)
app.include_router(auth_router)
app.include_router(jobs_router)
app.add_exception_handler(TwilioRestException, twilio_exception_handler)

bg_tasks = []

from app.core.database import engine, Base

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    bg_tasks.append(asyncio.create_task(transcript_worker.run()))
    bg_tasks.append(asyncio.create_task(cleanup_orphans()))

@app.on_event("shutdown")
async def shutdown():
    for ws in list(active_connections):
        try:
            await ws.send_json({"type": "server_shutdown", "message": "Server restarting, please reconnect"})
            await ws.close(1001)
        except Exception: pass
    for t in bg_tasks: t.cancel()
    await transcript_worker.flush()
    await engine.dispose()
