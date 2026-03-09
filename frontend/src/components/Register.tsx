import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import apiClient from '../services/apiClient'
import { Lock, Mail, ArrowRight, Video, User } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAppStore()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.post('/api/v1/auth/register', {
        email,
        password,
        full_name: fullName,
      })

      const { token, user_id, email: user_email } = response.data
      login(token, { user_id, email: user_email })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

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
            Hire smarter,<br />
            not harder.
          </h1>
          <p className="text-xl text-blue-200 mt-4 max-w-md">
            The next generation synchronous and asynchronous interview platform powered by AI.
          </p>
        </div>
        <div className="text-sm text-blue-400">© {new Date().getFullYear()} AI.nterview. All rights reserved.</div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="mb-8 md:hidden flex items-center gap-3">
            <Video className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">AI.nterview</span>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-500 mb-8">Join our interview platform today.</p>

          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters recommended</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 font-medium hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
