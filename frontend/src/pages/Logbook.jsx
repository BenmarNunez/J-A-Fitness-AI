import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import useFitnessStore from '../store/fitnessStore'
import api from '../api'

export default function Logbook() {
  const { workoutLogs, setWorkoutLogs } = useFitnessStore()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ notes: '', sets: [{ exercise_name: '', sets: 3, reps: 10, weight_kg: '' }] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/fitness/log/').then(({ data }) => setWorkoutLogs(data)).finally(() => setLoading(false))
  }, [])

  const addSet = () => setForm(f => ({ ...f, sets: [...f.sets, { exercise_name: '', sets: 3, reps: 10, weight_kg: '' }] }))

  const updateSet = (i, field, val) => setForm(f => {
    const sets = [...f.sets]
    sets[i] = { ...sets[i], [field]: val }
    return { ...f, sets }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await api.post('/api/fitness/log/', {
        date: today,
        notes: form.notes,
        sets: form.sets.map(s => ({ ...s, sets: Number(s.sets), reps: Number(s.reps), weight_kg: s.weight_kg ? Number(s.weight_kg) : null })),
      })
      setWorkoutLogs([data, ...workoutLogs])
      setShowForm(false)
      setForm({ notes: '', sets: [{ exercise_name: '', sets: 3, reps: 10, weight_kg: '' }] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Activity Logbook</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm transition">
          {showForm ? 'Cancel' : '+ Log Workout'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-accent/20 rounded-xl p-6 mb-6 space-y-4">
          <textarea
            placeholder="Session notes (optional)" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent resize-none"
            rows={2}
          />
          {form.sets.map((s, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <input placeholder="Exercise" value={s.exercise_name}
                onChange={e => updateSet(i, 'exercise_name', e.target.value)} required
                className="col-span-1 bg-bg border border-accent/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-accent" />
              <input type="number" placeholder="Sets" value={s.sets}
                onChange={e => updateSet(i, 'sets', e.target.value)}
                className="bg-bg border border-accent/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-accent" />
              <input type="number" placeholder="Reps" value={s.reps}
                onChange={e => updateSet(i, 'reps', e.target.value)}
                className="bg-bg border border-accent/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-accent" />
              <input type="number" step="0.5" placeholder="kg" value={s.weight_kg}
                onChange={e => updateSet(i, 'weight_kg', e.target.value)}
                className="bg-bg border border-accent/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-accent" />
            </div>
          ))}
          <button type="button" onClick={addSet} className="text-accent text-sm hover:underline">+ Add exercise</button>
          <button type="submit" disabled={saving}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm">
            {saving ? 'Saving…' : 'Save Workout'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-text-muted text-sm">Loading…</p>
      ) : workoutLogs.length === 0 ? (
        <p className="text-text-muted text-sm">No workouts logged yet.</p>
      ) : (
        <div className="space-y-4">
          {workoutLogs.map(log => (
            <div key={log.id} className="bg-surface border border-accent/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold">{log.date}</span>
                {log.notes && <span className="text-text-muted text-xs">{log.notes}</span>}
              </div>
              <div className="space-y-1">
                {log.sets.map((s, i) => (
                  <div key={i} className="flex gap-4 text-sm">
                    <span className="text-white min-w-32">{s.exercise_name}</span>
                    <span className="text-text-muted">{s.sets}×{s.reps}</span>
                    {s.weight_kg && <span className="text-text-muted">{s.weight_kg}kg</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
