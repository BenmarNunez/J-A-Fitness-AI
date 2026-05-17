from rest_framework import serializers
from .models import FeatureUsageLog


class FeatureUsageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureUsageLog
        fields = ['id', 'feature', 'timestamp']
        read_only_fields = ['id', 'timestamp']
