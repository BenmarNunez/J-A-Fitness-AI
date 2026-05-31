# J&A Fitness AI — System Design Spec
**Date:** 2026-05-17
**Project:** Smart Decision Exercise Planner for J&A Fitness (Legazpi City)
**Authors:** Neil John D. Balunso, Marc Cristian Bellen, Misha Rain A. Sobue
**Institution:** Computer Arts and Technological College, Inc.

---

## 1. Approach

Phase-aligned prototype methodology (matches thesis documentation):

1. **Scaffold** — monorepo structure, both frontend and backend project setup
2. **Phase 1** — UI design + user authentication/registration flow
3. **Phase 2** — AI logic + backend integration (Django, Gemini API, PostgreSQL)
4. **Phase 3** — Computer vision + final deployment (MediaPipe, Vercel, Railway)

---

## 2. Project Structure (Monorepo)

```
j-a-fitness-ai/
├── frontend/                    ← React 19 + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FitnessPlan.jsx
│   │   │   ├── Nutrition.jsx
│   │   │   ├── PostureChecker.jsx
│   │   │   ├── BMIEstimator.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   ├── Logbook.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── components/
│   │   ├── store/
│   │   ├── api/
│   │   └── utils/
│   ├── index.html
│   └── vite.config.js
│
├── backend/                     ← Django + DRF
│   ├── config/                  ← settings, urls, wsgi
│   ├── apps/
│   │   ├── users/
│   │   ├── fitness/
│   │   ├── nutrition/
│   │   ├── ai/
│   │   ├── equipment/
│   │   └── analytics/
│   ├── requirements.txt
│   └── manage.py
│
├── docs/
│   └── superpowers/specs/
└── README.md
```

---

## 3. Database Schema

### users app

**User** (extends AbstractUser)
- `email` — unique, used as login identifier
- `first_name`, `last_name`
- `is_admin` — bool, grants AdminDashboard access

**MemberProfile** (OneToOne → User)
- `age`, `weight_kg`, `height_cm`, `gender`
- `fitness_goal` — choices: `lose_weight | build_muscle | maintain`
- `activity_level` — choices: `sedentary | light | moderate | active | very_active`
- `bmi` — float, computed and stored on profile save
- `bmr` — float, computed via Mifflin-St Jeor formula on profile save
- `membership_status` — choices: `pending | active | inactive`
- `membership_start` — date, nullable
- `membership_end` — date, nullable

### fitness app

**FitnessPlan**
- `user` (FK → User), `created_at`, `goal`, `weekly_schedule` (JSONField), `is_active` (bool)

**WorkoutLog**
- `user` (FK → User), `date`, `notes`

**WorkoutSet** (FK → WorkoutLog)
- `exercise_name`, `sets`, `reps`, `weight_kg`

**BodyMetric**
- `user` (FK → User), `date`, `weight_kg`, `body_fat_pct` (nullable)

### nutrition app

**NutritionPlan**
- `user` (FK → User), `created_at`, `content` (JSONField), `calories`, `protein_g`, `carbs_g`, `fat_g`

**FoodScan**
- `user` (FK → User), `image` (ImageField), `analysis` (JSONField), `scanned_at`

### equipment app

**Equipment**
- `name`, `description`, `usage_guide` (TextField), `is_available` (bool)

### ai app

**ChatSession**
- `user` (FK → User), `created_at`

**ChatMessage** (FK → ChatSession)
- `role` — choices: `user | assistant`
- `content` (TextField), `timestamp`

### analytics app

**FeatureUsageLog**
- `user` (FK → User)
- `feature` — choices: `fitness_plan | nutrition | posture | chatbot | logbook | bmi`
- `timestamp`

---

## 4. API Endpoints

All non-auth endpoints require `Authorization: Token <token>` header.
Active membership gated by custom `IsActiveMember` DRF permission.
Admin endpoints gated by `IsAdmin` DRF permission.

### Auth (public)
```
POST /api/auth/register/        → create User + MemberProfile
POST /api/auth/login/           → return token
POST /api/auth/logout/          → invalidate token
```

### Profile
```
GET  /api/profile/              → own profile + biometrics
PUT  /api/profile/              → update biometrics/goals
```

### Fitness Plans
```
POST /api/fitness/generate/     → Gemini Path A, save FitnessPlan
GET  /api/fitness/plans/        → list user's plans
GET  /api/fitness/plans/<id>/   → single plan detail
```

### Workout Log
```
POST /api/fitness/log/          → create WorkoutLog + WorkoutSets
GET  /api/fitness/log/          → paginated log history
```

### Body Metrics
```
POST /api/fitness/metrics/      → log weight/body fat
GET  /api/fitness/metrics/      → history for dashboard chart
```

### Nutrition
```
POST /api/nutrition/generate/   → Gemini text plan (Path A)
POST /api/nutrition/scan/       → Gemini Vision food image (Path A)
GET  /api/nutrition/plans/      → list plans
```

### Equipment
```
GET  /api/equipment/            → list available equipment
```

### Chatbot
```
POST /api/ai/chat/session/        → create ChatSession
GET  /api/ai/chat/history/<sid>/  → session messages
POST /api/ai/chat/history/<sid>/  → save messages after client-side chat
```

### BMI
```
POST /api/fitness/bmi/          → returns BMI value + WHO classification
```

### Analytics
```
POST /api/analytics/log/        → log feature usage event
```

### Admin
```
GET  /api/admin/members/        → all members + membership status
PUT  /api/admin/members/<id>/   → activate/deactivate, update status
GET  /api/admin/analytics/      → usage stats, engagement trends
```

---

## 5. Frontend Routes + State

### React Router routes

| Path | Component | Guard |
|---|---|---|
| `/` | Landing | public |
| `/login` | Login | public |
| `/register` | Register (2-step) | public |
| `/dashboard` | Dashboard | IsActiveMember |
| `/fitness-plan` | FitnessPlanDesigner | IsActiveMember |
| `/nutrition` | Nutritionist + Macro Scanner | IsActiveMember |
| `/posture` | PostureChecker | IsActiveMember |
| `/bmi` | BMI Estimator | IsActiveMember |
| `/chatbot` | AI Chatbot | IsActiveMember |
| `/logbook` | Activity Logbook | IsActiveMember |
| `/profile` | User Profile | IsActiveMember |
| `/membership-pending` | Pending notice page | auth required |
| `/admin` | AdminDashboard | IsAdmin |

**Route guards:**
- `<PrivateRoute>` — checks token + `membership_status === 'active'`; inactive redirects to `/membership-pending`
- `<AdminRoute>` — checks `is_admin === true`

### Zustand stores

```
authStore       → token, user, is_admin, membership_status
profileStore    → biometrics, bmi, bmr, fitness_goal
fitnessStore    → active_plan, workout_logs, body_metrics
nutritionStore  → meal_plans, scan_results
chatStore       → session_id, messages[]
uiStore         → loading states, error messages
```

### Axios instance (`src/api/index.js`)
- Base URL from `VITE_API_URL` env var
- Request interceptor: auto-attaches `Authorization: Token <token>` from `authStore`
- Response interceptor: 401 → clear auth + redirect to `/login`

---

## 6. AI Integration — Dual-Path Gemini

### Path A — Server-side (Django → Gemini)

Used for: fitness plan generation, nutrition plan generation, food image scan.

- Model: `gemini-1.5-flash`
- API key stored in Railway environment variable `GEMINI_API_KEY` — never sent to client
- Django view: validate biometrics → build structured prompt → call `google-generativeai` SDK → validate non-empty response → save to DB → return JSON
- Food scan: base64-encode uploaded image in Django → send to Gemini Vision

### Path B — Client-side (React → Gemini)

Used for: real-time AI chatbot only.

- Model: `gemini-1.5-flash`
- Uses a **separate restricted Gemini API key** (`VITE_GEMINI_PUBLIC_KEY`) with HTTP referrer restrictions set in Google AI Studio
- Streams response token-by-token into `chatStore.messages[]`
- After session ends, messages saved to backend via `POST /api/ai/chat/history/<sid>/`

### AI output validation (NFR-26)
- Django strips any response beginning with "I cannot", "As an AI", or empty strings
- Frontend shows disclaimer banner on all AI-powered pages (NFR-25)

---

## 7. Computer Vision — PostureChecker

**Library:** `@mediapipe/tasks-vision` — PoseLandmarker API (WASM-based, no TensorFlow.js required)

> Note: Original tech stack listed "MediaPipe + TensorFlow.js". Modern MediaPipe Tasks Vision API ships its own WASM runtime and does not require TF.js as a separate dependency. Thesis stack table updated accordingly.

**Implementation flow:**
1. `getUserMedia()` → webcam stream → `<video>` element (FR-16, NFR-21)
2. `PoseLandmarker` loads model from CDN on component mount
3. `requestAnimationFrame` loop:
   - `poseLandmarker.detectForVideo(videoElement, timestamp)`
   - Draw skeleton on `<canvas>` overlay
   - Calculate joint angles (shoulder, elbow, hip, knee) from landmarks
   - Compare angles to per-exercise thresholds:
     - Correct form → green overlay + `repCount++`
     - Incorrect form → red overlay + corrective text (FR-18)
     - High-risk pattern → alert banner (FR-22, FR-23)
4. No video data sent to server — all processing in-browser (FR-21, NFR-20)

**Supported exercises (Phase 3):** squat, deadlift, bicep curl, push-up
**Thresholds:** derived from exercise science angle ranges (FR-24)
**Disclaimer:** accuracy is approximate, displayed prominently (FR-20)

---

## 8. Styling Guidelines

**Theme:** Dark fitness aesthetic (consistent with architecture diagram color language)

**Color palette:**
```
Primary green:    #0D9373   buttons, CTAs, active nav
Green dark:       #085041   card backgrounds, nav bg
Green accent:     #5DCAA5   borders, highlights, badges
Blue dark:        #0C447C   admin section backgrounds
Blue accent:      #85B7EB   admin highlights
Warning orange:   #EF9F27   equipment, recommendations
Danger red:       #F09595   injury risk alerts, error states
Background:       #0F0F0E   main page background
Surface:          #1A1A18   card background
Text primary:     #FAF9F5
Text muted:       #C2C0B6
```

**Tailwind component classes:**
```
Card:          bg-[#1A1A18] border border-[#5DCAA5]/20 rounded-xl p-6
Button:        bg-[#0D9373] hover:bg-[#0B7A5E] text-white rounded-lg px-4 py-2
Danger btn:    bg-[#7A1F1F] hover:bg-[#5C1717] border border-[#F09595]/50
Input:         bg-[#0F0F0E] border border-[#5DCAA5]/30 rounded-lg px-3 py-2
Badge active:  bg-[#085041] text-[#5DCAA5] text-xs rounded-full px-2 py-0.5
Badge inactive: bg-[#3D1A1A] text-[#F09595] text-xs rounded-full px-2 py-0.5
```

**Layout:**
- Desktop: fixed sidebar nav (240px) + main content area
- Mobile: bottom tab bar (5 tabs: Dashboard, Plan, Nutrition, Posture, More)
- Container: `max-w-6xl mx-auto px-4`

**AI Disclaimer banner** (required NFR-25): yellow banner component, shown on FitnessPlan, Nutrition, Chatbot, PostureChecker pages.

**SUS target ≥68:** achieved via consistent nav, clear labels, loading skeletons during AI calls, plain-language UI copy.

---

## 9. Security Checklist

- `GEMINI_API_KEY` — Railway env var only, never in frontend bundle (NFR-05)
- `VITE_GEMINI_PUBLIC_KEY` — separate restricted key, HTTP referrer lock in Google AI Studio
- CORS configured in Django `django-cors-headers`, whitelist Vercel domain only (NFR-06)
- Passwords hashed via Django's built-in `PBKDF2PasswordHasher` (NFR-07)
- All API endpoints behind `TokenAuthentication` (NFR-08)
- Camera access via browser Permission API, explicit user grant (NFR-09, NFR-21)
- Admin endpoints double-checked with `IsAdmin` permission class (NFR-23)

---

## 10. Non-Functional Requirements Coverage

| NFR | How met |
|---|---|
| NFR-01 (AI plan ≤5s) | `gemini-1.5-flash` + Railway proximity to Gemini |
| NFR-02 (chatbot ≤2s) | Client-side streaming Path B |
| NFR-03 (CV ≥15 FPS) | MediaPipe WASM runs at 30+ FPS on modern devices |
| NFR-04 (no page reloads) | React SPA + React Router |
| NFR-13 (99% uptime) | Vercel + Railway managed infra |
| NFR-15 (CI/CD) | Vercel auto-deploy on git push |
| NFR-16 (SUS ≥68) | Consistent UI, loading states, plain copy |
| NFR-19 (responsive) | Tailwind responsive classes + mobile nav |
