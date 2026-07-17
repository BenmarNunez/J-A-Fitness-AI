from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import MemberProfile, NotificationPreference

User = get_user_model()

PROFILE_FIELDS = ['age', 'weight_kg', 'height_cm', 'gender', 'fitness_goal', 'activity_level']


class MemberProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = MemberProfile
        fields = [
            'age', 'weight_kg', 'height_cm', 'gender',
            'fitness_goal', 'activity_level', 'body_build', 'bmi', 'bmr',
            'membership_status', 'membership_start', 'membership_end',
            'profile_picture',
        ]
        read_only_fields = ['bmi', 'bmr', 'membership_status', 'membership_start', 'membership_end']

    def get_profile_picture(self, obj):
        return obj.profile_picture.url if obj.profile_picture else None

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        update_fields = list(validated_data.keys())
        if {'weight_kg', 'height_cm', 'age', 'gender'} & set(update_fields):
            update_fields += ['bmi', 'bmr']
        # An empty update_fields list makes Model.save() skip the DB write
        # entirely (Django: "If update_fields is empty, skip the save"),
        # so a no-op PATCH/PUT correctly touches nothing rather than
        # falling back to a full-row save (update_fields=None) that would
        # reintroduce the lost-update race this override exists to prevent.
        instance.save(update_fields=update_fields)
        return instance


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


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['workout_reminders', 'plan_updates', 'weekly_summary']


class ProfilePictureUploadSerializer(serializers.Serializer):
    picture = serializers.ImageField()

    def validate_picture(self, value):
        if value.content_type not in ('image/jpeg', 'image/png'):
            raise serializers.ValidationError('Only JPG and PNG files are allowed.')
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('File must be 5MB or smaller.')
        return value
