from django.db import migrations


def backfill_notification_prefs(apps, schema_editor):
    User = apps.get_model('users', 'User')
    NotificationPreference = apps.get_model('users', 'NotificationPreference')
    for user in User.objects.all():
        NotificationPreference.objects.get_or_create(user=user)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_notificationpreference'),
    ]

    operations = [
        migrations.RunPython(backfill_notification_prefs, noop_reverse),
    ]
