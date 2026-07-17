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


from unittest.mock import patch


@pytest.mark.django_db
@patch('apps.fitness.views.generate_nutrition_plan')
@patch('apps.fitness.views.generate_fitness_plan')
def test_generate_fitness_plan_sends_update_email(mock_generate, mock_nutrition, auth_client, active_user):
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
    mock_nutrition.return_value = None
    mail.outbox.clear()
    response = auth_client.post('/api/fitness/generate/')
    assert response.status_code == 201
    assert len(mail.outbox) == 1
    assert 'fitness plan' in mail.outbox[0].subject.lower()


@pytest.mark.django_db
@patch('apps.fitness.views.generate_nutrition_plan')
@patch('apps.fitness.views.generate_fitness_plan')
def test_generate_fitness_plan_also_creates_nutrition_plan(mock_fitness, mock_nutrition, auth_client, active_user):
    active_user.profile.age = 25
    active_user.profile.weight_kg = 70
    active_user.profile.height_cm = 175
    active_user.profile.gender = 'male'
    active_user.profile.save()
    mock_fitness.return_value = {
        'goal': 'maintain',
        'weekly_schedule': {
            'monday': [{'exercise': 'Squat', 'sets': 3, 'reps': 10}],
            'tuesday': 'rest',
        },
        'estimated_weekly_calories_burned': 1200,
    }
    mock_nutrition.return_value = {
        'calories': 2200, 'protein_g': 160, 'carbs_g': 220, 'fat_g': 70,
        'meals': {'breakfast': [], 'lunch': [], 'dinner': [], 'snacks': []},
    }

    response = auth_client.post('/api/fitness/generate/')

    assert response.status_code == 201
    assert response.data['fitness_plan']['goal'] == 'maintain'
    assert response.data['nutrition_plan']['calories'] == 2200
    mock_nutrition.assert_called_once()
    call_kwargs = mock_nutrition.call_args.kwargs
    assert call_kwargs['workout_days_per_week'] == 1
    assert call_kwargs['estimated_weekly_calories_burned'] == 1200


@pytest.mark.django_db
@patch('apps.fitness.views.generate_nutrition_plan')
@patch('apps.fitness.views.generate_fitness_plan')
def test_fitness_plan_succeeds_even_if_nutrition_generation_fails(mock_fitness, mock_nutrition, auth_client, active_user):
    active_user.profile.age = 25
    active_user.profile.weight_kg = 70
    active_user.profile.height_cm = 175
    active_user.profile.gender = 'male'
    active_user.profile.save()
    mock_fitness.return_value = {
        'goal': 'maintain', 'weekly_schedule': {'monday': []}, 'estimated_weekly_calories_burned': 0,
    }
    mock_nutrition.return_value = None

    response = auth_client.post('/api/fitness/generate/')

    assert response.status_code == 201
    assert response.data['fitness_plan']['goal'] == 'maintain'
    assert response.data['nutrition_plan'] is None
    assert 'nutrition_error' in response.data
