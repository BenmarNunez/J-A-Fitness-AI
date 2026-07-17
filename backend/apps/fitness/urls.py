from django.urls import path
from .views import GenerateFitnessPlanView, FitnessPlanListView, WorkoutLogView, WorkoutAutoLogView, BodyMetricView, BMIView, RestDayView

urlpatterns = [
    path('generate/', GenerateFitnessPlanView.as_view()),
    path('plans/', FitnessPlanListView.as_view()),
    path('log/', WorkoutLogView.as_view()),
    path('log/auto/', WorkoutAutoLogView.as_view()),
    path('metrics/', BodyMetricView.as_view()),
    path('bmi/', BMIView.as_view()),
    path('rest-day/', RestDayView.as_view()),
]
