import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useFitnessStore from '../store/fitnessStore'
import api from '../api'

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

  const schedule = activePlan?.weekly_schedule

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Fitness Plan</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          {generating ? 'Generating…' : activePlan ? 'Regenerate Plan' : 'Generate Plan'}
        </button>
      </div>

      <DisclaimerBanner />

      {error && (
        <div className="bg-danger/10 border border-danger/40 text-danger text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {generating && (
        <div className="bg-surface border border-accent/20 rounded-xl p-8 text-center text-text-muted">
          AI is creating your personalized plan…
        </div>
      )}

      {!generating && activePlan && schedule && (
        <div className="space-y-4">
          {Object.entries(schedule.weekly_schedule || schedule).map(([day, exercises]) => (
            <div key={day} className="bg-surface border border-accent/20 rounded-xl p-5">
              <h3 className="text-accent font-semibold capitalize mb-3">{day}</h3>
              {exercises === 'rest' || exercises === 'Rest' ? (
                <p className="text-text-muted text-sm">Rest day</p>
              ) : Array.isArray(exercises) ? (
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <div key={i} className="flex items-center gap-4 text-sm">
                      <span className="text-white font-medium min-w-36">{ex.exercise || ex.name}</span>
                      <span className="text-text-muted">{ex.sets} sets × {ex.reps} reps</span>
                      {ex.rest_seconds && <span className="text-text-muted">{ex.rest_seconds}s rest</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm">{String(exercises)}</p>
              )}
            </div>
          ))}
          {schedule.notes && (
            <div className="bg-surface border border-accent/20 rounded-xl p-4 text-text-muted text-sm">
              {schedule.notes}
            </div>
          )}
        </div>
      )}

      {!generating && !activePlan && (
        <div className="bg-surface border border-accent/20 rounded-xl p-8 text-center text-text-muted">
          No plan generated yet. Complete your profile, then click Generate Plan.
        </div>
      )}
    </AppLayout>
  )
}
