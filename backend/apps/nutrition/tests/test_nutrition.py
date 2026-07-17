import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.users.models import MemberProfile

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def active_user_with_profile():
    user = User.objects.create_user(
        username='nutri@example.com', email='nutri@example.com', password='pass123',
    )
    MemberProfile.objects.create(
        user=user, membership_status='active',
        age=25, weight_kg=70, height_cm=175, gender='male',
    )
    return user


@pytest.fixture
def auth_client(api_client, active_user_with_profile):
    token, _ = Token.objects.get_or_create(user=active_user_with_profile)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return api_client


@pytest.mark.django_db
@patch('apps.nutrition.views.generate_nutrition_plan')
def test_generate_nutrition_plan_sends_update_email(mock_generate, auth_client):
    mock_generate.return_value = {
        'calories': 2000, 'protein_g': 150, 'carbs_g': 200, 'fat_g': 60,
        'meals': {'breakfast': [], 'lunch': [], 'dinner': [], 'snacks': []},
    }
    mail.outbox.clear()
    response = auth_client.post('/api/nutrition/generate/')
    assert response.status_code == 201
    assert len(mail.outbox) == 1
    assert 'nutrition plan' in mail.outbox[0].subject.lower()
