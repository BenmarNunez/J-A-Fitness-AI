from django.db.models import Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember, IsAdmin
from apps.users.models import MemberProfile
from .models import FeatureUsageLog
from .serializers import FeatureUsageLogSerializer


class LogUsageView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        serializer = FeatureUsageLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminAnalyticsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        total_members = MemberProfile.objects.count()
        active_members = MemberProfile.objects.filter(membership_status='active').count()
        pending_members = MemberProfile.objects.filter(membership_status='pending').count()
        feature_usage = (
            FeatureUsageLog.objects
            .values('feature')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        return Response({
            'total_members': total_members,
            'active_members': active_members,
            'pending_members': pending_members,
            'feature_usage': list(feature_usage),
        })
