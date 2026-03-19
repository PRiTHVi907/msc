import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Lock, Mail, ArrowRight, Video } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'candidate' | 'reviewer'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // #region agent log
    fetch('http://127.0.0.1:7787/ingest/b72f1e5d-a006-424c-839f-e5f53559e1bf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '705855',
      },
      body: JSON.stringify({
        sessionId: '705855',
        runId: 'initial',
        hypothesisId: 'H1',
        location: 'Login.tsx:handleLogin:start',
        message: 'handleLogin invoked',
        data: { role },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      // #region agent log
      fetch('http://127.0.0.1:7787/ingest/b72f1e5d-a006-424c-839f-e5f53559e1bf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '705855',
        },
        body: JSON.stringify({
          sessionId: '705855',
          runId: 'initial',
          hypothesisId: 'H2',
          location: 'Login.tsx:handleLogin:response',
          message: 'Login response received',
          data: { status: res.status, ok: res.ok },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!res.ok) {
        let message = 'Login failed. Please check your credentials.';
        try {
          const errorBody = await res.json();
          if (errorBody?.detail || errorBody?.message) {
            message = errorBody.detail || errorBody.message;
          }
        } catch {
          // ignore JSON parse errors and fall back to default message
        }
        throw new Error(message);
      }
      
      const data = await res.json();
      login(data.token, { user_id: data.user_id || 'unknown', email });
      
      if (role === 'admin' || role === 'reviewer') {
        navigate('/admin');
      } else {
        if (data.interview_id) {
          navigate(`/interview/${data.interview_id}`);
        } else {
          setError("Error: No interview ID found for this candidate.");
          // #region agent log
          fetch('http://127.0.0.1:7787/ingest/b72f1e5d-a006-424c-839f-e5f53559e1bf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': '705855',
            },
            body: JSON.stringify({
              sessionId: '705855',
              runId: 'initial',
              hypothesisId: 'H3',
              location: 'Login.tsx:handleLogin:noInterviewId',
              message: 'Candidate login missing interview_id',
              data: {},
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
        }
      }
    } catch (err) {
      console.error(err);
      // #region agent log
      fetch('http://127.0.0.1:7787/ingest/b72f1e5d-a006-424c-839f-e5f53559e1bf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '705855',
        },
        body: JSON.stringify({
          sessionId: '705855',
          runId: 'initial',
          hypothesisId: 'H4',
          location: 'Login.tsx:handleLogin:catch',
          message: 'Error during login',
          data: {
            isTypeError: err instanceof TypeError,
            name: err instanceof Error ? err.name : 'Unknown',
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (err instanceof TypeError) {
        setError("Cannot reach the server at http://localhost:8000. Please ensure the backend is running.");
      } else if (err instanceof Error) {
        setError(err.message || "Failed to login. Please try again.");
      } else {
        setError("Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left side - Branding */}
      <div className="hidden md:flex flex-col justify-between bg-blue-900 text-white p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <Video className="w-10 h-10 text-blue-400" />
            <span className="text-2xl font-bold tracking-wider">AI.nterview</span>
          </div>
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            Hire smarter,<br/>not harder.
          </h1>
          <p className="text-xl text-blue-200 mt-4 max-w-md">
            The next generation synchronous and asynchronous interview platform powered by AI.
          </p>
        </div>
        <div className="text-sm text-blue-400">
          © {new Date().getFullYear()} AI.nterview. All rights reserved.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fade-in-up">
          <div className="mb-8 md:hidden flex items-center gap-3">
            <Video className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">AI.nterview</span>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">Please enter your details to sign in.</p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Login as</label>
              <div className="grid grid-cols-3 gap-3">
                {['admin', 'reviewer', 'candidate'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r as 'admin' | 'candidate' | 'reviewer')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                      role === r 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200 pl-10 pr-3"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200 pl-10 pr-3"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary text-white font-semibold py-3 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
