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
