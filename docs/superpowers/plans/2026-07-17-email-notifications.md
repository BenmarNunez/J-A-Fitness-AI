# Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send workout-reminder, plan-update, and weekly-progress-summary emails via SendGrid, scheduled with Django-Q2, with a per-type toggle in a new Settings page.

**Architecture:** A `NotificationPreference` model (one-to-one with `User`) stores three booleans. `apps/users/emails.py` holds thin `send_mail`-wrapping helpers; `apps/users/tasks.py` holds the two scheduled job functions (workout reminders, weekly summary), registered with Django-Q2's DB-backed scheduler via a one-time management command. Plan-update emails fire synchronously from the existing plan-generation views. A new `Settings.jsx` page exposes the three toggles through a new `/api/notifications/prefs/` endpoint.

**Tech Stack:** Django 5 + DRF, `django-q2` (DB-backed task queue/scheduler — no Redis), `django-anymail[sendgrid]` (SendGrid transactional email), pytest-django (backend tests use Django's automatic `locmem` email backend during tests — no real emails sent), React 19 + axios (frontend, manual browser verification).

---

### Task 1: Dependencies and settings

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/config/settings.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: Add dependencies**

Append to `backend/requirements.txt`:

```
django-q2==1.7.2
django-anymail[sendgrid]==11.1
```

Run (from `backend/`, with the project's virtualenv active): `py -m pip install django-q2 "django-anymail[sendgrid]"`

- [ ] **Step 2: Add settings**

In `backend/config/settings.py`, update `INSTALLED_APPS` (line 10-26) by adding `'django_q'` and `'anymail'` after `'apps.analytics',`:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'apps.users',
    'apps.fitness',
    'apps.nutrition',
    'apps.ai_module',
    'apps.equipment',
    'apps.analytics',
    'django_q',
    'anymail',
]
```

Append to the end of `backend/config/settings.py` (after the existing `if not DEBUG:` block, line 104-107):

```python
EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
ANYMAIL = {
    'SENDGRID_API_KEY': config('SENDGRID_API_KEY', default=''),
}
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@jafitness.ai')

Q_CLUSTER = {
    'name': 'ja_fitness',
    'orm': 'default',
    'workers': 2,
    'timeout': 60,
    'retry': 120,
}
```

- [ ] **Step 3: Add env vars**

Append to `backend/.env.example`:

```
SENDGRID_API_KEY=your-sendgrid-api-key-here
DEFAULT_FROM_EMAIL=noreply@jafitness.ai
```

- [ ] **Step 4: Verify Django loads with the new settings**

Run (from `backend/`): `py manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/config/settings.py backend/.env.example
git commit -m "chore: add django-q2 and django-anymail/sendgrid dependencies"
```

---

### Task 2: NotificationPreference model, serializer, endpoint

**Files:**
- Modify: `backend/apps/users/models.py`
- Create: `backend/apps/users/migrations/0003_notificationpreference.py` (generated)
- Modify: `backend/apps/users/serializers.py`
- Modify: `backend/apps/users/views.py`
- Create: `backend/apps/users/notification_urls.py`
- Modify: `backend/config/urls.py`
- Test: `backend/apps/users/tests/test_notifications.py`

- [ ] **Step 1: Add the model**

In `backend/apps/users/models.py`, append after the `MemberProfile` class (after line 77):

```python

class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_prefs')
    workout_reminders = models.BooleanField(default=True)
    plan_updates = models.BooleanField(default=True)
    weekly_summary = models.BooleanField(default=True)

    def __str__(self):
        return f'NotificationPreference({self.user.email})'
```

- [ ] **Step 2: Generate and inspect the migration**

Run (from `backend/`): `py manage.py makemigrations users`
Expected output: `Migrations for 'users': ... 0003_notificationpreference.py ... - Create model NotificationPreference`

- [ ] **Step 3: Write the failing serializer/view tests**

Create `backend/apps/users/tests/test_notifications.py`:

```python
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.users.models import MemberProfile, NotificationPreference

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def active_user():
    user = User.objects.create_user(
        username='notify@example.com', email='notify@example.com', password='pass123'
    )
    MemberProfile.objects.create(user=user, membership_status='active')
    return user


@pytest.fixture
def auth_client(api_client, active_user):
    token, _ = Token.objects.get_or_create(user=active_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return api_client


@pytest.mark.django_db
def test_get_notification_prefs_creates_defaults(auth_client, active_user):
    response = auth_client.get('/api/notifications/prefs/')
    assert response.status_code == 200
    assert response.data == {
        'workout_reminders': True,
        'plan_updates': True,
        'weekly_summary': True,
    }
    assert NotificationPreference.objects.filter(user=active_user).count() == 1


@pytest.mark.django_db
def test_patch_notification_prefs_updates_single_field(auth_client, active_user):
    response = auth_client.patch('/api/notifications/prefs/', {
        'workout_reminders': False,
    }, format='json')
    assert response.status_code == 200
    assert response.data['workout_reminders'] is False
    assert response.data['plan_updates'] is True
    prefs = NotificationPreference.objects.get(user=active_user)
    assert prefs.workout_reminders is False
```

- [ ] **Step 4: Run tests to verify they fail**

Run (from `backend/`): `py -m pytest apps/users/tests/test_notifications.py -v`
Expected: FAIL — `404 Not Found` for `/api/notifications/prefs/`.

- [ ] **Step 5: Add the serializer**

Append to `backend/apps/users/serializers.py`:

```python
from .models import NotificationPreference


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['workout_reminders', 'plan_updates', 'weekly_summary']
```

- [ ] **Step 6: Add the view**

In `backend/apps/users/views.py`, update the import at line 7 to include `NotificationPreferenceSerializer`, and add `NotificationPreference` to the model import:

```python
from .serializers import RegisterSerializer, UserSerializer, MemberProfileSerializer, NotificationPreferenceSerializer
from .models import NotificationPreference
```

Append the view at the end of the file (after `AdminMemberDetailView`):

```python


class NotificationPreferenceView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(prefs).data)

    def patch(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 7: Wire the URL**

Create `backend/apps/users/notification_urls.py`:

```python
from django.urls import path
from .views import NotificationPreferenceView

urlpatterns = [
    path('prefs/', NotificationPreferenceView.as_view()),
]
```

In `backend/config/urls.py`, add a new line after `path('api/admin/', ...)` (line 10):

```python
    path('api/notifications/', include('apps.users.notification_urls')),
```

- [ ] **Step 8: Run tests to verify they pass**

Run (from `backend/`): `py -m pytest apps/users/tests/test_notifications.py -v`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/apps/users/models.py backend/apps/users/migrations/0003_notificationpreference.py backend/apps/users/serializers.py backend/apps/users/views.py backend/apps/users/notification_urls.py backend/config/urls.py backend/apps/users/tests/test_notifications.py
git commit -m "feat: add notification preference model and prefs API"
```

---

### Task 3: Email-sending helpers

**Files:**
- Create: `backend/apps/users/emails.py`
- Test: `backend/apps/users/tests/test_emails.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/apps/users/tests/test_emails.py`:

```python
import pytest
from django.core import mail
from django.contrib.auth import get_user_model
from apps.users.models import MemberProfile, NotificationPreference
from apps.users.emails import send_plan_update_email, send_workout_reminder_email, send_weekly_summary_email

User = get_user_model()


@pytest.fixture
def user_with_prefs(db):
    user = User.objects.create_user(
        username='mail@example.com', email='mail@example.com',
        password='pass123', first_name='Jane',
    )
    MemberProfile.objects.create(user=user, membership_status='active')
    NotificationPreference.objects.create(user=user)
    return user


@pytest.mark.django_db
def test_send_plan_update_email_respects_preference(user_with_prefs):
    send_plan_update_email(user_with_prefs, 'fitness')
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ['mail@example.com']

    mail.outbox.clear()
    prefs = user_with_prefs.notification_prefs
    prefs.plan_updates = False
    prefs.save()
    send_plan_update_email(user_with_prefs, 'fitness')
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_send_workout_reminder_email(user_with_prefs):
    send_workout_reminder_email(user_with_prefs)
    assert len(mail.outbox) == 1
    assert 'workout' in mail.outbox[0].subject.lower()


@pytest.mark.django_db
def test_send_weekly_summary_email(user_with_prefs):
    send_weekly_summary_email(user_with_prefs, session_count=3, total_sets=12, top_exercises=['Squat', 'Bench Press'])
    assert len(mail.outbox) == 1
    assert 'Squat' in mail.outbox[0].body
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `py -m pytest apps/users/tests/test_emails.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'apps.users.emails'`.

- [ ] **Step 3: Implement the helpers**

Create `backend/apps/users/emails.py`:

```python
import logging
from django.conf import settings
from django.core.mail import send_mail
from .models import NotificationPreference

logger = logging.getLogger(__name__)


def _send(user, subject, message):
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
    except Exception:
        logger.exception('Failed to send email to %s', user.email)


def _get_prefs(user):
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    return prefs


def send_plan_update_email(user, plan_type):
    if not _get_prefs(user).plan_updates:
        return
    label = 'fitness plan' if plan_type == 'fitness' else 'nutrition plan'
    _send(
        user,
        f'Your {label} has been updated',
        f'Hi {user.first_name or "there"}, your {label} was just regenerated. '
        f'Log in to J&A Fitness AI to check it out.',
    )


def send_workout_reminder_email(user):
    if not _get_prefs(user).workout_reminders:
        return
    _send(
        user,
        "Don't skip today's workout!",
        f'Hi {user.first_name or "there"}, you have a workout scheduled today on your '
        f'J&A Fitness AI plan. Log in and get it done!',
    )


def send_weekly_summary_email(user, session_count, total_sets, top_exercises):
    if not _get_prefs(user).weekly_summary:
        return
    top = ', '.join(top_exercises) if top_exercises else 'no exercises logged'
    _send(
        user,
        'Your weekly progress summary',
        f'Hi {user.first_name or "there"}, this week you completed {session_count} '
        f'session(s) and {total_sets} total sets. Top exercises: {top}. Keep it up!',
    )
```

Note: `send_plan_update_email`/`send_workout_reminder_email`/`send_weekly_summary_email` each check preferences internally, so callers (Task 4's scheduled tasks, Task 5's view hooks) do not need to check preferences themselves — except where a query pre-filters by preference for efficiency (Task 4 does this to avoid querying every user).

- [ ] **Step 4: Run tests to verify they pass**

Run (from `backend/`): `py -m pytest apps/users/tests/test_emails.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/users/emails.py backend/apps/users/tests/test_emails.py
git commit -m "feat: add email-sending helpers for notifications"
```

---

### Task 4: Scheduled tasks (workout reminders, weekly summary)

**Files:**
- Create: `backend/apps/users/tasks.py`
- Create: `backend/apps/users/management/__init__.py`
- Create: `backend/apps/users/management/commands/__init__.py`
- Create: `backend/apps/users/management/commands/setup_email_schedules.py`
- Test: `backend/apps/users/tests/test_tasks.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/apps/users/tests/test_tasks.py`:

```python
import pytest
from datetime import date, timedelta
from django.core import mail
from django.contrib.auth import get_user_model
from apps.users.models import MemberProfile, NotificationPreference
from apps.fitness.models import FitnessPlan, WorkoutLog, WorkoutSet
from apps.users.tasks import send_workout_reminders, send_weekly_summary

User = get_user_model()

SCHEDULE = {
    'weekly_schedule': {
        'monday': [{'exercise': 'Squat', 'sets': 3, 'reps': 10}],
        'tuesday': 'rest',
        'wednesday': [{'exercise': 'Bench Press', 'sets': 3, 'reps': 10}],
        'thursday': 'rest',
        'friday': [{'exercise': 'Deadlift', 'sets': 3, 'reps': 5}],
        'saturday': 'rest',
        'sunday': 'rest',
    }
}


@pytest.fixture
def user_with_plan(db, monkeypatch):
    user = User.objects.create_user(
        username='sched@example.com', email='sched@example.com', password='pass123',
    )
    MemberProfile.objects.create(user=user, membership_status='active')
    NotificationPreference.objects.create(user=user)
    FitnessPlan.objects.create(user=user, goal='maintain', weekly_schedule=SCHEDULE, is_active=True)
    return user


@pytest.mark.django_db
def test_workout_reminder_skips_rest_day(user_with_plan, monkeypatch):
    import apps.users.tasks as tasks_module

    class FixedDate(date):
        @classmethod
        def today(cls):
            return date(2026, 7, 21)  # a Tuesday -> 'rest' in SCHEDULE

    monkeypatch.setattr(tasks_module, 'date', FixedDate)
    send_workout_reminders()
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_workout_reminder_skips_if_already_logged(user_with_plan, monkeypatch):
    import apps.users.tasks as tasks_module

    class FixedDate(date):
        @classmethod
        def today(cls):
            return date(2026, 7, 20)  # a Monday -> workout day in SCHEDULE

    monkeypatch.setattr(tasks_module, 'date', FixedDate)
    WorkoutLog.objects.create(user=user_with_plan, date=date(2026, 7, 20))
    send_workout_reminders()
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_workout_reminder_sent_on_scheduled_unlogged_day(user_with_plan, monkeypatch):
    import apps.users.tasks as tasks_module

    class FixedDate(date):
        @classmethod
        def today(cls):
            return date(2026, 7, 20)  # a Monday -> workout day in SCHEDULE

    monkeypatch.setattr(tasks_module, 'date', FixedDate)
    send_workout_reminders()
    assert len(mail.outbox) == 1


@pytest.mark.django_db
def test_weekly_summary_sent_when_sessions_logged(user_with_plan):
    log = WorkoutLog.objects.create(user=user_with_plan, date=date.today())
    WorkoutSet.objects.create(log=log, exercise_name='Squat', sets=3, reps=10, weight_kg=40)
    send_weekly_summary()
    assert len(mail.outbox) == 1
    assert 'Squat' in mail.outbox[0].body


@pytest.mark.django_db
def test_weekly_summary_skipped_when_no_sessions(user_with_plan):
    send_weekly_summary()
    assert len(mail.outbox) == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `py -m pytest apps/users/tests/test_tasks.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'apps.users.tasks'`.

- [ ] **Step 3: Implement the tasks**

Create `backend/apps/users/tasks.py`:

```python
from datetime import date, timedelta
from .models import NotificationPreference
from .emails import send_workout_reminder_email, send_weekly_summary_email
from apps.fitness.models import FitnessPlan, WorkoutLog, WorkoutSet

DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


def _is_rest_entry(entry):
    if entry is None:
        return True
    if isinstance(entry, str):
        return True
    if isinstance(entry, list) and len(entry) == 0:
        return True
    return False


def send_workout_reminders():
    today = date.today()
    today_name = DAY_NAMES[today.weekday()]
    prefs_qs = NotificationPreference.objects.filter(workout_reminders=True).select_related('user')
    for prefs in prefs_qs:
        user = prefs.user
        plan = FitnessPlan.objects.filter(user=user, is_active=True).first()
        if not plan:
            continue
        schedule = plan.weekly_schedule.get('weekly_schedule', plan.weekly_schedule)
        if not isinstance(schedule, dict):
            continue
        today_entry = schedule.get(today_name)
        if _is_rest_entry(today_entry):
            continue
        if WorkoutLog.objects.filter(user=user, date=today).exists():
            continue
        send_workout_reminder_email(user)


def send_weekly_summary():
    today = date.today()
    week_start = today - timedelta(days=7)
    prefs_qs = NotificationPreference.objects.filter(weekly_summary=True).select_related('user')
    for prefs in prefs_qs:
        user = prefs.user
        logs = WorkoutLog.objects.filter(user=user, date__gte=week_start, date__lte=today)
        session_count = logs.count()
        if session_count == 0:
            continue
        sets = WorkoutSet.objects.filter(log__in=logs)
        total_sets = sets.count()
        top_exercises = list(sets.values_list('exercise_name', flat=True).distinct()[:3])
        send_weekly_summary_email(user, session_count, total_sets, top_exercises)
```

- [ ] **Step 4: Run tests to verify they pass**

Run (from `backend/`): `py -m pytest apps/users/tests/test_tasks.py -v`
Expected: PASS.

- [ ] **Step 5: Register the schedules**

Create `backend/apps/users/management/__init__.py` (empty file).
Create `backend/apps/users/management/commands/__init__.py` (empty file).
Create `backend/apps/users/management/commands/setup_email_schedules.py`:

```python
from django.core.management.base import BaseCommand
from django_q.models import Schedule


class Command(BaseCommand):
    help = 'Registers the recurring email notification tasks with Django-Q2 (idempotent, safe to re-run).'

    def handle(self, *args, **options):
        Schedule.objects.get_or_create(
            func='apps.users.tasks.send_workout_reminders',
            defaults={'schedule_type': Schedule.DAILY, 'name': 'workout_reminders'},
        )
        Schedule.objects.get_or_create(
            func='apps.users.tasks.send_weekly_summary',
            defaults={'schedule_type': Schedule.WEEKLY, 'name': 'weekly_summary'},
        )
        self.stdout.write(self.style.SUCCESS('Email schedules registered.'))
```

- [ ] **Step 6: Run the command against the local dev database**

Run (from `backend/`): `py manage.py migrate` (applies django_q's own migrations) then `py manage.py setup_email_schedules`
Expected: `Email schedules registered.` and two rows visible in Django admin under Django Q > Schedules (or via `py manage.py shell -c "from django_q.models import Schedule; print(list(Schedule.objects.values_list('name', flat=True)))"` → `['workout_reminders', 'weekly_summary']`).

Note for deployment: the Django-Q2 worker process (`py manage.py qcluster`) must run as a separate long-lived process alongside `gunicorn` for these schedules to actually fire — this is a deployment/infra step outside this plan's scope (the existing `Procfile` will need a second process line, e.g. `worker: python manage.py qcluster`, when deploying to Railway).

- [ ] **Step 7: Commit**

```bash
git add backend/apps/users/tasks.py backend/apps/users/management backend/apps/users/tests/test_tasks.py
git commit -m "feat: add scheduled workout reminder and weekly summary tasks"
```

---

### Task 5: Wire plan-update emails into existing generation views

**Files:**
- Modify: `backend/apps/fitness/views.py`
- Modify: `backend/apps/nutrition/views.py`
- Test: `backend/apps/fitness/tests/test_fitness.py`
- Test: `backend/apps/nutrition/tests/test_nutrition.py` (create if it doesn't already exist)

- [ ] **Step 1: Write the failing tests**

Check whether `backend/apps/fitness/tests/test_fitness.py` already defines `api_client` and `auth_client` fixtures (grep for `def api_client` — the Workout Auto-Log plan adds them). If they're **not** present yet (this plan is being implemented before that one), append this block first:

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

If they're already present (skip the block above and) append only the new test to `backend/apps/fitness/tests/test_fitness.py`:

```python
from unittest.mock import patch


@pytest.mark.django_db
@patch('apps.fitness.views.generate_fitness_plan')
def test_generate_fitness_plan_sends_update_email(mock_generate, auth_client, active_user):
    from django.core import mail
    active_user.profile.age = 25
    active_user.profile.weight_kg = 70
    active_user.profile.height_cm = 175
    active_user.profile.gender = 'male'
    active_user.profile.save()
    mock_generate.return_value = {
        'goal': 'maintain',
        'weekly_schedule': {'monday': []},
        'estimated_weekly_calories_burned': 1000,
    }
    mail.outbox.clear()
    response = auth_client.post('/api/fitness/generate/')
    assert response.status_code == 201
    assert len(mail.outbox) == 1
    assert 'fitness plan' in mail.outbox[0].subject.lower()
```

Check whether `backend/apps/nutrition/tests/` exists; if not, create `backend/apps/nutrition/tests/__init__.py` (empty) and `backend/apps/nutrition/tests/test_nutrition.py`:

```python
import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.users.models import MemberProfile

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def active_user_with_profile():
    user = User.objects.create_user(
        username='nutri@example.com', email='nutri@example.com', password='pass123',
    )
    MemberProfile.objects.create(
        user=user, membership_status='active',
        age=25, weight_kg=70, height_cm=175, gender='male',
    )
    return user


@pytest.fixture
def auth_client(api_client, active_user_with_profile):
    token, _ = Token.objects.get_or_create(user=active_user_with_profile)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return api_client


@pytest.mark.django_db
@patch('apps.nutrition.views.generate_nutrition_plan')
def test_generate_nutrition_plan_sends_update_email(mock_generate, auth_client):
    mock_generate.return_value = {
        'calories': 2000, 'protein_g': 150, 'carbs_g': 200, 'fat_g': 60,
        'meals': {'breakfast': [], 'lunch': [], 'dinner': [], 'snacks': []},
    }
    mail.outbox.clear()
    response = auth_client.post('/api/nutrition/generate/')
    assert response.status_code == 201
    assert len(mail.outbox) == 1
    assert 'nutrition plan' in mail.outbox[0].subject.lower()
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `py -m pytest apps/fitness/tests/test_fitness.py apps/nutrition/tests/test_nutrition.py -v`
Expected: FAIL — `assert len(mail.outbox) == 1` fails with `0 == 1` (no email sent yet).

- [ ] **Step 3: Wire the fitness view**

In `backend/apps/fitness/views.py`, add the import at the top (after line 4):

```python
from apps.users.emails import send_plan_update_email
```

Change line 43 (the return in `GenerateFitnessPlanView.post`) from:

```python
        return Response(FitnessPlanSerializer(plan).data, status=status.HTTP_201_CREATED)
```

to:

```python
        send_plan_update_email(request.user, 'fitness')
        return Response(FitnessPlanSerializer(plan).data, status=status.HTTP_201_CREATED)
```

- [ ] **Step 4: Wire the nutrition view**

In `backend/apps/nutrition/views.py`, add the import at the top (after line 4):

```python
from apps.users.emails import send_plan_update_email
```

Change line 37 (the return in `GenerateNutritionView.post`) from:

```python
        return Response(NutritionPlanSerializer(plan).data, status=status.HTTP_201_CREATED)
```

to:

```python
        send_plan_update_email(request.user, 'nutrition')
        return Response(NutritionPlanSerializer(plan).data, status=status.HTTP_201_CREATED)
```

- [ ] **Step 5: Run tests to verify they pass**

Run (from `backend/`): `py -m pytest apps/fitness/tests/test_fitness.py apps/nutrition/tests/test_nutrition.py -v`
Expected: PASS.

- [ ] **Step 6: Run the full backend suite to check for regressions**

Run (from `backend/`): `py -m pytest -v`
Expected: all tests pass (no pre-existing test asserts an exact `mail.outbox` count of 0 after calling these views, so this should not break anything else).

- [ ] **Step 7: Commit**

```bash
git add backend/apps/fitness/views.py backend/apps/nutrition/views.py backend/apps/fitness/tests/test_fitness.py backend/apps/nutrition/tests
git commit -m "feat: send plan-update email on fitness/nutrition plan generation"
```

---

### Task 6: Frontend — Settings page with notification toggles

**Files:**
- Create: `frontend/src/pages/Settings.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/components/BottomNav.jsx`

- [ ] **Step 1: Create the Settings page**

Create `frontend/src/pages/Settings.jsx`:

```jsx
import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../api'

const TOGGLES = [
  { key: 'workout_reminders', label: 'Workout Reminders', desc: 'Get an email nudge on days you have a scheduled workout and haven\'t logged one yet.' },
  { key: 'plan_updates',      label: 'Plan Updates',       desc: 'Get an email whenever your fitness or nutrition plan is regenerated.' },
  { key: 'weekly_summary',    label: 'Weekly Summary',     desc: 'Get a weekly email recapping your logged sessions and top exercises.' },
]

export default function Settings() {
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/notifications/prefs/').then(({ data }) => setPrefs(data)).finally(() => setLoading(false))
  }, [])

  const handleToggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)
    try {
      await api.patch('/api/notifications/prefs/', { [key]: next[key] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="mb-7">
        <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Account</p>
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="max-w-lg space-y-4">
        <div className="card p-6">
          <h2 className="text-text-base font-semibold mb-4">Email Notifications</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="shimmer-line h-10" />)}
            </div>
          ) : (
            <div className="space-y-5">
              {TOGGLES.map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-text-base text-sm font-medium">{label}</p>
                    <p className="text-text-dim text-xs mt-0.5">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(key)}
                    disabled={saving}
                    aria-pressed={prefs[key]}
                    className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                      prefs[key] ? 'bg-primary' : 'bg-border-mid'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        prefs[key] ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 2: Add the route**

In `frontend/src/App.jsx`, add the import (after line 15, `import Profile from './pages/Profile'`):

```javascript
import Settings from './pages/Settings'
```

Add the route (after line 39, the `/profile` route):

```jsx
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
```

- [ ] **Step 3: Add the nav entry to Sidebar**

In `frontend/src/components/Sidebar.jsx`, add `IconSettings` to the `NAV` array (after the `/profile` entry, line 14):

```javascript
  { to: '/profile',      label: 'Profile',      icon: IconUser },
  { to: '/settings',     label: 'Settings',     icon: IconSettings },
```

Add the icon function at the end of the icon definitions (after `IconLogout`, line 127):

```javascript
function IconSettings(p) { return <Ico {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ico> }
```

- [ ] **Step 4: Add the nav entry to BottomNav**

In `frontend/src/components/BottomNav.jsx`, add a Settings entry to `MORE_TABS` (after line 16, the `/profile` entry):

```javascript
  { to: '/profile',  label: 'Profile',  icon: '👤' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
```

- [ ] **Step 5: Manual verification**

1. Start both servers.
2. Log in as an active member, navigate to `/settings` via the Sidebar (desktop) or the "More" sheet (mobile viewport).
3. Confirm all three toggles show as ON by default (matches model defaults).
4. Toggle "Workout Reminders" off, refresh the page, confirm it stays off (persisted server-side).
5. Trigger a fitness plan generation from `/fitness-plan` and confirm (via backend console/log output, since SendGrid isn't configured with a real key in dev) that `send_plan_update_email` was invoked without raising — check Django server logs for either a successful send or the caught/logged exception, never an unhandled 500.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Settings.jsx frontend/src/App.jsx frontend/src/components/Sidebar.jsx frontend/src/components/BottomNav.jsx
git commit -m "feat: add Settings page with notification preference toggles"
```

---

### Task 7: Full verification and push

- [ ] **Step 1: Run the full backend test suite**

Run (from `backend/`): `py -m pytest -v`
Expected: all tests pass.

- [ ] **Step 2: Live walkthrough**

Repeat Task 6 Step 5's manual verification end-to-end, plus confirm from the Nutrition page that generating a nutrition plan standalone also triggers a plan-update email attempt (per its preference toggle).

- [ ] **Step 3: Push**

```bash
git push
```
