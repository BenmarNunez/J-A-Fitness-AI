import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../api'

const CLASSIFICATIONS = {
  'Underweight': 'text-admin-accent',
  'Normal weight': 'text-accent',
  'Overweight': 'text-warn',
  'Obese': 'text-danger',
}

export default function BMIEstimator() {
  const [form, setForm] = useState({ weight_kg: '', height_cm: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/fitness/bmi/', {
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
      })
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-white mb-6">BMI Estimator</h1>
      <div className="max-w-md">
        <form onSubmit={handleSubmit} className="bg-surface border border-accent/20 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Weight (kg)</label>
            <input
              type="number" step="0.1" required value={form.weight_kg}
              onChange={e => setForm({ ...form, weight_kg: e.target.value })}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Height (cm)</label>
            <input
              type="number" step="0.1" required value={form.height_cm}
              onChange={e => setForm({ ...form, height_cm: e.target.value })}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? 'Calculating…' : 'Calculate BMI'}
          </button>
        </form>

        {result && (
          <div className="mt-4 bg-surface border border-accent/20 rounded-xl p-6 text-center">
            <p className="text-text-muted text-sm">Your BMI</p>
            <p className="text-5xl font-bold text-white mt-2">{result.bmi}</p>
            <p className={`text-lg font-semibold mt-2 ${CLASSIFICATIONS[result.classification] || 'text-white'}`}>
              {result.classification}
            </p>
            <p className="text-text-muted text-xs mt-3">WHO classification. Consult a professional for medical assessment.</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
