# Phase 2 — AI + Backend Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all backend Django apps and their frontend pages — Fitness Plan Generator, Nutrition/Macro Scanner, AI Chatbot, BMI Estimator, Equipment Suggestions, Activity Logbook, User Profile/Dashboard, and Admin Dashboard.

**Architecture:** Django apps added to `backend/apps/`. All AI server-side calls (Path A) use `google-generativeai` SDK with `GEMINI_API_KEY`. Chatbot (Path B) calls Gemini directly from React using `VITE_GEMINI_PUBLIC_KEY`. Frontend pages replace Phase 1 stubs.

**Tech Stack:** Django REST Framework, google-generativeai (gemini-1.5-flash), Zustand (profileStore, fitnessStore, nutritionStore, chatStore, uiStore), Recharts (dashboard charts), React

**Prerequisite:** Phase 1 plan complete and all tests passing.

---

## File Map

### New Backend Apps
```
backend/apps/
├── fitness/
│   ├── models.py          ← FitnessPlan, WorkoutLog, WorkoutSet, BodyMetric
│   ├── serializers.py
│   ├── views.py           ← GeneratePlanView, LogWorkoutView, BodyMetricView, BMIView
│   ├── urls.py
│   └── tests/test_fitness.py
├── nutrition/
│   ├── models.py          ← NutritionPlan, FoodScan
│   ├── serializers.py
│   ├── views.py           ← GenerateNutritionView, FoodScanView
│   ├── urls.py
│   └── tests/test_nutrition.py
├── ai/
│   ├── models.py          ← ChatSession, ChatMessage
│   ├── serializers.py
│   ├── views.py           ← ChatSessionView, ChatHistoryView
│   ├── gemini.py          ← Gemini SDK wrapper (Path A)
│   ├── urls.py
│   └── tests/test_gemini.py
├── equipment/
│   ├── models.py          ← Equipment
│   ├── serializers.py
│   ├── views.py           ← EquipmentListView
│   ├── urls.py
│   └── management/commands/seed_equipment.py
└── analytics/
    ├── models.py          ← FeatureUsageLog
    ├── serializers.py
    ├── views.py           ← LogUsageView, AdminAnalyticsView
    └── urls.py
```

### New/Modified Backend Config
```
backend/config/urls.py     ← add new app URLs
backend/config/settings.py ← add new apps to INSTALLED_APPS
```

### New Frontend Stores + Pages
```
frontend/src/store/
├── profileStore.js
├── fitnessStore.js
├── nutritionStore.js
├── chatStore.js
└── uiStore.js

frontend/src/pages/
├── Dashboard.jsx          ← replace stub
├── FitnessPlan.jsx        ← replace stub
├── Nutrition.jsx          ← replace stub
├── BMIEstimator.jsx       ← replace stub
├── Chatbot.jsx            ← replace stub
├── Logbook.jsx            ← replace stub
├── Profile.jsx            ← replace stub
└── AdminDashboard.jsx     ← replace stub

frontend/src/components/
├── DisclaimerBanner.jsx   ← reusable AI disclaimer
├── Sidebar.jsx            ← desktop nav
└── BottomNav.jsx          ← mobile nav
```

---

## Task 1: Register New Django Apps + Config

**Files:**
- Modify: `backend/config/settings.py`
- Modify: `backend/config/urls.py`

- [ ] **Step 1: Scaffold new apps**

```bash
cd backend
python -m django startapp fitness
python -m django startapp nutrition
python -m django startapp ai_module
python -m django startapp equipment
python -m django startapp analytics

# Move to apps/
# PowerShell:
Move-Item fitness apps\
Move-Item nutrition apps\
Move-Item ai_module apps\
Move-Item equipment apps\
Move-Item analytics apps\
```

Create `__init__.py` in each:
```bash
# PowerShell:
New-Item apps\fitness\__init__.py -ItemType File
New-Item apps\nutrition\__init__.py -ItemType File
New-Item apps\ai_module\__init__.py -ItemType File
New-Item apps\equipment\__init__.py -ItemType File
New-Item apps\analytics\__init__.py -ItemType File
```

- [ ] **Step 2: Add to INSTALLED_APPS in settings.py**

In `backend/config/settings.py`, replace the `INSTALLED_APPS` list:

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
]
```

- [ ] **Step 3: Update config/urls.py**

```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/profile/', include('apps.users.profile_urls')),
    path('api/fitness/', include('apps.fitness.urls')),
    path('api/nutrition/', include('apps.nutrition.urls')),
    path('api/ai/', include('apps.ai_module.urls')),
    path('api/equipment/', include('apps.equipment.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/admin/', include('apps.users.admin_urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "chore: scaffold phase 2 django apps and update urls"
```

---

## Task 2: Profile API (GET/PUT own profile)

**Files:**
- Create: `backend/apps/users/profile_urls.py`
- Modify: `backend/apps/users/views.py`
- Modify: `backend/apps/users/tests/test_auth.py`

- [ ] **Step 1: Add profile tests**

Append to `backend/apps/users/tests/test_auth.py`:

```python
@pytest.mark.django_db
def test_get_profile_requires_active_membership(api_client, registered_user):
    token = registered_user['token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
    response = api_client.get('/api/profile/')
    assert response.status_code == 403  # pending membership


@pytest.mark.django_db
def test_get_profile_succeeds_for_active_member(api_client):
    from rest_framework.authtoken.models import Token
    user = User.objects.create_user(
        username='active2@example.com', email='active2@example.com', password='pass123'
    )
    MemberProfile.objects.create(user=user, membership_status='active')
    token, _ = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    response = api_client.get('/api/profile/')
    assert response.status_code == 200
    assert response.data['email'] == 'active2@example.com'


@pytest.mark.django_db
def test_update_profile_biometrics(api_client):
    from rest_framework.authtoken.models import Token
    user = User.objects.create_user(
        username='update@example.com', email='update@example.com', password='pass123'
    )
    MemberProfile.objects.create(user=user, membership_status='active')
    token, _ = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    response = api_client.put('/api/profile/', {
        'age': 30, 'weight_kg': 80.0, 'height_cm': 180.0,
        'gender': 'male', 'fitness_goal': 'build_muscle', 'activity_level': 'active',
    }, format='json')
    assert response.status_code == 200
    user.profile.refresh_from_db()
    assert user.profile.weight_kg == 80.0
    assert user.profile.bmi is not None
```

- [ ] **Step 2: Run — expect failure**

```bash
pytest apps/users/tests/test_auth.py -v -k "profile"
```

Expected: FAIL — `/api/profile/` not found.

- [ ] **Step 3: Add ProfileView to views.py**

Append to `backend/apps/users/views.py`:

```python
from .serializers import MemberProfileSerializer
from .permissions import IsActiveMember


class ProfileView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = MemberProfileSerializer(
            request.user.profile, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 4: Create profile_urls.py**

```python
from django.urls import path
from .views import ProfileView

urlpatterns = [
    path('', ProfileView.as_view(), name='profile'),
]
```

- [ ] **Step 5: Run tests**

```bash
pytest apps/users/tests/ -v
```

Expected: all tests PASSED.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/users/
git commit -m "feat: add GET/PUT profile endpoint with IsActiveMember guard"
```

---

## Task 3: Fitness Models + Migrations

**Files:**
- Create: `backend/apps/fitness/models.py`
- Create: `backend/apps/fitness/tests/__init__.py`
- Create: `backend/apps/fitness/tests/test_fitness.py`

- [ ] **Step 1: Write failing tests**

Create `backend/apps/fitness/tests/__init__.py` — empty.

Create `backend/apps/fitness/tests/test_fitness.py`:

```python
import pytest
from django.contrib.auth import get_user_model
from apps.users.models import MemberProfile
from apps.fitness.models import FitnessPlan, WorkoutLog, WorkoutSet, BodyMetric

User = get_user_model()


@pytest.fixture
def active_user(db):
    user = User.objects.create_user(
        username='fit@example.com', email='fit@example.com', password='pass123'
    )
    MemberProfile.objects.create(user=user, membership_status='active')
    return user


@pytest.mark.django_db
def test_fitness_plan_created(active_user):
    plan = FitnessPlan.objects.create(
        user=active_user,
        goal='build_muscle',
        weekly_schedule={'mon': 'chest', 'wed': 'back', 'fri': 'legs'},
        is_active=True,
    )
    assert plan.user == active_user
    assert FitnessPlan.objects.filter(user=active_user).count() == 1


@pytest.mark.django_db
def test_workout_log_with_sets(active_user):
    from datetime import date
    log = WorkoutLog.objects.create(user=active_user, date=date.today(), notes='Good session')
    WorkoutSet.objects.create(log=log, exercise_name='Bench Press', sets=3, reps=10, weight_kg=60.0)
    assert WorkoutSet.objects.filter(log=log).count() == 1


@pytest.mark.django_db
def test_body_metric(active_user):
    from datetime import date
    metric = BodyMetric.objects.create(
        user=active_user, date=date.today(), weight_kg=75.0, body_fat_pct=18.5
    )
    assert metric.weight_kg == 75.0
```

- [ ] **Step 2: Run — expect failure**

```bash
pytest apps/fitness/tests/ -v
```

Expected: ImportError — models not defined.

- [ ] **Step 3: Write fitness/models.py**

```python
from django.db import models
from django.conf import settings


class FitnessPlan(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fitness_plans')
    created_at = models.DateTimeField(auto_now_add=True)
    goal = models.CharField(max_length=20)
    weekly_schedule = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']


class WorkoutLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workout_logs')
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']


class WorkoutSet(models.Model):
    log = models.ForeignKey(WorkoutLog, on_delete=models.CASCADE, related_name='sets')
    exercise_name = models.CharField(max_length=100)
    sets = models.PositiveIntegerField()
    reps = models.PositiveIntegerField()
    weight_kg = models.FloatField(null=True, blank=True)


class BodyMetric(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='body_metrics')
    date = models.DateField()
    weight_kg = models.FloatField()
    body_fat_pct = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
```

- [ ] **Step 4: Migrate and run tests**

```bash
python manage.py makemigrations fitness
python manage.py migrate
pytest apps/fitness/tests/ -v
```

Expected: 3 tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/fitness/
git commit -m "feat: add fitness models — FitnessPlan, WorkoutLog, WorkoutSet, BodyMetric"
```

---

## Task 4: Gemini API Wrapper (Path A)

**Files:**
- Create: `backend/apps/ai_module/gemini.py`
- Create: `backend/apps/ai_module/tests/__init__.py`
- Create: `backend/apps/ai_module/tests/test_gemini.py`

- [ ] **Step 1: Add GEMINI_API_KEY to settings.py**

Append to `backend/config/settings.py`:

```python
GEMINI_API_KEY = config('GEMINI_API_KEY', default='')
```

- [ ] **Step 2: Write failing tests for Gemini wrapper**

Create `backend/apps/ai_module/tests/__init__.py` — empty.

Create `backend/apps/ai_module/tests/test_gemini.py`:

```python
import pytest
from unittest.mock import patch, MagicMock
from apps.ai_module.gemini import generate_fitness_plan, generate_nutrition_plan


@pytest.mark.django_db
def test_generate_fitness_plan_returns_dict():
    mock_response = MagicMock()
    mock_response.text = '{"weekly_schedule": {"mon": "chest day", "wed": "back day"}}'

    with patch('apps.ai_module.gemini._model') as mock_model:
        mock_model.generate_content.return_value = mock_response
        result = generate_fitness_plan(
            age=25, weight_kg=70, height_cm=175, gender='male',
            fitness_goal='build_muscle', activity_level='moderate',
            bmr=1668.75, bmi=22.86,
        )
    assert isinstance(result, dict)
    assert 'weekly_schedule' in result


@pytest.mark.django_db
def test_generate_fitness_plan_handles_invalid_json():
    mock_response = MagicMock()
    mock_response.text = 'Sorry, I cannot help with that.'

    with patch('apps.ai_module.gemini._model') as mock_model:
        mock_model.generate_content.return_value = mock_response
        result = generate_fitness_plan(
            age=25, weight_kg=70, height_cm=175, gender='male',
            fitness_goal='build_muscle', activity_level='moderate',
            bmr=1668.75, bmi=22.86,
        )
    assert result is None


@pytest.mark.django_db
def test_generate_nutrition_plan_returns_dict():
    mock_response = MagicMock()
    mock_response.text = '{"calories": 2000, "meals": ["breakfast", "lunch", "dinner"]}'

    with patch('apps.ai_module.gemini._model') as mock_model:
        mock_model.generate_content.return_value = mock_response
        result = generate_nutrition_plan(
            age=25, weight_kg=70, height_cm=175, gender='male',
            fitness_goal='build_muscle', bmr=1668.75, bmi=22.86,
            activity_level='moderate',
        )
    assert isinstance(result, dict)
    assert 'calories' in result
```

- [ ] **Step 3: Run — expect failure**

```bash
pytest apps/ai_module/tests/test_gemini.py -v
```

Expected: ImportError.

- [ ] **Step 4: Write ai_module/gemini.py**

```python
import json
import re
import google.generativeai as genai
from django.conf import settings

genai.configure(api_key=settings.GEMINI_API_KEY)
_model = genai.GenerativeModel('gemini-1.5-flash')

_FITNESS_PROMPT = """
You are a certified personal trainer. Generate a personalized weekly workout plan in JSON format only.

User profile:
- Age: {age} years
- Weight: {weight_kg} kg
- Height: {height_cm} cm
- Gender: {gender}
- Goal: {fitness_goal}
- Activity level: {activity_level}
- BMI: {bmi}
- BMR: {bmr} kcal/day

Return ONLY valid JSON with this structure:
{{
  "goal": "string",
  "weekly_schedule": {{
    "monday": [{{"exercise": "name", "sets": 3, "reps": 10, "rest_seconds": 60}}],
    "tuesday": "rest",
    ...
  }},
  "notes": "string",
  "estimated_weekly_calories_burned": number
}}
"""

_NUTRITION_PROMPT = """
You are a registered nutritionist. Generate a personalized daily meal plan in JSON format only.

User profile:
- Age: {age} years
- Weight: {weight_kg} kg
- Height: {height_cm} cm
- Gender: {gender}
- Goal: {fitness_goal}
- Activity level: {activity_level}
- BMI: {bmi}
- BMR: {bmr} kcal/day

Return ONLY valid JSON with this structure:
{{
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "meals": {{
    "breakfast": [{{"food": "name", "portion": "amount", "calories": number}}],
    "lunch": [...],
    "dinner": [...],
    "snacks": [...]
  }},
  "hydration_ml": number,
  "notes": "string"
}}
"""


def _parse_json_response(text: str) -> dict | None:
    if not text or text.lower().startswith(('sorry', 'i cannot', 'as an ai')):
        return None
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None


def generate_fitness_plan(*, age, weight_kg, height_cm, gender, fitness_goal, activity_level, bmr, bmi) -> dict | None:
    prompt = _FITNESS_PROMPT.format(
        age=age, weight_kg=weight_kg, height_cm=height_cm, gender=gender,
        fitness_goal=fitness_goal, activity_level=activity_level, bmr=bmr, bmi=bmi,
    )
    response = _model.generate_content(prompt)
    return _parse_json_response(response.text)


def generate_nutrition_plan(*, age, weight_kg, height_cm, gender, fitness_goal, activity_level, bmr, bmi) -> dict | None:
    prompt = _NUTRITION_PROMPT.format(
        age=age, weight_kg=weight_kg, height_cm=height_cm, gender=gender,
        fitness_goal=fitness_goal, activity_level=activity_level, bmr=bmr, bmi=bmi,
    )
    response = _model.generate_content(prompt)
    return _parse_json_response(response.text)


def analyze_food_image(image_bytes: bytes, mime_type: str = 'image/jpeg') -> dict | None:
    prompt = """Analyze this food image and return ONLY valid JSON:
{
  "foods_detected": [{"name": "string", "portion_estimate": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}],
  "total_calories": number,
  "total_protein_g": number,
  "total_carbs_g": number,
  "total_fat_g": number,
  "confidence": "low|medium|high"
}"""
    image_part = {'mime_type': mime_type, 'data': image_bytes}
    response = _model.generate_content([prompt, image_part])
    return _parse_json_response(response.text)
```

- [ ] **Step 5: Run tests**

```bash
pytest apps/ai_module/tests/test_gemini.py -v
```

Expected: 3 tests PASSED (mocked — no real API calls).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/ai_module/
git commit -m "feat: add gemini api wrapper with fitness plan, nutrition, and food scan functions"
```

---

## Task 5: Fitness Plan API Endpoints

**Files:**
- Create: `backend/apps/fitness/serializers.py`
- Create: `backend/apps/fitness/views.py`
- Create: `backend/apps/fitness/urls.py`
- Modify: `backend/apps/fitness/tests/test_fitness.py`

- [ ] **Step 1: Add API tests**

Append to `backend/apps/fitness/tests/test_fitness.py`:

```python
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from unittest.mock import patch


@pytest.fixture
def active_api_client(active_user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=active_user)
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return client


@pytest.mark.django_db
def test_generate_plan_returns_201(active_api_client, active_user):
    MemberProfile.objects.filter(user=active_user).update(
        age=25, weight_kg=70, height_cm=175, gender='male',
        fitness_goal='build_muscle', activity_level='moderate',
        bmi=22.86, bmr=1668.75,
    )
    mock_plan = {'weekly_schedule': {'monday': [{'exercise': 'Bench Press', 'sets': 3, 'reps': 10, 'rest_seconds': 60}]}, 'goal': 'build_muscle', 'notes': 'Good luck', 'estimated_weekly_calories_burned': 1200}
    with patch('apps.fitness.views.generate_fitness_plan', return_value=mock_plan):
        response = active_api_client.post('/api/fitness/generate/')
    assert response.status_code == 201
    assert FitnessPlan.objects.filter(user=active_user).count() == 1


@pytest.mark.django_db
def test_generate_plan_fails_without_biometrics(active_api_client):
    with patch('apps.fitness.views.generate_fitness_plan', return_value=None):
        response = active_api_client.post('/api/fitness/generate/')
    assert response.status_code == 400


@pytest.mark.django_db
def test_list_plans(active_api_client, active_user):
    FitnessPlan.objects.create(user=active_user, goal='build_muscle', weekly_schedule={}, is_active=True)
    response = active_api_client.get('/api/fitness/plans/')
    assert response.status_code == 200
    assert len(response.data) >= 1
```

- [ ] **Step 2: Write fitness/serializers.py**

```python
from rest_framework import serializers
from .models import FitnessPlan, WorkoutLog, WorkoutSet, BodyMetric


class WorkoutSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSet
        fields = ['id', 'exercise_name', 'sets', 'reps', 'weight_kg']


class WorkoutLogSerializer(serializers.ModelSerializer):
    sets = WorkoutSetSerializer(many=True)

    class Meta:
        model = WorkoutLog
        fields = ['id', 'date', 'notes', 'sets', 'created_at']

    def create(self, validated_data):
        sets_data = validated_data.pop('sets', [])
        log = WorkoutLog.objects.create(**validated_data)
        for s in sets_data:
            WorkoutSet.objects.create(log=log, **s)
        return log


class FitnessPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitnessPlan
        fields = ['id', 'goal', 'weekly_schedule', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class BodyMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = BodyMetric
        fields = ['id', 'date', 'weight_kg', 'body_fat_pct', 'created_at']
        read_only_fields = ['id', 'created_at']
```

- [ ] **Step 3: Write fitness/views.py**

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from apps.ai_module.gemini import generate_fitness_plan
from .models import FitnessPlan, WorkoutLog, BodyMetric
from .serializers import FitnessPlanSerializer, WorkoutLogSerializer, BodyMetricSerializer


class GenerateFitnessPlanView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        profile = request.user.profile
        if not all([profile.age, profile.weight_kg, profile.height_cm, profile.gender]):
            return Response(
                {'detail': 'Complete your profile (age, weight, height, gender) before generating a plan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        plan_data = generate_fitness_plan(
            age=profile.age,
            weight_kg=profile.weight_kg,
            height_cm=profile.height_cm,
            gender=profile.gender,
            fitness_goal=profile.fitness_goal or 'maintain',
            activity_level=profile.activity_level or 'moderate',
            bmr=profile.bmr or 0,
            bmi=profile.bmi or 0,
        )
        if not plan_data:
            return Response(
                {'detail': 'AI plan generation failed. Try again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        FitnessPlan.objects.filter(user=request.user, is_active=True).update(is_active=False)
        plan = FitnessPlan.objects.create(
            user=request.user,
            goal=plan_data.get('goal', profile.fitness_goal),
            weekly_schedule=plan_data,
            is_active=True,
        )
        return Response(FitnessPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


class FitnessPlanListView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        plans = FitnessPlan.objects.filter(user=request.user)
        return Response(FitnessPlanSerializer(plans, many=True).data)


class WorkoutLogView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        serializer = WorkoutLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        logs = WorkoutLog.objects.filter(user=request.user).prefetch_related('sets')
        return Response(WorkoutLogSerializer(logs, many=True).data)


class BodyMetricView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        serializer = BodyMetricSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        metrics = BodyMetric.objects.filter(user=request.user)
        return Response(BodyMetricSerializer(metrics, many=True).data)


class BMIView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        weight = request.data.get('weight_kg')
        height = request.data.get('height_cm')
        if not weight or not height:
            return Response({'detail': 'weight_kg and height_cm required.'}, status=status.HTTP_400_BAD_REQUEST)
        h = float(height) / 100
        bmi = round(float(weight) / (h * h), 2)
        if bmi < 18.5:
            classification = 'Underweight'
        elif bmi < 25:
            classification = 'Normal weight'
        elif bmi < 30:
            classification = 'Overweight'
        else:
            classification = 'Obese'
        return Response({'bmi': bmi, 'classification': classification})
```

- [ ] **Step 4: Write fitness/urls.py**

```python
from django.urls import path
from .views import GenerateFitnessPlanView, FitnessPlanListView, WorkoutLogView, BodyMetricView, BMIView

urlpatterns = [
    path('generate/', GenerateFitnessPlanView.as_view(), name='fitness-generate'),
    path('plans/', FitnessPlanListView.as_view(), name='fitness-plans'),
    path('log/', WorkoutLogView.as_view(), name='fitness-log'),
    path('metrics/', BodyMetricView.as_view(), name='fitness-metrics'),
    path('bmi/', BMIView.as_view(), name='fitness-bmi'),
]
```

- [ ] **Step 5: Migrate and run tests**

```bash
python manage.py makemigrations fitness
python manage.py migrate
pytest apps/fitness/tests/ -v
```

Expected: all tests PASSED.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/fitness/
git commit -m "feat: add fitness plan generation, workout log, body metrics, and BMI endpoints"
```

---

## Task 6: Nutrition + Equipment + Analytics Apps

**Files:**
- Create: `backend/apps/nutrition/models.py`, `serializers.py`, `views.py`, `urls.py`
- Create: `backend/apps/equipment/models.py`, `serializers.py`, `views.py`, `urls.py`
- Create: `backend/apps/analytics/models.py`, `serializers.py`, `views.py`, `urls.py`

- [ ] **Step 1: Write nutrition/models.py**

```python
from django.db import models
from django.conf import settings


class NutritionPlan(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='nutrition_plans')
    created_at = models.DateTimeField(auto_now_add=True)
    content = models.JSONField(default=dict)
    calories = models.FloatField(null=True, blank=True)
    protein_g = models.FloatField(null=True, blank=True)
    carbs_g = models.FloatField(null=True, blank=True)
    fat_g = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']


class FoodScan(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='food_scans')
    image = models.ImageField(upload_to='food_scans/')
    analysis = models.JSONField(default=dict)
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scanned_at']
```

- [ ] **Step 2: Write nutrition/serializers.py**

```python
from rest_framework import serializers
from .models import NutritionPlan, FoodScan


class NutritionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionPlan
        fields = ['id', 'created_at', 'content', 'calories', 'protein_g', 'carbs_g', 'fat_g']
        read_only_fields = ['id', 'created_at']


class FoodScanSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodScan
        fields = ['id', 'image', 'analysis', 'scanned_at']
        read_only_fields = ['id', 'analysis', 'scanned_at']
```

- [ ] **Step 3: Write nutrition/views.py**

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from apps.ai_module.gemini import generate_nutrition_plan, analyze_food_image
from .models import NutritionPlan, FoodScan
from .serializers import NutritionPlanSerializer, FoodScanSerializer


class GenerateNutritionView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        profile = request.user.profile
        if not all([profile.age, profile.weight_kg, profile.height_cm, profile.gender]):
            return Response(
                {'detail': 'Complete your profile before generating a nutrition plan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        plan_data = generate_nutrition_plan(
            age=profile.age, weight_kg=profile.weight_kg, height_cm=profile.height_cm,
            gender=profile.gender, fitness_goal=profile.fitness_goal or 'maintain',
            activity_level=profile.activity_level or 'moderate',
            bmr=profile.bmr or 0, bmi=profile.bmi or 0,
        )
        if not plan_data:
            return Response({'detail': 'AI nutrition plan generation failed. Try again.'}, status=status.HTTP_400_BAD_REQUEST)
        plan = NutritionPlan.objects.create(
            user=request.user,
            content=plan_data,
            calories=plan_data.get('calories'),
            protein_g=plan_data.get('protein_g'),
            carbs_g=plan_data.get('carbs_g'),
            fat_g=plan_data.get('fat_g'),
        )
        return Response(NutritionPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


class FoodScanView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'detail': 'image file required.'}, status=status.HTTP_400_BAD_REQUEST)
        image_bytes = image_file.read()
        mime_type = image_file.content_type or 'image/jpeg'
        analysis = analyze_food_image(image_bytes, mime_type)
        if not analysis:
            return Response({'detail': 'Could not analyze image. Try a clearer photo.'}, status=status.HTTP_400_BAD_REQUEST)
        scan = FoodScan.objects.create(user=request.user, image=image_file, analysis=analysis)
        return Response(FoodScanSerializer(scan).data, status=status.HTTP_201_CREATED)


class NutritionPlanListView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        plans = NutritionPlan.objects.filter(user=request.user)
        return Response(NutritionPlanSerializer(plans, many=True).data)
```

- [ ] **Step 4: Write nutrition/urls.py**

```python
from django.urls import path
from .views import GenerateNutritionView, FoodScanView, NutritionPlanListView

urlpatterns = [
    path('generate/', GenerateNutritionView.as_view()),
    path('scan/', FoodScanView.as_view()),
    path('plans/', NutritionPlanListView.as_view()),
]
```

- [ ] **Step 5: Write equipment/models.py**

```python
from django.db import models


class Equipment(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    usage_guide = models.TextField(blank=True)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return self.name
```

- [ ] **Step 6: Write equipment/serializers.py**

```python
from rest_framework import serializers
from .models import Equipment


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ['id', 'name', 'description', 'usage_guide', 'is_available']
```

- [ ] **Step 7: Write equipment/views.py**

```python
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from .models import Equipment
from .serializers import EquipmentSerializer


class EquipmentListView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        equipment = Equipment.objects.filter(is_available=True)
        return Response(EquipmentSerializer(equipment, many=True).data)
```

- [ ] **Step 8: Write equipment/urls.py**

```python
from django.urls import path
from .views import EquipmentListView

urlpatterns = [
    path('', EquipmentListView.as_view()),
]
```

- [ ] **Step 9: Write analytics/models.py**

```python
from django.db import models
from django.conf import settings


class FeatureUsageLog(models.Model):
    FEATURES = [
        ('fitness_plan', 'Fitness Plan'),
        ('nutrition', 'Nutrition'),
        ('posture', 'Posture Checker'),
        ('chatbot', 'Chatbot'),
        ('logbook', 'Logbook'),
        ('bmi', 'BMI Estimator'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='feature_usage')
    feature = models.CharField(max_length=20, choices=FEATURES)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
```

- [ ] **Step 10: Write analytics/serializers.py**

```python
from rest_framework import serializers
from .models import FeatureUsageLog


class FeatureUsageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureUsageLog
        fields = ['id', 'feature', 'timestamp']
        read_only_fields = ['id', 'timestamp']
```

- [ ] **Step 11: Write analytics/views.py**

```python
from django.db.models import Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember, IsAdmin
from apps.users.models import MemberProfile
from .models import FeatureUsageLog
from .serializers import FeatureUsageLogSerializer


class LogUsageView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        serializer = FeatureUsageLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminAnalyticsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        total_members = MemberProfile.objects.count()
        active_members = MemberProfile.objects.filter(membership_status='active').count()
        pending_members = MemberProfile.objects.filter(membership_status='pending').count()
        feature_usage = (
            FeatureUsageLog.objects
            .values('feature')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        return Response({
            'total_members': total_members,
            'active_members': active_members,
            'pending_members': pending_members,
            'feature_usage': list(feature_usage),
        })
```

- [ ] **Step 12: Write analytics/urls.py**

```python
from django.urls import path
from .views import LogUsageView, AdminAnalyticsView

urlpatterns = [
    path('log/', LogUsageView.as_view()),
    path('summary/', AdminAnalyticsView.as_view()),
]
```

- [ ] **Step 13: Migrate everything**

```bash
python manage.py makemigrations nutrition equipment analytics
python manage.py migrate
```

Expected: migrations created and applied with no errors.

- [ ] **Step 14: Seed equipment data**

Create `backend/apps/equipment/management/__init__.py` and `backend/apps/equipment/management/commands/__init__.py` and `backend/apps/equipment/management/commands/seed_equipment.py`:

```python
from django.core.management.base import BaseCommand
from apps.equipment.models import Equipment

EQUIPMENT = [
    {'name': 'Barbell', 'description': 'Standard Olympic barbell (20kg)', 'usage_guide': 'Use with weight plates for compound lifts like squat, deadlift, bench press. Ensure collars are secured before lifting.'},
    {'name': 'Dumbbell Set', 'description': 'Adjustable dumbbells (2–40kg)', 'usage_guide': 'Grip firmly with thumb wrapped around handle. Keep wrists neutral for most exercises.'},
    {'name': 'Cable Machine', 'description': 'Multi-station cable pulley system', 'usage_guide': 'Adjust the pin to appropriate weight. Cable flyes, tricep pushdowns, lat pulldowns.'},
    {'name': 'Leg Press Machine', 'description': 'Plate-loaded leg press', 'usage_guide': 'Place feet shoulder-width on platform. Do not lock knees at the top.'},
    {'name': 'Treadmill', 'description': 'Motorized treadmill', 'usage_guide': 'Start at a slow speed. Use safety clip. Increase incline for more calorie burn.'},
    {'name': 'Pull-up Bar', 'description': 'Wall-mounted pull-up bar', 'usage_guide': 'Grip slightly wider than shoulder-width. Engage lats, pull chest to bar.'},
    {'name': 'Bench Press', 'description': 'Flat adjustable bench with rack', 'usage_guide': 'Set safety bars appropriately. Keep feet flat, arch natural, retract shoulder blades.'},
    {'name': 'Kettlebells', 'description': 'Cast iron kettlebells (8–32kg)', 'usage_guide': 'Swing with hip hinge, not arm lift. Turkish get-ups build total-body stability.'},
]


class Command(BaseCommand):
    help = 'Seed gym equipment data'

    def handle(self, *args, **options):
        for item in EQUIPMENT:
            Equipment.objects.get_or_create(name=item['name'], defaults=item)
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(EQUIPMENT)} equipment items.'))
```

Run:
```bash
python manage.py seed_equipment
```

Expected: `Seeded 8 equipment items.`

- [ ] **Step 15: Commit**

```bash
git add backend/apps/nutrition/ backend/apps/equipment/ backend/apps/analytics/
git commit -m "feat: add nutrition, equipment, and analytics apps with all endpoints"
```

---

## Task 7: Chat + Admin Member Management APIs

**Files:**
- Create: `backend/apps/ai_module/models.py`, `serializers.py`, `views.py`, `urls.py`
- Create: `backend/apps/users/admin_urls.py`
- Modify: `backend/apps/users/views.py`

- [ ] **Step 1: Write ai_module/models.py**

```python
from django.db import models
from django.conf import settings


class ChatSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_sessions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class ChatMessage(models.Model):
    ROLES = [('user', 'User'), ('assistant', 'Assistant')]
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLES)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
```

- [ ] **Step 2: Write ai_module/serializers.py**

```python
from rest_framework import serializers
from .models import ChatSession, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = ['id', 'created_at', 'messages']
        read_only_fields = ['id', 'created_at']
```

- [ ] **Step 3: Write ai_module/views.py**

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer


class ChatSessionView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        session = ChatSession.objects.create(user=request.user)
        return Response(ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class ChatHistoryView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatSessionSerializer(session).data)

    def post(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        messages = request.data.get('messages', [])
        for msg in messages:
            ChatMessage.objects.create(
                session=session,
                role=msg.get('role'),
                content=msg.get('content', ''),
            )
        return Response({'saved': len(messages)}, status=status.HTTP_201_CREATED)
```

- [ ] **Step 4: Write ai_module/urls.py**

```python
from django.urls import path
from .views import ChatSessionView, ChatHistoryView

urlpatterns = [
    path('chat/session/', ChatSessionView.as_view()),
    path('chat/history/<int:session_id>/', ChatHistoryView.as_view()),
]
```

- [ ] **Step 5: Add admin member management views to users/views.py**

Append to `backend/apps/users/views.py`:

```python
from django.contrib.auth import get_user_model
from .permissions import IsAdmin

User = get_user_model()


class AdminMemberListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.select_related('profile').exclude(is_superuser=True)
        return Response(UserSerializer(users, many=True).data)


class AdminMemberDetailView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, user_id):
        try:
            user = User.objects.select_related('profile').get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)

        allowed = ['membership_status', 'membership_start', 'membership_end']
        profile_data = {k: v for k, v in request.data.items() if k in allowed}
        serializer = MemberProfileSerializer(user.profile, data=profile_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 6: Create users/admin_urls.py**

```python
from django.urls import path
from .views import AdminMemberListView, AdminMemberDetailView

urlpatterns = [
    path('members/', AdminMemberListView.as_view()),
    path('members/<int:user_id>/', AdminMemberDetailView.as_view()),
]
```

- [ ] **Step 7: Migrate and run all tests**

```bash
python manage.py makemigrations ai_module
python manage.py migrate
pytest -v
```

Expected: all tests PASSED.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/ai_module/ backend/apps/users/admin_urls.py backend/apps/users/views.py
git commit -m "feat: add chat session/history API and admin member management endpoints"
```

---

## Task 8: Frontend Stores

**Files:**
- Create: `frontend/src/store/profileStore.js`
- Create: `frontend/src/store/fitnessStore.js`
- Create: `frontend/src/store/nutritionStore.js`
- Create: `frontend/src/store/chatStore.js`
- Create: `frontend/src/store/uiStore.js`

- [ ] **Step 1: Write profileStore.js**

```javascript
import { create } from 'zustand'

const useProfileStore = create((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}))

export default useProfileStore
```

- [ ] **Step 2: Write fitnessStore.js**

```javascript
import { create } from 'zustand'

const useFitnessStore = create((set) => ({
  activePlan: null,
  plans: [],
  workoutLogs: [],
  bodyMetrics: [],
  setActivePlan: (plan) => set({ activePlan: plan }),
  setPlans: (plans) => set({ plans, activePlan: plans.find(p => p.is_active) || null }),
  setWorkoutLogs: (logs) => set({ workoutLogs: logs }),
  setBodyMetrics: (metrics) => set({ bodyMetrics: metrics }),
  addBodyMetric: (metric) => set((s) => ({ bodyMetrics: [metric, ...s.bodyMetrics] })),
}))

export default useFitnessStore
```

- [ ] **Step 3: Write nutritionStore.js**

```javascript
import { create } from 'zustand'

const useNutritionStore = create((set) => ({
  plans: [],
  scanResult: null,
  setPlans: (plans) => set({ plans }),
  setScanResult: (result) => set({ scanResult: result }),
}))

export default useNutritionStore
```

- [ ] **Step 4: Write chatStore.js**

```javascript
import { create } from 'zustand'

const useChatStore = create((set) => ({
  sessionId: null,
  messages: [],
  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearChat: () => set({ sessionId: null, messages: [] }),
}))

export default useChatStore
```

- [ ] **Step 5: Write uiStore.js**

```javascript
import { create } from 'zustand'

const useUIStore = create((set) => ({
  loading: {},
  errors: {},
  setLoading: (key, value) => set((s) => ({ loading: { ...s.loading, [key]: value } })),
  setError: (key, value) => set((s) => ({ errors: { ...s.errors, [key]: value } })),
  clearError: (key) => set((s) => { const e = { ...s.errors }; delete e[key]; return { errors: e } }),
}))

export default useUIStore
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/store/
git commit -m "feat: add profile, fitness, nutrition, chat, and ui zustand stores"
```

---

## Task 9: Shared UI Components

**Files:**
- Create: `frontend/src/components/DisclaimerBanner.jsx`
- Create: `frontend/src/components/Sidebar.jsx`
- Create: `frontend/src/components/BottomNav.jsx`

- [ ] **Step 1: Write DisclaimerBanner.jsx**

```jsx
export default function DisclaimerBanner({ message }) {
  return (
    <div className="bg-warn/10 border border-warn/40 text-warn text-sm rounded-lg px-4 py-3 mb-4">
      ⚠️ {message || 'AI-generated content is for guidance only and does not replace professional medical or nutritionist advice.'}
    </div>
  )
}
```

- [ ] **Step 2: Write Sidebar.jsx**

```jsx
import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api'

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/fitness-plan', label: 'Fitness Plan' },
  { to: '/nutrition', label: 'Nutrition' },
  { to: '/posture', label: 'Posture Check' },
  { to: '/bmi', label: 'BMI' },
  { to: '/chatbot', label: 'AI Chat' },
  { to: '/logbook', label: 'Logbook' },
  { to: '/profile', label: 'Profile' },
]

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout/') } finally {
      clearAuth()
      navigate('/login')
    }
  }

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-primary-dark border-r border-accent/20 px-4 py-6">
      <span className="text-accent font-bold text-lg mb-8 px-2">J&A Fitness AI</span>
      <nav className="flex-1 space-y-1">
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-white/5'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
        {user?.is_admin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-admin-dark text-white font-semibold' : 'text-admin-accent hover:bg-admin-dark/20'
              }`
            }
          >
            Admin
          </NavLink>
        )}
      </nav>
      <button
        onClick={handleLogout}
        className="mt-4 px-3 py-2 text-sm text-text-muted hover:text-danger transition text-left"
      >
        Log Out
      </button>
    </aside>
  )
}
```

- [ ] **Step 3: Write BottomNav.jsx**

```jsx
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/dashboard', label: 'Home' },
  { to: '/fitness-plan', label: 'Plan' },
  { to: '/nutrition', label: 'Nutrition' },
  { to: '/posture', label: 'Posture' },
  { to: '/chatbot', label: 'Chat' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary-dark border-t border-accent/20 flex">
      {TABS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-xs transition ${
              isActive ? 'text-accent font-semibold' : 'text-text-muted'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Create AppLayout wrapper**

Create `frontend/src/components/AppLayout.jsx`:

```jsx
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6 w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add DisclaimerBanner, Sidebar, BottomNav, AppLayout components"
```

---

## Task 10: Dashboard Page

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Install recharts**

```bash
cd frontend && npm install recharts
```

- [ ] **Step 2: Write Dashboard.jsx**

```jsx
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import AppLayout from '../components/AppLayout'
import useAuthStore from '../store/authStore'
import useFitnessStore from '../store/fitnessStore'
import api from '../api'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { bodyMetrics, setBodyMetrics } = useFitnessStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/fitness/metrics/').then(({ data }) => {
      setBodyMetrics(data)
    }).finally(() => setLoading(false))
  }, [])

  const chartData = [...bodyMetrics]
    .reverse()
    .slice(-12)
    .map(m => ({ date: m.date, weight: m.weight_kg }))

  const profile = user?.profile

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-white mb-6">
        Welcome back, {user?.first_name}
      </h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'BMI', value: profile?.bmi ?? '—' },
          { label: 'BMR', value: profile?.bmr ? `${profile.bmr} kcal` : '—' },
          { label: 'Goal', value: profile?.fitness_goal?.replace('_', ' ') ?? '—' },
          { label: 'Membership', value: profile?.membership_status ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface border border-accent/20 rounded-xl p-4">
            <p className="text-text-muted text-xs uppercase tracking-wide">{label}</p>
            <p className="text-white font-semibold mt-1 capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Weight chart */}
      <div className="bg-surface border border-accent/20 rounded-xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Weight Progress (kg)</h2>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-text-muted text-sm">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-text-muted text-sm">
            No weight data yet. Log your first measurement below.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#C2C0B6', fontSize: 11 }} />
              <YAxis tick={{ fill: '#C2C0B6', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#1A1A18', border: '1px solid #5DCAA5', borderRadius: 8 }} />
              <Line type="monotone" dataKey="weight" stroke="#5DCAA5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Log weight form */}
      <LogWeightForm onLogged={(m) => setBodyMetrics([m, ...bodyMetrics])} />
    </AppLayout>
  )
}

function LogWeightForm({ onLogged }) {
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await api.post('/api/fitness/metrics/', {
        date: today,
        weight_kg: Number(weight),
        body_fat_pct: bodyFat ? Number(bodyFat) : undefined,
      })
      onLogged(data)
      setWeight('')
      setBodyFat('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface border border-accent/20 rounded-xl p-6">
      <h2 className="text-white font-semibold mb-4">Log Today's Measurements</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-text-muted mb-1">Weight (kg)</label>
          <input
            type="number" step="0.1" required value={weight} onChange={e => setWeight(e.target.value)}
            className="bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Body Fat % (optional)</label>
          <input
            type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)}
            className="bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit" disabled={saving}
          className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition text-sm"
        >
          {saving ? 'Saving…' : 'Log'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Start both servers. Log in as active member (set via Django admin). Navigate to `/dashboard`. Verify: stats cards show profile data, empty weight chart with message, log weight form works.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: add dashboard with weight progress chart and measurement logging"
```

---

## Task 11: Fitness Plan + BMI + Profile + Logbook Pages

**Files:**
- Modify: `frontend/src/pages/FitnessPlan.jsx`
- Modify: `frontend/src/pages/BMIEstimator.jsx`
- Modify: `frontend/src/pages/Profile.jsx`
- Modify: `frontend/src/pages/Logbook.jsx`

- [ ] **Step 1: Write FitnessPlan.jsx**

```jsx
import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useFitnessStore from '../store/fitnessStore'
import api from '../api'

export default function FitnessPlan() {
  const { activePlan, setPlans } = useFitnessStore()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/fitness/plans/').then(({ data }) => setPlans(data))
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const { data } = await api.post('/api/fitness/generate/')
      setPlans([data])
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed. Complete your profile first.')
    } finally {
      setGenerating(false)
    }
  }

  const schedule = activePlan?.weekly_schedule

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Fitness Plan</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          {generating ? 'Generating…' : activePlan ? 'Regenerate Plan' : 'Generate Plan'}
        </button>
      </div>

      <DisclaimerBanner />

      {error && (
        <div className="bg-danger/10 border border-danger/40 text-danger text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {generating && (
        <div className="bg-surface border border-accent/20 rounded-xl p-8 text-center text-text-muted">
          AI is creating your personalized plan…
        </div>
      )}

      {!generating && activePlan && schedule && (
        <div className="space-y-4">
          {Object.entries(schedule.weekly_schedule || schedule).map(([day, exercises]) => (
            <div key={day} className="bg-surface border border-accent/20 rounded-xl p-5">
              <h3 className="text-accent font-semibold capitalize mb-3">{day}</h3>
              {exercises === 'rest' || exercises === 'Rest' ? (
                <p className="text-text-muted text-sm">Rest day</p>
              ) : Array.isArray(exercises) ? (
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <div key={i} className="flex items-center gap-4 text-sm">
                      <span className="text-white font-medium min-w-36">{ex.exercise || ex.name}</span>
                      <span className="text-text-muted">{ex.sets} sets × {ex.reps} reps</span>
                      {ex.rest_seconds && <span className="text-text-muted">{ex.rest_seconds}s rest</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm">{String(exercises)}</p>
              )}
            </div>
          ))}
          {schedule.notes && (
            <div className="bg-surface border border-accent/20 rounded-xl p-4 text-text-muted text-sm">
              {schedule.notes}
            </div>
          )}
        </div>
      )}

      {!generating && !activePlan && (
        <div className="bg-surface border border-accent/20 rounded-xl p-8 text-center text-text-muted">
          No plan generated yet. Complete your profile, then click Generate Plan.
        </div>
      )}
    </AppLayout>
  )
}
```

- [ ] **Step 2: Write BMIEstimator.jsx**

```jsx
import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../api'

const CLASSIFICATIONS = {
  'Underweight': 'text-admin-accent',
  'Normal weight': 'text-accent',
  'Overweight': 'text-warn',
  'Obese': 'text-danger',
}

export default function BMIEstimator() {
  const [form, setForm] = useState({ weight_kg: '', height_cm: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/fitness/bmi/', {
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
      })
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-white mb-6">BMI Estimator</h1>
      <div className="max-w-md">
        <form onSubmit={handleSubmit} className="bg-surface border border-accent/20 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Weight (kg)</label>
            <input
              type="number" step="0.1" required value={form.weight_kg}
              onChange={e => setForm({ ...form, weight_kg: e.target.value })}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Height (cm)</label>
            <input
              type="number" step="0.1" required value={form.height_cm}
              onChange={e => setForm({ ...form, height_cm: e.target.value })}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? 'Calculating…' : 'Calculate BMI'}
          </button>
        </form>

        {result && (
          <div className="mt-4 bg-surface border border-accent/20 rounded-xl p-6 text-center">
            <p className="text-text-muted text-sm">Your BMI</p>
            <p className="text-5xl font-bold text-white mt-2">{result.bmi}</p>
            <p className={`text-lg font-semibold mt-2 ${CLASSIFICATIONS[result.classification] || 'text-white'}`}>
              {result.classification}
            </p>
            <p className="text-text-muted text-xs mt-3">WHO classification. Consult a professional for medical assessment.</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 3: Write Profile.jsx**

```jsx
import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import useAuthStore from '../store/authStore'
import api from '../api'

const FITNESS_GOALS = ['lose_weight', 'build_muscle', 'maintain']
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active']

export default function Profile() {
  const { user, setAuth } = useAuthStore()
  const profile = user?.profile
  const [form, setForm] = useState({
    age: profile?.age ?? '',
    weight_kg: profile?.weight_kg ?? '',
    height_cm: profile?.height_cm ?? '',
    gender: profile?.gender ?? '',
    fitness_goal: profile?.fitness_goal ?? '',
    activity_level: profile?.activity_level ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/api/profile/', {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      })
      const token = useAuthStore.getState().token
      setAuth(token, data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>
      <div className="max-w-lg">
        <div className="bg-surface border border-accent/20 rounded-xl p-6 mb-4">
          <p className="text-white font-semibold">{user?.first_name} {user?.last_name}</p>
          <p className="text-text-muted text-sm">{user?.email}</p>
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
            profile?.membership_status === 'active'
              ? 'bg-primary-dark text-accent'
              : 'bg-[#3D1A1A] text-danger'
          }`}>
            {profile?.membership_status}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-accent/20 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Fitness Profile</h2>
          <div className="grid grid-cols-3 gap-3">
            {[['age', 'Age', 'number'], ['weight_kg', 'Weight (kg)', 'number'], ['height_cm', 'Height (cm)', 'number']].map(([name, label, type]) => (
              <div key={name}>
                <label className="block text-xs text-text-muted mb-1">{label}</label>
                <input
                  type={type} name={name} value={form[name]} onChange={handleChange} step="0.1"
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent">
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Fitness Goal</label>
            <select name="fitness_goal" value={form.fitness_goal} onChange={handleChange}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent">
              <option value="">Select…</option>
              {FITNESS_GOALS.map(g => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Activity Level</label>
            <select name="activity_level" value={form.activity_level} onChange={handleChange}
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent">
              <option value="">Select…</option>
              {ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm">
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 4: Write Logbook.jsx**

```jsx
import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import useFitnessStore from '../store/fitnessStore'
import api from '../api'

export default function Logbook() {
  const { workoutLogs, setWorkoutLogs } = useFitnessStore()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ notes: '', sets: [{ exercise_name: '', sets: 3, reps: 10, weight_kg: '' }] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/fitness/log/').then(({ data }) => setWorkoutLogs(data)).finally(() => setLoading(false))
  }, [])

  const addSet = () => setForm(f => ({ ...f, sets: [...f.sets, { exercise_name: '', sets: 3, reps: 10, weight_kg: '' }] }))

  const updateSet = (i, field, val) => setForm(f => {
    const sets = [...f.sets]
    sets[i] = { ...sets[i], [field]: val }
    return { ...f, sets }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await api.post('/api/fitness/log/', {
        date: today,
        notes: form.notes,
        sets: form.sets.map(s => ({ ...s, sets: Number(s.sets), reps: Number(s.reps), weight_kg: s.weight_kg ? Number(s.weight_kg) : null })),
      })
      setWorkoutLogs([data, ...workoutLogs])
      setShowForm(false)
      setForm({ notes: '', sets: [{ exercise_name: '', sets: 3, reps: 10, weight_kg: '' }] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Activity Logbook</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm transition">
          {showForm ? 'Cancel' : '+ Log Workout'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-accent/20 rounded-xl p-6 mb-6 space-y-4">
          <textarea
            placeholder="Session notes (optional)" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent resize-none"
            rows={2}
          />
          {form.sets.map((s, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <input placeholder="Exercise" value={s.exercise_name}
                onChange={e => updateSet(i, 'exercise_name', e.target.value)} required
                className="col-span-1 bg-bg border border-accent/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-accent" />
              <input type="number" placeholder="Sets" value={s.sets}
                onChange={e => updateSet(i, 'sets', e.target.value)}
                className="bg-bg border border-accent/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-accent" />
              <input type="number" placeholder="Reps" value={s.reps}
                onChange={e => updateSet(i, 'reps', e.target.value)}
                className="bg-bg border border-accent/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-accent" />
              <input type="number" step="0.5" placeholder="kg" value={s.weight_kg}
                onChange={e => updateSet(i, 'weight_kg', e.target.value)}
                className="bg-bg border border-accent/30 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-accent" />
            </div>
          ))}
          <button type="button" onClick={addSet} className="text-accent text-sm hover:underline">+ Add exercise</button>
          <button type="submit" disabled={saving}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm">
            {saving ? 'Saving…' : 'Save Workout'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-text-muted text-sm">Loading…</p>
      ) : workoutLogs.length === 0 ? (
        <p className="text-text-muted text-sm">No workouts logged yet.</p>
      ) : (
        <div className="space-y-4">
          {workoutLogs.map(log => (
            <div key={log.id} className="bg-surface border border-accent/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold">{log.date}</span>
                {log.notes && <span className="text-text-muted text-xs">{log.notes}</span>}
              </div>
              <div className="space-y-1">
                {log.sets.map((s, i) => (
                  <div key={i} className="flex gap-4 text-sm">
                    <span className="text-white min-w-32">{s.exercise_name}</span>
                    <span className="text-text-muted">{s.sets}×{s.reps}</span>
                    {s.weight_kg && <span className="text-text-muted">{s.weight_kg}kg</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/FitnessPlan.jsx frontend/src/pages/BMIEstimator.jsx frontend/src/pages/Profile.jsx frontend/src/pages/Logbook.jsx
git commit -m "feat: add fitness plan, BMI estimator, profile, and logbook pages"
```

---

## Task 12: Nutrition + Chatbot Pages

**Files:**
- Modify: `frontend/src/pages/Nutrition.jsx`
- Modify: `frontend/src/pages/Chatbot.jsx`

- [ ] **Step 1: Write Nutrition.jsx**

```jsx
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
```

- [ ] **Step 2: Install Gemini JS SDK for chatbot (Path B)**

```bash
npm install @google/generative-ai
```

- [ ] **Step 3: Write Chatbot.jsx**

```jsx
import { useEffect, useRef, useState } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useChatStore from '../store/chatStore'
import api from '../api'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY)
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: 'You are a friendly AI fitness assistant for J&A Fitness gym. Answer questions about workouts, nutrition, equipment, and healthy habits. Keep responses concise and encouraging. Always recommend consulting professionals for medical advice.',
})

export default function Chatbot() {
  const { sessionId, messages, setSessionId, addMessage, clearChat } = useChatStore()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()
  const chatRef = useRef(null)

  useEffect(() => {
    if (!sessionId) {
      api.post('/api/ai/chat/session/').then(({ data }) => {
        setSessionId(data.id)
      })
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initChat = () => {
    if (!chatRef.current) {
      chatRef.current = model.startChat({
        history: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      })
    }
    return chatRef.current
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    const userMsg = { role: 'user', content: input.trim() }
    addMessage(userMsg)
    setInput('')
    setSending(true)

    try {
      const chat = initChat()
      const result = await chat.sendMessage(userMsg.content)
      const assistantMsg = { role: 'assistant', content: result.response.text() }
      addMessage(assistantMsg)

      if (sessionId) {
        api.post(`/api/ai/chat/history/${sessionId}/`, {
          messages: [userMsg, assistantMsg],
        }).catch(() => {})
      }
    } catch {
      addMessage({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  const handleNewChat = () => {
    chatRef.current = null
    clearChat()
    api.post('/api/ai/chat/session/').then(({ data }) => setSessionId(data.id))
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">AI Fitness Chat</h1>
        <button onClick={handleNewChat} className="text-sm text-text-muted hover:text-accent transition">
          New Chat
        </button>
      </div>
      <DisclaimerBanner message="AI responses may be inaccurate (hallucinations). Do not use as medical advice." />

      <div className="bg-surface border border-accent/20 rounded-xl flex flex-col" style={{ height: '60vh' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-text-muted text-sm text-center mt-8">
              Ask me anything about workouts, nutrition, or gym equipment!
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-bg border border-accent/20 text-white rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-bg border border-accent/20 px-4 py-2 rounded-2xl rounded-bl-sm text-text-muted text-sm">
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-accent/10">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask about workouts, nutrition, equipment…"
            className="flex-1 bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
          />
          <button type="submit" disabled={sending || !input.trim()}
            className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition">
            Send
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Nutrition.jsx frontend/src/pages/Chatbot.jsx
git commit -m "feat: add nutrition page with meal plan + food scan, and AI chatbot (Path B)"
```

---

## Task 13: Admin Dashboard Page

**Files:**
- Modify: `frontend/src/pages/AdminDashboard.jsx`

- [ ] **Step 1: Write AdminDashboard.jsx**

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/members/'),
      api.get('/api/analytics/summary/'),
    ]).then(([membersRes, analyticsRes]) => {
      setMembers(membersRes.data)
      setAnalytics(analyticsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const updateMembership = async (userId, newStatus) => {
    setUpdating(userId)
    try {
      await api.put(`/api/admin/members/${userId}/`, { membership_status: newStatus })
      setMembers(prev => prev.map(m =>
        m.id === userId ? { ...m, profile: { ...m.profile, membership_status: newStatus } } : m
      ))
    } finally {
      setUpdating(null)
    }
  }

  const STATUS_COLORS = {
    active: 'bg-primary-dark text-accent',
    pending: 'bg-[#3D3000] text-warn',
    inactive: 'bg-[#3D1A1A] text-danger',
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-admin-accent/20 bg-admin-dark">
        <span className="text-admin-accent font-bold text-lg">J&A Fitness — Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-text-muted text-sm">{user?.email}</span>
          <button onClick={() => navigate('/dashboard')} className="text-admin-accent text-sm hover:underline">
            Member View
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Analytics */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              ['Total Members', analytics.total_members],
              ['Active', analytics.active_members],
              ['Pending', analytics.pending_members],
              ['Inactive', analytics.total_members - analytics.active_members - analytics.pending_members],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface border border-admin-accent/20 rounded-xl p-4">
                <p className="text-text-muted text-xs uppercase tracking-wide">{label}</p>
                <p className="text-white text-2xl font-bold mt-1">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Feature usage */}
        {analytics?.feature_usage?.length > 0 && (
          <div className="bg-surface border border-admin-accent/20 rounded-xl p-6 mb-8">
            <h2 className="text-white font-semibold mb-4">Feature Usage</h2>
            <div className="space-y-2">
              {analytics.feature_usage.map(({ feature, count }) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="text-text-muted text-sm capitalize min-w-28">{feature.replace('_', ' ')}</span>
                  <div className="flex-1 bg-bg rounded-full h-2">
                    <div
                      className="bg-admin-accent h-2 rounded-full"
                      style={{ width: `${Math.min(100, (count / analytics.feature_usage[0].count) * 100)}%` }}
                    />
                  </div>
                  <span className="text-text-muted text-sm w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members table */}
        <div className="bg-surface border border-admin-accent/20 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-admin-accent/10">
            <h2 className="text-white font-semibold">Members ({members.length})</h2>
          </div>
          {loading ? (
            <p className="p-6 text-text-muted text-sm">Loading…</p>
          ) : (
            <div className="divide-y divide-white/5">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1">
                    <p className="text-white font-medium">{member.first_name} {member.last_name}</p>
                    <p className="text-text-muted text-sm">{member.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[member.profile?.membership_status] || ''}`}>
                    {member.profile?.membership_status}
                  </span>
                  <div className="flex gap-2">
                    {member.profile?.membership_status !== 'active' && (
                      <button
                        onClick={() => updateMembership(member.id, 'active')}
                        disabled={updating === member.id}
                        className="text-xs bg-primary/20 text-accent border border-accent/30 px-3 py-1 rounded-lg hover:bg-primary/30 transition disabled:opacity-50"
                      >
                        Activate
                      </button>
                    )}
                    {member.profile?.membership_status === 'active' && (
                      <button
                        onClick={() => updateMembership(member.id, 'inactive')}
                        disabled={updating === member.id}
                        className="text-xs bg-danger/10 text-danger border border-danger/30 px-3 py-1 rounded-lg hover:bg-danger/20 transition disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Test admin flow**

In Django admin, set `is_admin=True` on a user. Log in with that user. Verify redirect to `/admin`. Verify member list shows all registered users. Activate a pending member. Verify status badge updates immediately.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AdminDashboard.jsx
git commit -m "feat: add admin dashboard with member management and usage analytics"
```

---

## Phase 2 Complete ✓

**What's working:**
- All 6 Django apps with full models, serializers, views, and URLs
- Gemini API Path A: fitness plan generation, nutrition plan, food image scan
- Gemini API Path B: real-time streaming chatbot
- All 8 frontend pages fully implemented (replacing Phase 1 stubs)
- Shared layout: Sidebar (desktop), BottomNav (mobile), DisclaimerBanner
- Admin dashboard with member management and analytics

**Run all backend tests:**
```bash
cd backend && pytest -v
```

**Run frontend:**
```bash
cd frontend && npm run dev
```

**Next:** See `docs/superpowers/plans/2026-05-17-phase3-computer-vision.md`
