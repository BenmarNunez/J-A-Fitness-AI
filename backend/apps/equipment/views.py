from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from .models import Equipment
from .serializers import EquipmentSerializer


class EquipmentListView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        equipment = Equipment.objects.filter(is_available=True)
        return Response(EquipmentSerializer(equipment, many=True).data)
