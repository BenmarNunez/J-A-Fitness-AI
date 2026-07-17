import io
import pytest
from PIL import Image
from django.contrib.auth import get_user_model
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
