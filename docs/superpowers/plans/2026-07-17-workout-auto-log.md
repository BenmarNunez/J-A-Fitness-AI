# Workout History Auto-Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically record a `WorkoutLog`/`WorkoutSet` entry when a user finishes a camera-tracked exercise in PostureChecker, and add a date-sort control to the Logbook history view.

**Architecture:** New DRF endpoint `POST /api/fitness/log/auto/` gets-or-creates today's `WorkoutLog` for the user and appends a `WorkoutSet`, reusing the existing `WorkoutSet`/`WorkoutLog` models and `WorkoutSetSerializer`. `PostureChecker.jsx` calls this endpoint (fire-and-forget) the moment its existing `workoutComplete` state flips to `true`. `Logbook.jsx` gets a client-side sort toggle over the logs it already fetches.

**Tech Stack:** Django 5 + DRF (backend/apps/fitness), React 19 + axios (frontend/src/pages), pytest-django for backend tests, manual browser verification for frontend (no frontend test runner is configured in this repo).

---

### Task 1: Backend — auto-log endpoint

**Files:**
- Modify: `backend/apps/fitness/views.py`
- Modify: `backend/apps/fitness/urls.py`
- Test: `backend/apps/fitness/tests/test_fitness.py`

- [ ] **Step 1: Write the failing tests**

Check whether `backend/apps/fitness/tests/test_fitness.py` already defines `api_client` and `auth_client` fixtures (grep for `def api_client` — the Email Notifications and Meal Plan Generation plans also add them, in that same file, guarded the same way). If they're **not** present yet, append this block first:

```python
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, active_user):
    token, _ = Token.objects.get_or_create(user=active_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return api_client
```

Then append (regardless of whether the block above was needed) the new tests to `backend/apps/fitness/tests/test_fitness.py`:

```python
@pytest.mark.django_db
def test_auto_log_creates_log_for_today(auth_client, active_user):
    response = auth_client.post('/api/fitness/log/auto/', {
        'exercise_name': 'Barbell Squat',
        'sets': 3,
        'reps': 10,
        'weight_kg': 40.0,
    }, format='json')
    assert response.status_code == 201
    from datetime import date
    log = WorkoutLog.objects.get(user=active_user, date=date.today())
    assert log.sets.count() == 1
    assert log.sets.first().exercise_name == 'Barbell Squat'


@pytest.mark.django_db
def test_auto_log_appends_to_existing_log_same_day(auth_client, active_user):
    from datetime import date
    existing_log = WorkoutLog.objects.create(user=active_user, date=date.today())
    WorkoutSet.objects.create(log=existing_log, exercise_name='Push Up', sets=3, reps=15)

    response = auth_client.post('/api/fitness/log/auto/', {
        'exercise_name': 'Bicep Curl',
        'sets': 3,
        'reps': 12,
        'weight_kg': 10.0,
    }, format='json')

    assert response.status_code == 201
    assert WorkoutLog.objects.filter(user=active_user, date=date.today()).count() == 1
    existing_log.refresh_from_db()
    assert existing_log.sets.count() == 2


@pytest.mark.django_db
def test_auto_log_weight_optional(auth_client):
    response = auth_client.post('/api/fitness/log/auto/', {
        'exercise_name': 'Plank',
        'sets': 3,
        'reps': 1,
    }, format='json')
    assert response.status_code == 201


@pytest.mark.django_db
def test_auto_log_requires_exercise_name(auth_client):
    response = auth_client.post('/api/fitness/log/auto/', {
        'sets': 3,
        'reps': 10,
    }, format='json')
    assert response.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py manage.py test apps.fitness` (from `backend/`) — or if pytest is configured: `py -m pytest apps/fitness/tests/test_fitness.py -v`
Expected: FAIL — `404 Not Found` for `/api/fitness/log/auto/` (URL doesn't exist yet).

- [ ] **Step 3: Add the view**

In `backend/apps/fitness/views.py`, add after `WorkoutLogView` (after line 66):

```python
class WorkoutAutoLogView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        from datetime import date as date_cls
        serializer = WorkoutSetSerializer(data=request.data)
        if serializer.is_valid():
            log, _ = WorkoutLog.objects.get_or_create(user=request.user, date=date_cls.today())
            WorkoutSet.objects.create(log=log, **serializer.validated_data)
            return Response(WorkoutLogSerializer(log).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

Update the imports at the top of `backend/apps/fitness/views.py` (line 6-7) to include `WorkoutSet` and `WorkoutSetSerializer`:

```python
from .models import FitnessPlan, WorkoutLog, WorkoutSet, BodyMetric, RestDay
from .serializers import FitnessPlanSerializer, WorkoutLogSerializer, WorkoutSetSerializer, BodyMetricSerializer, RestDaySerializer
```

- [ ] **Step 4: Wire the URL**

In `backend/apps/fitness/urls.py`, change the import and urlpatterns:

```python
from django.urls import path
from .views import GenerateFitnessPlanView, FitnessPlanListView, WorkoutLogView, WorkoutAutoLogView, BodyMetricView, BMIView, RestDayView

urlpatterns = [
    path('generate/', GenerateFitnessPlanView.as_view()),
    path('plans/', FitnessPlanListView.as_view()),
    path('log/', WorkoutLogView.as_view()),
    path('log/auto/', WorkoutAutoLogView.as_view()),
    path('metrics/', BodyMetricView.as_view()),
    path('bmi/', BMIView.as_view()),
    path('rest-day/', RestDayView.as_view()),
]
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `py -m pytest apps/fitness/tests/test_fitness.py -v` (from `backend/`)
Expected: PASS — all 4 new tests plus the 3 pre-existing ones green.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/fitness/views.py backend/apps/fitness/urls.py backend/apps/fitness/tests/test_fitness.py
git commit -m "feat: add auto-log endpoint for camera-tracked workouts"
```

---

### Task 2: Frontend — auto-log on workout completion

**Files:**
- Modify: `frontend/src/pages/PostureChecker.jsx`

- [ ] **Step 1: Import the API client**

In `frontend/src/pages/PostureChecker.jsx`, add to the imports at the top (after line 8):

```javascript
import api from '../api'
```

- [ ] **Step 2: Fire the auto-log request on workout completion**

Replace the effect at lines 111-125 (the one that watches `repCount` and sets `workoutComplete`):

```javascript
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
        const exerciseName = exerciseData?.name || selectedPlanEx?.name;
        if (exerciseName) {
          api.post('/api/fitness/log/auto/', {
            exercise_name: exerciseName,
            sets: targetSets,
            reps: targetReps,
            weight_kg: exerciseData?.weight_kg ?? selectedPlanEx?.weight ?? null,
          }).catch(err => console.error('Auto-log failed:', err));
        }
      }
    }
  }, [repCount, exerciseData, selectedPlanEx, currentSet]);
```

The POST is fire-and-forget: a failure is logged to the console only, and never blocks or alters the "Workout Complete!" screen the user already sees.

- [ ] **Step 3: Manual verification**

1. Start both servers: backend (`py manage.py runserver` from `backend/`) and frontend (`npm run dev` from `frontend/`).
2. Log in as an active member with a generated fitness plan.
3. Open browser DevTools → Network tab.
4. Go to Fitness Plan, click "Start Exercise" on any exercise.
5. On the Posture Check page, click "Enable Camera" (or use the manual `+`/`-` rep buttons if no camera is available) and drive `repCount` up to the target reps/sets until the "Workout Complete!" overlay appears.
6. Confirm in the Network tab that a `POST /api/fitness/log/auto/` request fired and returned `201`.
7. Navigate to `/logbook` and confirm a new entry for today's date includes the exercise just completed, with correct sets/reps/weight.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PostureChecker.jsx
git commit -m "feat: auto-log completed camera-tracked workouts to history"
```

---

### Task 3: Frontend — Logbook sort control

**Files:**
- Modify: `frontend/src/pages/Logbook.jsx`

- [ ] **Step 1: Add sort state and derived sorted list**

In `frontend/src/pages/Logbook.jsx`, add after line 11 (`const [saving, setSaving] = useState(false)`):

```javascript
  const [sortOrder, setSortOrder] = useState('desc')

  const sortedLogs = [...workoutLogs].sort((a, b) =>
    sortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  )
```

- [ ] **Step 2: Add the sort toggle button and use the sorted list**

Replace the header block at lines 41-50:

```jsx
      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Training Records</p>
          <h1 className="page-title">Logbook</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'))}
            className="btn-ghost text-xs"
          >
            {sortOrder === 'desc' ? '↓ Newest first' : '↑ Oldest first'}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className={showForm ? 'btn-ghost' : 'btn-primary'}>
            {showForm ? '✕ Cancel' : '+ Log Workout'}
          </button>
        </div>
      </div>
```

Then replace `workoutLogs.map(log => (` at line 116 with `sortedLogs.map(log => (`.

- [ ] **Step 3: Manual verification**

1. With the frontend dev server running, go to `/logbook`.
2. Log at least two manual workouts on different dates (or rely on entries from Task 2's verification plus a manually-logged one).
3. Click the sort toggle button and confirm the list order flips between newest-first and oldest-first.
4. Confirm the empty-state card still shows correctly when `workoutLogs` is empty (unaffected by the sort logic since it's a separate branch).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Logbook.jsx
git commit -m "feat: add date sort toggle to workout logbook"
```

---

### Task 4: Full end-to-end live verification and push

- [ ] **Step 1: Run the full backend test suite**

Run (from `backend/`): `py -m pytest -v`
Expected: all tests pass, including the 4 new ones from Task 1.

- [ ] **Step 2: Live walkthrough in the browser**

Repeat the full flow from Task 2 Step 3 end-to-end once more after all three tasks are done, this time also verifying the Task 3 sort toggle on the resulting Logbook entries. Confirm no console errors appear during the flow.

- [ ] **Step 3: Push**

```bash
git push
```
