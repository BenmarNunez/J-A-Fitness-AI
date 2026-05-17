from django.urls import path
from .views import GenerateFitnessPlanView, FitnessPlanListView, WorkoutLogView, BodyMetricView, BMIView

urlpatterns = [
    path('generate/', GenerateFitnessPlanView.as_view()),
    path('plans/', FitnessPlanListView.as_view()),
    path('log/', WorkoutLogView.as_view()),
    path('metrics/', BodyMetricView.as_view()),
    path('bmi/', BMIView.as_view()),
]
