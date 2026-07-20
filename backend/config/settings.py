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
    'apps.fitness',
    'apps.nutrition',
    'apps.ai_module',
    'apps.equipment',
    'apps.analytics',
    'django_q',
    'anymail',
    'cloudinary',
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

from decouple import config as decouple_config
GEMINI_API_KEY = decouple_config('GEMINI_API_KEY', default='')

import dj_database_url as _dj_db_url

_db_url = config('DATABASE_URL', default='')
if _db_url:
    DATABASES['default'] = _dj_db_url.parse(_db_url, conn_max_age=600)

MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
STATIC_ROOT = BASE_DIR / 'staticfiles'

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

EMAIL_BACKEND = 'anymail.backends.resend.EmailBackend'
ANYMAIL = {
    'RESEND_API_KEY': config('RESEND_API_KEY', default=''),
}
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@jafitness.ai')

import platform as _platform

Q_CLUSTER = {
    'name': 'ja_fitness',
    'orm': 'default',
    'workers': 2,
    # django-q2's per-task timeout relies on signal.SIGALRM, which doesn't exist on
    # Windows. Disable it there (task just runs to completion); keep it on Linux
    # (production) as a safety net against a hung task blocking a worker forever.
    'timeout': None if _platform.system() == 'Windows' else 60,
    'retry': 120,
}

import cloudinary

cloudinary.config(
    cloud_name=config('CLOUDINARY_CLOUD_NAME', default=''),
    api_key=config('CLOUDINARY_API_KEY', default=''),
    api_secret=config('CLOUDINARY_API_SECRET', default=''),
    secure=True,
)
