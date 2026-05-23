from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from apps.ai_module.gemini import generate_fitness_plan
from .models import FitnessPlan, WorkoutLog, BodyMetric
from .serializers import FitnessPlanSerializer, WorkoutLogSerializer, BodyMetricSerializer


class GenerateFitnessPlanView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        profile = request.user.profile
        if not all([profile.age, profile.weight_kg, profile.height_cm, profile.gender]):
            return Response(
                {'detail': 'Complete your profile (age, weight, height, gender) before generating a plan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        plan_data = generate_fitness_plan(
            age=profile.age,
            weight_kg=profile.weight_kg,
            height_cm=profile.height_cm,
            gender=profile.gender,
            fitness_goal=profile.fitness_goal or 'maintain',
            activity_level=profile.activity_level or 'moderate',
            bmr=profile.bmr or 0,
            bmi=profile.bmi or 0,
            body_build=profile.body_build or 'medium',
        )
        if not plan_data:
            return Response(
                {'detail': 'AI plan generation failed. Try again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        FitnessPlan.objects.filter(user=request.user, is_active=True).update(is_active=False)
        plan = FitnessPlan.objects.create(
            user=request.user,
            goal=plan_data.get('goal', profile.fitness_goal or 'maintain'),
            weekly_schedule=plan_data,
            is_active=True,
        )
        return Response(FitnessPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


class FitnessPlanListView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        plans = FitnessPlan.objects.filter(user=request.user)
        return Response(FitnessPlanSerializer(plans, many=True).data)


class WorkoutLogView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        serializer = WorkoutLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        logs = WorkoutLog.objects.filter(user=request.user).prefetch_related('sets')
        return Response(WorkoutLogSerializer(logs, many=True).data)


class BodyMetricView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        serializer = BodyMetricSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        metrics = BodyMetric.objects.filter(user=request.user)
        return Response(BodyMetricSerializer(metrics, many=True).data)


class BMIView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        weight = request.data.get('weight_kg')
        height = request.data.get('height_cm')
        if not weight or not height:
            return Response({'detail': 'weight_kg and height_cm required.'}, status=status.HTTP_400_BAD_REQUEST)
        h = float(height) / 100
        bmi = round(float(weight) / (h * h), 2)
        if bmi < 18.5:
            classification = 'Underweight'
        elif bmi < 25:
            classification = 'Normal weight'
        elif bmi < 30:
            classification = 'Overweight'
        else:
            classification = 'Obese'
        return Response({'bmi': bmi, 'classification': classification})
