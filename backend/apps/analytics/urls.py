from django.urls import path
from .views import LogUsageView, AdminAnalyticsView

urlpatterns = [
    path('log/', LogUsageView.as_view()),
    path('summary/', AdminAnalyticsView.as_view()),
]
