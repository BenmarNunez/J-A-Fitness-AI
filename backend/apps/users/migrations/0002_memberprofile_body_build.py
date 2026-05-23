from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='memberprofile',
            name='body_build',
            field=models.CharField(
                blank=True,
                choices=[('light', 'Light'), ('medium', 'Medium'), ('heavy', 'Heavy')],
                max_length=10,
            ),
        ),
    ]
