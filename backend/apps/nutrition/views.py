from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from apps.ai_module.gemini import generate_nutrition_plan, analyze_food_image
from .models import NutritionPlan, FoodScan
from .serializers import NutritionPlanSerializer, FoodScanSerializer


class GenerateNutritionView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        profile = request.user.profile
        if not all([profile.age, profile.weight_kg, profile.height_cm, profile.gender]):
            return Response(
                {'detail': 'Complete your profile before generating a nutrition plan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        plan_data = generate_nutrition_plan(
            age=profile.age, weight_kg=profile.weight_kg, height_cm=profile.height_cm,
            gender=profile.gender, fitness_goal=profile.fitness_goal or 'maintain',
            activity_level=profile.activity_level or 'moderate',
            bmr=profile.bmr or 0, bmi=profile.bmi or 0,
            body_build=profile.body_build or 'medium',
        )
        if not plan_data:
            return Response({'detail': 'AI nutrition plan generation failed. Try again.'}, status=status.HTTP_400_BAD_REQUEST)
        plan = NutritionPlan.objects.create(
            user=request.user,
            content=plan_data,
            calories=plan_data.get('calories'),
            protein_g=plan_data.get('protein_g'),
            carbs_g=plan_data.get('carbs_g'),
            fat_g=plan_data.get('fat_g'),
        )
        return Response(NutritionPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


class FoodScanView(APIView):
    permission_classes = [IsActiveMember]

    def post(self, request):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'detail': 'image file required.'}, status=status.HTTP_400_BAD_REQUEST)
        image_bytes = image_file.read()
        mime_type = image_file.content_type or 'image/jpeg'
        analysis = analyze_food_image(image_bytes, mime_type)
        if not analysis:
            return Response({'detail': 'Could not analyze image. Try a clearer photo.'}, status=status.HTTP_400_BAD_REQUEST)
        scan = FoodScan.objects.create(user=request.user, image=image_file, analysis=analysis)
        return Response(FoodScanSerializer(scan).data, status=status.HTTP_201_CREATED)


class NutritionPlanListView(APIView):
    permission_classes = [IsActiveMember]

    def get(self, request):
        plans = NutritionPlan.objects.filter(user=request.user)
        return Response(NutritionPlanSerializer(plans, many=True).data)
