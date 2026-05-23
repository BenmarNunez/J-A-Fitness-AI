from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import MemberProfile

User = get_user_model()

PROFILE_FIELDS = ['age', 'weight_kg', 'height_cm', 'gender', 'fitness_goal', 'activity_level', 'body_build']


class MemberProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = [
            'age', 'weight_kg', 'height_cm', 'gender',
            'fitness_goal', 'activity_level', 'body_build', 'bmi', 'bmr',
            'membership_status', 'membership_start', 'membership_end',
        ]
        read_only_fields = ['bmi', 'bmr', 'membership_status', 'membership_start', 'membership_end']


class UserSerializer(serializers.ModelSerializer):
    profile = MemberProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'is_admin', 'profile']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    age = serializers.IntegerField(required=False)
    weight_kg = serializers.FloatField(required=False)
    height_cm = serializers.FloatField(required=False)
    gender = serializers.CharField(required=False, allow_blank=True)
    fitness_goal = serializers.CharField(required=False, allow_blank=True)
    activity_level = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password'] + PROFILE_FIELDS

    def create(self, validated_data):
        profile_data = {k: validated_data.pop(k) for k in PROFILE_FIELDS if k in validated_data}
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password'],
        )
        MemberProfile.objects.create(user=user, **profile_data)
        return user
