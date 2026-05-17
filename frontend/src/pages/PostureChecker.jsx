import { useEffect, useRef, useState, useCallback } from 'react'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import { extractAngles } from '../utils/poseAngles'
import { EXERCISES, updateRepCount } from '../utils/exerciseThresholds'

const EXERCISE_KEYS = Object.keys(EXERCISES)
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

export default function PostureChecker() {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const landmarkerRef   = useRef(null)
  const drawingUtilsRef = useRef(null)
  const animFrameRef    = useRef(null)
  const repStateRef     = useRef({ count: 0, phase: 'extended' })

  const [selectedExercise, setSelectedExercise] = useState('squat')
  const [cameraActive, setCameraActive]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [modelReady, setModelReady]       = useState(false)
  const [repCount, setRepCount]           = useState(0)
  const [formStatus, setFormStatus]       = useState('idle')
  const [feedback, setFeedback]           = useState('')
  const [injuryAlert, setInjuryAlert]     = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision')
        const { PoseLandmarker, FilesetResolver, DrawingUtils } = vision
        const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM)
        const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        })
        if (!cancelled) {
          landmarkerRef.current = poseLandmarker
          const canvas = canvasRef.current
          const ctx = canvas?.getContext('2d')
          if (ctx) drawingUtilsRef.current = new DrawingUtils(ctx)
          setModelReady(true)
        }
      } catch {
        if (!cancelled) setModelReady(false)
      }
    }
    load()
    return () => {
      cancelled = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const startCamera = async () => {
    setLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      videoRef.current.srcObject = stream
      await new Promise(resolve => { videoRef.current.onloadedmetadata = resolve })
      videoRef.current.play()

      const vision = await import('@mediapipe/tasks-vision')
      const { DrawingUtils } = vision
      const ctx = canvasRef.current.getContext('2d')
      drawingUtilsRef.current = new DrawingUtils(ctx)

      setCameraActive(true)
      startDetectionLoop()
    } catch {
      setFeedback('Camera access denied. Enable camera permission and try again.')
    } finally {
      setLoading(false)
    }
  }

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
    setFormStatus('idle')
    setFeedback('')
    setInjuryAlert('')
  }

  const resetReps = () => {
    repStateRef.current = { count: 0, phase: 'extended' }
    setRepCount(0)
  }

  const startDetectionLoop = useCallback(() => {
    const detect = async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2 || !landmarkerRef.current) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const result = landmarkerRef.current.detectForVideo(video, performance.now())

      if (result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]
        const vision = await import('@mediapipe/tasks-vision')
        const { PoseLandmarker } = vision

        if (drawingUtilsRef.current) {
          drawingUtilsRef.current.drawConnectors(
            landmarks,
            PoseLandmarker.POSE_CONNECTIONS,
            { color: '#5DCAA5', lineWidth: 2 }
          )
          drawingUtilsRef.current.drawLandmarks(landmarks, {
            color: '#0D9373',
            lineWidth: 1,
            radius: 3,
          })
        }

        const angles = extractAngles(landmarks)
        if (angles) {
          const exercise = EXERCISES[selectedExercise]
          if (exercise.injuryRisk.check(angles)) {
            setFormStatus('danger')
            setInjuryAlert(exercise.injuryRisk.message)
          } else {
            setInjuryAlert('')
            if (exercise.goodForm(angles)) {
              setFormStatus('good')
              setFeedback(exercise.feedback.good)
            } else {
              setFormStatus('warning')
              setFeedback(exercise.feedback.low)
            }
          }
          repStateRef.current = updateRepCount(repStateRef.current, angles, selectedExercise)
          setRepCount(repStateRef.current.count)
        }
      } else {
        setFormStatus('idle')
        setFeedback('Stand in frame to begin analysis')
      }

      animFrameRef.current = requestAnimationFrame(detect)
    }
    animFrameRef.current = requestAnimationFrame(detect)
  }, [selectedExercise])

  const STATUS_BORDER = {
    idle:    'border-accent/20',
    good:    'border-accent',
    warning: 'border-warn',
    danger:  'border-danger',
  }

  const STATUS_BANNER = {
    danger:  'bg-danger/10 border border-danger/40 text-danger',
    good:    'bg-accent/10 border border-accent/40 text-accent',
    warning: 'bg-warn/10 border border-warn/40 text-warn',
    idle:    'bg-surface border border-white/10 text-text-muted',
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-white mb-4">Posture Checker</h1>
      <DisclaimerBanner message="Posture analysis is approximate. Results vary with lighting and camera angle. Not a medical diagnostic tool." />

      {/* Exercise selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXERCISE_KEYS.map(key => (
          <button
            key={key}
            onClick={() => { setSelectedExercise(key); resetReps() }}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              selectedExercise === key
                ? 'bg-primary text-white font-semibold'
                : 'bg-surface border border-accent/20 text-text-muted hover:text-white'
            }`}
          >
            {EXERCISES[key].label}
          </button>
        ))}
      </div>

      {/* Camera viewport */}
      <div
        className={`relative bg-surface border-2 rounded-xl overflow-hidden mb-4 ${STATUS_BORDER[formStatus]}`}
        style={{ aspectRatio: '16/9', maxHeight: 480 }}
      >
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/80 gap-4">
            {!modelReady
              ? <p className="text-text-muted text-sm">Loading AI model…</p>
              : <>
                  <p className="text-text-muted text-sm">Camera is off</p>
                  <button
                    onClick={startCamera}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition"
                  >
                    {loading ? 'Starting…' : 'Enable Camera'}
                  </button>
                </>
            }
          </div>
        )}

        {cameraActive && (
          <div className="absolute top-3 right-3 bg-bg/80 border border-accent/30 rounded-xl px-4 py-2 text-center">
            <p className="text-text-muted text-xs">REPS</p>
            <p className="text-white text-3xl font-bold">{repCount}</p>
          </div>
        )}
      </div>

      {/* Feedback bar */}
      {cameraActive && (
        <div className={`rounded-xl px-5 py-3 mb-3 text-sm font-medium ${STATUS_BANNER[formStatus]}`}>
          {injuryAlert || feedback || 'Stand in frame to begin…'}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        {cameraActive ? (
          <>
            <button onClick={stopCamera}
              className="bg-danger/10 border border-danger/30 text-danger px-4 py-2 rounded-lg text-sm hover:bg-danger/20 transition">
              Stop Camera
            </button>
            <button onClick={resetReps}
              className="bg-surface border border-accent/20 text-text-muted px-4 py-2 rounded-lg text-sm hover:text-white transition">
              Reset Reps
            </button>
          </>
        ) : (
          <button
            onClick={startCamera}
            disabled={loading || !modelReady}
            className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm transition"
          >
            {loading ? 'Starting…' : !modelReady ? 'Loading model…' : 'Start Camera'}
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-surface border border-accent/20 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-2">How to use</h2>
        <ol className="text-text-muted text-sm space-y-1 list-decimal list-inside">
          <li>Select your exercise above</li>
          <li>Click Enable Camera and allow browser camera access</li>
          <li>Position yourself so your full body is visible</li>
          <li>Perform the exercise — reps count automatically</li>
          <li>Green border = good form · Yellow = adjust · Red = injury risk</li>
        </ol>
      </div>
    </AppLayout>
  )
}
