from rest_framework import serializers
from .models import NutritionPlan, FoodScan


class NutritionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionPlan
        fields = ['id', 'created_at', 'content', 'calories', 'protein_g', 'carbs_g', 'fat_g']
        read_only_fields = ['id', 'created_at']


class FoodScanSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodScan
        fields = ['id', 'image', 'analysis', 'scanned_at']
        read_only_fields = ['id', 'analysis', 'scanned_at']
