# Project Code Audit & Elimination Target Report 

This is an exhaustive architectural review of the AI.nterview codebase mapping exactly what lines of code exist and calling out areas that are safe to delete now that the Retell AI transition is complete.

## 1. Top-Level Backend Application (`main.py`)
- **Purpose**: Initializes the FastAPI `app` instance, mounts all modular APIRouters, configures global CORS, and handles the DB engine lifespan startup/teardown events.
- **Code Breakdown**:
  - `app.include_router(...)` integrates models.
  - `@app.on_event("startup")` fires database table creation and appends `cleanup_orphans()` to `bg_tasks`.
- **🗑️ Elimination Targets:** The `cleanup_orphans()` loop is primarily leftover logic from when Twilio WebRTC room lifecycles had to be forcefully handled by the server (stuck empty rooms billing Twilio credits permanently). With Retell SDK driving the pipeline, rooms tear themselves down automatically. You can safely remove the `cleanup_orphans` task background array and its import entirely. 

## 2. API Endpoints (`app/api/*`)
### `auth.py`
- **Purpose**: Manages `/login` and `/register` flows using `passlib` bcrypt and PyJWT hashing. Returns the newly modified schema with `interview_id`.
- **🗑️ Elimination Targets:** None. This explicitly maps user routing logic securely without DB bloating.

### `interviews.py`
- **Purpose**: Endpoints to list candidate interviews and generate `retell_call_id`.
- **🗑️ Elimination Targets:** Currently entirely clean after Phase 2 stripping.

### `webhooks.py`
- **Purpose**: Acts as the ingress collector for Retell's async LLM and voice webhooks (e.g., `call_ended`).
- **🗑️ Elimination Targets:** Ensure that `pydantic` webhook schema parameters possess `model_config = {"extra": "ignore"}` to drop bloated LLM trace metadata Retell constantly fires in webhook bodies.

### `jobs.py`
- **Purpose**: CRUD for HR admins fetching Jobs schemas.

## 3. Worker & Core Services (`app/services/*`)
### `worker.py` (Background Jobs)
- **Purpose**: A producer-consumer asynchronous batching queue system utilizing `asyncio.Queue` designed to dump `Transcript` shards directly into the Postgres/SQLite database in bulk without locking UI threads.
- **🗑️ Elimination Targets:** Cleaned the Twilio teardown functions; `cleanup_orphans()` should be axed entirely from this file. The legacy `TranscriptWorker` loop can remain, but verify if Retell's new "Transcript Analysis" webhook entirely replaces the need for granular text dumps.

### `retell_service.py`
- **Purpose**: Central HTTP client for the Retell SDK provisioning WebCall instances for the frontend JS SDK client. Contains dev environment exception bypasses.
- **🗑️ Elimination Targets:** Code is perfectly isolated.

### `interview_audio_engine.py`
- **Purpose**: A pristine standalone orchestration Python class wrapping Deepgram STT, Gemini LLM flash, and ElevenLabs TTS into unified IO.
- **🗑️ Elimination Targets:** This orchestration class may be dead weight / legacy experimentation since the Retell Node SDK officially handles LLM socket injection intrinsically. If Retell connects natively directly to Gemini via Webhooks, this entire orchestration chunk and its pip dependencies (`elevenlabs`, `deepgram-sdk`) could be deleted off the repository entirely.

### `scoring.py` & `evaluation_service.py`
- **Purpose**: Triggers a backend LLM pass computing a semantic interview score.

## 4. Frontend Application Map (`frontend/src/*`)
### `store/useAppStore.ts`
- **Purpose**: Zustand overarching state manager. Retains `jwt` session and global UI flags.
- **🗑️ Elimination Targets:** Ensure `audioBuffer` global variables or Twilio active room `string` types have been deleted in past stages entirely.

### `components/LiveAIInterviewRoom.tsx`
- **Purpose**: The WebRTC bridging interface that mounts the React frontend directly into the Retell agent socket using the newly generated `interview_id` mapped token.

### `components/Login.tsx`, `Dashboard.tsx`, `JobBuilder.tsx`
- **Purpose**: Visual interface arrays.
- **🗑️ Elimination Targets:** The `CandidateReviewPanel.tsx` currently imports arbitrary mock arrays if not strictly wired to `jobs.py`. `JobBuilder.tsx` can strip the "async" interview conditionally toggled selection strings if the platform commits exclusively to continuous live "Retell Live" agent sessions.

## 5. Tests & CI/CD Tooling
### Root Test Scripts (`test_server.py`, `verify_phase_*.py`, `check_live_models.py`)
- **🗑️ Elimination Targets:** There are dozens of root-level `verify_phase_1.py`, `verify_phase_3.py`, `check_live_models.py` system-check files that have accrued over multiple project development phases. Now that robust Pytest coverage was introduced cleanly inside `tests/`, **ALL** of those root experimental verification scripts (`verify_*.py`) should be immediately wiped via `.gitignore` or `rm` to strip root directory bloat.

### `tests/*`
- **Purpose:** Full integration mocking suites (`test_auth`, `test_webhooks`, `test_workers`).

## Summary of Actionable Removals:
1. Delete `app/services/interview_audio_engine.py` (**If** the system is fully operating on the unified Retell stack, we do not need native backend audio bridging logic).
2. Delete root `verify_phase_1.py` through `5` test files, `test_server.py`, and `check_live_models.py`.
3. Wipe `cleanup_orphans` from `main.py` and `worker.py`.
