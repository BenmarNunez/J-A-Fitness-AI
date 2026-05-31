# Phase 1 — Scaffold + Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the full monorepo, Django backend with token auth, and React frontend with login/register UI and route guards — everything required before any feature work.

**Architecture:** Monorepo with `frontend/` (React 19 + Vite) and `backend/` (Django + DRF). Custom User model extending AbstractUser uses email as login. MemberProfile (OneToOne) holds biometrics and membership_status. Route guards enforce active membership.

**Tech Stack:** React 19, Vite, Tailwind CSS, Zustand, Axios, React Router v6, Django 5, Django REST Framework, django-cors-headers, python-decouple, pytest-django, PostgreSQL (local SQLite for dev)

---

## File Map

### Backend
```
backend/
├── manage.py
├── requirements.txt
├── pytest.ini
├── .env.example
├── config/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── apps/
    └── users/
        ├── __init__.py
        ├── admin.py
        ├── models.py          ← User, MemberProfile
        ├── serializers.py     ← RegisterSerializer, UserSerializer, MemberProfileSerializer
        ├── views.py           ← RegisterView, LoginView, LogoutView
        ├── urls.py
        ├── permissions.py     ← IsActiveMember, IsAdmin
        └── tests/
            ├── __init__.py
            └── test_auth.py
```

### Frontend
```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── src/
    ├── main.jsx
    ├── App.jsx                ← React Router routes
    ├── index.css              ← Tailwind directives
    ├── api/
    │   └── index.js           ← Axios instance with auth interceptors
    ├── store/
    │   └── authStore.js       ← Zustand auth store (persisted)
    ├── components/
    │   ├── PrivateRoute.jsx   ← membership gate
    │   └── AdminRoute.jsx     ← admin gate
    └── pages/
        ├── Landing.jsx
        ├── Login.jsx
        ├── Register.jsx       ← 2-step: account → fitness profile
        └── MembershipPending.jsx
```

---

## Task 1: Initialize Monorepo

**Files:**
- Create: `README.md`
- Create: `.gitignore`

- [ ] **Step 1: Create project root and git repo**

```bash
cd "C:\Users\AIRFLIX PH\Desktop\J&A Fitness AI"
git init
```

- [ ] **Step 2: Create .gitignore**

Create `.gitignore` at project root with this content:

```
# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.egg-info/
dist/
build/
.venv/
venv/
env/

# Django
*.sqlite3
*.log
backend/.env
backend/media/

# Node
node_modules/
frontend/dist/
frontend/.env
frontend/.env.local

# IDE
.vscode/
.idea/
*.swp
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Create README.md**

```markdown
# J&A Fitness AI

Smart Decision Exercise Planner for J&A Fitness, Legazpi City.

## Setup

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # fill in values
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env     # fill in values
npm run dev
```

## Phases
- Phase 1: Scaffold + Auth
- Phase 2: AI + Backend Features
- Phase 3: Computer Vision + Deployment
```

- [ ] **Step 4: Initial commit**

```bash
git add .gitignore README.md
git commit -m "chore: initialize monorepo"
```

---

## Task 2: Django Backend Scaffold

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/` (Django project)

- [ ] **Step 1: Create backend directory and virtualenv**

```bash
mkdir backend
cd backend
python -m venv .venv
.venv\Scripts\activate
```

- [ ] **Step 2: Install dependencies**

```bash
pip install django==5.0.6 djangorestframework==3.15.2 django-cors-headers==4.4.0 python-decouple==3.8 Pillow==10.4.0 psycopg2-binary==2.9.9 pytest-django==4.8.0 pytest==8.3.2
```

- [ ] **Step 3: Create requirements.txt**

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
```

- [ ] **Step 4: Scaffold Django project**

```bash
django-admin startproject config .
python -m django startapp users
mkdir apps
mv users apps/
```

On Windows PowerShell:
```powershell
django-admin startproject config .
python -m django startapp users
New-Item -ItemType Directory -Name apps
Move-Item users apps\
```

- [ ] **Step 5: Create apps/__init__.py**

Create `backend/apps/__init__.py` — empty file.

- [ ] **Step 6: Create .env.example**

```
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=sqlite:///db.sqlite3
GEMINI_API_KEY=your-gemini-api-key-here
```

- [ ] **Step 7: Create pytest.ini**

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests/test_*.py
python_classes = Test*
python_functions = test_*
```

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "chore: scaffold django backend"
```

---

## Task 3: Django Settings

**Files:**
- Modify: `backend/config/settings.py`
- Modify: `backend/config/urls.py`

- [ ] **Step 1: Write settings.py**

Replace `backend/config/settings.py` with:

```python
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='dev-secret-key-change-in-prod')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

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
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173'
).split(',')

STATIC_URL = '/static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Manila'
USE_I18N = True
USE_TZ = True
```

- [ ] **Step 2: Write config/urls.py**

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
]
```

- [ ] **Step 3: Commit**

```bash
git add backend/config/
git commit -m "chore: configure django settings and urls"
```

---

## Task 4: User and MemberProfile Models

**Files:**
- Create: `backend/apps/users/models.py`
- Create: `backend/apps/users/admin.py`
- Create: `backend/apps/users/tests/__init__.py`
- Create: `backend/apps/users/tests/test_auth.py` (failing tests first)

- [ ] **Step 1: Write failing tests first**

Create `backend/apps/users/tests/__init__.py` — empty.

Create `backend/apps/users/tests/test_auth.py`:

```python
import pytest
from django.contrib.auth import get_user_model
from apps.users.models import MemberProfile

User = get_user_model()


@pytest.mark.django_db
def test_user_uses_email_as_username():
    user = User.objects.create_user(
        username='test@example.com',
        email='test@example.com',
        password='pass123',
    )
    assert user.email == 'test@example.com'
    assert User.USERNAME_FIELD == 'email'


@pytest.mark.django_db
def test_member_profile_created_with_pending_status():
    user = User.objects.create_user(
        username='profile@example.com',
        email='profile@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(user=user)
    assert profile.membership_status == 'pending'


@pytest.mark.django_db
def test_bmi_computed_on_profile_save():
    user = User.objects.create_user(
        username='bmi@example.com',
        email='bmi@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(
        user=user,
        weight_kg=70.0,
        height_cm=175.0,
    )
    assert profile.bmi == pytest.approx(22.86, rel=0.01)


@pytest.mark.django_db
def test_bmr_computed_for_male():
    user = User.objects.create_user(
        username='bmr@example.com',
        email='bmr@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(
        user=user,
        weight_kg=70.0,
        height_cm=175.0,
        age=25,
        gender='male',
    )
    # Mifflin-St Jeor male: 10*70 + 6.25*175 - 5*25 + 5 = 1668.75
    assert profile.bmr == pytest.approx(1668.75, rel=0.01)


@pytest.mark.django_db
def test_bmi_none_when_missing_measurements():
    user = User.objects.create_user(
        username='nobmi@example.com',
        email='nobmi@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(user=user)
    assert profile.bmi is None
    assert profile.bmr is None
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend
pytest apps/users/tests/test_auth.py -v
```

Expected: `ImportError` or `django.core.exceptions.ImproperlyConfigured` — models don't exist yet.

- [ ] **Step 3: Write models.py**

```python
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_admin = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']


class MemberProfile(models.Model):
    FITNESS_GOALS = [
        ('lose_weight', 'Lose Weight'),
        ('build_muscle', 'Build Muscle'),
        ('maintain', 'Maintain'),
    ]
    ACTIVITY_LEVELS = [
        ('sedentary', 'Sedentary'),
        ('light', 'Light'),
        ('moderate', 'Moderate'),
        ('active', 'Active'),
        ('very_active', 'Very Active'),
    ]
    MEMBERSHIP_STATUSES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    GENDERS = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    age = models.PositiveIntegerField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDERS, blank=True)
    fitness_goal = models.CharField(max_length=20, choices=FITNESS_GOALS, blank=True)
    activity_level = models.CharField(max_length=20, choices=ACTIVITY_LEVELS, blank=True)
    bmi = models.FloatField(null=True, blank=True)
    bmr = models.FloatField(null=True, blank=True)
    membership_status = models.CharField(
        max_length=10, choices=MEMBERSHIP_STATUSES, default='pending'
    )
    membership_start = models.DateField(null=True, blank=True)
    membership_end = models.DateField(null=True, blank=True)

    def _compute_bmi(self):
        if self.weight_kg and self.height_cm:
            h = self.height_cm / 100
            return round(self.weight_kg / (h * h), 2)
        return None

    def _compute_bmr(self):
        if self.weight_kg and self.height_cm and self.age and self.gender in ('male', 'female'):
            base = 10 * self.weight_kg + 6.25 * self.height_cm - 5 * self.age
            return round(base + 5 if self.gender == 'male' else base - 161, 2)
        return None

    def save(self, *args, **kwargs):
        self.bmi = self._compute_bmi()
        self.bmr = self._compute_bmr()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user.email} — {self.membership_status}'
```

- [ ] **Step 4: Write admin.py**

```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, MemberProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'is_admin', 'is_active']
    list_filter = ['is_admin', 'is_active']


@admin.register(MemberProfile)
class MemberProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'membership_status', 'bmi', 'fitness_goal']
    list_filter = ['membership_status', 'fitness_goal']
    readonly_fields = ['bmi', 'bmr']
```

- [ ] **Step 5: Create and run migrations**

```bash
python manage.py makemigrations users
python manage.py migrate
```

Expected output: migrations created and applied with no errors.

- [ ] **Step 6: Run tests — expect pass**

```bash
pytest apps/users/tests/test_auth.py -v
```

Expected: 5 tests PASSED.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/users/
git commit -m "feat: add User and MemberProfile models with BMI/BMR computation"
```

---

## Task 5: Auth Serializers, Views, URLs

**Files:**
- Create: `backend/apps/users/serializers.py`
- Create: `backend/apps/users/views.py`
- Create: `backend/apps/users/urls.py`

- [ ] **Step 1: Add API tests to test_auth.py**

Append to `backend/apps/users/tests/test_auth.py`:

```python
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def registered_user(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'member@example.com',
        'first_name': 'Jane',
        'last_name': 'Doe',
        'password': 'securepass123',
        'age': 28,
        'weight_kg': 60.0,
        'height_cm': 165.0,
        'gender': 'female',
        'fitness_goal': 'lose_weight',
        'activity_level': 'moderate',
    }, format='json')
    return response.data


@pytest.mark.django_db
def test_register_returns_token_and_user(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'new@example.com',
        'first_name': 'New',
        'last_name': 'User',
        'password': 'securepass123',
    }, format='json')
    assert response.status_code == 201
    assert 'token' in response.data
    assert response.data['user']['email'] == 'new@example.com'
    assert response.data['user']['profile']['membership_status'] == 'pending'


@pytest.mark.django_db
def test_register_duplicate_email_rejected(api_client):
    payload = {
        'email': 'dup@example.com',
        'first_name': 'A',
        'last_name': 'B',
        'password': 'securepass123',
    }
    api_client.post('/api/auth/register/', payload, format='json')
    response = api_client.post('/api/auth/register/', payload, format='json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_login_valid_credentials(api_client, registered_user):
    response = api_client.post('/api/auth/login/', {
        'email': 'member@example.com',
        'password': 'securepass123',
    }, format='json')
    assert response.status_code == 200
    assert 'token' in response.data


@pytest.mark.django_db
def test_login_wrong_password_returns_401(api_client, registered_user):
    response = api_client.post('/api/auth/login/', {
        'email': 'member@example.com',
        'password': 'wrongpassword',
    }, format='json')
    assert response.status_code == 401


@pytest.mark.django_db
def test_logout_invalidates_token(api_client, registered_user):
    token = registered_user['token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
    response = api_client.post('/api/auth/logout/')
    assert response.status_code == 204
    response = api_client.post('/api/auth/logout/')
    assert response.status_code == 401
```

- [ ] **Step 2: Run new tests — expect failure**

```bash
pytest apps/users/tests/test_auth.py -v -k "register_returns or login or logout"
```

Expected: FAIL — views don't exist yet.

- [ ] **Step 3: Write serializers.py**

```python
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import MemberProfile

User = get_user_model()

PROFILE_FIELDS = ['age', 'weight_kg', 'height_cm', 'gender', 'fitness_goal', 'activity_level']


class MemberProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = [
            'age', 'weight_kg', 'height_cm', 'gender',
            'fitness_goal', 'activity_level', 'bmi', 'bmr',
            'membership_status', 'membership_start', 'membership_end',
        ]
        read_only_fields = ['bmi', 'bmr', 'membership_status', 'membership_start', 'membership_end']


class UserSerializer(serializers.ModelSerializer):
    profile = MemberProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'is_admin', 'profile']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    age = serializers.IntegerField(required=False)
    weight_kg = serializers.FloatField(required=False)
    height_cm = serializers.FloatField(required=False)
    gender = serializers.CharField(required=False, allow_blank=True)
    fitness_goal = serializers.CharField(required=False, allow_blank=True)
    activity_level = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password'] + PROFILE_FIELDS

    def create(self, validated_data):
        profile_data = {k: validated_data.pop(k) for k in PROFILE_FIELDS if k in validated_data}
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password'],
        )
        MemberProfile.objects.create(user=user, **profile_data)
        return user
```

- [ ] **Step 4: Write views.py**

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {'token': token.key, 'user': UserSerializer(user).data},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('password', '')
        user = authenticate(request, username=email, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'user': UserSerializer(user).data})
        return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 5: Write urls.py**

```python
from django.urls import path
from .views import RegisterView, LoginView, LogoutView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
]
```

- [ ] **Step 6: Run all auth tests**

```bash
pytest apps/users/tests/test_auth.py -v
```

Expected: all tests PASSED.

- [ ] **Step 7: Smoke test with runserver**

```bash
python manage.py runserver
```

In a second terminal:
```bash
curl -X POST http://localhost:8000/api/auth/register/ -H "Content-Type: application/json" -d "{\"email\":\"smoke@test.com\",\"first_name\":\"Smoke\",\"last_name\":\"Test\",\"password\":\"pass1234\"}"
```

Expected: `{"token": "...", "user": {...}}` with status 201.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/users/
git commit -m "feat: add auth API — register, login, logout endpoints"
```

---

## Task 6: IsActiveMember and IsAdmin Permissions

**Files:**
- Create: `backend/apps/users/permissions.py`

- [ ] **Step 1: Add permission tests to test_auth.py**

Append to `backend/apps/users/tests/test_auth.py`:

```python
@pytest.mark.django_db
def test_pending_member_blocked_from_protected_endpoint(api_client, registered_user):
    token = registered_user['token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
    # /api/profile/ requires IsActiveMember — set up in Task 9
    # For now, test the permission class directly
    from apps.users.permissions import IsActiveMember
    from unittest.mock import MagicMock
    user = User.objects.get(email='member@example.com')
    request = MagicMock()
    request.user = user
    perm = IsActiveMember()
    assert perm.has_permission(request, None) is False


@pytest.mark.django_db
def test_active_member_passes_permission():
    from apps.users.permissions import IsActiveMember
    from unittest.mock import MagicMock
    user = User.objects.create_user(
        username='active@example.com',
        email='active@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(user=user, membership_status='active')
    request = MagicMock()
    request.user = user
    perm = IsActiveMember()
    assert perm.has_permission(request, None) is True


@pytest.mark.django_db
def test_admin_permission():
    from apps.users.permissions import IsAdmin
    from unittest.mock import MagicMock
    admin_user = User.objects.create_user(
        username='admin@example.com',
        email='admin@example.com',
        password='pass123',
        is_admin=True,
    )
    regular_user = User.objects.create_user(
        username='regular@example.com',
        email='regular@example.com',
        password='pass123',
    )
    request = MagicMock()
    perm = IsAdmin()
    request.user = admin_user
    assert perm.has_permission(request, None) is True
    request.user = regular_user
    assert perm.has_permission(request, None) is False
```

- [ ] **Step 2: Run new tests — expect failure**

```bash
pytest apps/users/tests/test_auth.py -v -k "permission"
```

Expected: FAIL — `permissions.py` not found.

- [ ] **Step 3: Write permissions.py**

```python
from rest_framework.permissions import BasePermission


class IsActiveMember(BasePermission):
    message = 'Membership is not active. Contact gym management.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.membership_status == 'active'
        except Exception:
            return False


class IsAdmin(BasePermission):
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )
```

- [ ] **Step 4: Run all tests**

```bash
pytest apps/users/tests/test_auth.py -v
```

Expected: all tests PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/users/permissions.py backend/apps/users/tests/test_auth.py
git commit -m "feat: add IsActiveMember and IsAdmin permission classes"
```

---

## Task 7: React Frontend Scaffold

**Files:**
- Create: `frontend/` (Vite project)
- Create: `frontend/tailwind.config.js`
- Create: `frontend/src/index.css`
- Create: `frontend/.env.example`

- [ ] **Step 1: Scaffold Vite project**

From project root:
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom zustand axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: Configure tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#0D9373',
        'primary-dark': '#085041',
        'accent': '#5DCAA5',
        'surface': '#1A1A18',
        'bg': '#0F0F0E',
        'text-muted': '#C2C0B6',
        'admin-dark': '#0C447C',
        'admin-accent': '#85B7EB',
        'warn': '#EF9F27',
        'danger': '#F09595',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Write src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0F0F0E;
  color: #FAF9F5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

- [ ] **Step 5: Create .env.example**

```
VITE_API_URL=http://localhost:8000
VITE_GEMINI_PUBLIC_KEY=your-restricted-gemini-key-here
```

- [ ] **Step 6: Copy to .env**

```bash
cp .env.example .env
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server at `http://localhost:5173` with default React page.

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend/
git commit -m "chore: scaffold react 19 frontend with tailwind css"
```

---

## Task 8: Zustand Auth Store + Axios Instance

**Files:**
- Create: `frontend/src/store/authStore.js`
- Create: `frontend/src/api/index.js`

- [ ] **Step 1: Create store directory and authStore.js**

```bash
mkdir frontend/src/store frontend/src/api
```

Create `frontend/src/store/authStore.js`:

```javascript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    { name: 'ja-fitness-auth' }
  )
)

export default useAuthStore
```

- [ ] **Step 2: Create api/index.js**

```javascript
import axios from 'axios'
import useAuthStore from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/ frontend/src/api/
git commit -m "feat: add zustand auth store and axios instance with interceptors"
```

---

## Task 9: Route Guards

**Files:**
- Create: `frontend/src/components/PrivateRoute.jsx`
- Create: `frontend/src/components/AdminRoute.jsx`

- [ ] **Step 1: Create components directory**

```bash
mkdir frontend/src/components
```

- [ ] **Step 2: Write PrivateRoute.jsx**

```jsx
import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function PrivateRoute({ children }) {
  const { token, user } = useAuthStore()

  if (!token) return <Navigate to="/login" replace />

  const status = user?.profile?.membership_status
  if (status === 'pending' || status === 'inactive') {
    return <Navigate to="/membership-pending" replace />
  }

  return children
}
```

- [ ] **Step 3: Write AdminRoute.jsx**

```jsx
import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function AdminRoute({ children }) {
  const { token, user } = useAuthStore()

  if (!token) return <Navigate to="/login" replace />
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />

  return children
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add PrivateRoute and AdminRoute guards"
```

---

## Task 10: App.jsx Routing

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Create stub pages (will be filled in Tasks 11-14)**

Create `frontend/src/pages/` directory and stub files:

`frontend/src/pages/Dashboard.jsx`:
```jsx
export default function Dashboard() {
  return <div className="p-8 text-white">Dashboard — coming Phase 2</div>
}
```

`frontend/src/pages/FitnessPlan.jsx`:
```jsx
export default function FitnessPlan() {
  return <div className="p-8 text-white">Fitness Plan — coming Phase 2</div>
}
```

`frontend/src/pages/Nutrition.jsx`:
```jsx
export default function Nutrition() {
  return <div className="p-8 text-white">Nutrition — coming Phase 2</div>
}
```

`frontend/src/pages/PostureChecker.jsx`:
```jsx
export default function PostureChecker() {
  return <div className="p-8 text-white">Posture Checker — coming Phase 3</div>
}
```

`frontend/src/pages/BMIEstimator.jsx`:
```jsx
export default function BMIEstimator() {
  return <div className="p-8 text-white">BMI Estimator — coming Phase 2</div>
}
```

`frontend/src/pages/Chatbot.jsx`:
```jsx
export default function Chatbot() {
  return <div className="p-8 text-white">AI Chatbot — coming Phase 2</div>
}
```

`frontend/src/pages/Logbook.jsx`:
```jsx
export default function Logbook() {
  return <div className="p-8 text-white">Logbook — coming Phase 2</div>
}
```

`frontend/src/pages/Profile.jsx`:
```jsx
export default function Profile() {
  return <div className="p-8 text-white">Profile — coming Phase 2</div>
}
```

`frontend/src/pages/AdminDashboard.jsx`:
```jsx
export default function AdminDashboard() {
  return <div className="p-8 text-white">Admin Dashboard — coming Phase 2</div>
}
```

- [ ] **Step 2: Write App.jsx**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute'
import AdminRoute from './components/AdminRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import MembershipPending from './pages/MembershipPending'
import Dashboard from './pages/Dashboard'
import FitnessPlan from './pages/FitnessPlan'
import Nutrition from './pages/Nutrition'
import PostureChecker from './pages/PostureChecker'
import BMIEstimator from './pages/BMIEstimator'
import Chatbot from './pages/Chatbot'
import Logbook from './pages/Logbook'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/membership-pending" element={<MembershipPending />} />

        {/* Member-only */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/fitness-plan" element={<PrivateRoute><FitnessPlan /></PrivateRoute>} />
        <Route path="/nutrition" element={<PrivateRoute><Nutrition /></PrivateRoute>} />
        <Route path="/posture" element={<PrivateRoute><PostureChecker /></PrivateRoute>} />
        <Route path="/bmi" element={<PrivateRoute><BMIEstimator /></PrivateRoute>} />
        <Route path="/chatbot" element={<PrivateRoute><Chatbot /></PrivateRoute>} />
        <Route path="/logbook" element={<PrivateRoute><Logbook /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* Admin-only */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Update main.jsx**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 4: Verify app runs with all routes**

```bash
npm run dev
```

Navigate to `http://localhost:5173/login` — should not crash. Navigate to `http://localhost:5173/dashboard` — should redirect to `/login` (no token). Navigate to `http://localhost:5173/` — should show Landing stub.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add react router routing with all page stubs and route guards"
```

---

## Task 11: Landing Page

**Files:**
- Modify: `frontend/src/pages/Landing.jsx`

- [ ] **Step 1: Write Landing.jsx**

```jsx
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-accent/20">
        <span className="text-accent font-bold text-xl tracking-tight">J&A Fitness AI</span>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-accent border border-accent/40 rounded-lg hover:bg-accent/10 transition"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm bg-primary hover:bg-primary/80 text-white rounded-lg transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-white max-w-3xl leading-tight">
          Your Personal AI{' '}
          <span className="text-accent">Fitness Trainer</span>
        </h1>
        <p className="mt-6 text-text-muted text-lg max-w-xl">
          Personalized workout plans, real-time posture correction, and AI nutrition
          guidance — built for J&A Fitness members in Legazpi City.
        </p>
        <Link
          to="/register"
          className="mt-10 px-8 py-3 bg-primary hover:bg-primary/80 text-white font-semibold rounded-xl text-lg transition"
        >
          Start Your Journey
        </Link>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {[
            {
              title: 'AI Fitness Plans',
              desc: 'Hyper-personalized workout regimens generated from your biometrics and goals.',
              color: 'border-accent/30',
            },
            {
              title: 'Posture Checker',
              desc: 'Real-time form assessment and rep counting via your device camera.',
              color: 'border-warn/30',
            },
            {
              title: 'AI Nutritionist',
              desc: 'Meal plans and macro scanning powered by Gemini Vision.',
              color: 'border-admin-accent/30',
            },
          ].map(({ title, desc, color }) => (
            <div
              key={title}
              className={`bg-surface border ${color} rounded-xl p-6 text-left`}
            >
              <h3 className="text-white font-semibold text-lg">{title}</h3>
              <p className="mt-2 text-text-muted text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-text-muted text-xs border-t border-white/5">
        J&A Fitness AI — Computer Arts and Technological College, Inc. · Legazpi City
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Check in browser**

Navigate to `http://localhost:5173/`. Verify: dark background, nav with Log In and Get Started buttons, hero text, 3 feature cards, footer.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.jsx
git commit -m "feat: add landing page"
```

---

## Task 12: Login Page

**Files:**
- Modify: `frontend/src/pages/Login.jsx`

- [ ] **Step 1: Write Login.jsx**

```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import useAuthStore from '../store/authStore'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login/', form)
      setAuth(data.token, data.user)
      if (data.user.is_admin) {
        navigate('/admin')
      } else if (data.user.profile?.membership_status === 'active') {
        navigate('/dashboard')
      } else {
        navigate('/membership-pending')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-accent font-bold text-2xl">J&A Fitness AI</span>
          <h1 className="mt-4 text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-text-muted text-sm">Log in to your membership</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-accent/20 rounded-xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-danger/10 border border-danger/40 text-danger text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-text-muted mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-text-muted text-sm">
          No account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test login flow manually**

Ensure Django backend is running. Navigate to `http://localhost:5173/login`. Enter the smoke test email from Task 5. Verify: redirect to `/membership-pending` (status is pending). Wrong password shows error banner.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: add login page with error handling and post-login routing"
```

---

## Task 13: Register Page (2-Step)

**Files:**
- Modify: `frontend/src/pages/Register.jsx`

- [ ] **Step 1: Write Register.jsx**

```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import useAuthStore from '../store/authStore'

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { value: 'light', label: 'Light (1-3 days/week)' },
  { value: 'moderate', label: 'Moderate (3-5 days/week)' },
  { value: 'active', label: 'Active (6-7 days/week)' },
  { value: 'very_active', label: 'Very Active (twice daily)' },
]

const INITIAL = {
  email: '', first_name: '', last_name: '', password: '',
  age: '', weight_kg: '', height_cm: '', gender: '',
  fitness_goal: '', activity_level: '',
}

export default function Register() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleStep1 = (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      }
      const { data } = await api.post('/api/auth/register/', payload)
      setAuth(data.token, data.user)
      navigate('/membership-pending')
    } catch (err) {
      const errs = err.response?.data
      if (errs) {
        const first = Object.values(errs)[0]
        setError(Array.isArray(first) ? first[0] : String(first))
      } else {
        setError('Registration failed. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-accent font-bold text-2xl">J&A Fitness AI</span>
          <h1 className="mt-4 text-2xl font-bold text-white">Create your account</h1>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-text-muted">
            <span className={step === 1 ? 'text-accent font-semibold' : ''}>1. Account</span>
            <span>→</span>
            <span className={step === 2 ? 'text-accent font-semibold' : ''}>2. Fitness Profile</span>
          </div>
        </div>

        <div className="bg-surface border border-accent/20 rounded-xl p-8">
          {error && (
            <div className="mb-4 bg-danger/10 border border-danger/40 text-danger text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">First Name</label>
                  <input
                    name="first_name" value={form.first_name} onChange={handleChange} required
                    className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Last Name</label>
                  <input
                    name="last_name" value={form.last_name} onChange={handleChange} required
                    className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Email</label>
                <input
                  type="email" name="email" value={form.email} onChange={handleChange} required
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Password</label>
                <input
                  type="password" name="password" value={form.password} onChange={handleChange} required
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  placeholder="Min. 8 characters"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/80 text-white font-semibold py-2.5 rounded-lg transition"
              >
                Next →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Age</label>
                  <input
                    type="number" name="age" value={form.age} onChange={handleChange}
                    min="10" max="100"
                    className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Weight (kg)</label>
                  <input
                    type="number" name="weight_kg" value={form.weight_kg} onChange={handleChange}
                    step="0.1" min="20"
                    className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Height (cm)</label>
                  <input
                    type="number" name="height_cm" value={form.height_cm} onChange={handleChange}
                    step="0.1" min="100"
                    className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-1">Gender</label>
                <select
                  name="gender" value={form.gender} onChange={handleChange}
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-1">Fitness Goal</label>
                <select
                  name="fitness_goal" value={form.fitness_goal} onChange={handleChange}
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                >
                  <option value="">Select…</option>
                  {FITNESS_GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-1">Activity Level</label>
                <select
                  name="activity_level" value={form.activity_level} onChange={handleChange}
                  className="w-full bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                >
                  <option value="">Select…</option>
                  {ACTIVITY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <p className="text-xs text-text-muted">Fitness profile fields are optional — you can update them later.</p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-accent/30 text-accent py-2.5 rounded-lg hover:bg-accent/5 transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-text-muted text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test registration flow**

Navigate to `http://localhost:5173/register`. Complete Step 1 (account details) and click Next. Complete Step 2 (fitness profile) and submit. Verify: redirects to `/membership-pending`. Check Django admin at `http://localhost:8000/django-admin/` — new User and MemberProfile should appear.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Register.jsx
git commit -m "feat: add 2-step registration page"
```

---

## Task 14: MembershipPending Page

**Files:**
- Modify: `frontend/src/pages/MembershipPending.jsx`

- [ ] **Step 1: Write MembershipPending.jsx**

```jsx
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function MembershipPending() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      const { default: api } = await import('../api')
      await api.post('/api/auth/logout/')
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-6">⏳</div>
        <h1 className="text-2xl font-bold text-white">Membership Pending</h1>
        <p className="mt-4 text-text-muted">
          Hi <span className="text-white">{user?.first_name}</span>, your account has been created.
          Your membership is currently{' '}
          <span className={`font-semibold ${
            user?.profile?.membership_status === 'inactive' ? 'text-danger' : 'text-warn'
          }`}>
            {user?.profile?.membership_status ?? 'pending'}
          </span>.
        </p>
        <p className="mt-3 text-text-muted text-sm">
          Please visit the J&A Fitness gym or contact management to activate your membership.
          Once activated, you will have full access to all features.
        </p>
        <button
          onClick={handleLogout}
          className="mt-8 px-6 py-2.5 border border-accent/30 text-accent rounded-lg hover:bg-accent/5 transition text-sm"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the full auth flow end-to-end**

1. Go to `http://localhost:5173/register` — register a new account
2. Verify redirect to `/membership-pending` with user's name displayed
3. Log out — verify redirect to `/login`
4. Log back in — verify redirect to `/membership-pending` again (pending status)
5. Go to `http://localhost:8000/django-admin/` — set membership_status to `active`
6. Log back in — verify redirect to `/dashboard` stub

- [ ] **Step 3: Final commit**

```bash
git add frontend/src/pages/MembershipPending.jsx
git commit -m "feat: add membership pending page"
```

---

## Phase 1 Complete ✓

**What's working:**
- Monorepo with backend + frontend
- Django: custom User model, MemberProfile with BMI/BMR computation, token auth API (register/login/logout), IsActiveMember + IsAdmin permissions
- React: all routes stubbed, Zustand auth store persisted, Axios instance with token injection + 401 handling, PrivateRoute + AdminRoute guards, Landing, Login, Register (2-step), MembershipPending pages

**Test all backend tests:**
```bash
cd backend && pytest -v
```
Expected: 12+ tests PASSED, 0 failed.

**Next:** See `docs/superpowers/plans/2026-05-17-phase2-ai-backend-features.md`
