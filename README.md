# AI.nterview Backend - Real-Time Voice Recruiter

A high-performance, asynchronous FastAPI backend designed to power autonomous voice-based engineering interviews. This platform leverages **Retell AI** for voice orchestration, **Groq/Llama-3** for ultra-low latency intelligence, and **SQLAlchemy** for persistent state management.

## 🚀 Key Features

*   **Real-Time Voice Conversational AI:** Low-latency bidirectional speech processing via Retell AI WebSockets.
*   **Elite Recruiter Personas:** Dynamic prompt engineering grounded in specific candidate CVs (e.g., Alex Mercer - Head of Marketing).
*   **Structured AI Scoring:** Automated post-interview evaluation pipeline using LLM-based rubric analysis (0-100 score).
*   **Asynchronous Orchestration:** Non-blocking FastAPI routers handling auth, job management, and webhook integration.
*   **Security First:** JWT Bearer authentication, rate limiting, and encrypted environment configuration.

## 🛠️ Tech Stack

*   **Backend:** FastAPI (Python 3.10+)
*   **Voice Engine:** Retell AI SDK
*   **Intelligence:** Groq (Llama-3.3-70b) / OpenAI SDK
*   **Database:** SQLite (Development) / PostgreSQL (Production) with SQLAlchemy/asyncpg
*   **Auth:** JWT (Jose) + bcrypt

## ⚙️ Setup & Installation

### 1. Prerequisite Accounts
*   **Retell AI:** Get an API Key and create an Agent.
*   **Groq Cloud:** (Optional, for 0-latency free tier) Get an API key.
*   **OpenAI:** (Alternative) Get an API key.

### 2. Environment Configuration
Copy the `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```
*   `OPENAI_API_KEY`: Your Groq or OpenAI key.
*   `RETELL_API_KEY`: Your Retell API key.
*   `RETELL_AGENT_ID`: Your target Retell Agent ID.

### 3. Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run the server with reload
python -m uvicorn main:app --reload --port 8000
```

### 4. Tunneling for Retell Webhooks
Since Retell needs to reach your local server for the LLM WebSocket:
```bash
ngrok http 8000
```
*Set your **Custom LLM URL** in the Retell Dashboard to:*  
`wss://[your-ngrok-url].ngrok-free.app/api/v1/retell/llm-websocket`

## 📡 API Endpoints

*   `POST /api/v1/interviews/join`: Provisions a fresh voice session and returns highly-secure access tokens.
*   `POST /api/v1/retell/webhook`: Handles the `call_analyzed` event to persist transcripts and trigger AI scoring.
*   `WS /api/v1/retell/llm-websocket`: The real-time brain of the agent handling the conversation stream.

---
Built with ⚡ by Antigravity for the next generation of recruiting.