from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback
import logging
from app.api.interviews import router as interviews_router
from app.api.auth import router as auth_router
from app.api.jobs import router as jobs_router
from app.api.webhooks import router as webhooks_router
from app.api.retell_llm import router as retell_llm_router
from app.core.database import engine

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"Unexpected Error: {str(exc)}"
    logging.error(f"{error_msg}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": error_msg, "type": type(exc).__name__}
    )

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
app.include_router(retell_llm_router, prefix="/api/v1/retell", tags=["Retell"])

from app.core.database import engine, Base

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
