import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import useAuthStore from '../store/authStore'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login/', form)
      setAuth(data.token, data.user)
      if (data.user.is_admin) {
        navigate('/admin')
      } else if (data.user.profile?.membership_status === 'active') {
        navigate('/dashboard')
      } else {
        navigate('/membership-pending')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-accent font-bold text-2xl">J&A Fitness AI</span>
          <h1 className="mt-4 text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-text-muted text-sm">Log in to your membership</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-accent/20 rounded-xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-danger/10 border border-danger/40 text-danger text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-text-muted mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-text-muted text-sm">
          No account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
