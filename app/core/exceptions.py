import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

async def twilio_exception_handler(request: Request, exc: TwilioRestException):
    # Log the real error for debugging but never expose 502 to the caller.
    # The join endpoint already handles Twilio errors with a UUID fallback token;
    # this handler is a last-resort safety net.
    logger.error("[Twilio] Unhandled TwilioRestException on %s: code=%s msg=%s",
                 request.url.path, exc.code, exc.msg)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"detail": "video_unavailable", "fallback": True}
    )
