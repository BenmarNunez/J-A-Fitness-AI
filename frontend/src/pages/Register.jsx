import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import useAuthStore from '../store/authStore'

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { value: 'light', label: 'Light (1-3 days/week)' },
  { value: 'moderate', label: 'Moderate (3-5 days/week)' },
  { value: 'active', label: 'Active (6-7 days/week)' },
  { value: 'very_active', label: 'Very Active (twice daily)' },
]

const INITIAL = {
  email: '', first_name: '', last_name: '', password: '',
  age: '', weight_kg: '', height_cm: '', gender: '',
  fitness_goal: '', activity_level: '',
}

export default function Register() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleStep1 = (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      }
      const { data } = await api.post('/api/auth/register/', payload)
      setAuth(data.token, data.user)
      navigate('/membership-pending')
    } catch (err) {
      const errs = err.response?.data
      if (errs) {
        const first = Object.values(errs)[0]
        setError(Array.isArray(first) ? first[0] : String(first))
      } else {
        setError('Registration failed. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-accent font-bold text-2xl">J&A Fitness AI</span>
          <h1 className="mt-4 text-2xl font-bold text-white">Create your account</h1>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-text-muted">
            <span className={step === 1 ? 'text-accent font-semibold' : ''}>1. Account</span>
            <span>→</span>
            <span className={step === 2 ? 'text-accent font-semibold' : ''}>2. Fitness Profile</span>
          </div>
        </div>

        <div className="bg-surface border border-accent/20 rounded-xl p-8">
          {error && (
            <div className="mb-4 bg-danger/10 border border-danger/40 text-danger text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">First Name</label>
                  <input
                    name="first_name" value={form.first_name} onChange={handleChange} required
                    className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Last Name</label>
                  <input
                    name="last_name" value={form.last_name} onChange={handleChange} required
                    className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Email</label>
                <input
                  type="email" name="email" value={form.email} onChange={handleChange} required
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Password</label>
                <input
                  type="password" name="password" value={form.password} onChange={handleChange} required
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  placeholder="Min. 8 characters"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/80 text-white font-semibold py-2.5 rounded-lg transition"
              >
                Next →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[['age', 'Age'], ['weight_kg', 'Weight (kg)'], ['height_cm', 'Height (cm)']].map(([name, label]) => (
                  <div key={name}>
                    <label className="block text-sm text-text-muted mb-1">{label}</label>
                    <input
                      type="number" name={name} value={form[name]} onChange={handleChange} step="0.1"
                      className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange}
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent">
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Fitness Goal</label>
                <select name="fitness_goal" value={form.fitness_goal} onChange={handleChange}
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent">
                  <option value="">Select…</option>
                  {FITNESS_GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Activity Level</label>
                <select name="activity_level" value={form.activity_level} onChange={handleChange}
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent">
                  <option value="">Select…</option>
                  {ACTIVITY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <p className="text-xs text-text-muted">Fitness profile fields are optional — you can update them later.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 border border-accent/30 text-accent py-2.5 rounded-lg hover:bg-accent/5 transition">
                  ← Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition">
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-text-muted text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
