import pytest
from django.contrib.auth import get_user_model
from apps.users.models import MemberProfile

User = get_user_model()


@pytest.mark.django_db
def test_user_uses_email_as_username():
    user = User.objects.create_user(
        username='test@example.com',
        email='test@example.com',
        password='pass123',
    )
    assert user.email == 'test@example.com'
    assert User.USERNAME_FIELD == 'email'


@pytest.mark.django_db
def test_member_profile_created_with_pending_status():
    user = User.objects.create_user(
        username='profile@example.com',
        email='profile@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(user=user)
    assert profile.membership_status == 'pending'


@pytest.mark.django_db
def test_bmi_computed_on_profile_save():
    user = User.objects.create_user(
        username='bmi@example.com',
        email='bmi@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(
        user=user,
        weight_kg=70.0,
        height_cm=175.0,
    )
    assert profile.bmi == pytest.approx(22.86, rel=0.01)


@pytest.mark.django_db
def test_bmr_computed_for_male():
    user = User.objects.create_user(
        username='bmr@example.com',
        email='bmr@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(
        user=user,
        weight_kg=70.0,
        height_cm=175.0,
        age=25,
        gender='male',
    )
    # Mifflin-St Jeor male: 10*70 + 6.25*175 - 5*25 + 5 = 1668.75
    assert profile.bmr == pytest.approx(1668.75, rel=0.01)


@pytest.mark.django_db
def test_bmi_none_when_missing_measurements():
    user = User.objects.create_user(
        username='nobmi@example.com',
        email='nobmi@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(user=user)
    assert profile.bmi is None
    assert profile.bmr is None


from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from unittest.mock import MagicMock


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def registered_user(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'member@example.com',
        'first_name': 'Jane',
        'last_name': 'Doe',
        'password': 'securepass123',
        'age': 28,
        'weight_kg': 60.0,
        'height_cm': 165.0,
        'gender': 'female',
        'fitness_goal': 'lose_weight',
        'activity_level': 'moderate',
    }, format='json')
    return response.data


@pytest.mark.django_db
def test_register_returns_token_and_user(api_client):
    response = api_client.post('/api/auth/register/', {
        'email': 'new@example.com',
        'first_name': 'New',
        'last_name': 'User',
        'password': 'securepass123',
    }, format='json')
    assert response.status_code == 201
    assert 'token' in response.data
    assert response.data['user']['email'] == 'new@example.com'
    assert response.data['user']['profile']['membership_status'] == 'pending'


@pytest.mark.django_db
def test_register_duplicate_email_rejected(api_client):
    payload = {
        'email': 'dup@example.com',
        'first_name': 'A',
        'last_name': 'B',
        'password': 'securepass123',
    }
    api_client.post('/api/auth/register/', payload, format='json')
    response = api_client.post('/api/auth/register/', payload, format='json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_login_valid_credentials(api_client, registered_user):
    response = api_client.post('/api/auth/login/', {
        'email': 'member@example.com',
        'password': 'securepass123',
    }, format='json')
    assert response.status_code == 200
    assert 'token' in response.data


@pytest.mark.django_db
def test_login_wrong_password_returns_401(api_client, registered_user):
    response = api_client.post('/api/auth/login/', {
        'email': 'member@example.com',
        'password': 'wrongpassword',
    }, format='json')
    assert response.status_code == 401


@pytest.mark.django_db
def test_logout_invalidates_token(api_client, registered_user):
    token = registered_user['token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
    response = api_client.post('/api/auth/logout/')
    assert response.status_code == 204
    response = api_client.post('/api/auth/logout/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_pending_member_blocked_from_profile(api_client, registered_user):
    token = registered_user['token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
    response = api_client.get('/api/profile/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_active_member_can_access_profile(api_client):
    user = User.objects.create_user(
        username='active2@example.com', email='active2@example.com', password='pass123'
    )
    MemberProfile.objects.create(user=user, membership_status='active')
    token, _ = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    response = api_client.get('/api/profile/')
    assert response.status_code == 200
    assert response.data['email'] == 'active2@example.com'


@pytest.mark.django_db
def test_admin_permission_class():
    from apps.users.permissions import IsAdmin, IsActiveMember
    admin_user = User.objects.create_user(
        username='admin@example.com', email='admin@example.com', password='pass123', is_admin=True
    )
    regular_user = User.objects.create_user(
        username='regular@example.com', email='regular@example.com', password='pass123'
    )
    MemberProfile.objects.create(user=regular_user, membership_status='pending')
    req = MagicMock()
    perm = IsAdmin()
    req.user = admin_user
    assert perm.has_permission(req, None) is True
    req.user = regular_user
    assert perm.has_permission(req, None) is False


@pytest.mark.django_db
def test_profile_update_does_not_clobber_concurrently_uploaded_picture(api_client):
    """
    ProfileView.put() must only persist the fields actually submitted.
    Regression test for a lost-update race: MemberProfileSerializer's
    default update() calls instance.save() with no update_fields, which
    writes the entire row -- including whatever stale profile_picture
    value happened to be loaded onto the in-memory instance. If a picture
    upload lands in between this view loading the profile and its own
    save() reaching the database, that picture is silently wiped back to
    empty. We simulate the "another request wrote to the row in between"
    scenario via a pre_save signal, since it fires right before the
    view's serializer.save() reaches the database (same technique as
    test_picture_upload_does_not_overwrite_concurrently_changed_fields in
    test_profile_picture.py).
    """
    from django.db.models.signals import pre_save

    user = User.objects.create_user(
        username='racetest@example.com', email='racetest@example.com', password='pass123',
    )
    profile = MemberProfile.objects.create(user=user, membership_status='active', age=25)
    token, _ = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def simulate_concurrent_upload(sender, instance, **kwargs):
        if instance.pk == profile.pk:
            MemberProfile.objects.filter(pk=profile.pk).update(profile_picture='concurrently_uploaded_pic')

    pre_save.connect(simulate_concurrent_upload, sender=MemberProfile)
    try:
        response = api_client.put('/api/profile/', {'age': 30}, format='json')
    finally:
        pre_save.disconnect(simulate_concurrent_upload, sender=MemberProfile)

    assert response.status_code == 200, response.data
    profile.refresh_from_db()
    assert profile.age == 30
    assert str(profile.profile_picture) == 'concurrently_uploaded_pic'
