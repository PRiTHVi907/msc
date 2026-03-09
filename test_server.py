import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.api.stream import router as stream_router

app = FastAPI()
app.include_router(stream_router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL EXCEPTION CAUGHT: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"message": str(exc)})

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8004)
