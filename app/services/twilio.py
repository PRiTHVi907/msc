import asyncio
from twilio.rest import Client
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
from app.core.config import settings

class TwilioService:
    def __init__(self):
        self.client = Client(settings.TWILIO_API_KEY, settings.TWILIO_API_SECRET, settings.TWILIO_ACCOUNT_SID)

    async def create_video_room(self, interview_id: str) -> str:
        return (await asyncio.to_thread(self.client.video.rooms.create, unique_name=f"room_{interview_id}", type="peer-to-peer", record_participants_on_connect=False)).sid

    async def complete_video_room(self, room_sid: str):
        await asyncio.to_thread(self.client.video.rooms(room_sid).update, status="completed")

    def generate_client_token(self, room_name: str, identity: str) -> str:
        t = AccessToken(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_API_KEY, settings.TWILIO_API_SECRET, identity=identity)
        t.add_grant(VideoGrant(room=room_name))
        return t.to_jwt()

twilio_service = TwilioService()
