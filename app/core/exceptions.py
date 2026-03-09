from fastapi import Request, status
from fastapi.responses import JSONResponse
from twilio.base.exceptions import TwilioRestException

async def twilio_exception_handler(request: Request, exc: TwilioRestException):
    return JSONResponse(status_code=status.HTTP_502_BAD_GATEWAY, content={"detail": "Upstream provider failure"})
