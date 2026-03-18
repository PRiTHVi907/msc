# AI.nterview — Project Overview

## Purpose

AI.nterview is a full-stack AI-powered job interview platform that enables companies to conduct technical candidate interviews using a real-time Google Gemini AI recruiter. The platform supports two interview modes and provides an end-to-end hiring workflow from candidate invitation through scoring and HR review.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Twilio Video │  │  WebSocket   │  │   REST API (Axios) │ │
│  │  (WebRTC)     │  │  Audio/PCM   │  │   /api/v1/*        │ │
│  └──────┬────────┘  └──────┬───────┘  └────────┬───────────┘ │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                 FastAPI Backend (Python / Uvicorn)            │
│                                                              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ TwilioSvc  │  │ AIEngine    │  │ REST Routers          │  │
│  │ Video Rooms│  │ (Gemini     │  │ auth / interviews /   │  │
│  │ JWT Tokens │  │  Live API)  │  │ jobs / stream (WS)    │  │
│  └────────────┘  └─────────────┘  └──────────────────────┘  │
│                                                              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ StorageSvc │  │ ScoringJob  │  │ TranscriptWorker      │  │
│  │ (AWS S3)   │  │ (Gemini Pro)│  │ (background queue)    │  │
│  └────────────┘  └─────────────┘  └──────────────────────┘  │
└──────────────────────────────────┬───────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   PostgreSQL / SQLite (dev)  │
                    │  users, jobs, interviews,    │
                    │  transcripts                 │
                    └─────────────────────────────┘
```

---

## Technology Stack

### Backend

| Technology | Role |
|---|---|
| Python 3.11+ | Primary language |
| FastAPI | ASGI web framework (REST + WebSocket) |
| Uvicorn | ASGI server |
| SQLAlchemy (async) | ORM with async sessions |
| asyncpg / aiosqlite | PostgreSQL (prod) / SQLite (dev) drivers |
| Pydantic v2 | Request/response validation, settings |
| PyJWT | JWT token creation and verification |
| passlib (bcrypt) | Password hashing |
| google-genai | Gemini 2.0 Flash (live audio) + 2.5 Pro (scoring) |
| twilio | Programmable Video rooms + Access Tokens |
| boto3 | AWS SDK — S3 presigned uploads via STS role assumption |

### Frontend

| Technology | Role |
|---|---|
| React 19 | UI framework |
| TypeScript | Static typing |
| Vite | Build tool + dev server with backend proxy |
| React Router v7 | Client-side SPA routing |
| Zustand v5 | Global state (persisted to localStorage) |
| Tailwind CSS v4 | Utility-first styling |
| Axios | HTTP client with auth interceptors |
| twilio-video | WebRTC video room SDK |
| @dnd-kit | Drag-and-drop for Kanban review board |
| Web Audio API | Raw PCM microphone capture and AI audio playback |

---

## Directory Structure

```
msc/
├── main.py                      # FastAPI app entry, lifespan hooks
├── requirements.txt
├── .env                         # Environment variables
├── test.db                      # SQLite dev database
│
├── app/
│   ├── api/
│   │   ├── auth.py              # /api/v1/auth/register + login
│   │   ├── interviews.py        # /api/v1/interviews/* (join, upload, finalize)
│   │   ├── jobs.py              # /api/v1/jobs/* (create, list)
│   │   └── stream.py            # /ws/interviews/{id}/stream (WebSocket)
│   ├── core/
│   │   ├── config.py            # Pydantic Settings from .env
│   │   ├── auth.py              # JWT creation + HTTPBearer verification
│   │   ├── database.py          # Async engine, session factory, pool config
│   │   ├── exceptions.py        # Twilio exception handler
│   │   └── limiter.py           # Token-bucket rate limiter
│   ├── models/
│   │   └── models.py            # SQLAlchemy ORM: User, Job, Interview, Transcript
│   ├── schemas/
│   │   └── schemas.py           # Pydantic request/response schemas
│   └── services/
│       ├── ai.py                # AIEngineService — Gemini Live API orchestration
│       ├── twilio.py            # TwilioService — video room provisioning
│       ├── storage.py           # StorageService — S3 presigned URL generation
│       ├── worker.py            # TranscriptWorker + orphan cleanup scheduler
│       ├── scoring.py           # calculate_ai_score() — Gemini text scoring
│       ├── evaluation_service.py# Structured JSON scorecard generation
│       └── system_instruction.py# Builds AI recruiter persona system prompt
│
└── frontend/
    ├── vite.config.ts           # Dev proxy: /api -> :8000, /ws -> ws://:8000
    ├── package.json
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Dashboard.tsx
        │   ├── LiveAIInterviewRoom.tsx
        │   ├── AsyncInterviewRoom.tsx
        │   ├── LiveTranscript.tsx
        │   ├── JobBuilder.tsx
        │   ├── CandidateReviewPanel.tsx
        │   ├── CollaborationBoard.tsx
        │   ├── CalendarIntegration.tsx
        │   └── SystemCheck.tsx
        ├── hooks/
        │   ├── useAudioIngress.ts   # Mic capture → base64 PCM → WebSocket
        │   ├── useAudioEgress.ts    # Binary WebSocket frames → AudioContext playback
        │   ├── useMicrophoneStream.ts
        │   └── useMediaRecorder.ts  # Video recording → S3 upload
        ├── layouts/
        │   ├── AdminLayout.tsx
        │   └── CandidateLayout.tsx
        ├── pages/
        │   └── InterviewSession.tsx
        ├── store/
        │   └── useAppStore.ts       # Zustand global state + auth persistence
        └── services/
            ├── apiClient.ts         # Axios instance + 401 interceptor
            └── uploadService.ts     # S3 upload helper
```

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| email | String | unique, indexed |
| full_name | String | |
| password_hash | String | bcrypt |
| created_at | DateTime | |
| is_active | Boolean | default true |

### `jobs`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| title | String | |
| department | String | |
| skills | String | |
| interview_type | String | `async` or `live` |
| min_score | Integer | |
| questions | JSON | `[{id, text, allowFollowup}]` |
| notifications | JSON | `{email, sms, wa}` |
| created_at | DateTime | |

### `interviews`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | → users.id |
| job_id | UUID (FK) | → jobs.id (nullable) |
| twilio_room_sid | String | unique, nullable |
| status | Enum | `scheduled`, `in_progress`, `completed`, `failed` |
| started_at | DateTime | nullable |
| ended_at | DateTime | nullable |
| s3_video_url | String | nullable |
| ai_score | Float | nullable, 0–100 |

### `transcripts`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| interview_id | UUID (FK) | → interviews.id, indexed |
| speaker | Enum | `human` or `ai` |
| text_content | Text | |
| timestamp | DateTime | |
| confidence_score | Float | nullable |

---

## API Reference

### REST Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Register user, return JWT |
| POST | `/api/v1/auth/login` | — | Verify credentials, return JWT |
| GET | `/api/v1/interviews` | — | List all interviews (with user + job join) |
| POST | `/api/v1/interviews/{id}/join` | Bearer JWT | Provision Twilio room, set status `in_progress` |
| POST | `/api/v1/interviews/{id}/video-upload-url` | Bearer JWT | Return S3 presigned PUT URL |
| POST | `/api/v1/interviews/{id}/finalize-video` | Bearer JWT | Save S3 URL, launch async scoring job |
| POST | `/api/v1/jobs` | Bearer JWT | Create job posting |
| GET | `/api/v1/jobs` | — | List all jobs |

### WebSocket Endpoint

**`/ws/interviews/{interview_id}/stream`**

```
Client                          Server
  |                               |
  |── (open connection) ─────────>|
  |                               |
  |── M1: authenticate ──────────>|  {type:"authenticate", token:"<jwt>"}
  |                               |  ← verifies JWT, checks interview DB
  |                               |
  |── M2: start_stream ──────────>|  {type:"start_stream", sample_rate:16000}
  |                               |  ← opens Gemini Live session
  |                               |
  |── audio chunks ──────────────>|  {type:"audio", data:"<base64 PCM16>"}
  |<── binary audio frames ───────|  raw Int16 PCM bytes from Gemini
  |<── ai_response text ──────────|  {type:"ai_response", transcript:"..."}
  |                               |
  |── stop_stream ───────────────>|  {type:"stop_stream"}
  |                               |  ← Gemini session closed, scoring queued
```

---

## Systems in Detail

### 1. Authentication System

- **JWT (HS256)**: 24-hour tokens signed with `JWT_SECRET_KEY`. Contains only `user_id` and `exp`.
- **Passwords**: bcrypt via `passlib.CryptContext`.
- **REST protection**: `Depends(verify_jwt)` FastAPI dependency on write endpoints. Read endpoints (`GET /interviews`, `GET /jobs`) are open.
- **WebSocket auth**: First WebSocket message must be a `{type: "authenticate", token}` frame. Token verified before any session state is allocated.
- **Frontend persistence**: Zustand `persist` middleware stores JWT in `localStorage`. Axios interceptor attaches `Authorization: Bearer <token>` on all requests. 401 response triggers automatic logout and redirect to `/login`.
- **Roles**: `admin`, `reviewer`, `candidate` roles are client-side only. The backend does not enforce roles — all valid JWTs have equal access to all protected endpoints.

---

### 2. AI Engine (Live Interview)

**File**: `app/services/ai.py` — `AIEngineService`

Uses the `google.genai` **Multimodal Live API** with model `gemini-2.0-flash`.

The service runs two concurrent async tasks within a single Gemini session:

**Ingress task** (browser → Gemini):
1. Reads JSON frames `{type:"audio", data:"<base64>"}` from the WebSocket
2. Decodes base64 to raw bytes
3. Sends to Gemini as `mime_type="audio/pcm;rate=16000"`

**Egress task** (Gemini → browser):
1. Receives `server_content` events from Gemini
2. If audio `inline_data`: sends raw bytes as binary WebSocket frame
3. If text part: pushes to transcript queue and sends `{type:"ai_response", transcript}` JSON frame

Both tasks run concurrently with `asyncio.wait(FIRST_COMPLETED)`. On upstream error, sends `{type:"ai_disconnect"}` to the browser and retries once after a 2-second delay.

**System prompt** (`app/services/system_instruction.py`):
- Strict professional recruiter persona
- Mandated minimum 10 primary questions
- STAR method structuring
- Anti-prompt-injection guardrails
- Follow-up probing behavior

---

### 3. Audio Pipeline (Browser)

**Ingress** (`useAudioIngress.ts` + `useMicrophoneStream.ts`):
```
getUserMedia() → AudioContext (16 kHz) → ScriptProcessorNode (4096 buffer)
→ Float32Array → downsample to 16 kHz → Int16Array → base64 → WebSocket JSON
```

**Egress** (`useAudioEgress.ts`):
```
WebSocket binary frame (ArrayBuffer) → Int16Array → Float32Array
→ AudioBuffer (16 kHz) → AudioBufferSourceNode → scheduled gapless playback
```

Gapless playback uses a `nextPlayTimeRef` cursor — each buffer is scheduled at `source.start(nextPlayTime)` and `nextPlayTime` advances by the buffer duration, preventing clicks and dropouts.

---

### 4. Transcript Persistence

**File**: `app/services/worker.py` — `TranscriptWorker`

An asyncio background task (started at server startup via FastAPI lifespan) that:
- Drains a shared `asyncio.Queue` in batches of up to 10
- Flushes every 3 seconds using `asyncio.wait_for(..., timeout=3.0)`
- Bulk-inserts to the `transcripts` table
- Retries up to 3 times on `DBAPIError`

This decouples the latency-sensitive WebSocket path from synchronous DB writes.

---

### 5. Video Recording and Storage

**Async interview flow** (`AsyncInterviewRoom.tsx` + `useMediaRecorder.ts`):

1. `MediaRecorder` records as `video/webm;codecs=vp9,opus`, chunk interval 250ms
2. On stop: assembles `Blob`, calls `POST /api/v1/interviews/{id}/video-upload-url`
3. Backend calls `StorageService.get_upload_url()` — uses AWS STS `assume_role()` to get temporary credentials scoped to the target S3 key, then generates a 15-minute presigned PUT URL
4. Browser PUTs blob **directly to S3** (backend never touches the video bytes)
5. Browser calls `POST /api/v1/interviews/{id}/finalize-video` with the S3 URL
6. Backend saves `s3_video_url`, fires `asyncio.create_task(calculate_ai_score(...))`

---

### 6. AI Scoring

**File**: `app/services/scoring.py` — `calculate_ai_score()`

Runs after interview completion (triggered by finalize-video or WebSocket stop):

1. Fetches all transcripts for the interview, ordered by timestamp
2. Formats conversation as `[AI]: ...` / `[HUMAN]: ...` text block
3. Calls `gemini-2.5-pro-preview-03-25` with a structured rubric:
   - Technical Depth & Accuracy — 40 pts
   - Problem-Solving & Critical Thinking — 25 pts
   - Communication Clarity — 20 pts
   - Proactivity & Initiative — 15 pts
4. Parses integer response 0–100, stores in `interviews.ai_score`, sets status `completed`

**Structured scorecard** (`app/services/evaluation_service.py`):
Uses `response_schema=InterviewEvaluationSchema` for structured JSON output with per-competency breakdowns, communication assessment, identified red flags, and executive summary.

---

### 7. Twilio Video System

**File**: `app/services/twilio.py` — `TwilioService`

All Twilio SDK calls (which are blocking) run in `asyncio.to_thread()`.

- `create_video_room(room_name)`: Creates a Programmable Video room. On error code 53113 (room already exists), appends a UUID suffix and retries once.
- `generate_access_token(identity, room_name)`: Creates a Twilio `AccessToken` with `VideoGrant`, returning the JWT string for the frontend Twilio SDK to use.
- `complete_video_room(room_sid)`: Force-completes a room (used in orphan cleanup).

The frontend uses `twilio-video` SDK to connect to the room, attach local camera/microphone tracks, and display remote participant tracks — providing a video conferencing layer alongside the AI audio stream.

---

### 8. Orphan Interview Cleanup

**File**: `app/services/worker.py` — `cleanup_orphans()`

Runs every 15 minutes as a background asyncio task:

1. Queries for interviews with `status = 'in_progress'` and `started_at < now() - 2 hours`
2. For each orphaned interview:
   - Calls `TwilioService.complete_video_room()` to release the Twilio resource
   - Sets `interview.status = 'failed'`, `interview.ended_at = now()`
3. Commits to DB

This handles network failures, browser crashes, and abandoned sessions.

---

### 9. Rate Limiting

**File**: `app/core/limiter.py`

Two in-memory sliding-window token-bucket instances:
- `join_limiter`: 100 requests/hour per user ID (for `POST /interviews/{id}/join`)
- `ws_limiter`: 100 connections/minute per client IP (for WebSocket endpoint)

Note: The HTTP 429 enforcement (`raise HTTPException`) is currently commented out in the route handlers — the limiter logic exists but is not active.

---

## Key Workflows

### Live Interview (End-to-End)

```
1. Register / Login
       ↓
2. POST /interviews/{id}/join
   ← Twilio room created, Access Token returned
       ↓
3. Frontend connects to Twilio video room (WebRTC)
       ↓
4. Frontend opens WS /ws/interviews/{id}/stream
   → M1 authenticate  → M2 start_stream
   ← Gemini Live session opens
       ↓
5. Bidirectional audio streaming
   Mic → PCM → WS → Gemini → PCM → WS → AudioContext
   Transcripts → asyncio.Queue → TranscriptWorker → DB
       ↓
6. Candidate stops interview
   → stop_stream / WS close
   → asyncio.create_task(calculate_ai_score())
       ↓
7. Gemini 2.5 Pro scores transcript 0–100
   → interviews.ai_score updated, status = completed
       ↓
8. Admin reviews on Dashboard / CandidateReviewPanel
```

### Async Interview (End-to-End)

```
1. Candidate views question (from job.questions)
       ↓
2. 2-minute recorded response via MediaRecorder
       ↓
3. POST /interviews/{id}/video-upload-url
   ← Presigned S3 PUT URL (via STS assume_role, 15min expiry)
       ↓
4. Browser PUTs video blob directly to S3
       ↓
5. POST /interviews/{id}/finalize-video (with S3 URL)
   → asyncio.create_task(calculate_ai_score())
       ↓
6. HR reviews in CandidateReviewPanel with video playback + scorecard
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy URL (`sqlite+aiosqlite:///./test.db` for dev) |
| `JWT_SECRET_KEY` | HMAC-SHA256 signing key |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRY_HOURS` | Token lifetime (default 24) |
| `TWILIO_ACCOUNT_SID` | Twilio project SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_API_KEY` | Twilio API Key SID (for Access Tokens) |
| `TWILIO_API_SECRET` | Twilio API Key secret |
| `GEMINI_API_KEY` | Google AI Studio key (`"dummy"` → mock mode) |
| `AWS_ACCESS_KEY_ID` | IAM user key for S3 access |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `S3_BUCKET_NAME` | Target S3 bucket for video uploads |
| `AWS_ROLE_ARN` | IAM role ARN for scoped STS assumption |

---

## Frontend Pages and Routing

| Route | Component | User |
|---|---|---|
| `/login` | `Login.tsx` | All |
| `/register` | `Register.tsx` | All |
| `/admin` | `Dashboard.tsx` | admin, reviewer |
| `/admin/jobs/new` | `JobBuilder.tsx` | admin |
| `/admin/review/:id` | `CandidateReviewPanel.tsx` | admin, reviewer |
| `/admin/board` | `CollaborationBoard.tsx` | admin, reviewer |
| `/interview/:id` | `InterviewSession.tsx` | candidate |
| `/interview/:id/live` | `LiveAIInterviewRoom.tsx` | candidate |
| `/interview/:id/async` | `AsyncInterviewRoom.tsx` | candidate |
| `/system-check` | `SystemCheck.tsx` | candidate |

---

## Development Setup

```bash
# Backend
pip install -r requirements.txt
cp .env.example .env   # fill in credentials
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev            # starts on port 3000, proxies /api and /ws to :8000
```

SQLite schema is created automatically on first startup via `Base.metadata.create_all()` in the FastAPI lifespan handler.
