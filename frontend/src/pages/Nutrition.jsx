import { useEffect, useRef, useState } from 'react'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useNutritionStore from '../store/nutritionStore'
import api from '../api'

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
    setGenerating(true)
    setError('')
    try {
      const { data } = await api.post('/api/nutrition/generate/')
      setPlans([data, ...plans])
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed. Complete your profile first.')
    } finally {
      setGenerating(false)
    }
  }

  const handleScan = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScanning(true)
    setError('')
    const formData = new FormData()
    formData.append('image', file)
    try {
      const { data } = await api.post('/api/nutrition/scan/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setScanResult(data.analysis)
    } catch (err) {
      setError(err.response?.data?.detail || 'Image scan failed.')
    } finally {
      setScanning(false)
    }
  }

  const latestPlan = plans[0]?.content

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-white mb-6">AI Nutritionist</h1>
      <DisclaimerBanner message="Nutrition plans are AI-generated guidance only. Consult a registered dietitian for medical dietary advice." />

      {error && <div className="bg-danger/10 border border-danger/40 text-danger text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={handleGenerate} disabled={generating}
          className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition">
          {generating ? 'Generating…' : 'Generate Meal Plan'}
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={scanning}
          className="bg-surface border border-warn/40 text-warn hover:bg-warn/5 px-4 py-2 rounded-lg text-sm transition">
          {scanning ? 'Scanning…' : '📷 Scan Food Image'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
      </div>

      {scanResult && (
        <div className="bg-surface border border-warn/30 rounded-xl p-5 mb-6">
          <h2 className="text-warn font-semibold mb-3">Food Scan Result</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              ['Calories', scanResult.total_calories],
              ['Protein', `${scanResult.total_protein_g}g`],
              ['Carbs', `${scanResult.total_carbs_g}g`],
              ['Fat', `${scanResult.total_fat_g}g`],
            ].map(([label, value]) => (
              <div key={label} className="bg-bg rounded-lg p-3 text-center">
                <p className="text-text-muted text-xs">{label}</p>
                <p className="text-white font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {scanResult.foods_detected?.map((food, i) => (
            <div key={i} className="flex gap-3 text-sm py-1 border-t border-white/5">
              <span className="text-white">{food.name}</span>
              <span className="text-text-muted">{food.portion_estimate}</span>
              <span className="text-text-muted ml-auto">{food.calories} kcal</span>
            </div>
          ))}
          <p className="text-text-muted text-xs mt-2">Confidence: {scanResult.confidence}</p>
        </div>
      )}

      {latestPlan && (
        <div className="bg-surface border border-accent/20 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-1">Your Meal Plan</h2>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[['Calories', latestPlan.calories], ['Protein', `${latestPlan.protein_g}g`], ['Carbs', `${latestPlan.carbs_g}g`], ['Fat', `${latestPlan.fat_g}g`]].map(([l, v]) => (
              <div key={l} className="bg-bg rounded-lg p-3 text-center">
                <p className="text-text-muted text-xs">{l}</p>
                <p className="text-white font-semibold">{v}</p>
              </div>
            ))}
          </div>
          {Object.entries(latestPlan.meals || {}).map(([meal, foods]) => (
            <div key={meal} className="mb-4">
              <h3 className="text-accent capitalize font-medium mb-2">{meal}</h3>
              {Array.isArray(foods) && foods.map((f, i) => (
                <div key={i} className="flex gap-3 text-sm py-1">
                  <span className="text-white">{f.food}</span>
                  <span className="text-text-muted">{f.portion}</span>
                  <span className="text-text-muted ml-auto">{f.calories} kcal</span>
                </div>
              ))}
            </div>
          ))}
          {latestPlan.notes && <p className="text-text-muted text-sm mt-2">{latestPlan.notes}</p>}
        </div>
      )}
    </AppLayout>
  )
}
