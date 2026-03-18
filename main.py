from fastapi import FastAPI
from app.api.interviews import router as interviews_router
from app.api.auth import router as auth_router
from app.api.jobs import router as jobs_router
from app.api.webhooks import router as webhooks_router
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
app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(webhooks_router)

from app.core.database import engine, Base

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
