import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useFitnessStore from '../store/fitnessStore'
import { extractAngles } from '../utils/poseAngles'
import { EXERCISES, updateRepCount } from '../utils/exerciseThresholds'

const EXERCISE_KEYS = Object.keys(EXERCISES)
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

// Map ANY exercise name to closest CV posture key
function mapToPostureKey(name) {
  if (!name) return 'squat'
  const n = name.toLowerCase()
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg press') || n.includes('calf') || n.includes('step up')) return 'squat'
  if (n.includes('curl') || n.includes('bicep') || n.includes('hammer') || n.includes('row') || n.includes('pull') || n.includes('lat')) return 'bicep_curl'
  if (n.includes('push') || n.includes('press') || n.includes('chest') || n.includes('fly') || n.includes('dip') || n.includes('plank') || n.includes('tricep') || n.includes('extension')) return 'push_up'
  if (n.includes('deadlift') || n.includes('rdl') || n.includes('hip') || n.includes('glute') || n.includes('hinge') || n.includes('walk') || n.includes('run') || n.includes('jog') || n.includes('crunch') || n.includes('twist')) return 'deadlift'
  return 'squat'
}

export default function PostureChecker() {
  const { activePlan, postureExercise, setPostureExercise } = useFitnessStore()
  const location = useLocation()
  const navigate = useNavigate()
  const exerciseData = location.state?.exercise

  const [currentSet, setCurrentSet] = useState(1)
  const [workoutComplete, setWorkoutComplete] = useState(false)

  const isAutoMode = useMemo(() => {
    if (!exerciseData) return true // Default to auto for base exercises
    const key = mapToPostureKey(exerciseData.name)
    return !!EXERCISES[key]
  }, [exerciseData])

  const videoRef        = useRef(null)
  const canvasRef       = useRef(null)
  const landmarkerRef   = useRef(null)
  const drawingUtilsRef = useRef(null)
  const animFrameRef    = useRef(null)
  const poseConnectionsRef = useRef(null)
  const repStateRef     = useRef({ count: 0, phase: 'extended' })

  const [selectedExercise, setSelectedExercise] = useState('squat') // CV key
  const [planExSelected, setPlanExSelected]      = useState('')      // plan exercise name
  const [cameraActive, setCameraActive]  = useState(false)
  const [loading, setLoading]            = useState(false)
  const [modelReady, setModelReady]      = useState(false)
  const [repCount, setRepCount]          = useState(0)
  const [formStatus, setFormStatus]      = useState('idle')
  const [feedback, setFeedback]          = useState('')
  const [injuryAlert, setInjuryAlert]    = useState('')
  const [aspectRatio, setAspectRatio]      = useState(4/3)
  const [dimensions, setDimensions]      = useState({ width: 640, height: 480 })

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      const width = isMobile ? window.innerWidth : 640;
      setDimensions({
        width: width,
        height: width / aspectRatio
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [aspectRatio])

  // #9 — All unique exercises from entire plan (all days)
  const planExercises = useMemo(() => {
    const planContent = activePlan?.weekly_schedule || {}
    const schedule = planContent?.weekly_schedule || planContent
    if (!schedule || typeof schedule !== 'object') return []
    const all = []; const seen = new Set()
    Object.values(schedule).forEach(dayExs => {
      if (!Array.isArray(dayExs)) return
      dayExs.forEach(ex => {
        const name = ex.exercise || ex.name || ''
        if (!name || seen.has(name)) return
        seen.add(name)
        all.push({ name, key: mapToPostureKey(name), sets: ex.sets, reps: ex.reps, weight: ex.suggested_weight_kg, instructions: ex.instructions })
      })
    })
    return all
  }, [activePlan])

  const selectedPlanEx = planExercises.find(e => e.name === planExSelected) || null

  useEffect(() => {
    const targetReps = exerciseData?.recommended_reps || selectedPlanEx?.reps;
    const targetSets = exerciseData?.recommended_sets || selectedPlanEx?.sets;

    if (targetReps && repCount >= targetReps) {
      if (currentSet < targetSets) {
        alert("Set Complete! 🎉");
        setRepCount(0);
        setCurrentSet(prev => prev + 1);
        repStateRef.current = { count: 0, phase: 'extended', holdFrames: 0 };
      } else {
        setWorkoutComplete(true);
      }
    }
  }, [repCount, exerciseData, selectedPlanEx, currentSet]);

  // #6 — Auto-select from chatbot sync
  useEffect(() => {
    if (postureExercise && EXERCISES[postureExercise]) {
      setSelectedExercise(postureExercise)
      setPlanExSelected('')
      setPostureExercise(null)
    }
  }, [postureExercise])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision')
        const { PoseLandmarker, FilesetResolver, DrawingUtils } = vision
        poseConnectionsRef.current = PoseLandmarker.POSE_CONNECTIONS
        const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM)
        const poseLandmarker  = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO', numPoses: 1,
        })
        if (!cancelled) {
          landmarkerRef.current = poseLandmarker
          const ctx = canvasRef.current?.getContext('2d')
          if (ctx) drawingUtilsRef.current = new DrawingUtils(ctx)
          setModelReady(true)
        }
      } catch { if (!cancelled) setModelReady(false) }
    }
    load()
    return () => { cancelled = true; if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [])

  const startCamera = async () => {
    setLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      videoRef.current.srcObject = stream
      await new Promise(resolve => { videoRef.current.onloadedmetadata = resolve })
      const video = videoRef.current
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth
        canvasRef.current.height = video.videoHeight
      }
      setAspectRatio(video.videoWidth / video.videoHeight)
      video.play()
      const { DrawingUtils } = await import('@mediapipe/tasks-vision')
      drawingUtilsRef.current = new DrawingUtils(canvasRef.current.getContext('2d'))
      setCameraActive(true)
      startDetectionLoop()
    } catch { setFeedback('Camera access denied.') }
    finally { setLoading(false) }
  }

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false); setFormStatus('idle'); setFeedback(''); setInjuryAlert('')
  }

  const resetReps = () => { repStateRef.current = { count: 0, phase: 'extended', holdFrames: 0 }; setRepCount(0) }

  const handleSelectPlanEx = (ex) => {
    setPlanExSelected(ex.name)
    setSelectedExercise(ex.key)
    resetReps()
    if (cameraActive) stopCamera()
  }

  const handleSelectBaseEx = (key) => {
    setSelectedExercise(key)
    setPlanExSelected('')
    resetReps()
    if (cameraActive) stopCamera()
  }

  const startDetectionLoop = useCallback(() => {
    const detect = async () => {
      const video = videoRef.current; const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2 || !landmarkerRef.current) {
        animFrameRef.current = requestAnimationFrame(detect); return
      }
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height)
      const result = landmarkerRef.current.detectForVideo(video, performance.now())

      if (result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]
        if (drawingUtilsRef.current) {
          drawingUtilsRef.current.drawConnectors(landmarks, poseConnectionsRef.current, { color: '#00E676', lineWidth: 2 })
          drawingUtilsRef.current.drawLandmarks(landmarks, { color: '#00C853', lineWidth: 1, radius: 3 })
        }
        const angles = extractAngles(landmarks)
        if (angles) {
          const exercise = EXERCISES[selectedExercise]
          if (exercise.injuryRisk.check(angles)) {
            setFormStatus('danger'); setInjuryAlert(exercise.injuryRisk.message)
          } else {
            setInjuryAlert('')
            if (exercise.goodForm(angles)) { setFormStatus('good'); setFeedback(exercise.feedback.good) }
            else { setFormStatus('warning'); setFeedback(exercise.feedback.low) }
          }
          if (isAutoMode) {
            repStateRef.current = updateRepCount(repStateRef.current, angles, selectedExercise)
            setRepCount(repStateRef.current.count)
          }
        }
      } else { setFormStatus('idle'); setFeedback('Stand in frame to begin analysis') }

      animFrameRef.current = requestAnimationFrame(detect)
    }
    animFrameRef.current = requestAnimationFrame(detect)
  }, [selectedExercise])

  const STATUS_BORDER = { idle: 'border-border-soft', good: 'border-primary', warning: 'border-warn', danger: 'border-danger' }
  const STATUS_BANNER = {
    danger:  'bg-danger/10 border border-danger/40 text-danger',
    good:    'bg-primary/10 border border-primary/40 text-primary',
    warning: 'bg-warn/10 border border-warn/40 text-warn',
    idle:    'bg-surface border border-border-soft text-text-muted',
  }

  const displayName = planExSelected || EXERCISES[selectedExercise]?.label

  return (
    <AppLayout>
      <div className="mb-5">
        <p className="text-text-muted text-xs uppercase tracking-widest mb-1">AI-Powered CV</p>
        <h1 className="page-title">Posture Check</h1>
      </div>

      <DisclaimerBanner message="Posture analysis is approximate. Results vary with lighting and camera angle. Not a medical diagnostic tool." />

      <div className="flex items-center gap-3 bg-warn/10 border border-warn/30 rounded-xl px-4 py-3 mb-5">
        <span className="shrink-0 text-warn text-lg">⚠️</span>
        <p className="text-warn text-xs font-medium">
          Safety Reminder: Please have a workout buddy or supervisor present during exercise to avoid injury or exercise failure.
        </p>
      </div>

      {/* #9 — All Plan Exercises dropdown */}
      {planExercises.length > 0 && (
        <div className="card p-4 mb-4">
          <p className="stat-label mb-3">From Your Fitness Plan</p>
          <div className="flex flex-wrap gap-2">
            {planExercises.map(ex => (
              <button key={ex.name}
                onClick={() => handleSelectPlanEx(ex)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  planExSelected === ex.name
                    ? 'bg-primary text-bg border-primary shadow-glow-sm'
                    : 'bg-surface border-border-soft text-text-muted hover:text-text-base hover:border-border-mid'
                }`}>
                {ex.name}
              </button>
            ))}
          </div>

          {/* Show selected plan exercise details */}
          {selectedPlanEx && (
            <div className="mt-3 pt-3 border-t border-border-soft grid grid-cols-2 md:grid-cols-4 gap-3">
              {selectedPlanEx.sets && <div><p className="stat-label">Sets</p><p className="text-text-base font-semibold">{selectedPlanEx.sets}</p></div>}
              {selectedPlanEx.reps && <div><p className="stat-label">Reps</p><p className="text-text-base font-semibold">{selectedPlanEx.reps}</p></div>}
              {selectedPlanEx.weight > 0 && <div><p className="stat-label">Weight</p><p className="text-warn font-semibold">{selectedPlanEx.weight} kg</p></div>}
              {selectedPlanEx.key && <div><p className="stat-label">CV Tracking</p><p className="text-primary text-xs font-medium capitalize">{selectedPlanEx.key.replace(/_/g,' ')} pattern</p></div>}
              {selectedPlanEx.instructions && (
                <div className="col-span-2 md:col-span-4">
                  <p className="stat-label">Form Cue</p>
                  <p className="text-text-muted text-xs leading-relaxed">{selectedPlanEx.instructions}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Base exercises */}
      <div className="mb-4">
        <p className="text-text-dim text-xs uppercase tracking-widest mb-2">Base Exercises</p>
        <div className="flex flex-wrap gap-2">
          {EXERCISE_KEYS.map(key => (
            <button key={key} onClick={() => handleSelectBaseEx(key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${
                selectedExercise === key && !planExSelected
                  ? 'bg-primary text-bg border-primary font-semibold shadow-glow-sm'
                  : 'bg-surface border-border-soft text-text-muted hover:text-text-base'
              }`}>
              {EXERCISES[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Rep Controls */}
      {!isAutoMode && (
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setRepCount(prev => Math.max(0, prev - 1))}
            className="w-12 h-12 rounded-full bg-surface border border-border-soft text-2xl flex items-center justify-center hover:bg-border-mid transition"
          >
            -
          </button>
          <div className="text-center">
            <p className="text-xs text-text-muted uppercase">Manual Reps</p>
            <p className="text-3xl font-bold">{repCount}</p>
          </div>
          <button
            onClick={() => setRepCount(prev => prev + 1)}
            className="w-12 h-12 rounded-full bg-primary text-bg text-2xl flex items-center justify-center hover:bg-primary/80 transition"
          >
            +
          </button>
        </div>
      )}

      {/* Camera viewport */}
      <div className={`relative bg-surface border-2 rounded-xl overflow-hidden mb-4 transition-colors duration-500 mx-auto ${STATUS_BORDER[formStatus]}`}
        style={{ width: dimensions.width, height: dimensions.height }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/80 gap-4">
            {!modelReady
              ? <p className="text-text-muted text-sm animate-pulse-soft">Loading AI model…</p>
              : <>
                  <p className="text-text-muted text-sm">Camera off — <span className="text-primary font-medium">{displayName}</span> selected</p>
                  <button onClick={startCamera} disabled={loading} className="btn-primary">
                    {loading ? 'Starting…' : 'Enable Camera'}
                  </button>
                </>
            }
          </div>
        )}

        {cameraActive && (
          <div className="absolute top-3 right-3 bg-bg/80 border border-border-mid rounded-xl px-4 py-2 text-center shadow-glow-sm">
            <p className="text-text-muted text-[10px] uppercase tracking-widest">PROGRESS</p>
            <div className="flex flex-col gap-0.5">
              <p className="text-primary font-display text-2xl">Reps: {repCount} / {exerciseData?.recommended_reps || selectedPlanEx?.reps || '--'}</p>
              <p className="text-primary font-display text-xl">Set: {currentSet} / {exerciseData?.recommended_sets || selectedPlanEx?.sets || '--'}</p>
            </div>
            <p className="text-text-dim text-[10px] max-w-20 truncate">{displayName}</p>
          </div>
        )}

        {workoutComplete && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg/90 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-6xl mb-4">💪</div>
            <h2 className="text-2xl font-bold mb-2">Workout Complete!</h2>
            <p className="text-text-muted mb-6">Great job finishing your sets!</p>
            <button
              onClick={() => navigate('/fitness-plan')}
              className="btn-primary"
            >
              Back to Fitness Plan
            </button>
          </div>
        )}
      </div>

      {cameraActive && (
        <div className={`rounded-xl px-5 py-3 mb-3 text-sm font-medium ${STATUS_BANNER[formStatus]}`}>
          {injuryAlert || feedback || 'Stand in frame to begin…'}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        {cameraActive ? (
          <>
            <button onClick={stopCamera} className="bg-danger/10 border border-danger/30 text-danger px-4 py-2 rounded-lg text-sm hover:bg-danger/20 transition">
              Stop Camera
            </button>
            <button onClick={resetReps} className="bg-surface border border-border-soft text-text-muted px-4 py-2 rounded-lg text-sm hover:text-text-base transition">
              Reset Reps
            </button>
          </>
        ) : (
          <button onClick={startCamera} disabled={loading || !modelReady} className="btn-primary">
            {loading ? 'Starting…' : !modelReady ? 'Loading model…' : 'Start Camera'}
          </button>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-text-base font-semibold mb-3">How to use</h2>
        <ol className="text-text-muted text-sm space-y-1.5 list-decimal list-inside">
          <li>Pick any exercise from <span className="text-primary">your plan</span> or choose a base exercise</li>
          <li>Click <strong>Enable Camera</strong> and allow browser camera access</li>
          <li>Position so your full body is visible in frame</li>
          <li>Perform the exercise — reps count automatically via CV</li>
          <li><span className="text-primary">Green</span> = good form · <span className="text-warn">Yellow</span> = adjust · <span className="text-danger">Red</span> = injury risk</li>
        </ol>
      </div>
    </AppLayout>
  )
}
