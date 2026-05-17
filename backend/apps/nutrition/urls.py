from django.urls import path
from .views import GenerateNutritionView, FoodScanView, NutritionPlanListView

urlpatterns = [
    path('generate/', GenerateNutritionView.as_view()),
    path('scan/', FoodScanView.as_view()),
    path('plans/', NutritionPlanListView.as_view()),
]
