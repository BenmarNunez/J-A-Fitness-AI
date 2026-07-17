# Profile Picture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members upload a JPG/PNG profile picture, stored on Cloudinary, and show it in the navbar and Profile page in place of the current letter-initial avatar.

**Architecture:** `MemberProfile` gets a `profile_picture` field using `cloudinary.models.CloudinaryField` (uploads directly to Cloudinary on save — no change to Django's default file storage, so `FoodScan.image` keeps using local `MEDIA_ROOT` unchanged). A dedicated multipart `PATCH /api/profile/picture/` endpoint validates type/size server-side. `Profile.jsx` gets an upload control; `Sidebar.jsx` swaps its avatar for the uploaded image when present.

**Tech Stack:** Django 5 + DRF, `cloudinary` Python SDK (free tier, no billing card required), React 19 (file input + `FormData` upload, manual browser verification — no frontend test runner in this repo).

---

### Task 1: Backend — Cloudinary config and model field

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/config/settings.py`
- Modify: `backend/.env.example`
- Modify: `backend/apps/users/models.py`
- Create: `backend/apps/users/migrations/0004_memberprofile_profile_picture.py` (generated)

- [ ] **Step 1: Add the dependency**

Append to `backend/requirements.txt`:

```
cloudinary==1.41.0
```

Run (from `backend/`): `py -m pip install cloudinary`

- [ ] **Step 2: Configure Cloudinary in settings**

In `backend/config/settings.py`, add `'cloudinary'` to `INSTALLED_APPS` (line 10-26), after `'apps.analytics',`:

```python
    'apps.analytics',
    'cloudinary',
```

Append to the end of `backend/config/settings.py`:

```python
import cloudinary

cloudinary.config(
    cloud_name=config('CLOUDINARY_CLOUD_NAME', default=''),
    api_key=config('CLOUDINARY_API_KEY', default=''),
    api_secret=config('CLOUDINARY_API_SECRET', default=''),
    secure=True,
)
```

- [ ] **Step 3: Add env vars**

Append to `backend/.env.example`:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

Sign up for a free Cloudinary account (no billing card required) and fill in the real values in your local `.env` (not `.env.example`) before doing any live upload testing.

- [ ] **Step 4: Add the model field**

In `backend/apps/users/models.py`, add the import at the top (after line 2, `from django.db import models`):

```python
from cloudinary.models import CloudinaryField
```

Add the field to `MemberProfile` (after `body_build`, line 44):

```python
    body_build = models.CharField(max_length=10, choices=BODY_BUILDS, blank=True)
    profile_picture = CloudinaryField('image', blank=True, null=True)
```

- [ ] **Step 5: Generate the migration**

Run (from `backend/`): `py manage.py makemigrations users`
Expected: `Migrations for 'users': ... 0004_memberprofile_profile_picture.py ... - Add field profile_picture to memberprofile`

- [ ] **Step 6: Verify Django loads cleanly**

Run (from `backend/`): `py manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 7: Commit**

```bash
git add backend/requirements.txt backend/config/settings.py backend/.env.example backend/apps/users/models.py backend/apps/users/migrations/0004_memberprofile_profile_picture.py
git commit -m "feat: add Cloudinary-backed profile_picture field to MemberProfile"
```

---

### Task 2: Backend — upload endpoint with validation

**Files:**
- Modify: `backend/apps/users/serializers.py`
- Modify: `backend/apps/users/views.py`
- Modify: `backend/apps/users/profile_urls.py`
- Test: `backend/apps/users/tests/test_profile_picture.py`

- [ ] **Step 1: Write the failing validation tests**

Create `backend/apps/users/tests/test_profile_picture.py`:

```python
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
    serializer = ProfilePictureUploadSerializer(data={'picture': make_image_file(content_type='image/gif')})
    assert not serializer.is_valid()
    assert 'picture' in serializer.errors


def test_oversized_file_rejected():
    big_file = make_image_file(size_bytes=6 * 1024 * 1024)
    serializer = ProfilePictureUploadSerializer(data={'picture': big_file})
    assert not serializer.is_valid()
    assert 'picture' in serializer.errors
```

Note: `Pillow` is already a project dependency, so `PIL.Image` is available for building test fixtures.

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `py -m pytest apps/users/tests/test_profile_picture.py -v`
Expected: FAIL — `ImportError: cannot import name 'ProfilePictureUploadSerializer'`.

- [ ] **Step 3: Add the serializers**

In `backend/apps/users/serializers.py`, add `profile_picture` to `MemberProfileSerializer`. Replace the class (lines 10-18) with:

```python
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
```

Append a new serializer at the end of the file:

```python


class ProfilePictureUploadSerializer(serializers.Serializer):
    picture = serializers.ImageField()

    def validate_picture(self, value):
        if value.content_type not in ('image/jpeg', 'image/png'):
            raise serializers.ValidationError('Only JPG and PNG files are allowed.')
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('File must be 5MB or smaller.')
        return value
```

- [ ] **Step 4: Run tests to verify they pass**

Run (from `backend/`): `py -m pytest apps/users/tests/test_profile_picture.py -v`
Expected: PASS.

- [ ] **Step 5: Add the view**

In `backend/apps/users/views.py`, update the serializer import at line 7:

```python
from .serializers import RegisterSerializer, UserSerializer, MemberProfileSerializer, ProfilePictureUploadSerializer
```

Add a parser import (after line 5, `from django.contrib.auth import authenticate, get_user_model`):

```python
from rest_framework.parsers import MultiPartParser, FormParser
```

Append the view after `ProfileView` (after line 62):

```python


class ProfilePictureView(APIView):
    permission_classes = [IsActiveMember]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        serializer = ProfilePictureUploadSerializer(data=request.data)
        if serializer.is_valid():
            profile = request.user.profile
            profile.profile_picture = serializer.validated_data['picture']
            profile.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 6: Wire the URL**

In `backend/apps/users/profile_urls.py`:

```python
from django.urls import path
from .views import ProfileView, ProfilePictureView

urlpatterns = [
    path('', ProfileView.as_view(), name='profile'),
    path('picture/', ProfilePictureView.as_view(), name='profile-picture'),
]
```

This resolves to `PATCH /api/profile/picture/` (the existing `api/profile/` prefix from `config/urls.py:9`).

- [ ] **Step 7: Run the full users test suite**

Run (from `backend/`): `py -m pytest apps/users -v`
Expected: all tests pass, no regressions in existing profile/auth tests.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/users/serializers.py backend/apps/users/views.py backend/apps/users/profile_urls.py backend/apps/users/tests/test_profile_picture.py
git commit -m "feat: add profile picture upload endpoint with type/size validation"
```

---

### Task 3: Frontend — upload control on Profile page

**Files:**
- Modify: `frontend/src/pages/Profile.jsx`

- [ ] **Step 1: Add upload state and handlers**

In `frontend/src/pages/Profile.jsx`, add state after line 26 (`const [saved,  setSaved]  = useState(false)`):

```javascript
  const [pictureFile, setPictureFile] = useState(null)
  const [picturePreview, setPicturePreview] = useState(null)
  const [pictureError, setPictureError] = useState('')
  const [uploadingPicture, setUploadingPicture] = useState(false)

  const handlePictureSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setPictureError('Only JPG and PNG files are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPictureError('File must be 5MB or smaller.')
      return
    }
    setPictureError('')
    setPictureFile(file)
    setPicturePreview(URL.createObjectURL(file))
  }

  const handlePictureUpload = async () => {
    if (!pictureFile) return
    setUploadingPicture(true); setPictureError('')
    try {
      const formData = new FormData()
      formData.append('picture', pictureFile)
      const { data } = await api.patch('/api/profile/picture/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAuth(token, data)
      setPictureFile(null)
      setPicturePreview(null)
    } catch (err) {
      setPictureError(err.response?.data?.picture?.[0] || 'Upload failed. Try again.')
    } finally {
      setUploadingPicture(false)
    }
  }
```

- [ ] **Step 2: Replace the identity card avatar**

Replace lines 55-67 (the identity card's avatar + name block) with:

```jsx
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 shrink-0">
              {picturePreview || profile?.profile_picture ? (
                <img
                  src={picturePreview || profile.profile_picture}
                  alt="Profile"
                  className="w-14 h-14 rounded-full object-cover border border-primary/25"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/12 border border-primary/25 flex items-center justify-center text-primary font-display text-2xl">
                  {user?.first_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-bg flex items-center justify-center text-xs cursor-pointer">
                ✎
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePictureSelect} />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-base font-semibold text-lg">{user?.first_name} {user?.last_name}</p>
              <p className="text-text-muted text-sm truncate">{user?.email}</p>
              <span className={`inline-block mt-2 ${isActive ? 'badge-active' : 'badge-pending'}`}>
                {profile?.membership_status || 'pending'}
              </span>
            </div>
          </div>
          {pictureError && <p className="text-danger text-xs mt-3">{pictureError}</p>}
          {pictureFile && (
            <button onClick={handlePictureUpload} disabled={uploadingPicture} className="btn-primary text-xs mt-3 py-1.5 px-3">
              {uploadingPicture ? 'Uploading…' : 'Save Photo'}
            </button>
          )}
```

(Leave the rest of the identity card — the BMI/BMR/Body Build stats grid starting at the original line 68 — unchanged; it continues to close the same `<div className="card p-6">`.)

- [ ] **Step 3: Manual verification**

1. Ensure real Cloudinary credentials are set in `backend/.env` (from Task 1 Step 3).
2. Start both servers, log in as an active member, go to `/profile`.
3. Click the pencil icon on the avatar, select a JPG under 5MB — confirm a local preview appears immediately and a "Save Photo" button shows.
4. Click "Save Photo" — confirm the request succeeds (Network tab: `PATCH /api/profile/picture/` → 200) and the avatar now shows the uploaded image (served from a `res.cloudinary.com` URL).
5. Refresh the page — confirm the picture persists (loaded from `user.profile.profile_picture` in the persisted auth store / re-fetched profile).
6. Try selecting a `.gif` or a file over 5MB — confirm the inline error shows and no network request fires.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Profile.jsx
git commit -m "feat: add profile picture upload control to Profile page"
```

---

### Task 4: Frontend — navbar avatar

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Swap the avatar block**

In `frontend/src/components/Sidebar.jsx`, replace lines 86-89:

```jsx
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-semibold text-sm">
            {user?.first_name?.[0]?.toUpperCase() || 'U'}
          </div>
```

with:

```jsx
        <div className="flex items-center gap-3 mb-3">
          {user?.profile?.profile_picture ? (
            <img
              src={user.profile.profile_picture}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-primary/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-semibold text-sm">
              {user?.first_name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
```

- [ ] **Step 2: Manual verification**

With a profile picture already uploaded (from Task 3), confirm the Sidebar's user block (bottom-left, desktop viewport) now shows the same picture instead of the letter initial. Log out and back in to confirm it still shows after a fresh login (picture comes from the login response's nested `user.profile`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.jsx
git commit -m "feat: show uploaded profile picture in sidebar nav"
```

---

### Task 5: Full verification and push

- [ ] **Step 1: Run the full backend test suite**

Run (from `backend/`): `py -m pytest -v`
Expected: all tests pass.

- [ ] **Step 2: Live walkthrough**

Repeat Task 3 Step 3 and Task 4 Step 2's manual verification end-to-end in one pass, on both desktop and mobile viewport widths (BottomNav doesn't currently show an avatar, so mobile verification is limited to the Profile page itself).

- [ ] **Step 3: Push**

```bash
git push
```
