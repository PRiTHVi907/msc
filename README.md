# AI.nterview - Real-Time Voice Recruiter Platform

A high-performance, full-stack platform for autonomous voice-based engineering interviews. Features a FastAPI backend with real-time WebSocket communication via **Retell AI**, intelligent LLM responses using **Groq/Llama-3**, and a modern React TypeScript frontend.

## 🚀 Key Features

*   **Real-Time Voice Conversational AI:** Low-latency bidirectional speech processing via Retell AI WebSockets.
*   **Elite Recruiter Personas:** Dynamic prompt engineering grounded in specific candidate CVs.
*   **Structured AI Scoring:** Automated post-interview evaluation pipeline using LLM-based rubric analysis.
*   **Async Backend:** Non-blocking FastAPI routers handling auth, job management, and webhook integration.
*   **Modern Frontend:** React 19 + TypeScript with Vite, drag-and-drop collaboration board, real-time interview rooms.
*   **Security First:** JWT authentication, rate limiting, CORS protection, and encrypted secrets.

## 🛠️ Tech Stack

### Backend
*   **Framework:** FastAPI (Python 3.10+)
*   **Voice Engine:** Retell AI SDK
*   **Intelligence:** Groq (Llama-3.3-70b) or OpenAI
*   **Database:** SQLite (dev) / PostgreSQL (prod) with SQLAlchemy ORM + asyncpg
*   **Auth:** JWT + bcrypt password hashing

### Frontend
*   **Framework:** React 19 with TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS 4
*   **State:** Zustand
*   **UI Components:** Lucide React icons, @dnd-kit for drag-and-drop

## 📋 Prerequisites

Before running locally, ensure you have:

- **Node.js** (v18+) and **npm** / **yarn**
- **Python** (v3.10+)
- **Git**
- **ngrok** (for local webhook tunneling to Retell AI)

### Third-Party API Keys

1. **Retell AI** ([https://retell.cc](https://retell.cc))
   - Sign up and create an account
   - Create an Agent in the dashboard
   - Note your API Key and Agent ID

2. **Groq Cloud or OpenAI API**
   - **Groq** (recommended for free tier): [https://console.groq.com](https://console.groq.com)
   - **OpenAI**: [https://platform.openai.com](https://platform.openai.com)
   - Get your API key

## ⚙️ Local Setup Instructions

### Step 1: Clone the Repository
```bash
git clone https://github.com/PRiTHVi907/msc.git
cd msc
```

### Step 2: Backend Setup

#### 2a. Create Python Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### 2b. Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### 2c. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
DATABASE_URL=sqlite+aiosqlite:///./ai_interview.db

JWT_SECRET_KEY=your_strong_random_secret_here_min_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24

OPENAI_API_KEY=your_groq_or_openai_api_key
RETELL_API_KEY=your_retell_api_key
RETELL_AGENT_ID=your_retell_agent_id
```

#### 2d. Start the Backend Server
```bash
python -m uvicorn main:app --reload --port 8000
```

The backend will be available at: `http://localhost:8000`

**API Documentation:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Step 3: Frontend Setup

#### 3a. Install Frontend Dependencies
Open a **new terminal** and navigate to the frontend directory:
```bash
cd frontend
npm install
```

#### 3b. Start the Development Server
```bash
npm run dev
```

The frontend will typically run on: `http://localhost:5173`

**Available scripts:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Step 4: Configure Retell AI Webhook (for local development)

Since Retell AI needs to reach your local server for the LLM WebSocket, use **ngrok** for tunneling:

#### 4a. Start ngrok
```bash
ngrok http 8000
```

This will output a URL like: `https://xxxx-xxx-xxx-xxx.ngrok-free.app`

#### 4b. Update Retell Dashboard
1. Log in to your [Retell AI Dashboard](https://retell.cc/dashboard)
2. Select your Agent
3. Set **Custom LLM URL** to:
   ```
   wss://xxxx-xxx-xxx-xxx.ngrok-free.app/api/v1/retell/llm-websocket
   ```
4. Save changes

## 🚀 Running the Full Stack Locally

### Terminal 1: Backend
```bash
source venv/bin/activate  # Activate virtual environment
python -m uvicorn main:app --reload --port 8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

### Terminal 3: Webhook Tunneling (if testing webhooks)
```bash
ngrok http 8000
```

Now open your browser to `http://localhost:5173` and start using the platform!

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new candidate
- `POST /api/v1/auth/login` - Login and get JWT token

### Interviews
- `GET /api/v1/interviews` - List all interviews (public endpoint ⚠️)
- `POST /api/v1/interviews/{interview_id}/join` - Join an interview (requires auth)

### Jobs
- `POST /api/v1/jobs` - Create a job posting (requires auth)
- `GET /api/v1/jobs` - List all job postings (public endpoint ⚠️)

### Webhooks
- `POST /api/v1/retell/webhook` - Retell AI webhook (HMAC signed)
- `WS /api/v1/retell/llm-websocket/{call_id}` - Real-time LLM conversation stream

## 📊 Database Initialization

The database tables are automatically created on first server startup via SQLAlchemy migrations in `main.py`.

To **reset the database** (development only):
```bash
rm ai_interview.db  # Delete the SQLite file
# Restart the server - a fresh db will be created
```

## 🧪 Testing

Run the test suite:
```bash
pytest tests/ -v
```

Run specific test file:
```bash
pytest tests/test_auth.py -v
```

## 🔒 Security Notes

⚠️ **Current Issues (to be fixed):**
- GET `/api/v1/interviews` is publicly exposed (should require auth)
- GET `/api/v1/jobs` is publicly exposed (should require auth)
- WS `/api/v1/retell/llm-websocket` lacks call_id validation (should validate authorization)
- CORS is set to `allow_origins=["*"]` (should restrict to known frontend domains)
- OpenAPI docs are public in development (disable in production with `docs_url=None`)

**Production Recommendations:**
1. Use HTTPS/WSS only
2. Set `JWT_SECRET_KEY` to a strong random string (min 32 chars)
3. Use PostgreSQL instead of SQLite
4. Restrict CORS to your frontend domain
5. Disable OpenAPI documentation (`docs_url=None` in FastAPI())
6. Implement rate limiting on auth endpoints
7. Add request validation for all external webhooks

## 📁 Project Structure

```
msc/
├── app/
│   ├── api/              # API routers (auth, interviews, jobs, webhooks)
│   ├── core/             # Core logic (auth, config, database, LLM)
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic request/response schemas
│   └── services/         # Business logic (scoring, Retell integration)
├── frontend/             # React TypeScript Vite app
│   └── src/
│       ├── components/   # Reusable React components
│       ├── pages/        # Page-level components
│       ├── services/     # API client, upload service
│       └── store/        # Zustand state management
├── tests/                # Backend unit & integration tests
├── e2e/                  # End-to-end Playwright tests
├── main.py               # FastAPI app entry point
├── requirements.txt      # Python dependencies
└── .env.example          # Environment variables template
```

## 🎯 Development Workflow

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make changes** to backend (`app/`) or frontend (`frontend/src/`)
3. **Test locally** - Run backend tests and frontend dev server
4. **Commit**: `git commit -m "feat: describe your changes"`
5. **Push**: `git push origin feature/your-feature`
6. **Create a Pull Request** on GitHub

## 📞 Support & Debugging

### Backend Debugging
```bash
# Run with debug logging
python -m uvicorn main:app --reload --port 8000 --log-level debug
```

### Frontend Debugging
- Use React DevTools browser extension
- Check browser console (F12) for TypeScript errors
- Check network tab for API request/response

### Common Issues

**"Module not found" in backend**
```bash
pip install -r requirements.txt
```

**Port 8000 already in use**
```bash
python -m uvicorn main:app --reload --port 8001  # Use different port
```

**Frontend can't connect to backend**
- Ensure backend is running on `http://localhost:8000`
- Check CORS is not blocking requests
- Check `.env` configuration in both backend and frontend

**Retell AI fails to connect**
- Verify `RETELL_API_KEY` and `RETELL_AGENT_ID` are correct
- Check ngrok URL is updated in Retell Dashboard
- Ensure ngrok tunnel is running

## 📄 License

MIT License - see LICENSE file for details

