import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AppLayout from '../components/AppLayout'
import useAuthStore from '../store/authStore'
import useFitnessStore from '../store/fitnessStore'
import api from '../api'

const BUILD_META = {
  light:  { icon: '🏃', label: 'Light Build',  color: 'text-admin-accent' },
  medium: { icon: '💪', label: 'Medium Build', color: 'text-primary' },
  heavy:  { icon: '🏋️', label: 'Heavy Build',  color: 'text-warn' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border-mid rounded-lg px-3 py-2 text-sm shadow-glow-sm">
      <p className="text-text-muted text-xs mb-1">{label}</p>
      <p className="text-primary font-semibold">{payload[0].value} kg</p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const { bodyMetrics, setBodyMetrics, addBodyMetric } = useFitnessStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/fitness/metrics/').then(({ data }) => {
      setBodyMetrics(data)
    }).finally(() => setLoading(false))
  }, [])

  const chartData = [...bodyMetrics]
    .reverse()
    .slice(-12)
    .map(m => ({ date: m.date?.slice(5), weight: m.weight_kg }))

  const profile = user?.profile

  const buildMeta = BUILD_META[profile?.body_build]
  const stats = [
    { label: 'BMI',   value: profile?.bmi ?? '—', sub: 'Body Mass Index' },
    { label: 'BMR',   value: profile?.bmr ? `${profile.bmr}` : '—', sub: 'kcal / day' },
    { label: 'Goal',  value: profile?.fitness_goal?.replace(/_/g, ' ') ?? '—', sub: 'Current target' },
    { label: 'Status', value: profile?.membership_status ?? '—', sub: 'Membership', isBadge: true },
  ]

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <p className="text-text-muted text-sm font-medium mb-1 uppercase tracking-widest">Welcome back</p>
        <h1 className="font-display text-5xl text-text-base tracking-wide uppercase">
          {user?.first_name} {user?.last_name}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-px flex-1 max-w-16 bg-primary/40 rounded" />
          <span className="text-text-dim text-xs tracking-widest uppercase">Your Dashboard</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {stats.map(({ label, value, sub, isBadge }) => (
          <div key={label} className="stat-card group">
            <span className="stat-label">{label}</span>
            {isBadge ? (
              <span className={value === 'active' ? 'badge-active self-start' : 'badge-pending self-start'}>
                {value}
              </span>
            ) : (
              <span className="stat-value">{value}</span>
            )}
            <span className="text-text-dim text-[10px] uppercase tracking-wider">{sub}</span>
          </div>
        ))}
      </div>

      {/* Body Build Card — #3 visible connection to panelist */}
      {buildMeta ? (
        <div className="card p-4 mb-6 flex items-center gap-4 border-border-mid">
          <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center text-2xl shrink-0">
            {buildMeta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="stat-label">Body Build (Camera Scan)</p>
            <p className={`font-semibold text-lg ${buildMeta.color}`}>{buildMeta.label}</p>
            <p className="text-text-dim text-xs">Your fitness & meal plans are tailored to this classification</p>
          </div>
          <button onClick={() => navigate('/body-scan')}
            className="shrink-0 text-xs text-text-dim border border-border-soft rounded-lg px-3 py-1.5 hover:text-text-muted transition-colors">
            Rescan
          </button>
        </div>
      ) : (
        <div className="card p-4 mb-6 flex items-center gap-4 border-warn/20 bg-warn/3 cursor-pointer hover:border-warn/40 transition-all"
          onClick={() => navigate('/body-scan')}>
          <div className="w-12 h-12 rounded-xl bg-warn/10 flex items-center justify-center text-xl shrink-0">📷</div>
          <div className="flex-1">
            <p className="stat-label">Body Build Not Scanned</p>
            <p className="text-warn text-sm font-medium">Scan your body build to personalize your plans</p>
            <p className="text-text-dim text-xs">Plans currently use default Medium build</p>
          </div>
          <span className="text-warn text-xs font-medium shrink-0">Scan Now →</span>
        </div>
      )}

      {/* Weight Chart */}
      <div className="card p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-text-base font-semibold">Weight Progress</h2>
            <p className="text-text-muted text-xs mt-0.5">Last 12 measurements</p>
          </div>
          {chartData.length > 0 && (
            <span className="text-primary font-semibold text-sm">
              {chartData[chartData.length - 1]?.weight} kg
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-2 py-4">
            <div className="shimmer-line" />
            <div className="shimmer-line w-3/4" />
            <div className="shimmer-line w-1/2" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-text-muted">
            <span className="text-3xl opacity-30">📈</span>
            <span className="text-sm">No weight data yet. Log below.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="rgba(0,230,118,0.05)" strokeDasharray="4 4" />
              <XAxis dataKey="date" tick={{ fill: '#7DAE8A', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7DAE8A', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="weight" stroke="#00E676" strokeWidth={2}
                dot={{ fill: '#00E676', r: 3, strokeWidth: 0 }}
                activeDot={{ fill: '#00E676', r: 5, strokeWidth: 2, stroke: 'rgba(0,230,118,0.3)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Log Form */}
      <LogWeightForm onLogged={addBodyMetric} />
    </AppLayout>
  )
}

function LogWeightForm({ onLogged }) {
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-text-base font-semibold mb-4">Log Today's Measurements</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-28">
          <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">Weight (kg)</label>
          <input
            type="number" step="0.1" required value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="70.5"
            className="inp"
          />
        </div>
        <div className="flex-1 min-w-28">
          <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">Body Fat % <span className="text-text-dim">(optional)</span></label>
          <input
            type="number" step="0.1" value={bodyFat}
            onChange={e => setBodyFat(e.target.value)}
            placeholder="15.0"
            className="inp"
          />
        </div>
        <button
          type="submit" disabled={saving}
          className={`btn-primary shrink-0 ${saved ? 'bg-primary/80' : ''}`}
        >
          {saved ? '✓ Logged' : saving ? 'Saving…' : 'Log'}
        </button>
      </form>
    </div>
  )
}
