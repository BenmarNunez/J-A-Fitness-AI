import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import AppLayout from '../components/AppLayout'
import useAuthStore from '../store/authStore'
import useFitnessStore from '../store/fitnessStore'
import api from '../api'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { bodyMetrics, setBodyMetrics, addBodyMetric } = useFitnessStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/fitness/metrics/').then(({ data }) => {
      setBodyMetrics(data)
    }).finally(() => setLoading(false))
  }, [])

  const chartData = [...bodyMetrics]
    .reverse()
    .slice(-12)
    .map(m => ({ date: m.date, weight: m.weight_kg }))

  const profile = user?.profile

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-white mb-6">
        Welcome back, {user?.first_name}
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'BMI', value: profile?.bmi ?? '—' },
          { label: 'BMR', value: profile?.bmr ? `${profile.bmr} kcal` : '—' },
          { label: 'Goal', value: profile?.fitness_goal?.replace('_', ' ') ?? '—' },
          { label: 'Membership', value: profile?.membership_status ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface border border-accent/20 rounded-xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-wide">{label}</p>
            <p className="text-white font-semibold mt-1 capitalize">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-accent/20 rounded-xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Weight Progress (kg)</h2>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-text-muted text-sm">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-text-muted text-sm">
            No weight data yet. Log your first measurement below.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#C2C0B6', fontSize: 11 }} />
              <YAxis tick={{ fill: '#C2C0B6', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#1A1A18', border: '1px solid #5DCAA5', borderRadius: 8 }} />
              <Line type="monotone" dataKey="weight" stroke="#5DCAA5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <LogWeightForm onLogged={addBodyMetric} />
    </AppLayout>
  )
}

function LogWeightForm({ onLogged }) {
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await api.post('/api/fitness/metrics/', {
        date: today,
        weight_kg: Number(weight),
        body_fat_pct: bodyFat ? Number(bodyFat) : undefined,
      })
      onLogged(data)
      setWeight('')
      setBodyFat('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface border border-accent/20 rounded-xl p-6">
      <h2 className="text-white font-semibold mb-4">Log Today's Measurements</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-text-muted mb-1">Weight (kg)</label>
          <input
            type="number" step="0.1" required value={weight} onChange={e => setWeight(e.target.value)}
            className="bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Body Fat % (optional)</label>
          <input
            type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)}
            className="bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit" disabled={saving}
          className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition text-sm"
        >
          {saving ? 'Saving…' : 'Log'}
        </button>
      </form>
    </div>
  )
}
