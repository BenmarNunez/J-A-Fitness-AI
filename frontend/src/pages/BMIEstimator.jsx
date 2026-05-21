import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../api'

const CLASSIFICATIONS = {
  'Underweight':    { color: 'text-admin-accent', bg: 'bg-admin-accent/10', icon: '📉' },
  'Normal weight':  { color: 'text-primary',      bg: 'bg-primary/10',      icon: '✅' },
  'Overweight':     { color: 'text-warn',          bg: 'bg-warn/10',         icon: '⚠️' },
  'Obese':          { color: 'text-danger',        bg: 'bg-danger/10',       icon: '🚨' },
}

const BMI_SCALE = [
  { label: 'Under',   range: '< 18.5', color: 'bg-admin-accent' },
  { label: 'Normal',  range: '18.5–24.9', color: 'bg-primary' },
  { label: 'Over',    range: '25–29.9', color: 'bg-warn' },
  { label: 'Obese',   range: '≥ 30', color: 'bg-danger' },
]

export default function BMIEstimator() {
  const [form, setForm] = useState({ weight_kg: '', height_cm: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/api/fitness/bmi/', {
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
      })
      setResult(data)
    } finally { setLoading(false) }
  }

  const cls = result ? (CLASSIFICATIONS[result.classification] || { color: 'text-text-base', bg: 'bg-surface-2', icon: '📊' }) : null

  return (
    <AppLayout>
      <div className="mb-7">
        <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Health Check</p>
        <h1 className="page-title">BMI Estimator</h1>
      </div>

      <div className="max-w-md">
        <form onSubmit={handleSubmit} className="card p-6 space-y-5 mb-5">
          <div>
            <label className="block text-xs text-text-muted mb-2 uppercase tracking-wider">Weight (kg)</label>
            <input type="number" step="0.1" required value={form.weight_kg}
              onChange={e => setForm({ ...form, weight_kg: e.target.value })}
              placeholder="70.5" className="inp" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-2 uppercase tracking-wider">Height (cm)</label>
            <input type="number" step="0.1" required value={form.height_cm}
              onChange={e => setForm({ ...form, height_cm: e.target.value })}
              placeholder="170" className="inp" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Calculating…' : 'Calculate BMI'}
          </button>
        </form>

        {/* BMI Scale reference */}
        <div className="card p-5 mb-5">
          <p className="stat-label mb-3">WHO Classification Scale</p>
          <div className="space-y-2">
            {BMI_SCALE.map(({ label, range, color }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                <span className="text-text-base w-20">{label}</span>
                <span className="text-text-muted text-xs">{range}</span>
              </div>
            ))}
          </div>
        </div>

        {result && (
          <div className={`card p-8 text-center ${cls.bg} border-border-mid animate-fade-up`}>
            <div className="text-4xl mb-3">{cls.icon}</div>
            <p className="stat-label mb-2">Your BMI Score</p>
            <p className="font-display text-7xl text-text-base tracking-wide mb-2">{result.bmi}</p>
            <p className={`text-lg font-semibold ${cls.color}`}>{result.classification}</p>
            <p className="text-text-dim text-xs mt-4 leading-relaxed">
              WHO classification. Consult a healthcare professional for a complete health assessment.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
