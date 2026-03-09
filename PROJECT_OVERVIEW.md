# AI Interview Platform - Detailed Project Overview & Workflow

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [File Structure](#file-structure)
5. [Data Flow & Workflow](#data-flow--workflow)
6. [Core Components](#core-components)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [WebSocket Protocol](#websocket-protocol)
10. [Configuration & Environment](#configuration--environment)

---

## 🎯 Project Overview

**AI Interview Platform** is a real-time asynchronous interview system that combines:
- **Google Gemini Live API** for AI-powered interview conversations
- **Twilio Programmable Video** for video recording & WebRTC connectivity
- **AWS S3** for persistent video storage
- **PostgreSQL** (asyncio) for interview transcripts and metadata

**Key Features:**
- Sub-500ms bidirectional PCM audio via WebSocket → Gemini Live API
- Multi-phase interview workflow (authentication → room provisioning → live AI interview → scoring)
- Background worker for transcript persistence and orphan room cleanup
- JWT Bearer token authentication
- Rate limiting (token-bucket algorithm)
- Graceful shutdown with connection cleanup

---

## 🏗️ Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/TypeScript)                  │
│  (Dashboard, Live Interview Room, Candidate Review Panel)            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│         REST API              WebSocket              Video Stream     │
│          (HTTP)               (Bidirectional)        (Twilio)        │
│            │                       │                    │            │
├─────────────────────────────────────────────────────────────────────┤
│                      FASTAPI BACKEND (Python)                        │
│                                                                       │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  API Routers                                           │         │
│  │  • /api/v1/interviews       (Interview CRUD)         │         │
│  │  • /api/v1/jobs              (Job management)         │         │
│  │  • /api/v1/auth              (JWT authentication)     │         │
│  │  • /ws/interviews/{id}/stream (Live Audio Stream)    │         │
│  └────────────────────────────────────────────────────────┘         │
│                                    │                                 │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  Services Layer                                        │         │
│  │  ├─ AIEngineService    (Gemini Live API orchestration)│        │
│  │  ├─ TwilioService      (Video room provisioning)     │         │
│  │  ├─ StorageService     (S3 pre-signed URLs)          │         │
│  │  ├─ TranscriptWorker   (Async queue → DB persistence)│        │
│  │  └─ ScoringService     (AI evaluation & scoring)     │         │
│  └────────────────────────────────────────────────────────┘         │
│                                    │                                 │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  Middleware & Core                                     │         │
│  │  • CORS middleware                                     │         │
│  │  • JWT verification                                    │         │
│  │  • Rate limiting (join_limiter, ws_limiter)          │         │
│  │  • Database connection pooling (asyncpg)             │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                                 │
│  ┌──────────────────────┬──────────────────┬────────────────────┐   │
│  │  Google Gemini Live  │  Twilio Video    │  AWS S3            │   │
│  │  (AI Conversations)  │  (Video Rooms)   │  (Video Storage)   │   │
│  └──────────────────────┴──────────────────┴────────────────────┘   │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                       DATABASE (PostgreSQL)                          │
│  • Users (candidates)                                               │
│  • Jobs (open positions)                                            │
│  • Interviews (session metadata)                                    │
│  • Transcripts (Q&A history)                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend Dependencies (`requirements.txt`)
| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | latest | Web framework for REST APIs |
| `uvicorn[standard]` | latest | ASGI server |
| `pydantic-settings` | latest | Environment configuration management |
| `sqlalchemy` | latest | ORM for database abstraction |
| `asyncpg` | latest | Async PostgreSQL driver |
| `twilio` | latest | Video & SMS provisioning |
| `google-genai` | latest | Gemini Multimodal Live API client |
| `boto3` | latest | AWS S3 SDK |
| `PyJWT` | latest | JWT token signing & verification |

### Frontend Dependencies (`package.json`)
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | UI framework |
| `react-dom` | ^19.2.0 | React DOM utilities |
| `react-router-dom` | ^7.13.1 | Client-side routing |
| `twilio-video` | ^2.34.0 | Twilio Video SDK (peer connections) |
| `zustand` | ^5.0.11 | State management |
| `lucide-react` | ^0.577.0 | UI icons |
| `tailwindcss` | ^4.2.1 | Utility-first CSS |
| `@dnd-kit/*` | latest | Drag & drop for question ordering |
| `vite` | ^7.3.1 | Build tool & dev server |
| `typescript` | ~5.9.3 | Type safety |

---

## 📁 File Structure & Responsibilities

### Backend Structure

```
app/
├── __init__.py
├── api/
│   ├── __init__.py
│   ├── auth.py              # JWT login/registration endpoints
│   ├── interviews.py        # Interview CRUD & room provisioning
│   ├── jobs.py              # Job listing & creation
│   └── stream.py            # WebSocket endpoint for live AI stream
│
├── core/
│   ├── __init__.py
│   ├── auth.py              # JWT token verification & generation
│   ├── config.py            # Settings from .env (Pydantic)
│   ├── database.py          # SQLAlchemy async session factory
│   ├── exceptions.py        # Custom exception handlers
│   └── limiter.py           # Token-bucket rate limiting
│
├── models/
│   ├── __init__.py
│   └── models.py            # SQLAlchemy ORM models (User, Job, Interview, Transcript)
│
├── schemas/
│   ├── __init__.py
│   └── schemas.py           # Pydantic request/response schemas
│
└── services/
    ├── __init__.py
    ├── ai.py                # AIEngineService (Gemini orchestration)
    ├── evaluation_service.py # Candidate evaluation logic
    ├── scoring.py           # AI score calculation
    ├── storage.py           # S3 presigned URL generation
    ├── system_instruction.py# Recruiter prompt builder
    ├── twilio.py            # TwilioService (room & token management)
    └── worker.py            # TranscriptWorker (background queue)

main.py                       # FastAPI app initialization & startup/shutdown
requirements.txt              # Python dependencies
.env                          # Environment variables (confidential)
```

### Frontend Structure

```
frontend/
├── package.json
├── vite.config.ts           # Vite bundler configuration
├── tsconfig.json            # TypeScript configuration
├── index.html               # HTML entry point
│
└── src/
    ├── main.tsx             # React entry point
    ├── App.tsx              # Root component & routing
    ├── App.css              # Global styles
    │
    ├── components/
    │   ├── AsyncInterviewRoom.tsx       # Async interview (pre-recorded)
    │   ├── LiveAIInterviewRoom.tsx      # Live WebSocket interview
    │   ├── LiveTranscript.tsx           # Real-time transcript display
    │   ├── CandidateReviewPanel.tsx     # HR review interface
    │   ├── Dashboard.tsx                # Interview management dashboard
    │   ├── JobBuilder.tsx               # Job posting creation
    │   ├── CalendarIntegration.tsx      # Interview scheduling
    │   ├── SystemCheck.tsx              # Pre-interview audio/video test
    │   └── CollaborationBoard.tsx       # Team collaboration space
    │
    ├── hooks/
    │   ├── useAudioIngress.ts           # Audio capture from microphone
    │   ├── useAudioEgress.ts            # Audio playback from speaker
    │   ├── useMicrophoneStream.ts       # PCM audio stream management
    │   └── useMediaRecorder.ts          # Video recording via MediaRecorder API
    │
    ├── layouts/
    │   ├── AdminLayout.tsx              # Admin dashboard layout
    │   └── CandidateLayout.tsx          # Candidate interview layout
    │
    ├── pages/
    │   └── InterviewSession.tsx         # Full interview page
    │
    ├── services/
    │   └── uploadService.ts             # S3 video upload client
    │
    └── store/
        └── useAppStore.ts              # Zustand global state (interviews, users, jobs)
```

---

## 🔄 Data Flow & Workflow

### Phase 1: Interview Initialization

```
1. POST /api/v1/interviews/{interview_id}/join
   ↓
   [Verify JWT Token]
   ↓
   [Rate Limit Check]
   ↓
   [Fetch Interview from DB]
   ↓
   [CREATE Twilio Video Room (if not exists)]
   ↓
   [GENERATE Twilio Access Token]
   ↓
   [UPDATE Interview.status → in_progress]
   ↓
   Response: { token, room_name, interview_id }
```

### Phase 2: WebSocket Connection & Authentication

```
1. Frontend initiates: ws://backend/ws/interviews/{interview_id}/stream
   ↓
   [Backend accepts WebSocket]
   ↓
2. Frontend sends M1: { type: "authenticate", token: "JWT_TOKEN" }
   ↓
   [Backend verifies JWT]
   ↓
3. Frontend sends M2: { type: "start_stream", sample_rate: 16000 }
   ↓
   [Backend initializes AIEngineService.run()]
```

### Phase 3: Live Audio Stream (Bidirectional)

```
INGRESS (Candidate → AI):
┌──────────────────────────────────────────┐
│ Candidate speaks → Browser microphone    │
│ ↓                                        │
│ Audio captured as PCM16 @ 16kHz          │
│ ↓                                        │
│ Base64 encoded                           │
│ ↓                                        │
│ Sent via WebSocket:                      │
│ { type: "audio", data: "base64_pcm" }  │
│ ↓                                        │
│ Backend decodes → PCM bytes              │
│ ↓                                        │
│ SENT TO GEMINI LIVE API                 │
└──────────────────────────────────────────┘

EGRESS (AI → Candidate):
┌──────────────────────────────────────────┐
│ Gemini processes audio in real-time      │
│ ↓                                        │
│ Response: Audio bytes + TEXT transcript  │
│ ↓                                        │
│ Backend receives audio response          │
│ ↓                                        │
│ Sent to frontend via WebSocket:          │
│ Binary audio data                        │
│ ↓                                        │
│ Frontend plays via Web Audio API         │
│ ↓                                        │
│ Transcript stored in queue → Worker      │
└──────────────────────────────────────────┘
```

### Phase 4: Background Processing (Workers)

```
TranscriptWorker (Async Queue Draining):
┌────────────────────────────────────────────┐
│ AI response text captured                  │
│ ↓                                          │
│ JSON pushed to queue:                      │
│ {                                          │
│   interview_id,                           │
│   speaker: "ai",                          │
│   text_content: "...",                    │
│   timestamp                               │
│ }                                          │
│ ↓                                          │
│ Worker batches up to 10 items              │
│ Flushes every 3 seconds                    │
│ ↓                                          │
│ Bulk INSERT into DB (Transcripts table)   │
│ ↓                                          │
│ Retry logic (3 attempts) on DB error      │
└────────────────────────────────────────────┘

Cleanup Worker (Every 15 minutes):
┌────────────────────────────────────────────┐
│ Query: Interviews stuck in_progress        │
│ for >2 hours                               │
│ ↓                                          │
│ For each orphan:                           │
│   - Complete Twilio room                  │
│   - Mark as failed in DB                  │
│ ↓                                          │
│ Prevent resource leaks                    │
└────────────────────────────────────────────┘
```

### Phase 5: Interview Completion & Scoring

```
1. Candidate clicks "End Interview"
   ↓
2. Frontend sends: { type: "stop_stream" }
   ↓
3. WebSocket closes, ingress/egress tasks canceled
   ↓
4. POST /api/v1/interviews/{interview_id}/finalize-video
   ↓
   Upload video to S3 (presigned URL)
   ↓
   POST /api/v1/interviews/{interview_id}/finalize-video
   {
     s3_resource_url: "s3://bucket/..."
   }
   ↓
5. Backend stores S3 URL in DB
   ↓
6. Async task: calculate_ai_score(interview_id)
   ├─ Fetch all transcripts for interview
   ├─ Compile structured Q&A
   ├─ Send to Gemini for evaluation
   ├─ Store score in Interview.ai_score
   └─ Mark Interview.status → completed
```

---

## 🔧 Core Components

### 1. **AIEngineService** (`app/services/ai.py`)

**Responsibility:** Orchestrate bidirectional communication with Google Gemini Live API

**Key Methods:**
- `__init__(api_key)`: Initialize Gemini client
- `run(ws, sample_rate, transcript_queue, interview_id)`: Main orchestrator
  - Check for mock mode (api_key == "dummy")
  - Create LiveConnectConfig with system instructions
  - Spawn ingress & egress tasks
  - Handle reconnection logic (2 attempts)

**Data Flow:**
```
WebSocket Ingress Task:
  1. Receive JSON from frontend
  2. If type="audio": Decode base64 → send PCM to Gemini
  3. If type="user_transcript": Send text to Gemini
  4. If type="stop_stream": Break loop

WebSocket Egress Task:
  1. Receive responses from Gemini session
  2. Audio response → Send as binary to frontend
  3. Text response → Queue for transcript worker
  4. Handle end_of_turn semantics
```

### 2. **TwilioService** (`app/services/twilio.py`)

**Responsibility:** Manage Twilio Video rooms and authentication tokens

**Key Methods:**
- `create_video_room(room_name)`: Provision new room, return SID
- `generate_client_token(room_name, participant_id)`: Create access token
- `complete_video_room(room_sid)`: Force-end room (cleanup)

**Configuration:**
- Account SID, Auth Token (from `.env`)
- API Key & Secret for room management
- Tokens expire after 1 hour

### 3. **StorageService** (`app/services/storage.py`)

**Responsibility:** Generate AWS S3 presigned URLs for video upload/download

**Key Methods:**
- `generate_presigned_upload_url(interview_id, filename, content_type)`
  - Creates pre-signed PUT URL (15-minute expiry)
  - Candidate uploads directly to S3 (no backend relay)

**Configuration:**
- AWS IAM credentials
- S3 bucket name
- Region

### 4. **TranscriptWorker** (`app/services/worker.py`)

**Responsibility:** Asynchronously persist transcripts to database

**Workflow:**
```
Queue (asyncio.Queue) ← Receipt from AI
    ↓
Batch up to 10 items (timeout 3 sec)
    ↓
Bulk INSERT into Transcripts table
    ↓
Retry 3x on database error
    ↓
Flush remaining on shutdown
```

**Why Background Job?**
- Non-blocking: Interview continues during DB latency
- Batching: Reduces DB round-trips
- Resilience: Retry logic + flush on shutdown

### 5. **ScoringService** (`app/services/scoring.py`)

**Responsibility:** Evaluate candidate performance via AI

**Process:**
1. Fetch all transcripts for interview_id
2. Build Q&A pairs from speaker alternations
3. Construct detailed candidate profile
4. Send to Gemini for evaluation
5. Parse response → `ai_score` (0-100)
6. Update Interview.ai_score in DB

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌──────────────────────┐
│       User           │
├──────────────────────┤
│ id (PK, UUID)        │
│ email (UNIQUE)       │
│ full_name            │
│ created_at           │
│ is_active            │
└───────────┬──────────┘
            │ 1:N
            │
            │
┌───────────▼──────────┐         ┌──────────────────────┐
│     Interview        │         │        Job           │
├──────────────────────┤         ├──────────────────────┤
│ id (PK, UUID)        │◄────────┤ id (PK, UUID)        │
│ user_id (FK)         │ 1:N     │ title                │
│ job_id (FK)          │         │ department           │
│ twilio_room_sid      │         │ skills               │
│ status               │         │ interview_type       │
│ started_at           │         │ min_score            │
│ ended_at             │         │ questions (JSON)     │
│ s3_video_url         │         │ created_at           │
│ ai_score             │         └──────────────────────┘
└───────────┬──────────┘
            │ 1:N
            │
┌───────────▼──────────────┐
│     Transcript           │
├──────────────────────────┤
│ id (PK, UUID)            │
│ interview_id (FK)        │
│ speaker (Enum)           │ ← "human" or "ai"
│ text_content (Text)      │
│ timestamp                │
│ confidence_score (Float) │
└──────────────────────────┘
```

### Table Details

| Table | Column | Type | Constraints |
|-------|--------|------|-------------|
| `users` | id | UUID | PK, DEFAULT uuid4 |
| | email | VARCHAR | UNIQUE |
| | full_name | VARCHAR | NOT NULL |
| | created_at | DATETIME | DEFAULT NOW() |
| | is_active | BOOLEAN | DEFAULT TRUE |
| `jobs` | id | UUID | PK |
| | title | VARCHAR | NOT NULL |
| | skills | VARCHAR | NOT NULL |
| | interview_type | VARCHAR | "async" or "live" |
| | questions | JSON | Array of Q&A objects |
| `interviews` | id | UUID | PK |
| | user_id | UUID | FK → users.id |
| | job_id | UUID | FK → jobs.id |
| | twilio_room_sid | VARCHAR | UNIQUE (optional) |
| | status | ENUM | scheduled/in_progress/completed/failed |
| | ai_score | FLOAT | NULL until completed |
| `transcripts` | interview_id | UUID | FK → interviews.id |
| | speaker | ENUM | "human" or "ai" |
| | text_content | TEXT | Interview dialogue |
| | timestamp | DATETIME | DEFAULT NOW() |

---

## 🌐 API Endpoints

### REST API

#### Authentication
```
POST /api/v1/auth/register
Body: { email, full_name, password }
Response: { user_id, token }

POST /api/v1/auth/login
Body: { email, password }
Response: { user_id, token }
```

#### Interviews
```
GET /api/v1/interviews
Auth: Bearer JWT
Response: [
  {
    id, name, role, status ("Invited"/"Recorded"/"Scored"), score
  }
]

POST /api/v1/interviews/{interview_id}/join
Auth: Bearer JWT
Response: { token, room_name, interview_id }

POST /api/v1/interviews/{interview_id}/video-upload-url
Auth: Bearer JWT
Body: { filename, content_type }
Response: { upload_url, resource_url }

POST /api/v1/interviews/{interview_id}/finalize-video
Auth: Bearer JWT
Body: { s3_resource_url }
Response: { status: "ok" }
```

#### Jobs
```
GET /api/v1/jobs
Response: [{ id, title, department, skills, min_score }]

POST /api/v1/jobs
Auth: Bearer JWT
Body: { title, department, skills, questions, min_score }
Response: { id, ... }
```

### WebSocket API

#### Interview Live Stream
```
ws://backend/ws/interviews/{interview_id}/stream

Message 1 (Client → Server):
{
  "type": "authenticate",
  "token": "JWT_TOKEN"
}

Message 2 (Client → Server):
{
  "type": "start_stream",
  "sample_rate": 16000
}

Ingress Stream (Client → Server):
{
  "type": "audio",
  "data": "<base64_encoded_pcm16>"
}

Egress Stream (Server → Client):
- Binary audio frames (PCM16 @ 16kHz)
- JSON transcripts: { type: "transcript", speaker: "ai", text: "..." }

Stop (Client → Server):
{
  "type": "stop_stream"
}
```

---

## 🔐 Configuration & Environment

### `.env` Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/msc_db

# Twilio Credentials
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_API_KEY=SK...
TWILIO_API_SECRET=...

# JWT
JWT_SECRET_KEY=your_secret_key_here

# Gemini API
GEMINI_API_KEY=AIzaSy...

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=msc-videos
AWS_ROLE_ARN=arn:aws:iam::...
```

### Startup Flow

```python
@app.on_event("startup")
async def startup():
    # Create DB tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Start background workers
    bg_tasks.append(asyncio.create_task(transcript_worker.run()))
    bg_tasks.append(asyncio.create_task(cleanup_orphans()))

@app.on_event("shutdown")
async def shutdown():
    # Close all WebSocket connections gracefully
    # Cancel background tasks
    # Flush remaining transcripts
    # Dispose DB pool
```

---

## 🚀 Running the Project

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload

# Server listening on: http://localhost:8000
```

### Frontend
```bash
# Install dependencies
cd frontend && npm install

# Dev server
npm run dev

# Build for production
npm run build

# Server listening on: http://localhost:5173
```

---

## 📊 Key Metrics & Performance Characteristics

| Metric | Target | Notes |
|--------|--------|-------|
| Audio latency (WebSocket) | <500ms | Sub-perceptual delay |
| Transcript persistence | 3s batch | Non-blocking |
| Rate limit | 10 req/sec per user | Sliding window |
| Token expiry | 1 hour (Twilio) | Refresh on reconnect |
| Session timeout | 2 days (Interview stuck) | Cleanup worker |
| Database pool size | 10 connections | SQLAlchemy async |
| Interview limit | Unlimited | Depends on infrastructure |

---

## 🔍 Monitoring & Logging

- **WebSocket Logs**: `debug_ws.txt` (real-time events)
- **Gemini Logs**: `gemini_log.txt` (session events & errors)
- **Client Output**: `client_out.txt` (browser messages)
- **Error Handling**: Custom exception handlers for Twilio & validation errors

---

## 🎯 Future Enhancements

1. **Multi-language Support**: Extend Gemini prompts for non-English interviews
2. **Analytics Dashboard**: Visual interview performance metrics
3. **Custom Evaluation Rubrics**: HR-defined scoring criteria
4. **Async Interview Mode**: Pre-recorded candidate responses
5. **Interview Calendar**: Scheduling integration (Google Calendar/Outlook)
6. **Collaboration Features**: Real-time HR team feedback
7. **Video Highlighting**: Automatic timestamp-based Q&A extraction
8. **Mobile App**: Native iOS/Android support

---

## 📝 Summary

This platform is a **production-grade system** for  conducting AI-powered technical interviews. The architecture emphasizes:
- ✅ **Real-time Communication**: Sub-500ms audio WebSocket → Gemini
- ✅ **Scalability**: Background workers, async I/O throughout
- ✅ **Resilience**: Retry logic, graceful shutdown, orphan cleanup
- ✅ **Security**: JWT auth, rate limiting, AWS IAM roles
- ✅ **Observability**: Comprehensive logging & error tracking

The tech stack leverages **modern async Python** (FastAPI/asyncpg) and **React 19** with Twilio SDKs for a seamless full-stack experience.
