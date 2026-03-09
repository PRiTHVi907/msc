# AI Interview Platform Backend

A real-time, asynchronous FastAPI backend designed to orchestrate low-latency AI engineering interviews using the **Gemini Multimodal Live API**, **Twilio Programmable Video**, and **AWS S3** for persistent storage.

## Features
- **Phase 1:** Asynchronous PostgreSQL (asyncpg/SQLAlchemy) configuration and Twilio room provisioning.
- **Phase 2:** Sub-500ms bidirectional PCM audio WebSockets directly piping human speech to the Gemini Live API.
- **Phase 3:** Non-blocking background workers draining the AI transcript queue, alongside boto3 AWS S3 pre-signed URL generation for video records.
- **Phase 4:** Production hardening with custom in-memory token-bucket rate limiters, JWT Bearer verification, and graceful shutdown hooks for orphan Twilio room cleanup.

## Setup

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate the `.env` file with your **confidential** keys. Do **NOT** commit `.env` into version control.

### Required Confidential Keys:
- `DATABASE_URL`: Your asyncpg Postgres URL string.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`: Twilio console credentials.
- `JWT_SECRET_KEY`: A strong, randomly generated string used to sign your authorization tokens.
- `GEMINI_API_KEY`: Your private Google Gemini Multi-Modal Live API token.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ROLE_ARN`: AWS IAM tokens with permission to `s3:PutObject`.

3. Install requirements and run the backend via Uvicorn:
   ```bash
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```