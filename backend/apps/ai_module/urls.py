from django.urls import path
from .views import ChatSessionView, ChatHistoryView

urlpatterns = [
    path('chat/session/', ChatSessionView.as_view()),
    path('chat/history/<int:session_id>/', ChatHistoryView.as_view()),
]
