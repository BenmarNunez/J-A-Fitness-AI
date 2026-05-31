import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useNutritionStore from '../store/nutritionStore'
import useAuthStore from '../store/authStore'
import api from '../api'

const BUILD_META = {
  light:  { icon: '🏃', label: 'Light Build',  color: 'text-admin-accent', bg: 'bg-admin-accent/8', border: 'border-admin-accent/25' },
  medium: { icon: '💪', label: 'Medium Build', color: 'text-primary',      bg: 'bg-primary/8',      border: 'border-primary/25' },
  heavy:  { icon: '🏋️', label: 'Heavy Build',  color: 'text-warn',         bg: 'bg-warn/8',         border: 'border-warn/25' },
}

const MACRO_COLORS = {
  Calories: 'text-warn',
  Protein:  'text-primary',
  Carbs:    'text-admin-accent',
  Fat:      'text-danger',
}

// #8 — Live Camera capture modal
function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef()
  const canvasRef = useRef()
  const [ready, setReady] = useState(false)
  const [captured, setCaptured] = useState(false)
  const streamRef = useRef()

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setReady(true)
      })
      .catch(() => {
        // fallback to user-facing camera
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            streamRef.current = stream
            videoRef.current.srcObject = stream
            videoRef.current.play()
            setReady(true)
          })
      })
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    setCaptured(true)
  }, [])

  const retake = () => setCaptured(false)

  const confirmCapture = () => {
    canvasRef.current.toBlob(blob => {
      onCapture(blob)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg/95 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-base font-semibold">📷 Scan Food</h3>
          <button onClick={onClose} className="text-text-dim hover:text-danger transition-colors text-xl">✕</button>
        </div>

        <div className="relative bg-bg rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
          <video ref={videoRef} className={`w-full h-full object-cover ${captured ? 'hidden' : ''}`} playsInline muted />
          <canvas ref={canvasRef} className={`w-full h-full object-cover ${captured ? '' : 'hidden'}`} />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
              Starting camera…
            </div>
          )}
          {ready && !captured && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <div className="w-3 h-3 border-2 border-primary rounded-full animate-pulse-soft" />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!captured ? (
            <button onClick={capturePhoto} disabled={!ready} className="btn-primary flex-1">
              📸 Capture
            </button>
          ) : (
            <>
              <button onClick={retake} className="btn-ghost flex-1">Retake</button>
              <button onClick={confirmCapture} className="btn-primary flex-1">✓ Analyze</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Nutrition() {
  const { plans, setPlans, scanResult, setScanResult } = useNutritionStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const fileRef = useRef()

  const bodyBuild = user?.profile?.body_build
  const buildMeta = BUILD_META[bodyBuild]

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

  // #8 — Handle webcam capture blob
  const handleCameraCapture = async (blob) => {
    setShowCamera(false)
    setScanning(true); setError('')
    const formData = new FormData()
    formData.append('image', blob, 'capture.jpg')
    try {
      const { data } = await api.post('/api/nutrition/scan/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setScanResult(data.analysis)
    } catch (err) {
      setError(err.response?.data?.detail || 'Image scan failed.')
    } finally { setScanning(false) }
  }

  const handleFileUpload = async (e) => {
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
      {showCamera && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}

      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">AI-Powered · Filipino Foods</p>
          <h1 className="page-title">Nutrition</h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {/* #8 — Live camera button */}
          <button onClick={() => setShowCamera(true)} disabled={scanning}
            className="btn-ghost text-warn border-warn/30 hover:bg-warn/5 text-xs">
            📷 Camera Scan
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={scanning}
            className="btn-ghost text-text-muted text-xs">
            {scanning ? '⏳ Scanning…' : '📁 Upload'}
          </button>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? '⚡ Generating…' : 'Meal Plan'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      <DisclaimerBanner message="Meal plans use Filipino foods. AI-generated guidance only — consult a registered dietitian for medical dietary advice." />

      {/* Body Build connection banner */}
      {buildMeta ? (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-4 border ${buildMeta.bg} ${buildMeta.border}`}>
          <span className="text-xl shrink-0">{buildMeta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${buildMeta.color}`}>Meal plan tailored for your {buildMeta.label}</p>
            <p className="text-text-dim text-xs">Calories, macros, and meal frequency adjusted for your body classification</p>
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
            <p className="text-text-dim text-xs">Scan your body build for more accurate macro and calorie targets</p>
          </div>
          <span className="text-warn text-xs font-medium shrink-0">Scan →</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-danger/8 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3 mb-5">
          <span>⚠</span> {error}
        </div>
      )}

      {scanning && (
        <div className="card p-8 text-center mb-5">
          <div className="text-3xl mb-3 animate-pulse-soft">🔍</div>
          <p className="text-text-muted text-sm">Analyzing food image…</p>
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
            <h2 className="text-text-base font-semibold">Your Filipino Meal Plan</h2>
            <span className="text-primary font-semibold text-sm">{latestPlan.calories} kcal</span>
          </div>
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

      {!latestPlan && !generating && !scanning && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4 opacity-40">🍚</div>
          <p className="text-text-base font-semibold mb-1">No Meal Plan Yet</p>
          <p className="text-text-muted text-sm">Generate a personalized Filipino daily meal plan.</p>
          <button onClick={handleGenerate} className="btn-primary mt-6">Generate Meal Plan</button>
        </div>
      )}
    </AppLayout>
  )
}
