from django.db import models
from django.conf import settings


class NutritionPlan(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='nutrition_plans')
    created_at = models.DateTimeField(auto_now_add=True)
    content = models.JSONField(default=dict)
    calories = models.FloatField(null=True, blank=True)
    protein_g = models.FloatField(null=True, blank=True)
    carbs_g = models.FloatField(null=True, blank=True)
    fat_g = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']


class FoodScan(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='food_scans')
    image = models.ImageField(upload_to='food_scans/')
    analysis = models.JSONField(default=dict)
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scanned_at']
