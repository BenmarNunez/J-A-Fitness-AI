from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from apps.users.emails import send_plan_update_email
from apps.ai_module.gemini import generate_fitness_plan, generate_rest_day_plan, generate_nutrition_plan
from apps.nutrition.models import NutritionPlan
from apps.nutrition.serializers import NutritionPlanSerializer
from .models import FitnessPlan, WorkoutLog, WorkoutSet, BodyMetric, RestDay
from .serializers import FitnessPlanSerializer, WorkoutLogSerializer, WorkoutSetSerializer, BodyMetricSerializer, RestDaySerializer


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
        send_plan_update_email(request.user, 'fitness')

        nutrition_plan_data = None
        nutrition_error = None
        schedule = plan_data.get('weekly_schedule', {})
        workout_days = sum(
            1 for entry in schedule.values() if isinstance(entry, list) and len(entry) > 0
        ) if isinstance(schedule, dict) else 0
        nutrition_data = generate_nutrition_plan(
            age=profile.age, weight_kg=profile.weight_kg, height_cm=profile.height_cm,
            gender=profile.gender, fitness_goal=profile.fitness_goal or 'maintain',
            activity_level=profile.activity_level or 'moderate',
            bmr=profile.bmr or 0, bmi=profile.bmi or 0,
            body_build=profile.body_build or 'medium',
            workout_days_per_week=workout_days,
            estimated_weekly_calories_burned=plan_data.get('estimated_weekly_calories_burned', 0),
        )
        if nutrition_data:
            nutrition_plan = NutritionPlan.objects.create(
                user=request.user,
                content=nutrition_data,
                calories=nutrition_data.get('calories'),
                protein_g=nutrition_data.get('protein_g'),
                carbs_g=nutrition_data.get('carbs_g'),
                fat_g=nutrition_data.get('fat_g'),
            )
            send_plan_update_email(request.user, 'nutrition')
            nutrition_plan_data = NutritionPlanSerializer(nutrition_plan).data
        else:
            nutrition_error = 'AI meal plan generation failed.'

        response_data = {
            'fitness_plan': FitnessPlanSerializer(plan).data,
            'nutrition_plan': nutrition_plan_data,
        }
        if nutrition_error:
            response_data['nutrition_error'] = nutrition_error
        return Response(response_data, status=status.HTTP_201_CREATED)


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


class WorkoutAutoLogView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        serializer = WorkoutSetSerializer(data=request.data)
        if serializer.is_valid():
            log, _ = WorkoutLog.objects.get_or_create(user=request.user, date=timezone.localdate())
            WorkoutSet.objects.create(log=log, **serializer.validated_data)
            return Response(WorkoutLogSerializer(log).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


class RestDayView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        reason = request.data.get('reason')
        if not reason:
            return Response({'detail': 'Reason is required for logging a rest day.'}, status=status.HTTP_400_BAD_REQUEST)

        # Log the rest day
        rest_day = RestDay.objects.create(user=request.user, reason=reason)
        serializer = RestDaySerializer(rest_day)

        # Regenerate plan with Gemini
        profile = request.user.profile
        plan_data = generate_rest_day_plan(
            age=profile.age,
            weight_kg=profile.weight_kg,
            height_cm=profile.height_cm,
            gender=profile.gender,
            fitness_goal=profile.fitness_goal or 'maintain',
            activity_level=profile.activity_level or 'moderate',
            bmr=profile.bmr or 0,
            bmi=profile.bmi or 0,
            body_build=profile.body_build or 'medium',
            reason=reason,
        )

        if not plan_data:
            return Response({
                'rest_day': serializer.data,
                'detail': 'Rest day logged, but AI plan regeneration failed.'
            }, status=status.HTTP_200_OK)

        # Update active plan
        FitnessPlan.objects.filter(user=request.user, is_active=True).update(is_active=False)
        plan = FitnessPlan.objects.create(
            user=request.user,
            goal=plan_data.get('goal', profile.fitness_goal or 'maintain'),
            weekly_schedule=plan_data,
            is_active=True,
        )

        return Response({
            'rest_day': serializer.data,
            'plan': FitnessPlanSerializer(plan).data
        }, status=status.HTTP_201_CREATED)
