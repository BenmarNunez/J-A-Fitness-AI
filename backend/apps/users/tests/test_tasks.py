import pytest
from datetime import date, timedelta
from django.core import mail
from django.contrib.auth import get_user_model
from apps.users.models import MemberProfile
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
def test_workout_reminder_one_bad_plan_does_not_block_others(user_with_plan, monkeypatch):
    import apps.users.tasks as tasks_module

    class FixedDate(date):
        @classmethod
        def today(cls):
            return date(2026, 7, 20)  # a Monday -> workout day in SCHEDULE

    monkeypatch.setattr(tasks_module, 'date', FixedDate)

    bad_user = User.objects.create_user(
        username='badplan@example.com', email='badplan@example.com', password='pass123',
    )
    MemberProfile.objects.create(user=bad_user, membership_status='active')
    FitnessPlan.objects.create(user=bad_user, goal='maintain', weekly_schedule='not-a-dict', is_active=True)

    send_workout_reminders()
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [user_with_plan.email]


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
