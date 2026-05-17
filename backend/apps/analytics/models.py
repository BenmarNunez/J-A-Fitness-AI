from django.db import models
from django.conf import settings


class FeatureUsageLog(models.Model):
    FEATURES = [
        ('fitness_plan', 'Fitness Plan'),
        ('nutrition', 'Nutrition'),
        ('posture', 'Posture Checker'),
        ('chatbot', 'Chatbot'),
        ('logbook', 'Logbook'),
        ('bmi', 'BMI Estimator'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='feature_usage')
    feature = models.CharField(max_length=20, choices=FEATURES)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
