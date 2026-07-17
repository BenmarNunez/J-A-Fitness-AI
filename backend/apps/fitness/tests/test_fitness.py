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


@pytest.mark.django_db
def test_auto_log_creates_log_for_today(auth_client, active_user):
    response = auth_client.post('/api/fitness/log/auto/', {
        'exercise_name': 'Barbell Squat',
        'sets': 3,
        'reps': 10,
        'weight_kg': 40.0,
    }, format='json')
    assert response.status_code == 201
    from django.utils import timezone
    log = WorkoutLog.objects.get(user=active_user, date=timezone.localdate())
    assert log.sets.count() == 1
    assert log.sets.first().exercise_name == 'Barbell Squat'


@pytest.mark.django_db
def test_auto_log_appends_to_existing_log_same_day(auth_client, active_user):
    from django.utils import timezone
    existing_log = WorkoutLog.objects.create(user=active_user, date=timezone.localdate())
    WorkoutSet.objects.create(log=existing_log, exercise_name='Push Up', sets=3, reps=15)

    response = auth_client.post('/api/fitness/log/auto/', {
        'exercise_name': 'Bicep Curl',
        'sets': 3,
        'reps': 12,
        'weight_kg': 10.0,
    }, format='json')

    assert response.status_code == 201
    assert WorkoutLog.objects.filter(user=active_user, date=timezone.localdate()).count() == 1
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
