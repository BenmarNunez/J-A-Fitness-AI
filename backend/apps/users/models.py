from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_admin = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']


class MemberProfile(models.Model):
    FITNESS_GOALS = [
        ('lose_weight', 'Lose Weight'),
        ('build_muscle', 'Build Muscle'),
        ('maintain', 'Maintain'),
    ]
    ACTIVITY_LEVELS = [
        ('sedentary', 'Sedentary'),
        ('light', 'Light'),
        ('moderate', 'Moderate'),
        ('active', 'Active'),
        ('very_active', 'Very Active'),
    ]
    MEMBERSHIP_STATUSES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    GENDERS = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    BODY_BUILDS = [
        ('light',  'Light'),
        ('medium', 'Medium'),
        ('heavy',  'Heavy'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    age = models.PositiveIntegerField(null=True, blank=True)
    body_build = models.CharField(max_length=10, choices=BODY_BUILDS, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDERS, blank=True)
    fitness_goal = models.CharField(max_length=20, choices=FITNESS_GOALS, blank=True)
    activity_level = models.CharField(max_length=20, choices=ACTIVITY_LEVELS, blank=True)
    bmi = models.FloatField(null=True, blank=True)
    bmr = models.FloatField(null=True, blank=True)
    membership_status = models.CharField(
        max_length=10, choices=MEMBERSHIP_STATUSES, default='pending'
    )
    membership_start = models.DateField(null=True, blank=True)
    membership_end = models.DateField(null=True, blank=True)

    def _compute_bmi(self):
        if self.weight_kg and self.height_cm:
            h = self.height_cm / 100
            return round(self.weight_kg / (h * h), 2)
        return None

    def _compute_bmr(self):
        if self.weight_kg and self.height_cm and self.age and self.gender in ('male', 'female'):
            base = 10 * self.weight_kg + 6.25 * self.height_cm - 5 * self.age
            return round(base + 5 if self.gender == 'male' else base - 161, 2)
        return None

    def save(self, *args, **kwargs):
        self.bmi = self._compute_bmi()
        self.bmr = self._compute_bmr()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user.email} — {self.membership_status}'


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_prefs')
    workout_reminders = models.BooleanField(default=True)
    plan_updates = models.BooleanField(default=True)
    weekly_summary = models.BooleanField(default=True)

    def __str__(self):
        return f'NotificationPreference({self.user.email})'
