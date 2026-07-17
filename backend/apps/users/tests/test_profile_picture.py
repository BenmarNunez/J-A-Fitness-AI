import io
from unittest import mock

import pytest
import cloudinary
from cloudinary import CloudinaryResource
from PIL import Image
from django.contrib.auth import get_user_model
from django.db.models.signals import pre_save
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.users.models import MemberProfile
from apps.users.serializers import ProfilePictureUploadSerializer

User = get_user_model()


def make_image_file(fmt='JPEG', content_type='image/jpeg', size_bytes=None):
    from django.core.files.uploadedfile import SimpleUploadedFile
    buf = io.BytesIO()
    Image.new('RGB', (10, 10)).save(buf, format=fmt)
    content = buf.getvalue()
    if size_bytes is not None:
        content = content.ljust(size_bytes, b'\0')
    return SimpleUploadedFile('pic.jpg', content, content_type=content_type)


def test_valid_jpeg_passes_validation():
    serializer = ProfilePictureUploadSerializer(data={'picture': make_image_file()})
    assert serializer.is_valid(), serializer.errors


def test_wrong_content_type_rejected():
    # Note: Django's ImageField normalizes content_type to the Pillow-detected
    # real image format before our validator runs (see forms/fields.py
    # ImageField.to_python), so the fixture must be an actually-GIF-encoded
    # file for this to genuinely exercise rejection of a disallowed type.
    serializer = ProfilePictureUploadSerializer(
        data={'picture': make_image_file(fmt='GIF', content_type='image/gif')}
    )
    assert not serializer.is_valid()
    assert 'picture' in serializer.errors


def test_oversized_file_rejected():
    big_file = make_image_file(size_bytes=6 * 1024 * 1024)
    serializer = ProfilePictureUploadSerializer(data={'picture': big_file})
    assert not serializer.is_valid()
    assert 'picture' in serializer.errors


@pytest.mark.django_db
def test_picture_upload_does_not_overwrite_concurrently_changed_fields():
    """
    ProfilePictureView.patch() must only persist the profile_picture column.
    Regression test for a lost-update race: if profile.save() writes every
    field (no update_fields), an upload landing after another request has
    changed e.g. weight_kg would silently stomp that change with the stale
    in-memory value this view loaded. We simulate the "another request wrote
    to the row in between" scenario via a pre_save signal, since it fires
    right before the view's profile.save() reaches the database.
    """
    user = User.objects.create_user(
        username='pic-race@example.com',
        email='pic-race@example.com',
        password='pass123',
    )
    profile = MemberProfile.objects.create(
        user=user, membership_status='active', weight_kg=70.0,
    )
    token, _ = Token.objects.get_or_create(user=user)

    def simulate_concurrent_update(sender, instance, **kwargs):
        if instance.pk == profile.pk:
            MemberProfile.objects.filter(pk=profile.pk).update(weight_kg=999.0)

    pre_save.connect(simulate_concurrent_update, sender=MemberProfile)
    # UserSerializer renders profile_picture.url, which needs a configured
    # cloud_name; the test settings leave it unset, so stub one in and
    # restore the original config afterwards.
    original_config = cloudinary.config().__dict__.copy()
    try:
        cloudinary.config(cloud_name='test-cloud', api_key='test-key', api_secret='test-secret')
        fake_upload = CloudinaryResource(
            public_id='test_public_id', format='jpg', version=1,
            type='upload', resource_type='image',
        )
        with mock.patch('cloudinary.uploader.upload_resource', return_value=fake_upload):
            client = APIClient()
            client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
            response = client.patch(
                '/api/profile/picture/',
                {'picture': make_image_file()},
                format='multipart',
            )
    finally:
        pre_save.disconnect(simulate_concurrent_update, sender=MemberProfile)
        cloudinary.reset_config()
        cloudinary.config(**original_config)

    assert response.status_code == 200, response.data
    profile.refresh_from_db()
    # The concurrently-written weight_kg must survive the picture upload.
    assert profile.weight_kg == 999.0
    assert profile.profile_picture
