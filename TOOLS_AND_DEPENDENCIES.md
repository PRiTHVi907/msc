# Tools & Dependencies - Integration Guide

## 📦 Backend Dependencies Deep Dive

### 1. **FastAPI** - Web Framework
**Role:** REST API & WebSocket server
- Router-based endpoint organization (`app.include_router()`)
- Automatic OpenAPI/Swagger documentation
- Dependency injection system (`.depends()`)
- Exception handlers for global error handling
- Middleware for CORS, authentication

**Usage in Project:**
```python
# main.py
app = FastAPI()
app.add_middleware(CORSMiddleware, ...)
app.include_router(interviews_router)
app.include_router(stream_router)
```

**Endpoints Served:**
- REST: `/api/v1/interviews`, `/api/v1/jobs`, `/api/v1/auth`
- WebSocket: `/ws/interviews/{interview_id}/stream`

---

### 2. **Uvicorn** - ASGI Server
**Role:** Async HTTP server (runs FastAPI)
- Handles WebSocket upgrade protocol
- ASGI3 compliant
- Multi-worker support for production
- Hot reload (`--reload`)

**Startup Command:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

### 3. **SQLAlchemy** - ORM
**Role:** Database abstraction layer
- Async support via `AsyncSession`
- Declarative table definitions (`Base`)
- Type-hinted column mapping

**Integration Points:**
```python
# Async engine with connection pooling
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=AsyncPool,
    pool_size=10
)

# Session factory for dependency injection
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession)

# Define models (inherits from Base)
class Interview(Base):
    __tablename__ = "interviews"
    id: Mapped[UUID] = mapped_column(primary_key=True)
    # ... other fields
```

**Used in API Endpoints:**
```python
async def get_interviews(db: AsyncSession = Depends(get_db)):
    query = select(Interview, User.full_name, Job.title).join(...)
    results = (await db.execute(query)).all()
    return results
```

---

### 4. **asyncpg** - PostgreSQL Driver
**Role:** High-performance async database driver
- Native Python PostgreSQL protocol
- Sub-millisecond query latency
- Connection pooling built-in

**Configuration:**
```python
# In .env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/msc_db

# SQLAlchemy uses asyncpg via URL scheme
engine = create_async_engine(DATABASE_URL)
```

**Performance:**
- Connection pool: 10 simultaneous DB connections
- Batch inserts: 10-item transcript batches every 3 seconds

---

### 5. **Pydantic** - Data Validation
**Role:** Request/response schema validation + `.env` parsing

**Three Key Uses:**

**a) Environment Configuration (`pydantic-settings`):**
```python
# app/core/config.py
class Settings(BaseSettings):
    DATABASE_URL: str
    TWILIO_ACCOUNT_SID: str
    GEMINI_API_KEY: str
    # ... etc
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()  # Auto-validates & loads .env
```

**b) Request Validation:**
```python
# app/schemas/schemas.py
class VideoUploadRequest(BaseModel):
    filename: str
    content_type: str

@router.post("/{interview_id}/video-upload-url")
async def get_upload_url(..., req: VideoUploadRequest, ...):
    # req.filename is guaranteed valid string
    # Type mismatch → FastAPI returns 422 error
```

**c) Response Serialization:**
```python
class JoinResponse(BaseModel):
    token: str
    room_name: str
    interview_id: UUID

# FastAPI auto-serializes: JoinResponse → JSON
return JoinResponse(token=t, room_name=r, interview_id=i)
```

---

### 6. **Twilio SDK** - Video & SMS
**Role:** Programmable video rooms and authentication

**Key Components:**

**a) Room Provisioning:**
```python
# app/services/twilio.py
from twilio.rest import Client

client = Client(ACCOUNT_SID, AUTH_TOKEN)

# Create video room
room = client.video.rooms.create(
    unique_name=f"room_{interview_id}",
    type="go",  # Peer-to-peer
    max_participants=2
)
room_sid = room.sid  # Store in Interview.twilio_room_sid
```

**b) Access Tokens:**
```python
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

token = AccessToken(ACCOUNT_SID, API_KEY, API_SECRET)
token.add_grant(VideoGrant(room_name=room_name))
token_str = token.to_jwt()  # Send to frontend
```

**c) Room Cleanup:**
```python
# Delete room after interview ends
client.video.rooms(room_sid).update(status="completed")
```

**Data Flow:**
```
Candidate clicks "Join" 
  ↓
POST /api/v1/interviews/{id}/join
  ↓
Backend: TwilioService.create_video_room()
  ↓
Twilio API: Create room SID
  ↓
Backend: Generate access token
  ↓
Response: { token, room_name, interview_id }
  ↓
Frontend: Twilio.connect(token, room_name)
  ↓
WebRTC P2P connection established
```

---

### 7. **Google GenAI SDK** - Gemini Live API
**Role:** Real-time AI interview orchestration

**Integration:**

**a) Client Initialization:**
```python
# app/services/ai.py
from google import genai

class AIEngineService:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
```

**b) Live Session Connection:**
```python
from google.genai import types

cfg = types.LiveConnectConfig(
    response_modalities=["AUDIO", "TEXT"],
    system_instruction=types.Content(
        parts=[types.Part.from_text(text=_SYSTEM_INSTRUCTION)]
    ),
    # Note: Removed unsupported api_version="v1alpha"
)

async with self.client.aio.live.connect(
    model="gemini-2.0-flash",  # Fixed: was "gemini-2.0-flash-live-001"
    config=cfg
) as session:
    # Bidirectional audio/text streaming
    await session.send(input="Hello!")
    async for response in session.receive():
        # response contains audio & text
```

**c) Audio Data Format:**
```python
# Client sends: Base64-encoded PCM16 audio
raw_bytes = base64.b64decode(msg["data"])

# Backend sends to Gemini
await session.send(input={
    "mime_type": "audio/pcm;rate=16000",  # 16kHz mono PCM
    "data": raw_bytes
})

# Gemini responds with: Audio bytes + Text
async for response in session.receive():
    if response.data:
        # Audio chunk (bytes)
        await ws.send_bytes(response.data)
    if response.text:
        # Transcript text
        await transcript_worker.q.put({...})
```

**Known Issues (FIXED in PROJECT_OVERVIEW):**
- ❌ Old: `model="gemini-2.0-flash-live-001"` → Model not found
- ✅ New: `model="gemini-2.0-flash"` → Available & supported
- ❌ Old: `api_version="v1alpha"` → Doesn't support bidiGenerateContent
- ✅ New: No explicit version → Defaults to v1beta

---

### 8. **boto3** - AWS S3
**Role:** Presigned URLs for video storage

**Integration:**

**a) S3 Client Setup:**
```python
# app/services/storage.py
import boto3

s3_client = boto3.client(
    "s3",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)
```

**b) Generate Upload URL:**
```python
# Candidate gets presigned URL to upload video directly
presigned_url = s3_client.generate_presigned_url(
    "put_object",
    Params={
        "Bucket": S3_BUCKET_NAME,
        "Key": f"interviews/{interview_id}/video.mp4"
    },
    ExpiresIn=900  # 15 minutes
)
```

**c) Generate Download URL (optional):**
```python
presigned_download = s3_client.generate_presigned_url(
    "get_object",
    Params={
        "Bucket": S3_BUCKET_NAME,
        "Key": f"interviews/{interview_id}/video.mp4"
    },
    ExpiresIn=3600  # 1 hour
)
```

**Data Flow:**
```
Candidate finishes interview
  ↓
Frontend: POST /api/v1/interviews/{id}/video-upload-url
  ↓
Backend: Generate presigned PUT URL (15 min expiry)
  ↓
Response: { upload_url, resource_url }
  ↓
Frontend: PUT video to upload_url (direct to S3)
  ↓
Frontend: POST /api/v1/interviews/{id}/finalize-video
           { s3_resource_url: "s3://..." }
  ↓
Backend: UPDATE Interview.s3_video_url, trigger scoring
```

---

### 9. **PyJWT** - JWT Authentication
**Role:** Session/bearer token verification

**Integration:**

**a) Token Generation (Login):**
```python
# app/core/auth.py
import jwt
from datetime import datetime, timedelta

def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm="HS256"
    )
```

**b) Token Verification (Guard):**
```python
def verify_jwt(credentials: HTTPAuthorizationCredentials):
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload["user_id"]
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401)
```

**c) WebSocket Authentication:**
```python
# Client sends M1
await ws.receive_json()  # { type: "authenticate", token: "JWT" }

# Backend verifies
credentials = HTTPAuthorizationCredentials(
    scheme="Bearer",
    credentials=m1.get("token", "")
)
verify_jwt(credentials)  # Raises if invalid
```

---

## 🎨 Frontend Dependencies Deep Dive

### 1. **React** - UI Framework
**Role:** Component-based view layer
- Hooks for state management (useState, useEffect, useContext)
- Functional components throughout
- JSX syntax

**Key Components:**
- `Dashboard.tsx` - Interview list & management
- `LiveAIInterviewRoom.tsx` - Main interview interface
- `LiveTranscript.tsx` - Real-time Q&A display
- `SystemCheck.tsx` - Audio/video device verification

---

### 2. **Zustand** - State Management
**Role:** Lightweight global state store (Redux alternative)

**Usage:**
```typescript
// frontend/src/store/useAppStore.ts
import { create } from 'zustand'

export const useAppStore = create((set) => ({
  interviews: [],
  currentUser: null,
  selectedJob: null,
  setInterviews: (interviews) => set({ interviews }),
  setCurrentUser: (user) => set({ currentUser: user }),
  // ... etc
}))

// In component
const interviews = useAppStore((state) => state.interviews)
const setInterviews = useAppStore((state) => state.setInterviews)
```

---

### 3. **Twilio Video SDK** - WebRTC
**Role:** Peer-to-peer video connection

**Integration:**
```typescript
// frontend/src/components/LiveAIInterviewRoom.tsx
import { connect } from 'twilio-video'

const room = await connect(jwtToken, {
  name: roomName,
  audio: true,
  video: { width: 640 }
})

// Access video/audio tracks
room.on('participantConnected', (participant) => {
  // Render video stream
  const videoTrack = participant.videoTracks[0]?.track
  const audioTrack = participant.audioTracks[0]?.track
})

// Send local audio/video
room.localParticipant.audioTracks[0]?.track.enable()
room.localParticipant.videoTracks[0]?.track.enable()
```

---

### 4. **React Router** - Client-side Routing
**Role:** Navigation between pages

**Routes:**
```typescript
// frontend/src/App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
    <Route path="/interview/:id" element={<CandidateLayout><InterviewSession /></CandidateLayout>} />
    <Route path="/jobs" element={<JobBuilder />} />
  </Routes>
</BrowserRouter>
```

---

### 5. **Tailwind CSS** - Styling
**Role:** Utility-first CSS framework

**Configuration:**
```javascript
// frontend/tailwind.config.js
export default {
  theme: {
    extend: {
      colors: { ... },
      spacing: { ... }
    }
  }
}
```

**Usage:**
```tsx
<div className="flex items-center justify-between p-4 bg-gray-100">
  <h1 className="text-2xl font-bold">Interview Dashboard</h1>
  <button className="px-4 py-2 bg-blue-500 text-white rounded">Start</button>
</div>
```

---

### 6. **@dnd-kit** - Drag & Drop
**Role:** Reorder questions in job builder

**Usage:**
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={questions} strategy={verticalListSortingStrategy}>
    {questions.map(q => <SortableQuestion key={q.id} questions={q} />)}
  </SortableContext>
</DndContext>
```

---

### 7. **Vite** - Build Tool
**Role:** Lightning-fast development server & bundler

**Config:**
```typescript
// frontend/vite.config.ts
import react from '@vitejs/plugin-react'

export default {
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true }
    }
  }
}
```

**Commands:**
```bash
npm run dev      # Dev server @ localhost:5173
npm run build    # Production bundle
npm run preview  # Preview production build
```

---

### 8. **TypeScript** - Type Safety
**Role:** Compile-time type checking

**Interfaces Used:**
```typescript
interface Interview {
  id: string
  name: string
  role: string
  status: "Invited" | "Recorded" | "Scored"
  score?: number
}

interface JoinResponse {
  token: string
  room_name: string
  interview_id: string
}

type WebSocketMessage = 
  | { type: 'authenticate'; token: string }
  | { type: 'start_stream'; sample_rate: number }
  | { type: 'audio'; data: string }
  | { type: 'transcript'; speaker: 'ai' | 'human'; text: string }
  | { type: 'stop_stream' }
```

---

### 9. **Lucide React** - Icons
**Role:** UI iconography

**Usage:**
```tsx
import { Play, Pause, Send, Mic, Video } from 'lucide-react'

<button><Play size={24} /></button>
<button><Mic size={20} className="text-red-500" /></button>
```

---

## 🔗 Integration Points - How Tools Connect

### Backend ↔ Database ↔ Frontend

```
┌─ Frontend ─────────────────────────────────────────┐
│  React + Zustand + React Router + Tailwind CSS    │
│         ↓ (HTTP/WebSocket)                         │
├─────────────────────────────────────────────────────┤
│                    FastAPI                         │
│  • Route Handlers                                  │
│  • Dependency Injection (@Depends)                │
│  • Exception Handlers                             │
│         ↓ (SQLAlchemy ORM)                         │
├─────────────────────────────────────────────────────┤
│  SQLAlchemy AsyncSession                          │
│  (Type-hinted models)                             │
│         ↓ (asyncpg protocol)                       │
├─────────────────────────────────────────────────────┤
│  PostgreSQL Database                              │
│  (users, jobs, interviews, transcripts)          │
└─────────────────────────────────────────────────────┘
```

### External Service Integration

```
Backend (FastAPI)
    ├─→ Twilio SDK
    │   └─→ Twilio REST API (Room provisioning)
    │
    ├─→ Google GenAI SDK
    │   └─→ Gemini Live API (WebSocket → v1beta)
    │
    └─→ Boto3 (S3 SDK)
        └─→ AWS S3 (Presigned URLs)

Frontend (React)
    ├─→ Twilio Video SDK
    │   └─→ Twilio TURN/STUN servers (P2P connection)
    │
    └─→ Web APIs
        ├─ Web Audio API (audio capture/playback)
        ├─ MediaRecorder API (video recording)
        ├─ Fetch API (HTTP requests)
        └─ WebSocket API (real-time stream)
```

---

## 🚀 Startup Sequence

### Backend Startup

```
1. python -m uvicorn main:app --reload
2. app = FastAPI() initialized
3. CORSMiddleware added
4. Routers registered (interviews, stream, auth, jobs)
5. Exception handlers registered
6. @app.on_event("startup") fired:
   ├─ SQLAlchemy: Create all tables (if not exist)
   ├─ Start TranscriptWorker background task
   └─ Start cleanup_orphans background task
7. Uvicorn server listening on 0.0.0.0:8000
8. Ready to accept HTTP/WebSocket connections
```

### Frontend Startup

```
1. npm run dev
2. Vite dev server starts on localhost:5173
3. React app mounted on DOM
4. useAppStore initialized (Zustand)
5. useEffect hooks fire:
   ├─ Fetch /api/v1/interviews (populate store)
   ├─ Fetch /api/v1/jobs
   └─ Check JWT validity
6. Router renders based on URL
7. Ready to accept user interactions
```

---

## 📊 Performance Optimization Points

| Layer | Tool | Optimization |
|-------|------|--------------|
| **Database** | asyncpg + SQLAlchemy | Connection pooling (10), batch inserts |
| **API** | FastAPI | Async/await throughout, dependency caching |
| **WebSocket** | Uvicorn + asyncio | Non-blocking I/O, concurrent task handling |
| **Frontend** | React + Vite | Code splitting, HMR, lazy routing |
| **Audio** | Web Audio API | PCM16 encoding, 16kHz sample rate |
| **Video** | Twilio SDK | H.264 codec, adaptive bitrate |
| **Cloud** | boto3 + S3 | Presigned URLs (no backend relay) |
| **AI** | Gemini Live API | Streaming response (no batch processing) |

---

## 🔧 Development Tools & Debugging

### Backend Debugging
```python
# Logging to files
gemini_log.txt    # Gemini session events
debug_ws.txt      # WebSocket connection flow
client_out.txt    # Frontend output

# Print debugging
def log(msg):
    with open("debug_ws.txt", "a") as f:
        f.write(msg + "\n")
```

### Frontend Debugging
```typescript
// Browser DevTools
console.log()          // JavaScript console
Network tab            # Monitor HTTP/WebSocket
Application tab        # Inspect Zustand state
Performance tab        # Profile React renders

// React DevTools extension
<Profiler id="Interview">
  <LiveAIInterviewRoom />
</Profiler>
```

### Testing Files
```
test_live.py          # Test Gemini API with different models
test_twilio.py        # Test Twilio provisioning
test_ai.py            # Test AI scoring logic
test_server.py        # Test FastAPI endpoints
test_ws.py            # Test WebSocket protocol
```

---

## 📝 Summary

The project integrates **11 major tools/libraries**:

**Backend (Python):**
1. FastAPI - REST/WebSocket server
2. Uvicorn - ASGI server
3. SQLAlchemy - ORM
4. asyncpg - DB driver
5. Pydantic - Validation
6. Twilio SDK - Video provisioning
7. Google GenAI SDK - Gemini AI
8. boto3 - AWS S3
9. PyJWT - Authentication

**Frontend (TypeScript/React):**
10. React - UI framework
11. Zustand - State management
12. Twilio Video SDK - WebRTC
13. React Router - Navigation
14. Tailwind CSS - Styling
15. Vite - Build tool

All components work together in a **low-latency, event-driven, non-blocking** architecture optimized for real-time AI interviews.
