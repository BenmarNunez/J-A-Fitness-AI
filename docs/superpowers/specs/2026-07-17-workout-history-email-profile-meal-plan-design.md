# Design: Workout History, Email Notifications, Profile Picture, Meal Plan Generation

Date: 2026-07-17

## Context

J&A Fitness AI (Django + DRF backend, React 19 + Vite frontend, Gemini AI plan generation). Four independent features requested together. Each touches different parts of the stack; grouped in one spec since they share small integration points (Settings page, navbar avatar) but are otherwise separable and can be implemented/reviewed as separate plan phases.

## Feature 1: Workout History — Auto-Record

**Problem:** `WorkoutLog`/`WorkoutSet` models and the Logbook page already exist, but logging is manual-entry only. Camera-tracked workouts via PostureChecker aren't recorded anywhere.

**Backend**
- New endpoint `POST /api/fitness/log/auto/` (`WorkoutAutoLogView`) in `apps/fitness`:
  - Body: `{ exercise_name, sets, reps, weight_kg }`
  - `WorkoutLog.objects.get_or_create(user=request.user, date=today)`
  - Creates a `WorkoutSet` under that log.
  - No new models — reuses existing `WorkoutLog`/`WorkoutSet`.
- New serializer `WorkoutSetCreateSerializer` (or reuse `WorkoutSetSerializer`) for the auto-log payload.

**Frontend**
- `PostureChecker.jsx`: in the effect that sets `workoutComplete = true` (around line 122), fire `api.post('/api/fitness/log/auto/', {...})` using `exerciseData.name || selectedPlanEx.name`, `currentSet` (sets completed), target reps, and `suggested_weight_kg`/`weight` if present. Fire-and-forget — failure shows a small toast but never blocks the "Workout Complete!" screen.
- `Logbook.jsx`: add an explicit sort control (Newest/Oldest) over `workoutLogs`; default matches existing `-date` ordering. Auto-logged entries render through the same list/card markup as manual entries — no new display logic needed.

**Error handling:** auto-log failures are logged client-side and silently retried never — one attempt, toast on failure, no blocking.

## Feature 2: Email Notifications

**Problem:** No email backend, no task scheduler configured. Need reminder / plan-update / weekly-summary emails plus a preferences UI.

**New dependencies:** `django-q2` (DB-backed scheduler — no Redis needed), `django-anymail[sendgrid]`.

**New model** — `apps/users/models.py`:
```python
class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_prefs')
    workout_reminders = models.BooleanField(default=True)
    plan_updates = models.BooleanField(default=True)
    weekly_summary = models.BooleanField(default=True)
```

**Settings (`backend/config/settings.py`):**
- `EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'`
- `ANYMAIL = {'SENDGRID_API_KEY': config('SENDGRID_API_KEY')}`
- `DEFAULT_FROM_EMAIL` from env
- `INSTALLED_APPS += ['django_q', 'anymail']`
- `Q_CLUSTER` config (ORM broker, no Redis)

**Scheduled tasks** (`apps/users/tasks.py`, registered via Django-Q2 `Schedule` objects, run by `py manage.py qcluster`):
- `send_workout_reminders` — daily, ~18:00: for users with `workout_reminders=True` and an active `FitnessPlan`, if today's schedule entry isn't rest/empty and no `WorkoutLog` exists for today, send reminder.
- `send_weekly_summary` — weekly, Sunday evening: for users with `weekly_summary=True`, aggregate the week's `WorkoutLog`/`WorkoutSet` (session count, total sets, top exercises) and email a summary.
- `plan_updates` — not scheduled. Called synchronously from `GenerateFitnessPlanView.post` and `GenerateNutritionView.post` (and the combined flow in Feature 4) right after save, for users with `plan_updates=True`.

**New endpoints** (`apps/users`):
- `GET/PATCH /api/users/notification-prefs/` — read/update the three booleans.

**Frontend**
- New `Settings.jsx` page + `/settings` route + nav entry (Sidebar + BottomNav).
- Three toggle switches bound to the notification-prefs endpoint.

**Error handling:** all email sends wrapped in try/except and logged; a failed send never raises into the calling view (plan generation succeeds regardless of email outcome).

## Feature 3: Profile Picture

**Problem:** No `profile_picture` field, no cloud storage configured. Railway's filesystem doesn't persist local uploads across redeploys.

**New dependencies:** `cloudinary`, `django-cloudinary-storage`.

**Settings:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` from env, plus `cloudinary`/`cloudinary_storage` added to `INSTALLED_APPS`. No change to `DEFAULT_FILE_STORAGE`/`STORAGES['default']` — `CloudinaryField` manages its own storage per-field, so `FoodScan.image` keeps using local `MEDIA_ROOT` unchanged.

**Model:** `MemberProfile.profile_picture = CloudinaryField('image', blank=True, null=True)`.

**Serializer:** `MemberProfileSerializer` exposes `profile_picture` as a URL on read; a separate write path handles the upload.

**New endpoint:** `PATCH /api/users/profile/picture/` (multipart/form-data). Server-side validation: content-type in `{image/jpeg, image/png}`, size ≤ 5MB.

**Frontend**
- `Profile.jsx` (around line 56-59): replace letter-initial avatar with an upload control — file picker, local preview, upload button; falls back to initial-letter avatar when no picture is set. Client-side validation mirrors server rules (fast feedback).
- `Sidebar.jsx` (around line 85-94): same avatar swap for the persistent nav user block.
- `authStore.js`: `user.profile.profile_picture` (URL) flows through the existing persisted store; updated in place on successful upload.

**Error handling:** rejected files (wrong type/too large) show inline error before any network call; server-side re-validation is authoritative. Upload failure keeps the previous picture displayed.

## Feature 4: Meal Plan Generation Tied to Fitness Plan

**Problem:** `NutritionPlan` generation already exists (`generate_nutrition_plan` in `apps/ai_module/gemini.py:121`) but runs fully independently of fitness plan generation — same input profile, no shared context, separate button.

**Backend**
- `GenerateFitnessPlanView.post` (`apps/fitness/views.py:10`): after creating the `FitnessPlan`, also derive `workout_days_per_week` (count of non-rest/non-empty days in `plan_data['weekly_schedule']`) and read `estimated_weekly_calories_burned` from the fitness plan output, then call `generate_nutrition_plan(..., workout_days_per_week=..., estimated_weekly_calories_burned=...)` and create the `NutritionPlan` exactly as `GenerateNutritionView` does today.
- Response shape changes to `{ fitness_plan: {...}, nutrition_plan: {...} | null }`. If nutrition generation fails, the fitness plan still saves and returns; `nutrition_plan` is `null` with a `nutrition_error` note — fitness generation must not fail because of a nutrition-side failure.
- `_NUTRITION_PROMPT` (`apps/ai_module/gemini.py:60`) gets two new template variables (workout frequency, estimated weekly burn) with an added instruction to scale the daily calorie target/macros to the training intensity. Output schema is unchanged (single daily target — no per-day variation).
- `GenerateNutritionView` (standalone endpoint) is unchanged — still available for manual regeneration from the Nutrition page, called without the new workout-context args (defaults applied).

**Frontend**
- `FitnessPlan.jsx` `handleGenerate` (line 147): updates both `fitnessStore` and `nutritionStore` from the combined response; shows a banner/toast pointing to `/nutrition` when a meal plan was generated alongside.
- `Nutrition.jsx`: unchanged generate button/flow, still works standalone.

## Cross-Cutting

- New `Settings.jsx` page/route/nav entry serves Feature 2's toggles (only new page needed across all four features).
- No changes to existing auth, permission classes (`IsActiveMember`), or URL/serializer conventions — all new endpoints follow the existing flat `APIView` + `ModelSerializer` pattern.

## Testing

- **Backend:** pytest cases (existing `pytest-django` setup) for: auto-log endpoint (creates log if absent, appends set if log exists for today), notification-prefs GET/PATCH, profile picture upload validation (type/size rejection + success), combined generate endpoint (fitness succeeds independent of nutrition failure).
- **Frontend:** no test runner configured in this repo (no vitest/jest in `package.json`) — verification is manual browser walkthrough of each feature's golden path plus edge cases (no camera, no active plan, oversized image, toggles persisting across reload) after implementation, per project convention.
