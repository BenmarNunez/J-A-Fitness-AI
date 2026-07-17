import pytest
from django.core import mail
from django.contrib.auth import get_user_model
from apps.users.models import MemberProfile
from apps.users.emails import send_plan_update_email, send_workout_reminder_email, send_weekly_summary_email

User = get_user_model()


@pytest.fixture
def user_with_prefs(db):
    user = User.objects.create_user(
        username='mail@example.com', email='mail@example.com',
        password='pass123', first_name='Jane',
    )
    MemberProfile.objects.create(user=user, membership_status='active')
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
