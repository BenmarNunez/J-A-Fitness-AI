# Phase 3 — Computer Vision + Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the PostureChecker module using MediaPipe Tasks Vision API (in-browser WASM), then deploy frontend to Vercel and backend to Railway with production configuration.

**Architecture:** PostureChecker runs entirely in the browser — no video sent to server. `@mediapipe/tasks-vision` PoseLandmarker detects 33 body landmarks per frame via requestAnimationFrame loop. Joint angles determine form correctness and rep count for 4 supported exercises. Deployment uses Vercel (frontend) and Railway (backend + PostgreSQL).

**Tech Stack:** `@mediapipe/tasks-vision`, MediaPipe Pose Landmarker WASM model, HTML5 Canvas, React 19 refs + useEffect, Vercel CLI, Railway CLI / Railway dashboard

**Prerequisite:** Phases 1 and 2 complete and all tests passing.

---

## File Map

```
frontend/src/
├── pages/
│   └── PostureChecker.jsx    ← replace stub, full implementation
├── utils/
│   ├── poseAngles.js         ← joint angle calculation from landmarks
│   └── exerciseThresholds.js ← per-exercise angle thresholds + rep logic

backend/
├── config/
│   └── settings.py           ← production settings additions
├── Procfile                  ← for Railway deployment
├── runtime.txt               ← Python version for Railway
└── requirements.txt          ← add gunicorn, whitenoise

frontend/
├── vercel.json               ← Vercel SPA routing config
└── .env.production           ← production env vars (not committed)
```

---

## Task 1: Angle Calculation Utilities

**Files:**
- Create: `frontend/src/utils/poseAngles.js`
- Create: `frontend/src/utils/exerciseThresholds.js`

- [ ] **Step 1: Write poseAngles.js**

MediaPipe PoseLandmarker returns 33 landmarks, each with `{x, y, z, visibility}`. Landmark indices: `https://developers.google.com/mediapipe/solutions/vision/pose_landmarker`

Key indices used:
- 11: left shoulder, 12: right shoulder
- 13: left elbow, 14: right elbow
- 15: left wrist, 16: right wrist
- 23: left hip, 24: right hip
- 25: left knee, 26: right knee
- 27: left ankle, 28: right ankle

```javascript
// Calculate angle (degrees) at point B formed by A-B-C
export function angleBetween(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

// Extract angles needed for all supported exercises from pose landmarks
export function extractAngles(landmarks) {
  if (!landmarks || landmarks.length < 29) return null

  const [
    , , , , , , , , , , ,
    lShoulder, rShoulder,
    lElbow, rElbow,
    lWrist, rWrist,
    , , , , ,
    lHip, rHip,
    lKnee, rKnee,
    lAnkle, rAnkle,
  ] = landmarks

  return {
    leftElbow: angleBetween(lShoulder, lElbow, lWrist),
    rightElbow: angleBetween(rShoulder, rElbow, rWrist),
    leftKnee: angleBetween(lHip, lKnee, lAnkle),
    rightKnee: angleBetween(rHip, rKnee, rAnkle),
    leftHip: angleBetween(lShoulder, lHip, lKnee),
    rightHip: angleBetween(rShoulder, rHip, rKnee),
    leftShoulder: angleBetween(lElbow, lShoulder, lHip),
    rightShoulder: angleBetween(rElbow, rShoulder, rHip),
  }
}
```

- [ ] **Step 2: Write exerciseThresholds.js**

```javascript
// Rep counting uses a simple state machine: EXTENDED → CONTRACTED → EXTENDED = 1 rep
// Injury risk uses separate threshold — angle exceeds safe range

export const EXERCISES = {
  squat: {
    label: 'Squat',
    // Rep counted when both knees flex below 100° then extend above 160°
    repAngle: 'leftKnee',
    contractedBelow: 100,
    extendedAbove: 160,
    injuryRisk: {
      check: (angles) => angles.leftKnee < 60 || angles.rightKnee < 60,
      message: 'Knees too deep — risk of joint stress. Keep knees above 70°.',
    },
    goodForm: (angles) => angles.leftKnee > 85 && angles.leftKnee < 120,
    feedback: {
      good: 'Good squat depth!',
      low: 'Go lower — aim for 90°',
      high: 'Stand taller at the top',
    },
  },

  bicep_curl: {
    label: 'Bicep Curl',
    repAngle: 'leftElbow',
    contractedBelow: 60,
    extendedAbove: 150,
    injuryRisk: {
      check: (angles) => angles.leftShoulder > 45,
      message: 'Keep elbow tucked — shoulder swinging detected.',
    },
    goodForm: (angles) => angles.leftElbow > 40 && angles.leftElbow < 70,
    feedback: {
      good: 'Good curl!',
      low: 'Curl all the way up',
      high: 'Extend fully at the bottom',
    },
  },

  push_up: {
    label: 'Push Up',
    repAngle: 'leftElbow',
    contractedBelow: 90,
    extendedAbove: 160,
    injuryRisk: {
      check: (angles) => angles.leftHip < 150 || angles.rightHip < 150,
      message: 'Keep your body straight — hips are sagging.',
    },
    goodForm: (angles) => angles.leftElbow < 95 && angles.leftElbow > 70,
    feedback: {
      good: 'Great push-up!',
      low: 'Lower your chest to the ground',
      high: 'Fully extend arms at the top',
    },
  },

  deadlift: {
    label: 'Deadlift',
    repAngle: 'leftHip',
    contractedBelow: 140,
    extendedAbove: 170,
    injuryRisk: {
      check: (angles) => angles.leftHip < 100 && angles.leftKnee > 160,
      message: 'Spine rounding detected — engage your core, keep back flat.',
    },
    goodForm: (angles) => angles.leftHip > 130 && angles.leftKnee > 155,
    feedback: {
      good: 'Good hip hinge!',
      low: 'Drive hips back further',
      high: 'Stand tall at the top',
    },
  },
}

// State machine: 'extended' | 'contracted'
export function updateRepCount(state, angles, exercise) {
  const config = EXERCISES[exercise]
  if (!config || !angles) return state

  const angle = angles[config.repAngle]
  if (angle === undefined) return state

  let { count, phase } = state

  if (phase === 'extended' && angle < config.contractedBelow) {
    phase = 'contracted'
  } else if (phase === 'contracted' && angle > config.extendedAbove) {
    phase = 'extended'
    count += 1
  }

  return { count, phase }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/
git commit -m "feat: add pose angle utilities and exercise thresholds for posture checker"
```

---

## Task 2: PostureChecker Page

**Files:**
- Modify: `frontend/src/pages/PostureChecker.jsx`

- [ ] **Step 1: Install MediaPipe Tasks Vision**

```bash
cd frontend
npm install @mediapipe/tasks-vision
```

- [ ] **Step 2: Write PostureChecker.jsx**

```jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import { extractAngles } from '../utils/poseAngles'
import { EXERCISES, updateRepCount } from '../utils/exerciseThresholds'

const EXERCISE_KEYS = Object.keys(EXERCISES)

export default function PostureChecker() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const landmarkerRef = useRef(null)
  const drawingUtilsRef = useRef(null)
  const animFrameRef = useRef(null)
  const repStateRef = useRef({ count: 0, phase: 'extended' })

  const [selectedExercise, setSelectedExercise] = useState('squat')
  const [cameraActive, setCameraActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [formStatus, setFormStatus] = useState('idle') // 'idle' | 'good' | 'warning' | 'danger'
  const [feedback, setFeedback] = useState('')
  const [injuryAlert, setInjuryAlert] = useState('')
  const [modelReady, setModelReady] = useState(false)

  // Load MediaPipe model once
  useEffect(() => {
    const loadModel = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
      setModelReady(true)
    }
    loadModel()
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const startCamera = async () => {
    setLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play()
        const ctx = canvasRef.current.getContext('2d')
        drawingUtilsRef.current = new DrawingUtils(ctx)
        setCameraActive(true)
        startDetectionLoop()
      }
    } catch (err) {
      setFeedback('Camera access denied. Enable camera permission and try again.')
    } finally {
      setLoading(false)
    }
  }

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    const stream = videoRef.current?.srcObject
    stream?.getTracks().forEach(t => t.stop())
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
    const detect = () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !landmarkerRef.current) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const result = landmarkerRef.current.detectForVideo(video, performance.now())

      if (result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]

        // Draw skeleton
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

        // Analyse angles
        const angles = extractAngles(landmarks)
        if (angles) {
          const exercise = EXERCISES[selectedExercise]

          // Injury risk
          if (exercise.injuryRisk.check(angles)) {
            setFormStatus('danger')
            setInjuryAlert(exercise.injuryRisk.message)
          } else {
            setInjuryAlert('')

            // Form quality
            if (exercise.goodForm(angles)) {
              setFormStatus('good')
              setFeedback(exercise.feedback.good)
            } else {
              setFormStatus('warning')
              setFeedback(exercise.feedback.low)
            }
          }

          // Rep counting
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

  const STATUS_COLORS = {
    idle: 'border-accent/20',
    good: 'border-accent',
    warning: 'border-warn',
    danger: 'border-danger',
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-white mb-4">Posture Checker</h1>
      <DisclaimerBanner message="Posture analysis is approximate and uses computer vision angle estimation. Not a medical diagnostic tool. Results may vary based on lighting and camera angle." />

      {/* Exercise selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXERCISE_KEYS.map(key => (
          <button
            key={key}
            onClick={() => {
              setSelectedExercise(key)
              resetReps()
            }}
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

      {/* Camera area */}
      <div className={`relative bg-surface border-2 rounded-xl overflow-hidden mb-4 ${STATUS_COLORS[formStatus]}`}
        style={{ aspectRatio: '16/9', maxHeight: '480px' }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/80">
            {!modelReady ? (
              <p className="text-text-muted text-sm">Loading AI model…</p>
            ) : (
              <>
                <p className="text-text-muted text-sm mb-4">Camera is off</p>
                <button
                  onClick={startCamera}
                  disabled={loading || !modelReady}
                  className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg transition"
                >
                  {loading ? 'Starting…' : 'Enable Camera'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Rep counter overlay */}
        {cameraActive && (
          <div className="absolute top-3 right-3 bg-bg/80 border border-accent/30 rounded-xl px-4 py-2 text-center">
            <p className="text-text-muted text-xs">REPS</p>
            <p className="text-white text-3xl font-bold">{repCount}</p>
          </div>
        )}
      </div>

      {/* Feedback bar */}
      {cameraActive && (
        <div className={`rounded-xl px-5 py-3 mb-3 text-sm font-medium ${
          formStatus === 'danger' ? 'bg-danger/10 border border-danger/40 text-danger' :
          formStatus === 'good' ? 'bg-accent/10 border border-accent/40 text-accent' :
          formStatus === 'warning' ? 'bg-warn/10 border border-warn/40 text-warn' :
          'bg-surface border border-white/10 text-text-muted'
        }`}>
          {injuryAlert || feedback || 'Stand in frame to begin…'}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
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

      {/* How it works */}
      <div className="mt-6 bg-surface border border-accent/20 rounded-xl p-5">
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
```

- [ ] **Step 3: Test PostureChecker in browser**

```bash
npm run dev
```

Navigate to `http://localhost:5173/posture` (as active member). Click Enable Camera. Allow browser camera permission. Verify:
- Skeleton draws on canvas
- Rep counter increments during squat motion
- Border color changes with form quality
- Stop Camera cleans up stream

Test all 4 exercises: squat, bicep_curl, push_up, deadlift.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PostureChecker.jsx frontend/src/utils/
git commit -m "feat: add posture checker with mediapipe tasks vision, rep counting, injury detection"
```

---

## Task 3: Production Backend Configuration

**Files:**
- Modify: `backend/config/settings.py`
- Modify: `backend/requirements.txt`
- Create: `backend/Procfile`
- Create: `backend/runtime.txt`

- [ ] **Step 1: Add production dependencies**

```bash
cd backend
pip install gunicorn==22.0.0 whitenoise==6.7.0
```

Update `backend/requirements.txt`:

```
django==5.0.6
djangorestframework==3.15.2
django-cors-headers==4.4.0
python-decouple==3.8
Pillow==10.4.0
psycopg2-binary==2.9.9
pytest-django==4.8.0
pytest==8.3.2
google-generativeai==0.7.2
gunicorn==22.0.0
whitenoise==6.7.0
dj-database-url==2.2.0
```

Install `dj-database-url`:
```bash
pip install dj-database-url==2.2.0
```

- [ ] **Step 2: Update settings.py for production**

Append to `backend/config/settings.py`:

```python
import dj_database_url

# Production database — override SQLite with DATABASE_URL env var if set
DATABASE_URL = config('DATABASE_URL', default='')
if DATABASE_URL:
    DATABASES['default'] = dj_database_url.parse(DATABASE_URL, conn_max_age=600)

# WhiteNoise for static files
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Production security (only when DEBUG=False)
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
```

- [ ] **Step 3: Create Procfile**

```
web: gunicorn config.wsgi --log-file -
```

- [ ] **Step 4: Create runtime.txt**

```
python-3.12.3
```

- [ ] **Step 5: Run migrations and collect static**

```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

- [ ] **Step 6: Test gunicorn locally**

```bash
gunicorn config.wsgi --log-file -
```

Expected: server starts on port 8000, no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "chore: add production config — gunicorn, whitenoise, dj-database-url"
```

---

## Task 4: Vercel Frontend Deployment

**Files:**
- Create: `frontend/vercel.json`

- [ ] **Step 1: Create vercel.json**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

This ensures React Router handles all routes (not Vercel 404).

- [ ] **Step 2: Build frontend and verify**

```bash
cd frontend
npm run build
```

Expected: `dist/` directory created, no TypeScript/build errors.

- [ ] **Step 3: Deploy to Vercel**

Install Vercel CLI if not present:
```bash
npm install -g vercel
```

Deploy:
```bash
vercel
```

Follow prompts:
- Set up and deploy: `Y`
- Which scope: select your account
- Link to existing project: `N`
- Project name: `ja-fitness-ai-frontend`
- Directory: `./` (from inside frontend/)
- Override settings: `N`

- [ ] **Step 4: Set environment variables in Vercel dashboard**

Go to Vercel dashboard → project → Settings → Environment Variables. Add:
```
VITE_API_URL = https://your-railway-backend-url.railway.app
VITE_GEMINI_PUBLIC_KEY = your-restricted-gemini-key
```

- [ ] **Step 5: Redeploy with env vars**

```bash
vercel --prod
```

- [ ] **Step 6: Set HTTP referrer restriction on VITE_GEMINI_PUBLIC_KEY**

In Google AI Studio → API Keys → edit the public key → add HTTP referrer restriction:
```
https://your-vercel-domain.vercel.app/*
```

This prevents the key being used from other origins.

- [ ] **Step 7: Commit**

```bash
git add frontend/vercel.json
git commit -m "chore: add vercel.json for SPA routing"
```

---

## Task 5: Railway Backend Deployment

- [ ] **Step 1: Create Railway project**

Go to `https://railway.app` → New Project → Deploy from GitHub repo → select this repo.

Or use Railway CLI:
```bash
npm install -g @railway/cli
railway login
railway init
```

- [ ] **Step 2: Add PostgreSQL service**

In Railway dashboard → project → Add Service → Database → PostgreSQL. Railway auto-sets `DATABASE_URL` environment variable.

- [ ] **Step 3: Set environment variables in Railway**

In Railway → backend service → Variables. Add:
```
SECRET_KEY = generate-a-long-random-string-here
DEBUG = False
ALLOWED_HOSTS = your-railway-domain.railway.app
CORS_ALLOWED_ORIGINS = https://your-vercel-domain.vercel.app
GEMINI_API_KEY = your-server-side-gemini-key
DATABASE_URL = (auto-set by Railway PostgreSQL plugin)
```

Generate SECRET_KEY:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

- [ ] **Step 4: Set Railway root directory**

In Railway → service settings → Root Directory → set to `backend/`.

Set Start Command:
```
gunicorn config.wsgi --log-file -
```

- [ ] **Step 5: Trigger deploy and run migrations**

Push to git — Railway auto-deploys. Then run migrations via Railway CLI:

```bash
railway run python manage.py migrate
railway run python manage.py seed_equipment
railway run python manage.py createsuperuser
```

- [ ] **Step 6: Verify backend health**

```bash
curl https://your-railway-domain.railway.app/api/auth/register/ -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"deploy@test.com","first_name":"Deploy","last_name":"Test","password":"pass1234"}'
```

Expected: `{"token": "...", "user": {...}}` with status 201.

- [ ] **Step 7: Update VITE_API_URL in Vercel**

In Vercel dashboard, update `VITE_API_URL` to the actual Railway domain. Redeploy frontend.

- [ ] **Step 8: End-to-end production smoke test**

1. Open Vercel URL in browser
2. Register a new account
3. Verify redirect to membership-pending
4. Log in to Django admin (`/django-admin/`) using superuser credentials
5. Activate membership
6. Log in to app — verify redirect to dashboard
7. Generate fitness plan — verify Gemini responds within 5 seconds (NFR-01)
8. Test chatbot — verify response within 2 seconds (NFR-02)
9. Test PostureChecker — verify 15+ FPS with skeleton overlay

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "chore: production deployment — vercel frontend, railway backend + postgresql"
```

---

## Phase 3 Complete ✓

**All 3 phases done. Full system:**

| Feature | Status |
|---|---|
| Auth (register/login/logout) | ✓ |
| Membership gate | ✓ |
| AI Fitness Plan Generator (Gemini Path A) | ✓ |
| AI Nutrition Plan + Macro Scanner | ✓ |
| AI Chatbot (Gemini Path B, streaming) | ✓ |
| BMI Estimator | ✓ |
| Equipment Suggestions | ✓ |
| Activity Logbook | ✓ |
| Dashboard + Weight Tracking | ✓ |
| User Profile | ✓ |
| PostureChecker (MediaPipe Tasks Vision) | ✓ |
| Injury Risk Detection | ✓ |
| Rep Counter | ✓ |
| Admin Dashboard + Analytics | ✓ |
| Disclaimer banners (NFR-25) | ✓ |
| Vercel + Railway deployment | ✓ |
| Token auth + CORS (NFR-05, NFR-06) | ✓ |
| Responsive UI (desktop + mobile) | ✓ |

**Run final backend test suite:**
```bash
cd backend && pytest -v
```

**SUS Testing:** Distribute questionnaire to J&A Fitness clients (target ≥68 score). Collect feedback for Phase 4 modifications if needed.
