import logging
from datetime import date, timedelta
from .models import NotificationPreference
from .emails import send_workout_reminder_email, send_weekly_summary_email
from apps.fitness.models import FitnessPlan, WorkoutLog, WorkoutSet

logger = logging.getLogger(__name__)

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
        try:
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
            send_workout_reminder_email(user, prefs=prefs)
        except Exception:
            logger.exception('Failed to process workout reminder for user %s', prefs.user_id)


def send_weekly_summary():
    today = date.today()
    week_start = today - timedelta(days=6)
    prefs_qs = NotificationPreference.objects.filter(weekly_summary=True).select_related('user')
    for prefs in prefs_qs:
        try:
            user = prefs.user
            logs = WorkoutLog.objects.filter(user=user, date__gte=week_start, date__lte=today)
            session_count = logs.count()
            if session_count == 0:
                continue
            sets = WorkoutSet.objects.filter(log__in=logs)
            total_sets = sets.count()
            top_exercises = list(sets.values_list('exercise_name', flat=True).distinct()[:3])
            send_weekly_summary_email(user, session_count, total_sets, top_exercises, prefs=prefs)
        except Exception:
            logger.exception('Failed to process weekly summary for user %s', prefs.user_id)
