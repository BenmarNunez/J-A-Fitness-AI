from django.urls import path
from .views import ProfileView, ProfilePictureView

urlpatterns = [
    path('', ProfileView.as_view(), name='profile'),
    path('picture/', ProfilePictureView.as_view(), name='profile-picture'),
]
