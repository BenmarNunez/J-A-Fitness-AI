from django.core.management.base import BaseCommand
from django_q.models import Schedule


class Command(BaseCommand):
    help = 'Registers the recurring email notification tasks with Django-Q2 (idempotent, safe to re-run).'

    def handle(self, *args, **options):
        Schedule.objects.get_or_create(
            func='apps.users.tasks.send_workout_reminders',
            defaults={'schedule_type': Schedule.DAILY, 'name': 'workout_reminders'},
        )
        Schedule.objects.get_or_create(
            func='apps.users.tasks.send_weekly_summary',
            defaults={'schedule_type': Schedule.WEEKLY, 'name': 'weekly_summary'},
        )
        self.stdout.write(self.style.SUCCESS('Email schedules registered.'))
