import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useFitnessStore from '../store/fitnessStore'
import api from '../api'

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

export default function FitnessPlan() {
  const { activePlan, setPlans } = useFitnessStore()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/fitness/plans/').then(({ data }) => setPlans(data))
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const { data } = await api.post('/api/fitness/generate/')
      setPlans([data])
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed. Complete your profile first.')
    } finally {
      setGenerating(false)
    }
  }

  // weekly_schedule DB field stores the full Gemini JSON.
  // Actual days live at activePlan.weekly_schedule.weekly_schedule
  const planContent = activePlan?.weekly_schedule || {}
  const schedule    = planContent?.weekly_schedule || planContent

  const sortedEntries = schedule
    ? DAY_ORDER
        .filter(d => schedule[d] !== undefined)
        .map(d => [d, schedule[d]])
    : []

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Personalized</p>
          <h1 className="page-title">Fitness Plan</h1>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary">
          {generating ? (
            <span className="flex items-center gap-2"><span className="animate-pulse-soft">⚡</span> Generating…</span>
          ) : activePlan ? 'Regenerate' : 'Generate Plan'}
        </button>
      </div>

      <DisclaimerBanner />

      {error && (
        <div className="flex items-center gap-2 bg-danger/8 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3 mb-5">
          <span>⚠</span> {error}
        </div>
      )}

      {generating && (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-4 animate-pulse-soft">🤖</div>
          <p className="text-text-muted text-sm">AI is building your personalized plan…</p>
          <div className="mt-4 space-y-2 max-w-48 mx-auto">
            <div className="shimmer-line" />
            <div className="shimmer-line w-3/4 mx-auto" />
            <div className="shimmer-line w-1/2 mx-auto" />
          </div>
        </div>
      )}

      {!generating && activePlan && schedule && (
        <div className="space-y-3">
          {/* Plan meta */}
          {(activePlan.goal || planContent.estimated_weekly_calories_burned) && (
            <div className="card p-4 flex flex-wrap gap-4 items-center mb-5">
              {activePlan.goal && (
                <div>
                  <p className="stat-label">Goal</p>
                  <p className="text-text-base text-sm font-medium capitalize">{activePlan.goal.replace(/_/g, ' ')}</p>
                </div>
              )}
              {planContent.estimated_weekly_calories_burned > 0 && (
                <div>
                  <p className="stat-label">Est. Weekly Burn</p>
                  <p className="text-primary text-sm font-semibold">{planContent.estimated_weekly_calories_burned} kcal</p>
                </div>
              )}
            </div>
          )}

          {sortedEntries.map(([day, exercises]) => {
            const isRest = exercises === 'rest' || exercises === 'Rest' ||
              (typeof exercises === 'string') ||
              (Array.isArray(exercises) && exercises.length === 0)
            return (
              <div key={day} className={`card p-5 ${isRest ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="day-pill">{day}</span>
                  {isRest && <span className="text-text-dim text-xs">Recovery</span>}
                  {!isRest && Array.isArray(exercises) && (
                    <span className="text-text-dim text-xs">{exercises.length} exercises</span>
                  )}
                </div>
                {isRest ? (
                  <p className="text-text-dim text-sm flex items-center gap-2">
                    <span>🌙</span> Rest & recover
                  </p>
                ) : Array.isArray(exercises) ? (
                  <div className="divide-y divide-border-soft">
                    {exercises.map((ex, i) => (
                      <div key={i} className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0">
                        <span className="text-text-dim text-xs w-5 shrink-0 font-mono">{String(i+1).padStart(2,'0')}</span>
                        <span className="text-text-base text-sm font-medium flex-1">{ex.exercise || ex.name}</span>
                        <span className="text-primary text-xs font-medium shrink-0">{ex.sets}×{ex.reps}</span>
                        {ex.rest_seconds && (
                          <span className="text-text-dim text-xs shrink-0">{ex.rest_seconds}s</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted text-sm">{String(exercises)}</p>
                )}
              </div>
            )
          })}

          {planContent.notes && (
            <div className="card p-5 border-border-mid">
              <p className="stat-label mb-2">Coach Notes</p>
              <p className="text-text-muted text-sm leading-relaxed">{planContent.notes}</p>
            </div>
          )}
        </div>
      )}

      {!generating && !activePlan && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4 opacity-40">🏋️</div>
          <p className="text-text-base font-semibold mb-1">No Plan Yet</p>
          <p className="text-text-muted text-sm">Complete your profile, then hit Generate Plan.</p>
          <button onClick={handleGenerate} className="btn-primary mt-6">
            Generate My Plan
          </button>
        </div>
      )}
    </AppLayout>
  )
}
