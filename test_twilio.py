import asyncio
from app.services.twilio import twilio_service
from app.core.config import settings

async def main():
    print(f"TWILIO_ACCOUNT_SID: {settings.TWILIO_ACCOUNT_SID}")
    print(f"TWILIO_API_KEY: {settings.TWILIO_API_KEY}")
    try:
        room_sid = await twilio_service.create_video_room("test_interview_123")
        print(f"Success! Room SID: {room_sid}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
