from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional

# ============================================================================
# AUTHENTICATION SCHEMAS
# ============================================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "candidate"  # Optional role field from frontend

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str

# ============================================================================
# INTERVIEW SCHEMAS
# ============================================================================

class JoinResponse(BaseModel):
    """Response after joining an interview (provisioning complete)."""
    token: str
    room_name: str
    interview_id: UUID

class VideoUploadRequest(BaseModel):
    """Request for S3 presigned upload URL."""
    filename: str
    content_type: str

class VideoFinalizeRequest(BaseModel):
    """Request to finalize video after upload."""
    s3_resource_url: str

class InterviewListResponse(BaseModel):
    """Interview list item."""
    id: str
    name: str
    role: str
    status: str
    score: Optional[int] = None

# ============================================================================
# JOB SCHEMAS
# ============================================================================

class QuestionSchema(BaseModel):
    """Interview question."""
    id: str
    text: str
    allowFollowup: bool

class NotificationsSchema(BaseModel):
    """Notification preferences for job."""
    email: bool
    sms: bool
    wa: bool

class JobCreateRequest(BaseModel):
    """Request to create a new job posting."""
    title: str
    dept: str
    skills: str
    type: str  # 'async' or 'live'
    minScore: int
    qs: list[QuestionSchema]
    notifs: NotificationsSchema

class JobCreateResponse(BaseModel):
    """Response after job creation."""
    status: str
    job_id: str

class JobListItem(BaseModel):
    """Job list item."""
    id: str
    title: str
    department: str
    type: str
