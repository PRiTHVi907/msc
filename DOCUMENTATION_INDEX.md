# MSC AI Interview Platform - Documentation Index

## 📚 Complete Documentation Suite

This project includes comprehensive documentation covering all aspects of the system. Use this index to navigate.

---

## 📖 Available Documents

### 1. **PROJECT_OVERVIEW.md** 
**Reference for:** System architecture, high-level design, components, database schema, APIs

**Contains:**
- ✅ High-level architecture diagram
- ✅ Technology stack (all 9 backend + 9 frontend dependencies)
- ✅ Complete file structure with descriptions
- ✅ Data flow through all 5 phases
- ✅ Core services breakdown (AIEngineService, TwilioService, StorageService, etc.)
- ✅ Database entity-relationship diagram
- ✅ REST API endpoint reference
- ✅ WebSocket protocol specification
- ✅ Environment configuration guide
- ✅ Monitoring & logging details
- ✅ Future enhancement ideas

**When to use:**
- Understanding project architecture
- Explaining to stakeholders
- Adding new features
- Debugging specific components

---

### 2. **TOOLS_AND_DEPENDENCIES.md**
**Reference for:** Tech stack deep-dive, integration points, debugging

**Contains:**
- ✅ FastAPI (web framework details)
- ✅ Uvicorn (ASGI server)
- ✅ SQLAlchemy + asyncpg (ORM & DB driver)
- ✅ Pydantic (validation & configuration)
- ✅ Twilio SDK (video provisioning & tokens)
- ✅ Google GenAI SDK (Gemini Live API)
- ✅ boto3 (AWS S3 presigned URLs)
- ✅ PyJWT (authentication tokens)
- ✅ React, Zustand, React Router (frontend)
- ✅ Tailwind CSS, TypeScript, Vite (frontend tools)
- ✅ Integration points between all tools
- ✅ Startup sequences
- ✅ Performance optimization strategies
- ✅ Development tools & debugging

**When to use:**
- Learning how tools integrate
- Troubleshooting specific service (Twilio, Gemini, S3, etc.)
- Optimizing performance
- Adding new dependencies
- Understanding state management

---

### 3. **WORKFLOW_SEQUENCES.md**
**Reference for:** Detailed workflows, sequence diagrams, timing metrics, error handling

**Contains:**
- ✅ Phase 1: Registration & browsing workflow
- ✅ Phase 2: Interview room provisioning (join flow)
- ✅ Phase 3: WebSocket authentication
- ✅ Phase 4: Live bidirectional audio stream (ingress ↔ egress)
- ✅ Phase 5: Background transcript persistence
- ✅ Phase 6: Interview completion & cleanup
- ✅ Phase 7: AI scoring (background task)
- ✅ Concurrent task management diagram
- ✅ Error handling flows (WebSocket, DB, API errors)
- ✅ API call trace example (end-to-end)
- ✅ Performance metrics & timings
- ✅ All timing/latency data

**When to use:**
- Tracing a specific user action end-to-end
- Understanding timing & performance
- Debugging workflow issues
- Adding logging/observability
- Understanding concurrency model
- Error handling reference

---

## 🎯 Quick Start by Role

### 👨‍💼 **Project Manager / Stakeholder**
Start with: **PROJECT_OVERVIEW.md**
- Read: Technology Stack section
- Read: Architecture section
- Skim: Key Metrics & Performance section

---

### 👨‍💻 **Backend Developer**
1. Start: **PROJECT_OVERVIEW.md** (Core Components section)
2. Then: **TOOLS_AND_DEPENDENCIES.md** (all backend sections)
3. Reference: **WORKFLOW_SEQUENCES.md** (error handling flow)

**Key files to understand:**
- `main.py` - FastAPI initialization
- `app/services/ai.py` - Gemini orchestration
- `app/services/worker.py` - Background tasks
- `app/api/stream.py` - WebSocket handler

---

### 👩‍💻 **Frontend Developer**
1. Start: **PROJECT_OVERVIEW.md** (Frontend Architecture & WebSocket Protocol)
2. Then: **TOOLS_AND_DEPENDENCIES.md** (React, Zustand, Tailwind sections)
3. Reference: **WORKFLOW_SEQUENCES.md** (Phase 3-4 for WebSocket)

**Key files to understand:**
- `frontend/src/App.tsx` - Root component & routing
- `frontend/src/components/LiveAIInterviewRoom.tsx` - Main interview UI
- `frontend/src/store/useAppStore.ts` - State management
- `frontend/src/hooks/use*.ts` - Audio/video capture

---

### 🔧 **DevOps / Infrastructure Engineer**
1. Start: **PROJECT_OVERVIEW.md** (Configuration section)
2. Then: **TOOLS_AND_DEPENDENCIES.md** (Uvicorn, Performance, Startup)
3. Reference: **WORKFLOW_SEQUENCES.md** (Phase 5, error handling)

**Key considerations:**
- Database connection pooling (10 connections)
- Background worker tasks (start on startup, cancel on shutdown)
- WebSocket rate limiting
- Presigned URL expiry (15 minutes for S3)
- JWT token expiry (1 hour for Twilio)

---

### 🐛 **QA / Testing**
1. Start: **WORKFLOW_SEQUENCES.md** (all phases)
2. Then: **PROJECT_OVERVIEW.md** (API Endpoints & Database Schema)
3. Reference: **TOOLS_AND_DEPENDENCIES.md** (error handling)

**Test scenarios to cover:**
- Valid JWT vs invalid JWT
- Rate limiting (10 req/sec per user)
- WebSocket disconnect/reconnect
- Gemini API failures (model not found)
- Database connection pool exhaustion
- S3 upload URL expiry

---

### 🔍 **Security Engineer**
1. Sections to review:
   - **PROJECT_OVERVIEW.md**: 🔐 Configuration & Environment
   - **TOOLS_AND_DEPENDENCIES.md**: PyJWT section
   - **WORKFLOW_SEQUENCES.md**: Error handling flow

**Security checklist:**
- ✅ JWT secret key (strong, random)
- ✅ CORS middleware configured
- ✅ Rate limiting enabled
- ✅ AWS IAM roles with least privilege
- ✅ S3 presigned URLs with 15-min expiry
- ✅ Twilio tokens with 1-hour expiry
- ✅ `.env` not committed to version control
- ✅ WebSocket authentication required

---

## 🗂️ File Organization Reference

```
Backend Structure:
├── main.py                    # FastAPI app entry
├── requirements.txt           # Python dependencies
├── .env                      # Environment variables (SECRET!)
│
├── app/
│   ├── __init__.py
│   │
│   ├── api/                  # REST & WebSocket endpoints
│   │   ├── auth.py           # Login/registration
│   │   ├── interviews.py     # Interview CRUD & join
│   │   ├── jobs.py           # Job management
│   │   └── stream.py         # WebSocket handler
│   │
│   ├── core/                 # Core utilities
│   │   ├── config.py         # Settings (Pydantic)
│   │   ├── auth.py           # JWT verification
│   │   ├── database.py       # SQLAlchemy setup
│   │   ├── exceptions.py     # Error handlers
│   │   └── limiter.py        # Rate limiting
│   │
│   ├── models/               # Database models
│   │   └── models.py         # User, Job, Interview, Transcript
│   │
│   ├── schemas/              # Request/response validation
│   │   └── schemas.py        # Pydantic models
│   │
│   └── services/             # Business logic
│       ├── ai.py             # AIEngineService (Gemini)
│       ├── twilio.py         # TwilioService (Video rooms)
│       ├── storage.py        # StorageService (S3)
│       ├── worker.py         # TranscriptWorker (background)
│       ├── scoring.py        # AI evaluation
│       ├── system_instruction.py  # Recruiter prompt
│       └── evaluation_service.py   # Scoring logic

Frontend Structure:
├── package.json              # npm dependencies
├── vite.config.ts           # Build config
├── tsconfig.json            # TypeScript config
│
└── src/
    ├── main.tsx             # React entry
    ├── App.tsx              # Root component & routing
    │
    ├── components/          # UI components
    │   ├── LiveAIInterviewRoom.tsx
    │   ├── Dashboard.tsx
    │   ├── JobBuilder.tsx
    │   └── ... others
    │
    ├── hooks/               # Custom React hooks
    │   ├── useAudioIngress.ts
    │   ├── useAudioEgress.ts
    │   ├── useMicrophoneStream.ts
    │   └── useMediaRecorder.ts
    │
    ├── layouts/             # Page layouts
    │   ├── AdminLayout.tsx
    │   └── CandidateLayout.tsx
    │
    ├── store/               # Zustand state
    │   └── useAppStore.ts
    │
    └── services/            # API clients
        └── uploadService.ts
```

---

## 🔑 Key Concepts

### Real-time Audio Streaming
- PCM16 @ 16kHz mono
- Base64 encoded in JSON frames
- <500ms end-to-end latency
- Bidirectional (candidate ↔ AI)

### Interview Phases
1. **Registration** - User creates account
2. **Provisioning** - Twilio room created, token issued
3. **Authentication** - JWT verified over WebSocket
4. **Stream** - Live audio exchange with Gemini
5. **Recording** - Video stored in S3
6. **Scoring** - AI evaluates candidate

### Background Processing
- TranscriptWorker batches 10 items every 3 seconds
- Non-blocking (interview continues during DB inserts)
- Cleanup worker removes orphaned rooms every 15 minutes
- Both tasks cancel gracefully on server shutdown

### Authentication
- **REST APIs**: Bearer JWT in Authorization header
- **WebSocket**: JWT in first message (M1)
- **Twilio**: Access token with 1-hour expiry
- **S3**: Presigned URLs with 15-minute expiry

---

## 🚀 Common Tasks

### Add a New API Endpoint
1. Define Pydantic schema in `app/schemas/schemas.py`
2. Create route in appropriate `app/api/*.py` file
3. Use `@Depends(get_db)` & `@Depends(verify_jwt)` for guards
4. Reference: **PROJECT_OVERVIEW.md** → API Endpoints section

### Fix Gemini API Error
1. Check error in `debug_ws.txt` or `gemini_log.txt`
2. Reference: **TOOLS_AND_DEPENDENCIES.md** → Google GenAI SDK section
3. Check available models in **PROJECT_OVERVIEW.md** → Core Components

### Debug WebSocket Connection
1. Check `debug_ws.txt` for connection logs
2. Review Phase 3 in **WORKFLOW_SEQUENCES.md**
3. Check rate limiting in `app/core/limiter.py`
4. Verify JWT token validity

### Optimize Database Performance
1. Check query in section: **TOOLS_AND_DEPENDENCIES.md** → SQLAlchemy
2. Add index to `models.py` if needed
3. Review batch sizes in `app/services/worker.py` (current: 10 items)

### Deploy to Production
1. Review configuration checklist in **PROJECT_OVERVIEW.md** → Configuration
2. Set all `.env` variables
3. Configure database connection pooling (see notes)
4. Enable rate limiting in production mode
5. Monitor logs from all 3 files: `gemini_log.txt`, `debug_ws.txt`

---

## 📞 Troubleshooting Quick Reference

| Problem | Reference | Solution |
|---------|-----------|----------|
| "Model not found" | TOOLS_AND_DEPENDENCIES (#7) | Update model name to `gemini-2.0-flash` |
| WebSocket auth fails | WORKFLOW_SEQUENCES (Phase 3) | Check JWT validity, Bearer format |
| Transcript not saving | WORKFLOW_SEQUENCES (Phase 5) | Check TranscriptWorker in logs |
| S3 upload fails | PROJECT_OVERVIEW (API Endpoints) | Verify AWS credentials, presigned URL expiry |
| AI responds slowly | WORKFLOW_SEQUENCES (Timing metrics) | Check network latency, Gemini API status |
| Rate limit exceeded | TOOLS_AND_DEPENDENCIES (limiter.py) | Wait 1 second, retry request |

---

## 📊 Documentation Statistics

- **Lines of Code**: ~2,000 (backend) + ~1,500 (frontend)
- **API Endpoints**: 9 REST + 1 WebSocket
- **Database Tables**: 4 (users, jobs, interviews, transcripts)
- **External APIs**: 3 (Twilio, Gemini, AWS S3)
- **Background Tasks**: 2 (TranscriptWorker, cleanup)
- **Frontend Components**: 8+
- **Custom Hooks**: 4
- **Dependencies**: 18 total (9 backend + 9 frontend)

---

## 🎓 Learning Path

**If you're new to this project, follow this sequence:**

1. **Day 1**: Read **PROJECT_OVERVIEW.md** (1-2 hours)
   - Focus: Architecture, components, database schema

2. **Day 2**: Read **TOOLS_AND_DEPENDENCIES.md** (1-2 hours)
   - Focus: Your stack (backend or frontend)
   - Run: Backend startup & test connections

3. **Day 3**: Read **WORKFLOW_SEQUENCES.md** (1-2 hours)
   - Focus: Complete workflow end-to-end
   - Debug: Run a live interview session, check logs

4. **Day 4+**: Hands-on
   - Make a small change
   - Reference specific documentation sections
   - Run tests, check logs

---

## 📝 Document Maintenance

These documents were created to capture the **complete architecture and workflow** of the MSC AI Interview Platform.

**Last Updated**: March 9, 2026

**Topics Covered**:
- ✅ 11 major dependencies (backend + frontend)
- ✅ 7-phase interview workflow
- ✅ Database schema & relationships
- ✅ 9 REST API endpoints
- ✅ WebSocket protocol specification
- ✅ Error handling strategies
- ✅ Performance metrics
- ✅ Background job processing
- ✅ Security & authentication
- ✅ Troubleshooting guides

---

## 🔗 Related Files in Repository

- `README.md` - Original project README
- `requirements-txt` - Python dependencies
- `frontend/package.json` - npm dependencies
- `.env` - Configuration (do not commit!)
- `gemini_log.txt` - Gemini session logs
- `debug_ws.txt` - WebSocket connection logs
- `client_out.txt` - Frontend output
- Test files: `test_*.py` - Integration tests for APIs

---

**Happy coding! 🚀**

For questions or updates to this documentation, refer to the specific document sections mentioned in the troubleshooting table.
