from rest_framework import serializers
from .models import FitnessPlan, WorkoutLog, WorkoutSet, BodyMetric, RestDay


class WorkoutSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSet
        fields = ['id', 'exercise_name', 'sets', 'reps', 'weight_kg']


class WorkoutLogSerializer(serializers.ModelSerializer):
    sets = WorkoutSetSerializer(many=True)

    class Meta:
        model = WorkoutLog
        fields = ['id', 'date', 'notes', 'sets', 'created_at']

    def create(self, validated_data):
        sets_data = validated_data.pop('sets', [])
        log = WorkoutLog.objects.create(**validated_data)
        for s in sets_data:
            WorkoutSet.objects.create(log=log, **s)
        return log


class FitnessPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitnessPlan
        fields = ['id', 'goal', 'weekly_schedule', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class BodyMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = BodyMetric
        fields = ['id', 'date', 'weight_kg', 'body_fat_pct', 'created_at']
        read_only_fields = ['id', 'created_at']


class RestDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = RestDay
        fields = ['id', 'user', 'date', 'reason', 'created_at']
        read_only_fields = ['id', 'user', 'date', 'created_at']
