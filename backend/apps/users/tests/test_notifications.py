import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.users.models import MemberProfile, NotificationPreference

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def active_user():
    user = User.objects.create_user(
        username='notify@example.com', email='notify@example.com', password='pass123'
    )
    MemberProfile.objects.create(user=user, membership_status='active')
    return user


@pytest.fixture
def auth_client(api_client, active_user):
    token, _ = Token.objects.get_or_create(user=active_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return api_client


@pytest.mark.django_db
def test_get_notification_prefs_creates_defaults(auth_client, active_user):
    response = auth_client.get('/api/notifications/prefs/')
    assert response.status_code == 200
    assert response.data == {
        'workout_reminders': True,
        'plan_updates': True,
        'weekly_summary': True,
    }
    assert NotificationPreference.objects.filter(user=active_user).count() == 1


@pytest.mark.django_db
def test_patch_notification_prefs_updates_single_field(auth_client, active_user):
    response = auth_client.patch('/api/notifications/prefs/', {
        'workout_reminders': False,
    }, format='json')
    assert response.status_code == 200
    assert response.data['workout_reminders'] is False
    assert response.data['plan_updates'] is True
    prefs = NotificationPreference.objects.get(user=active_user)
    assert prefs.workout_reminders is False


@pytest.mark.django_db
def test_pending_member_blocked_from_notification_prefs(api_client):
    user = User.objects.create_user(
        username='pending@example.com', email='pending@example.com', password='pass123'
    )
    MemberProfile.objects.create(user=user, membership_status='pending')
    token, _ = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    response = api_client.get('/api/notifications/prefs/')
    assert response.status_code == 403
    # A prefs row is created automatically at user-creation time (via signal),
    # not by this endpoint. The 403 path must not create a second/duplicate row.
    assert NotificationPreference.objects.filter(user=user).count() == 1


@pytest.mark.django_db
def test_register_creates_notification_preference():
    response = APIClient().post('/api/auth/register/', {
        'email': 'newprefs@example.com',
        'first_name': 'New',
        'last_name': 'User',
        'password': 'securepass123',
    }, format='json')
    assert response.status_code == 201
    user = User.objects.get(email='newprefs@example.com')
    prefs = NotificationPreference.objects.get(user=user)
    assert prefs.workout_reminders is True
    assert prefs.plan_updates is True
    assert prefs.weekly_summary is True


@pytest.mark.django_db
def test_notification_preference_created_for_any_new_user_not_just_registration():
    from apps.users.models import NotificationPreference
    user = User.objects.create_user(
        username='directcreate@example.com', email='directcreate@example.com', password='pass123',
    )
    assert NotificationPreference.objects.filter(user=user).exists()
