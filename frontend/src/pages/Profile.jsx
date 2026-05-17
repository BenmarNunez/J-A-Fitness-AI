import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import useAuthStore from '../store/authStore'
import api from '../api'

const FITNESS_GOALS = ['lose_weight', 'build_muscle', 'maintain']
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active']

export default function Profile() {
  const { user, setAuth, token } = useAuthStore()
  const profile = user?.profile
  const [form, setForm] = useState({
    age: profile?.age ?? '',
    weight_kg: profile?.weight_kg ?? '',
    height_cm: profile?.height_cm ?? '',
    gender: profile?.gender ?? '',
    fitness_goal: profile?.fitness_goal ?? '',
    activity_level: profile?.activity_level ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/api/profile/', {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      })
      setAuth(token, data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>
      <div className="max-w-lg">
        <div className="bg-surface border border-accent/20 rounded-xl p-6 mb-4">
          <p className="text-white font-semibold">{user?.first_name} {user?.last_name}</p>
          <p className="text-text-muted text-sm">{user?.email}</p>
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
            profile?.membership_status === 'active'
              ? 'bg-primary-dark text-accent'
              : 'bg-[#3D1A1A] text-danger'
          }`}>
            {profile?.membership_status}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-accent/20 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Fitness Profile</h2>
          <div className="grid grid-cols-3 gap-3">
            {[['age', 'Age'], ['weight_kg', 'Weight (kg)'], ['height_cm', 'Height (cm)']].map(([name, label]) => (
              <div key={name}>
                <label className="block text-xs text-text-muted mb-1">{label}</label>
                <input
                  type="number" name={name} value={form[name]} onChange={handleChange} step="0.1"
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent">
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Fitness Goal</label>
            <select name="fitness_goal" value={form.fitness_goal} onChange={handleChange}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent">
              <option value="">Select…</option>
              {FITNESS_GOALS.map(g => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Activity Level</label>
            <select name="activity_level" value={form.activity_level} onChange={handleChange}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent">
              <option value="">Select…</option>
              {ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm">
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
