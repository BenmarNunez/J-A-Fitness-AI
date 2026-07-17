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
