from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer


class ChatSessionView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        session = ChatSession.objects.create(user=request.user)
        return Response(ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class ChatHistoryView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatSessionSerializer(session).data)

    def post(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        messages = request.data.get('messages', [])
        for msg in messages:
            ChatMessage.objects.create(
                session=session,
                role=msg.get('role'),
                content=msg.get('content', ''),
            )
        return Response({'saved': len(messages)}, status=status.HTTP_201_CREATED)
