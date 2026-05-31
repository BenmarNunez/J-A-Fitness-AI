import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useAuthStore from '../store/authStore'
import api from '../api'

// ── Body Build Classification ─────────────────────────────────────────────────
// Uses MediaPipe landmark ratios (scale-invariant):
//   frame_ratio = shoulder_width / torso_height
//   hip_shoulder_ratio = hip_width / shoulder_width
//
// Thresholds calibrated for typical body types:
//   Light  (Ectomorph)  : narrow frame, slim
//   Medium (Mesomorph)  : balanced, athletic
//   Heavy  (Endomorph)  : wider frame, more mass

const SCAN_DURATION_MS  = 5000  // 5-second scan
const MEDIAPIPE_WASM    = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const POSE_MODEL        = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const VIS_MIN           = 0.5

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function classifyBuild(measurements) {
  if (!measurements.length) return null
  const avg = (key) => measurements.reduce((s, m) => s + m[key], 0) / measurements.length

  const frameRatio       = avg('frameRatio')       // shoulder_width / torso_height
  const hipShoulderRatio = avg('hipShoulderRatio')  // hip_width / shoulder_width

  // Heavy: wide frame OR wide hips relative to shoulders (endomorph)
  if (frameRatio > 0.68 || (hipShoulderRatio > 1.05 && frameRatio > 0.5)) return 'heavy'
  // Light: narrow frame (ectomorph)
  if (frameRatio < 0.46) return 'light'
  // Medium: balanced (mesomorph)
  return 'medium'
}

function getMeasurement(landmarks) {
  const lShoulder = landmarks[11], rShoulder = landmarks[12]
  const lHip = landmarks[23],      rHip      = landmarks[24]

  const visible = (lm) => lm && (lm.visibility ?? 1) >= VIS_MIN
  if (!visible(lShoulder) || !visible(rShoulder) || !visible(lHip) || !visible(rHip)) return null

  const shoulderWidth = dist(lShoulder, rShoulder)
  const hipWidth      = dist(lHip, rHip)
  const shoulderMid   = { x: (lShoulder.x + rShoulder.x) / 2, y: (lShoulder.y + rShoulder.y) / 2 }
  const hipMid        = { x: (lHip.x + rHip.x) / 2,           y: (lHip.y + rHip.y) / 2 }
  const torsoHeight   = dist(shoulderMid, hipMid)

  if (torsoHeight < 0.05 || shoulderWidth < 0.01) return null

  return {
    frameRatio:       shoulderWidth / torsoHeight,
    hipShoulderRatio: hipWidth / shoulderWidth,
  }
}

const BUILD_INFO = {
  light: {
    label: 'Light Build',
    icon:  '🏃',
    color: 'text-admin-accent',
    bg:    'bg-admin-accent/10',
    border:'border-admin-accent/30',
    desc:  'Slim/Ectomorph frame. Your plans will focus on building muscle mass with compound lifts and a slight caloric surplus.',
  },
  medium: {
    label: 'Medium Build',
    icon:  '💪',
    color: 'text-primary',
    bg:    'bg-primary/10',
    border:'border-primary/30',
    desc:  'Balanced/Mesomorph frame. Your plans will combine strength training and conditioning with balanced macros.',
  },
  heavy: {
    label: 'Heavy Build',
    icon:  '🏋️',
    color: 'text-warn',
    bg:    'bg-warn/10',
    border:'border-warn/30',
    desc:  'Full/Endomorph frame. Your plans will prioritize fat-burning circuits, cardio intervals, and a caloric deficit.',
  },
}

export default function BodyScanner() {
  const { user, setAuth, token } = useAuthStore()
  const navigate = useNavigate()

  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const landmarkerRef = useRef(null)
  const animFrameRef  = useRef(null)
  const streamRef     = useRef(null)

  const [phase, setPhase]           = useState('idle')   // idle | loading | ready | scanning | result | saving
  const [countdown, setCountdown]   = useState(5)
  const [scanProgress, setScanProgress] = useState(0)
  const [measurements, setMeasurements] = useState([])
  const [result, setResult]         = useState(null)     // 'light' | 'medium' | 'heavy'
  const [frameCount, setFrameCount] = useState(0)
  const [error, setError]           = useState('')
  const [saved, setSaved]           = useState(false)

  const existingBuild = user?.profile?.body_build

  // Load MediaPipe model
  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    const load = async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision')
        const { PoseLandmarker, FilesetResolver } = vision
        const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM)
        const poseLandmarker  = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO', numPoses: 1,
        })
        if (!cancelled) { landmarkerRef.current = poseLandmarker; setPhase('ready') }
      } catch { if (!cancelled) { setPhase('ready') } } // continue even if GPU fails
    }
    load()
    return () => {
      cancelled = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await new Promise(resolve => { videoRef.current.onloadedmetadata = resolve })
      videoRef.current.play()
    } catch {
      setError('Camera access denied. Please allow camera permission.')
    }
  }

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    streamRef.current = null
  }

  const startScan = useCallback(async () => {
    setPhase('scanning')
    setMeasurements([])
    setScanProgress(0)
    setFrameCount(0)
    setCountdown(5)

    await startCamera()

    const collected = []
    const startTime = Date.now()

    const tick = () => {
      const elapsed  = Date.now() - startTime
      const progress = Math.min((elapsed / SCAN_DURATION_MS) * 100, 100)
      setScanProgress(Math.round(progress))
      setCountdown(Math.max(0, Math.ceil((SCAN_DURATION_MS - elapsed) / 1000)))

      const video  = videoRef.current
      const canvas = canvasRef.current

      if (video && canvas && video.readyState >= 2 && landmarkerRef.current) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const res = landmarkerRef.current.detectForVideo(video, performance.now())
        if (res.landmarks.length > 0) {
          // Draw skeleton overlay
          drawSkeleton(ctx, res.landmarks[0], canvas.width, canvas.height)

          const m = getMeasurement(res.landmarks[0])
          if (m) {
            collected.push(m)
            setFrameCount(collected.length)
          }
        }
      }

      if (elapsed < SCAN_DURATION_MS) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        // Scan done
        stopCamera()
        const build = classifyBuild(collected)
        setResult(build)
        setPhase('result')
      }
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  function drawSkeleton(ctx, landmarks, w, h) {
    // Draw body keypoints as dots
    const keyPoints = [11,12,13,14,15,16,23,24,25,26,27,28]
    ctx.fillStyle = 'rgba(0, 230, 118, 0.8)'
    keyPoints.forEach(i => {
      const lm = landmarks[i]
      if (lm && (lm.visibility ?? 1) > 0.5) {
        ctx.beginPath()
        ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    // Draw connections
    const connections = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]]
    ctx.strokeStyle = 'rgba(0, 230, 118, 0.5)'
    ctx.lineWidth = 2
    connections.forEach(([a, b]) => {
      const la = landmarks[a], lb = landmarks[b]
      if (la && lb && (la.visibility ?? 1) > 0.5 && (lb.visibility ?? 1) > 0.5) {
        ctx.beginPath()
        ctx.moveTo(la.x * w, la.y * h)
        ctx.lineTo(lb.x * w, lb.y * h)
        ctx.stroke()
      }
    })
  }

  const saveBuild = async () => {
    if (!result) return
    setPhase('saving')
    try {
      const { data } = await api.put('/api/profile/', { body_build: result })
      setAuth(token, data)
      setSaved(true)
      setTimeout(() => navigate('/profile'), 1500)
    } catch {
      setError('Failed to save. Try again.')
      setPhase('result')
    }
  }

  const reset = () => {
    stopCamera()
    setPhase('ready')
    setResult(null)
    setScanProgress(0)
    setFrameCount(0)
    setSaved(false)
  }

  const info = result ? BUILD_INFO[result] : null

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-text-muted text-xs uppercase tracking-widest mb-1">AI Vision</p>
        <h1 className="page-title">Body Build Scan</h1>
        <p className="text-text-muted text-sm mt-2">
          Stand 1.5–2 meters from camera. Full body visible. System analyzes your body frame to personalize your plans.
        </p>
      </div>

      {/* Existing build badge */}
      {existingBuild && (
        <div className={`card p-4 mb-5 flex items-center gap-3 ${BUILD_INFO[existingBuild]?.border}`}>
          <span className="text-2xl">{BUILD_INFO[existingBuild]?.icon}</span>
          <div>
            <p className="stat-label">Current Classification</p>
            <p className={`font-semibold ${BUILD_INFO[existingBuild]?.color}`}>{BUILD_INFO[existingBuild]?.label}</p>
          </div>
          <button onClick={reset} className="ml-auto text-xs text-text-dim hover:text-text-muted transition-colors border border-border-soft rounded-lg px-3 py-1.5">
            Rescan
          </button>
        </div>
      )}

      {error && (
        <div className="bg-danger/8 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Camera / Result */}
        <div>
          {/* Camera feed */}
          {(phase === 'scanning') && (
            <div className="relative bg-bg border-2 border-primary/50 rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

              {/* Silhouette guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg viewBox="0 0 100 200" className="h-3/4 opacity-20 fill-primary">
                  <ellipse cx="50" cy="25" rx="16" ry="20" />
                  <rect x="30" y="45" width="40" height="55" rx="8" />
                  <rect x="12" y="47" width="15" height="45" rx="7" />
                  <rect x="73" y="47" width="15" height="45" rx="7" />
                  <rect x="30" y="98" width="17" height="55" rx="7" />
                  <rect x="53" y="98" width="17" height="55" rx="7" />
                </svg>
              </div>

              {/* Progress overlay */}
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-bg/80 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-primary text-xs font-medium animate-pulse-soft">● Scanning…</span>
                    <span className="text-text-muted text-xs">{countdown}s remaining · {frameCount} samples</span>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hidden video/canvas for non-scanning phases */}
          {phase !== 'scanning' && (
            <div style={{ display: 'none' }}>
              <video ref={videoRef} playsInline muted />
              <canvas ref={canvasRef} />
            </div>
          )}

          {/* Result card */}
          {phase === 'result' && info && (
            <div className={`card p-8 text-center ${info.bg} ${info.border} animate-fade-up`}>
              <div className="text-5xl mb-3">{info.icon}</div>
              <p className="stat-label mb-1">Scan Result</p>
              <p className={`font-display text-4xl tracking-wide ${info.color} mb-2`}>{info.label}</p>
              <p className="text-text-muted text-sm leading-relaxed mb-1">{info.desc}</p>
              <p className="text-text-dim text-xs">Based on {frameCount} camera samples</p>

              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={reset} className="btn-ghost text-sm">Rescan</button>
                <button onClick={saveBuild} disabled={phase === 'saving'} className="btn-primary">
                  {phase === 'saving' ? 'Saving…' : saved ? '✓ Saved!' : 'Save & Apply'}
                </button>
              </div>
            </div>
          )}

          {/* Start scan button */}
          {(phase === 'ready' || phase === 'idle') && !result && (
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4 opacity-50">📷</div>
              <p className="text-text-base font-semibold mb-2">Ready to Scan</p>
              <p className="text-text-muted text-sm mb-6">5-second AI body analysis using your camera</p>
              <button onClick={startScan} className="btn-primary">
                Start Body Scan
              </button>
            </div>
          )}

          {phase === 'loading' && (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-3 animate-pulse-soft">🧠</div>
              <p className="text-text-muted text-sm">Loading AI vision model…</p>
            </div>
          )}
        </div>

        {/* Instructions + Build Guide */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-text-base font-semibold mb-3">How it works</h3>
            <ol className="text-text-muted text-sm space-y-2.5 list-decimal list-inside">
              <li>Stand <strong>1.5–2 meters</strong> from camera, full body visible</li>
              <li>Stand straight, arms slightly away from body</li>
              <li>AI scans your <strong>shoulder width, hip width</strong>, and frame proportions</li>
              <li>System classifies your build in <strong>5 seconds</strong></li>
              <li>Save result — your <strong>fitness & meal plans</strong> will be tailored to your build</li>
            </ol>
          </div>

          <div className="card p-5">
            <h3 className="text-text-base font-semibold mb-3">Build Classifications</h3>
            <div className="space-y-3">
              {Object.entries(BUILD_INFO).map(([key, b]) => (
                <div key={key} className={`flex gap-3 p-3 rounded-lg border ${b.border} ${b.bg}`}>
                  <span className="text-xl shrink-0">{b.icon}</span>
                  <div>
                    <p className={`font-semibold text-sm ${b.color}`}>{b.label}</p>
                    <p className="text-text-muted text-xs leading-relaxed mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
