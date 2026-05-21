import { useEffect, useRef, useState } from 'react'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useNutritionStore from '../store/nutritionStore'
import api from '../api'

const MACRO_COLORS = {
  Calories: 'text-warn',
  Protein:  'text-primary',
  Carbs:    'text-admin-accent',
  Fat:      'text-danger',
}

export default function Nutrition() {
  const { plans, setPlans, scanResult, setScanResult } = useNutritionStore()
  const [generating, setGenerating] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    api.get('/api/nutrition/plans/').then(({ data }) => setPlans(data))
  }, [])

  const handleGenerate = async () => {
    setGenerating(true); setError('')
    try {
      const { data } = await api.post('/api/nutrition/generate/')
      setPlans([data, ...plans])
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed. Complete your profile first.')
    } finally { setGenerating(false) }
  }

  const handleScan = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setScanning(true); setError('')
    const formData = new FormData(); formData.append('image', file)
    try {
      const { data } = await api.post('/api/nutrition/scan/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setScanResult(data.analysis)
    } catch (err) {
      setError(err.response?.data?.detail || 'Image scan failed.')
    } finally { setScanning(false) }
  }

  const latestPlan = plans[0]?.content

  return (
    <AppLayout>
      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">AI-Powered</p>
          <h1 className="page-title">Nutrition</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={scanning}
            className="btn-ghost text-warn border-warn/30 hover:bg-warn/5">
            {scanning ? '⏳ Scanning…' : '📷 Scan Food'}
          </button>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? '⚡ Generating…' : 'Meal Plan'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
        </div>
      </div>

      <DisclaimerBanner message="Nutrition plans are AI-generated guidance only. Consult a registered dietitian for medical dietary advice." />

      {error && (
        <div className="flex items-center gap-2 bg-danger/8 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3 mb-5">
          <span>⚠</span> {error}
        </div>
      )}

      {/* Food Scan Result */}
      {scanResult && (
        <div className="card border-warn/20 p-6 mb-5">
          <p className="stat-label mb-4">Food Scan Result</p>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[['Calories', scanResult.total_calories, 'kcal'],
              ['Protein',  scanResult.total_protein_g, 'g'],
              ['Carbs',    scanResult.total_carbs_g, 'g'],
              ['Fat',      scanResult.total_fat_g, 'g']
            ].map(([label, value, unit]) => (
              <div key={label} className="bg-bg rounded-xl p-3 text-center border border-border-soft">
                <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">{label}</p>
                <p className={`font-semibold ${MACRO_COLORS[label]}`}>{value}<span className="text-[10px] text-text-dim ml-0.5">{unit}</span></p>
              </div>
            ))}
          </div>
          <div className="divide-y divide-border-soft">
            {scanResult.foods_detected?.map((food, i) => (
              <div key={i} className="flex gap-3 text-sm py-2.5 first:pt-0">
                <span className="text-text-base flex-1">{food.name}</span>
                <span className="text-text-muted text-xs">{food.portion_estimate}</span>
                <span className="text-warn text-xs font-medium">{food.calories} kcal</span>
              </div>
            ))}
          </div>
          <p className="text-text-dim text-xs mt-3">Confidence: <span className="text-text-muted">{scanResult.confidence}</span></p>
        </div>
      )}

      {/* Meal Plan */}
      {latestPlan && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-text-base font-semibold">Your Meal Plan</h2>
            <span className="text-primary font-semibold text-sm">{latestPlan.calories} kcal</span>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[['Calories', latestPlan.calories, 'kcal'],
              ['Protein',  latestPlan.protein_g, 'g'],
              ['Carbs',    latestPlan.carbs_g, 'g'],
              ['Fat',      latestPlan.fat_g, 'g']
            ].map(([label, value, unit]) => (
              <div key={label} className="bg-bg rounded-xl p-3 text-center border border-border-soft">
                <p className="text-text-muted text-[10px] uppercase tracking-wider mb-1">{label}</p>
                <p className={`font-semibold ${MACRO_COLORS[label]}`}>{value}<span className="text-[10px] text-text-dim ml-0.5">{unit}</span></p>
              </div>
            ))}
          </div>

          {/* Meals */}
          <div className="space-y-5">
            {Object.entries(latestPlan.meals || {}).map(([meal, foods]) => (
              <div key={meal}>
                <p className="day-pill mb-3">{meal}</p>
                {Array.isArray(foods) && foods.map((f, i) => (
                  <div key={i} className="flex gap-3 text-sm py-2 border-b border-border-soft last:border-0">
                    <span className="text-text-base flex-1">{f.food}</span>
                    <span className="text-text-muted text-xs">{f.portion}</span>
                    <span className="text-warn text-xs font-medium">{f.calories} kcal</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {latestPlan.hydration_ml && (
            <p className="text-text-muted text-sm mt-4">💧 Hydration: <span className="text-admin-accent">{latestPlan.hydration_ml} ml</span></p>
          )}
          {latestPlan.notes && (
            <p className="text-text-muted text-sm mt-3 leading-relaxed border-t border-border-soft pt-3">{latestPlan.notes}</p>
          )}
        </div>
      )}

      {!latestPlan && !generating && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4 opacity-40">🥗</div>
          <p className="text-text-base font-semibold mb-1">No Meal Plan Yet</p>
          <p className="text-text-muted text-sm">Generate a personalized daily meal plan based on your profile.</p>
          <button onClick={handleGenerate} className="btn-primary mt-6">Generate Meal Plan</button>
        </div>
      )}
    </AppLayout>
  )
}
