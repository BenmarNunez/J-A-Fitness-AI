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

  const removeSet = (i) => setForm(f => ({ ...f, sets: f.sets.filter((_, idx) => idx !== i) }))

  const updateSet = (i, field, val) => setForm(f => {
    const sets = [...f.sets]; sets[i] = { ...sets[i], [field]: val }; return { ...f, sets }
  })

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await api.post('/api/fitness/log/', {
        date: today, notes: form.notes,
        sets: form.sets.map(s => ({ ...s, sets: Number(s.sets), reps: Number(s.reps), weight_kg: s.weight_kg ? Number(s.weight_kg) : null })),
      })
      setWorkoutLogs([data, ...workoutLogs])
      setShowForm(false)
      setForm({ notes: '', sets: [{ exercise_name: '', sets: 3, reps: 10, weight_kg: '' }] })
    } finally { setSaving(false) }
  }

  return (
    <AppLayout>
      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Training Records</p>
          <h1 className="page-title">Logbook</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-ghost' : 'btn-primary'}>
          {showForm ? '✕ Cancel' : '+ Log Workout'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-4 animate-fade-up">
          <textarea placeholder="Session notes (optional)…" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="inp resize-none h-16" rows={2} />

          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 text-[10px] text-text-dim uppercase tracking-widest px-1">
            <span className="col-span-5">Exercise</span>
            <span className="col-span-2 text-center">Sets</span>
            <span className="col-span-2 text-center">Reps</span>
            <span className="col-span-2 text-center">kg</span>
            <span className="col-span-1" />
          </div>

          {form.sets.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input placeholder="Barbell Squat" value={s.exercise_name}
                onChange={e => updateSet(i, 'exercise_name', e.target.value)} required
                className="col-span-5 inp py-2 text-sm" />
              <input type="number" value={s.sets} onChange={e => updateSet(i, 'sets', e.target.value)}
                className="col-span-2 inp py-2 text-sm text-center" />
              <input type="number" value={s.reps} onChange={e => updateSet(i, 'reps', e.target.value)}
                className="col-span-2 inp py-2 text-sm text-center" />
              <input type="number" step="0.5" placeholder="—" value={s.weight_kg}
                onChange={e => updateSet(i, 'weight_kg', e.target.value)}
                className="col-span-2 inp py-2 text-sm text-center" />
              <button type="button" onClick={() => removeSet(i)}
                className="col-span-1 text-text-dim hover:text-danger transition-colors text-center text-lg leading-none">
                ×
              </button>
            </div>
          ))}

          <div className="flex gap-3">
            <button type="button" onClick={addSet}
              className="text-primary text-sm hover:text-primary-dim transition-colors font-medium">
              + Add exercise
            </button>
            <button type="submit" disabled={saving} className="btn-primary ml-auto">
              {saving ? 'Saving…' : 'Save Workout'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5">
              <div className="shimmer-line w-32 mb-3" />
              <div className="shimmer-line w-full mb-2" />
              <div className="shimmer-line w-2/3" />
            </div>
          ))}
        </div>
      ) : workoutLogs.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4 opacity-40">📓</div>
          <p className="text-text-base font-semibold mb-1">No Workouts Logged</p>
          <p className="text-text-muted text-sm">Start tracking your training sessions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workoutLogs.map(log => (
            <div key={log.id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-text-base font-semibold">{log.date}</p>
                  {log.notes && <p className="text-text-muted text-xs mt-0.5">{log.notes}</p>}
                </div>
                <span className="text-text-dim text-xs">{log.sets?.length || 0} exercises</span>
              </div>
              <div className="divide-y divide-border-soft">
                {log.sets?.map((s, i) => (
                  <div key={i} className="flex gap-4 py-2 first:pt-0 last:pb-0 text-sm items-center">
                    <span className="text-text-base font-medium flex-1">{s.exercise_name}</span>
                    <span className="text-primary font-medium text-xs">{s.sets}×{s.reps}</span>
                    {s.weight_kg && (
                      <span className="text-text-muted text-xs">{s.weight_kg} kg</span>
                    )}
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
