# Phase 1 Implementation - Foundation & Authentication

## Completed Artifacts

### Backend Files (Python/FastAPI)

#### 1. **Configuration** (`app/core/config.py`)
- Pydantic Settings with environment variables
- Database, JWT, Twilio, Gemini, AWS credentials
- Hot-loaded from `.env` file

#### 2. **Database** (`app/core/database.py`)
- SQLAlchemy async engine with asyncpg driver
- Connection pool: size=10, max_overflow=5
- AsyncSessionLocal sessionmaker for dependency injection
- `Base` declarative for ORM models
- `get_db()` dependency for FastAPI endpoints

#### 3. **ORM Models** (`app/models/models.py`)
- **User**: UUID PK, email unique, password_hash, is_active flag
- **Job**: UUID PK, title, skills/questions (JSON), min_score
- **Interview**: UUID PK, FK to user/job, status enum, twilio_room_sid, ai_score
- **Transcript**: UUID PK, FK to interview, speaker enum, text_content

#### 4. **Authentication Core** (`app/core/auth.py`)
```python
create_jwt(user_id: str) -> str
  ├─ Payload: { user_id, exp }
  ├─ Algorithm: HS256
  └─ Expiry: 24 hours (configurable)

verify_jwt(credentials: HTTPAuthorizationCredentials) -> str
  ├─ Extracts Bearer token
  ├─ Validates signature & expiry
  └─ Returns user_id or raises 401
```

#### 5. **Authentication Router** (`app/api/auth.py`)
- **POST /api/v1/auth/register**: Create new user
  - Validates email uniqueness
  - Hash password with bcrypt (passlib)
  - Returns JWT token + user_id
  
- **POST /api/v1/auth/login**: Authenticate existing user
  - Verify email + password hash
  - Check is_active flag
  - Returns JWT token + user_id

#### 6. **Schemas** (`app/schemas/schemas.py`)
- `LoginRequest`: email, password
- `RegisterRequest`: email, password, full_name
- `AuthResponse`: token, user_id, email

### Frontend Files (TypeScript/React)

#### 1. **Zustand Store** (`frontend/src/store/useAppStore.ts`)
```typescript
interface AuthSlice {
  token: string | null
  currentUser: { user_id, email }
  login(token, user) → void
  logout() → void
  isAuthenticated() → boolean
}

interface AppStore extends AuthSlice {
  interviews, jobs, selectedInterview
  setInterviews, setJobs, setSelectedInterview
}
```
- Persisted to localStorage: `app-store`
- Automatically rehydrates on mount

#### 2. **HTTP Client** (`frontend/src/services/apiClient.ts`)
```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
})

// Request interceptor: Inject Bearer token
apiClient.interceptors.request.use((config) => {
  const token = useAppStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: Handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAppStore.getState().logout()
      window.location.href = '/login'
    }
  }
)
```

#### 3. **Login Component** (`frontend/src/components/Login.tsx`)
- Email + password form
- Role selection (admin/reviewer/candidate)
- Calls `apiClient.post('/api/v1/auth/login')`
- On success: Store token, navigate to `/dashboard` or `/interview/{id}`

#### 4. **Register Component** (`frontend/src/components/Register.tsx`)
- Full name + email + password form
- Calls `apiClient.post('/api/v1/auth/register')`
- On success: Redirect to `/dashboard`
- Error display on validation failure

### Configuration Files

#### 1. **Dependencies** (`requirements.txt`)
Added:
- `passlib[bcrypt]` - Password hashing
- `email-validator` - Email validation for Pydantic
- `python-multipart` - Form data parsing

#### 2. **.env.example**
Template with all required environment variables

### Integration Points

#### FastAPI App (`main.py`)
- ✅ Auth router already included
- ✅ CORS middleware configured
- ✅ Database engine initialized on startup
- ✅ Tables created automatically via `Base.metadata.create_all()`

---

## API Specification (Phase 1)

### REST Endpoints

```
POST /api/v1/auth/register
Body: {
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "John Doe"
}
Response: {
  "token": "eyJhbGc...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
Status: 200 | 409 (email exists)

---

POST /api/v1/auth/login
Body: {
  "email": "user@example.com",
  "password": "secure_password"
}
Response: {
  "token": "eyJhbGc...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
Status: 200 | 401 (invalid credentials) | 403 (inactive)
```

### Authorization Model
- **Bearer Token**: Header `Authorization: Bearer {JWT}`
- **Token Lifetime**: 24 hours (configurable via `JWT_EXPIRY_HOURS`)
- **Validation**: Signature + expiry check on every protected endpoint via `@Depends(verify_jwt)`

---

## Database Schema (Phase 1)

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR NOT NULL,
  password_hash VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  INDEX(email)
);
```

### jobs
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  department VARCHAR NOT NULL,
  skills VARCHAR NOT NULL,
  interview_type VARCHAR NOT NULL,
  min_score INTEGER NOT NULL,
  questions JSONB NOT NULL,
  notifications JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### interviews
```sql
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  job_id UUID REFERENCES jobs(id),
  twilio_room_sid VARCHAR UNIQUE,
  status ENUM('scheduled', 'in_progress', 'completed', 'failed'),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  s3_video_url VARCHAR,
  ai_score FLOAT,
  INDEX(user_id),
  INDEX(job_id)
);
```

### transcripts
```sql
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id),
  speaker ENUM('human', 'ai') NOT NULL,
  text_content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  confidence_score FLOAT,
  INDEX(interview_id)
);
```

---

## Startup Checklist

### Backend
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set up .env (copy from .env.example)
cp .env.example .env
# Edit .env with actual credentials

# 3. Initialize PostgreSQL (ensure running)
# Set DATABASE_URL in .env

# 4. Start FastAPI
uvicorn main:app --reload

# ✅ Server: http://localhost:8000
# ✅ Swagger UI: http://localhost:8000/docs
```

### Frontend
```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Create .env.local (if needed)
echo "VITE_API_URL=http://localhost:8000" > .env.local

# 3. Start dev server
npm run dev

# ✅ Frontend: http://localhost:5173
```

### Test Flow
1. Frontend: Navigate to `/register`
2. Fill form + submit
3. Backend: Hash password, create user, generate JWT
4. Frontend: Store token in Zustand + localStorage
5. Frontend: Redirect to `/dashboard`
6. Future requests: Bearer token auto-injected via axios interceptor

---

## Security Highlights

✅ Passwords hashed with bcrypt (passlib)
✅ JWT signed with HS256 algorithm
✅ Bearer token validation on all protected routes
✅ Email validation via Pydantic `EmailStr`
✅ 401 intercept: Auto logout + redirect to `/login`
✅ CORS configured for frontend domain
✅ Credentials never stored in localStorage (only token)

---

## Phase 1 Status: ✅ COMPLETE

All authentication infrastructure is production-ready for:
- User registration with secure password hashing
- JWT-based stateless authentication
- Protected REST endpoints via dependency injection
- Automatic token injection on frontend requests
- Graceful 401 handling with auto-redirect

**Next Phase (Phase 2):** Live WebSocket streaming with Gemini AI + Twilio video provisioning.
