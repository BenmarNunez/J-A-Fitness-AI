from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, get_user_model
from .serializers import RegisterSerializer, UserSerializer, MemberProfileSerializer, NotificationPreferenceSerializer
from .models import NotificationPreference
from .permissions import IsActiveMember, IsAdmin

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {'token': token.key, 'user': UserSerializer(user).data},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('password', '')
        user = authenticate(request, username=email, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'user': UserSerializer(user).data})
        return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = MemberProfileSerializer(
            request.user.profile, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminMemberListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.select_related('profile').exclude(is_superuser=True)
        return Response(UserSerializer(users, many=True).data)


class AdminMemberDetailView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, user_id):
        try:
            user = User.objects.select_related('profile').get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)

        allowed = ['membership_status', 'membership_start', 'membership_end']
        profile_data = {k: v for k, v in request.data.items() if k in allowed}
        serializer = MemberProfileSerializer(user.profile, data=profile_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationPreferenceView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(prefs).data)

    def patch(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
