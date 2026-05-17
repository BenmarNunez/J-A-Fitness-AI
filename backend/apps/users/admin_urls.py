from django.urls import path
from .views import AdminMemberListView, AdminMemberDetailView

urlpatterns = [
    path('members/', AdminMemberListView.as_view()),
    path('members/<int:user_id>/', AdminMemberDetailView.as_view()),
]
