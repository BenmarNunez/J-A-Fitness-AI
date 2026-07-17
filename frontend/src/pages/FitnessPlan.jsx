import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useFitnessStore from '../store/fitnessStore'
import useNutritionStore from '../store/nutritionStore'
import useAuthStore from '../store/authStore'
import api from '../api'

const BUILD_META = {
  light:  { icon: '🏃', label: 'Light Build',  color: 'text-admin-accent', bg: 'bg-admin-accent/8', border: 'border-admin-accent/25' },
  medium: { icon: '💪', label: 'Medium Build', color: 'text-primary',      bg: 'bg-primary/8',      border: 'border-primary/25' },
  heavy:  { icon: '🏋️', label: 'Heavy Build',  color: 'text-warn',         bg: 'bg-warn/8',         border: 'border-warn/25' },
}

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

// Known exercise → YouTube video ID mapping (proper form tutorials)
const EXERCISE_VIDEOS = {
  'barbell squat':             'bEv6CCg2BC8',
  'goblet squat':              'MxsFDhcyFyE',
  'front squat':               'uYumuL_G_V0',
  'barbell bench press':       'rT7DgCr-3pg',
  'dumbbell bench press':      'VmB1G1K7v94',
  'incline dumbbell press':    'DbFgADa2PL8',
  'bent-over barbell row':     'FWJR5Ve8bnQ',
  'barbell row':               'FWJR5Ve8bnQ',
  'seated cable row':          'GZbfZ033f74',
  'lat pulldown':              'CAwf7n6Luuc',
  'deadlift':                  'ytGaGIn3SjE',
  'romanian deadlift':         'JCXUYuzwNrM',
  'rdl':                       'JCXUYuzwNrM',
  'barbell overhead press':    'CnBmiBqp-AI',
  'overhead press':            'CnBmiBqp-AI',
  'dumbbell shoulder press':   '6Z15_WdXmVw',
  'dumbbell lateral raise':    'kDqklk1ZESo',
  'bicep curl':                'ykJmrZ5v0Oo',
  'bicep curls':               'ykJmrZ5v0Oo',
  'dumbbell curl':             'ykJmrZ5v0Oo',
  'hammer curl':               'zC3nLlEvin4',
  'triceps pushdown':          'vB5OHsJ3EME',
  'overhead triceps extension':'_gsUck-7M74',
  'push-up':                   'IODxDxX7oi4',
  'push up':                   'IODxDxX7oi4',
  'plank':                     'pSHjTRCQxIw',
  'dumbbell lunges':           'D7KaRcUTQeE',
  'lunges':                    'D7KaRcUTQeE',
  'leg press':                 'IZxyjW7MPJQ',
  'leg curl':                  'Orxowest56U',
  'calf raise':                'gwLzBJYoWlQ',
  'crunches':                  'Xyd_fa5zoEU',
  'russian twists':            'wkD8rjkodUI',
  'mountain climbers':         'nmwgirgXLYM',
  'burpees':                   'dZgVxmf6jkA',
}

function getVideoId(exerciseName) {
  if (!exerciseName) return null
  const lower = exerciseName.toLowerCase()
  // exact match first
  if (EXERCISE_VIDEOS[lower]) return EXERCISE_VIDEOS[lower]
  // partial match
  for (const [key, id] of Object.entries(EXERCISE_VIDEOS)) {
    if (lower.includes(key) || key.includes(lower)) return id
  }
  return null
}

function ExerciseDemo({ name }) {
  const [showVideo, setShowVideo] = useState(false)
  const videoId = getVideoId(name)
  const searchQuery = encodeURIComponent(`${name} proper form tutorial`)

  if (showVideo && videoId) {
    return (
      <div className="mt-2">
        <iframe
          width="100%" height="200"
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={`${name} form demo`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg border border-border-soft"
        />
        <button onClick={() => setShowVideo(false)} className="text-text-dim text-xs mt-1 hover:text-text-muted">
          ✕ Close video
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 mt-2">
      {videoId && (
        <button onClick={() => setShowVideo(true)}
          className="flex items-center gap-1.5 text-[11px] bg-danger/10 text-danger border border-danger/25 rounded-full px-3 py-1 hover:bg-danger/20 transition-all font-medium">
          ▶ Watch Demo
        </button>
      )}
      <a
        href={`https://www.youtube.com/results?search_query=${searchQuery}`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[11px] bg-surface border border-border-soft text-text-muted rounded-full px-3 py-1 hover:text-text-base transition-all"
      >
        🔍 Search Tutorial
      </a>
    </div>
  )
}

export default function FitnessPlan() {
  const { activePlan, setPlans } = useFitnessStore()
  const { setPlans: setNutritionPlans } = useNutritionStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [expandedEx, setExpandedEx] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [restDayModalOpen, setRestDayModalOpen] = useState(false)
  const [restDayReason, setRestDayReason] = useState('')
  const [restDayLoading, setRestDayLoading] = useState(false)
  const [restDaySuccess, setRestDaySuccess] = useState(false)
  const [mealPlanReady, setMealPlanReady] = useState(false)
  const [nutritionNotice, setNutritionNotice] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const bodyBuild = user?.profile?.body_build
  const buildMeta = BUILD_META[bodyBuild]

  useEffect(() => {
    api.get('/api/fitness/plans/').then(({ data }) => setPlans(data))
  }, [])

  const handleGenerate = async () => {
    setGenerating(true); setError('')
    try {
      const { data } = await api.post('/api/fitness/generate/')
      setPlans([data.fitness_plan])
      if (data.nutrition_plan) {
        setNutritionPlans([data.nutrition_plan, ...useNutritionStore.getState().plans])
        setMealPlanReady(true)
        setTimeout(() => setMealPlanReady(false), 6000)
      } else if (data.nutrition_error) {
        setNutritionNotice(data.nutrition_error)
        setTimeout(() => setNutritionNotice(''), 6000)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed. Complete your profile first.')
    } finally { setGenerating(false) }
  }

  const handleRequestRestDay = async () => {
    if (!restDayReason.trim()) return
    setRestDayLoading(true); setError('')
    try {
      const { data } = await api.post('/api/fitness/rest-day/', { reason: restDayReason })
      setPlans([data.plan])
      setRestDaySuccess(true)
      setRestDayModalOpen(false)
      setRestDayReason('')
      setTimeout(() => setRestDaySuccess(false), 5000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request rest day.')
    } finally { setRestDayLoading(false) }
  }

  const planContent = activePlan?.weekly_schedule || {}
  const schedule    = planContent?.weekly_schedule || planContent
  const sortedEntries = schedule
    ? DAY_ORDER.filter(d => schedule[d] !== undefined).map(d => [d, schedule[d]])
    : []

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-7">
        <div className="flex flex-col gap-1">
          <div className="text-text-muted text-[11px] font-medium uppercase tracking-wider">
            {formattedDate} | {formattedTime}
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Personalized</p>
            <h1 className="page-title !mb-0">Fitness Plan</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setRestDayModalOpen(true)} disabled={generating || restDayLoading} className="btn-secondary text-xs py-1 px-3">
            Request Rest Day
          </button>
          <button onClick={handleGenerate} disabled={generating || restDayLoading} className="btn-primary">
            {generating ? <span className="flex items-center gap-2"><span className="animate-pulse-soft">⚡</span>Generating…</span>
              : activePlan ? 'Regenerate' : 'Generate Plan'}
          </button>
        </div>
      </div>

      <DisclaimerBanner />

      {/* Body Build connection banner */}
      {buildMeta ? (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-4 border ${buildMeta.bg} ${buildMeta.border}`}>
          <span className="text-xl shrink-0">{buildMeta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${buildMeta.color}`}>Plan tailored for your {buildMeta.label}</p>
            <p className="text-text-dim text-xs">Exercises, volume, and intensity are adjusted for your body classification</p>
          </div>
          <button onClick={() => navigate('/body-scan')} className="text-[10px] text-text-dim hover:text-text-muted shrink-0 transition-colors">
            Change
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-warn/5 border border-warn/20 rounded-xl px-4 py-3 mb-4 cursor-pointer hover:border-warn/35 transition-all"
          onClick={() => navigate('/body-scan')}>
          <span className="text-lg shrink-0">📷</span>
          <div className="flex-1">
            <p className="text-warn text-xs font-semibold">Body Build not scanned — using default Medium</p>
            <p className="text-text-dim text-xs">Scan your body build for a more accurate personalized plan</p>
          </div>
          <span className="text-warn text-xs font-medium shrink-0">Scan →</span>
        </div>
      )}

      {/* #3.1 Safety Warning */}
      <div className="flex items-start gap-3 bg-danger/5 border border-danger/25 rounded-xl px-4 py-3 mb-5">
        <span className="shrink-0 text-danger mt-0.5">🛡️</span>
        <div>
          <p className="text-danger text-xs font-semibold uppercase tracking-wider mb-0.5">Safety First</p>
          <p className="text-danger/80 text-xs">
            {planContent.safety_note || 'Always warm up 5–10 min before training. Use a buddy/spotter for heavy compound lifts (bench press, squat, deadlift). Stop immediately if you feel sharp or unusual pain.'}
          </p>
        </div>
      </div>

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
            <div className="card p-4 flex flex-wrap gap-6 items-center mb-2">
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
                  <p className="text-text-dim text-sm flex items-center gap-2"><span>🌙</span> Rest & recover</p>
                ) : Array.isArray(exercises) ? (
                  <div className="divide-y divide-border-soft">
                    {exercises.map((ex, i) => {
                      const exKey = `${day}-${i}`
                      const isOpen = expandedEx === exKey
                      const needsSpotter = ex.needs_spotter
                      return (
                        <div key={i} className="py-2.5 first:pt-0 last:pb-0">
                          <div
                            className="flex flex-wrap items-center gap-x-4 gap-y-2 cursor-pointer group"
                            onClick={() => setExpandedEx(isOpen ? null : exKey)}
                          >
                            <span className="text-text-dim text-xs w-5 shrink-0 font-mono">{String(i+1).padStart(2,'0')}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-text-base text-sm font-medium">{ex.exercise || ex.name}</span>
                              {needsSpotter && (
                                <span className="ml-2 text-[10px] bg-warn/10 text-warn border border-warn/30 rounded-full px-1.5 py-0.5">
                                  🛡️ Spotter
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-primary text-xs font-medium">{ex.sets}×{ex.reps}</span>
                              {ex.rest_seconds && <span className="text-text-dim text-xs">{ex.rest_seconds}s</span>}
                              {ex.suggested_weight_kg > 0 && (
                                <span className="text-warn text-xs font-medium">{ex.suggested_weight_kg}kg</span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/posture-check', {
                                  state: {
                                    exercise: {
                                      name: ex.exercise || ex.name,
                                      recommended_reps: ex.reps,
                                      recommended_sets: ex.sets,
                                      weight_kg: ex.suggested_weight_kg,
                                      how_to_guide: ex.instructions
                                    }
                                  }
                                });
                              }}
                              className="btn-primary text-[10px] py-1 px-2 h-fit shrink-0 w-full md:w-auto mt-2 md:mt-0"
                            >
                              Start Exercise
                            </button>
                            <span className="text-text-dim text-xs ml-1 group-hover:text-text-muted transition-colors">
                              {isOpen ? '▲' : '▼'}
                            </span>
                          </div>
                          {/* #3 — Exercise instructions + visual demo */}
                          {isOpen && (
                            <div className="mt-2 ml-9 space-y-1.5 animate-fade-up">
                              {ex.instructions && (
                                <p className="text-text-muted text-xs leading-relaxed">
                                  📋 <span className="font-medium">Form:</span> {ex.instructions}
                                </p>
                              )}
                              {ex.suggested_weight_kg > 0 && (
                                <p className="text-warn text-xs">
                                  🏋️ <span className="font-medium">Suggested weight:</span> {ex.suggested_weight_kg} kg
                                </p>
                              )}
                              {needsSpotter && (
                                <p className="text-danger text-xs">
                                  🛡️ <span className="font-medium">Spotter required</span> — ask a buddy or use safety bars
                                </p>
                              )}
                              {/* Visual demo */}
                              <ExerciseDemo name={ex.exercise || ex.name} />
                            </div>
                          )}
                        </div>
                      )
                    })}
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
          <button onClick={handleGenerate} className="btn-primary mt-6">Generate My Plan</button>
        </div>
      )}

      {restDaySuccess && (
        <div className="fixed bottom-6 right-6 bg-success text-white px-4 py-3 rounded-xl shadow-lg animate-fade-up z-50 border border-success/20">
          <p className="text-sm font-medium">🌙 Rest day logged. Your plan has been updated.</p>
        </div>
      )}

      {mealPlanReady && (
        <div
          className="fixed bottom-6 right-24 bg-primary text-bg px-4 py-3 rounded-xl shadow-lg animate-fade-up z-50 border border-primary/20 cursor-pointer"
          onClick={() => navigate('/nutrition')}
        >
          <p className="text-sm font-medium">🥗 Meal plan generated too — tap to view →</p>
        </div>
      )}

      {nutritionNotice && (
        <div className="fixed bottom-6 right-24 bg-warn/10 border border-warn/30 text-warn px-4 py-3 rounded-xl shadow-lg animate-fade-up z-50">
          <p className="text-sm font-medium">⚠️ Meal plan generation failed — you can retry from the Nutrition page.</p>
        </div>
      )}

      {restDayModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={() => setRestDayModalOpen(false)}
        >
          <div
            className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl relative animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setRestDayModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-base transition-colors"
            >
              <span className="text-xl leading-none">✕</span>
            </button>

            <div className="pr-6">
              <h3 className="text-lg font-semibold mb-2">Request Rest Day</h3>
              <p className="text-text-muted text-sm mb-4">Tell us why you need a rest day, and we'll adjust your plan for tomorrow.</p>
              <textarea
                className="w-full bg-surface border border-border-soft rounded-xl p-3 text-sm text-text-base focus:border-primary outline-none transition-all min-h-[100px]"
                placeholder="e.g. Feeling fatigued, muscle soreness, family emergency..."
                value={restDayReason}
                onChange={(e) => setRestDayReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRestDayModalOpen(false)} disabled={restDayLoading} className="flex-1 py-2 text-sm font-medium text-text-muted hover:text-text-base transition-colors">
                Cancel
              </button>
              <button onClick={handleRequestRestDay} disabled={restDayLoading || !restDayReason.trim()} className="btn-primary flex-1 py-2 text-sm font-medium">
                {restDayLoading ? 'Updating Plan...' : 'Confirm Rest Day'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
