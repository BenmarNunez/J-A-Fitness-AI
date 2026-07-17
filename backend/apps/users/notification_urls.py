from django.urls import path
from .views import NotificationPreferenceView

urlpatterns = [
    path('prefs/', NotificationPreferenceView.as_view()),
]
