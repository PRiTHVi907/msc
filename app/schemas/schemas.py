from pydantic import BaseModel
from uuid import UUID

class JoinResponse(BaseModel):
    token: str
    room_name: str
    interview_id: UUID

class VideoUploadRequest(BaseModel):
    filename: str
    content_type: str

class VideoFinalizeRequest(BaseModel):
    s3_resource_url: str
