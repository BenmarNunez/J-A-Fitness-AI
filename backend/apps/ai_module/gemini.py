import json
import re
from google import genai
from google.genai import types
from django.conf import settings

_client = genai.Client(api_key=settings.GEMINI_API_KEY)
_MODEL = 'gemini-2.5-flash'

_FITNESS_PROMPT = """
You are a certified personal trainer. Generate a personalized weekly workout plan in JSON format only.

User profile:
- Age: {age} years
- Weight: {weight_kg} kg
- Height: {height_cm} cm
- Gender: {gender}
- Goal: {fitness_goal}
- Activity level: {activity_level}
- BMI: {bmi}
- BMR: {bmr} kcal/day

Return ONLY valid JSON with this structure:
{{
  "goal": "string",
  "weekly_schedule": {{
    "monday": [{{"exercise": "name", "sets": 3, "reps": 10, "rest_seconds": 60}}],
    "tuesday": "rest",
    "wednesday": [],
    "thursday": "rest",
    "friday": [],
    "saturday": "rest",
    "sunday": "rest"
  }},
  "notes": "string",
  "estimated_weekly_calories_burned": 0
}}
"""

_NUTRITION_PROMPT = """
You are a registered nutritionist. Generate a personalized daily meal plan in JSON format only.

User profile:
- Age: {age} years
- Weight: {weight_kg} kg
- Height: {height_cm} cm
- Gender: {gender}
- Goal: {fitness_goal}
- Activity level: {activity_level}
- BMI: {bmi}
- BMR: {bmr} kcal/day

Return ONLY valid JSON with this structure:
{{
  "calories": 0,
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0,
  "meals": {{
    "breakfast": [{{"food": "name", "portion": "amount", "calories": 0}}],
    "lunch": [],
    "dinner": [],
    "snacks": []
  }},
  "hydration_ml": 0,
  "notes": "string"
}}
"""


def _parse_json_response(text: str):
    if not text or any(text.lower().startswith(p) for p in ('sorry', 'i cannot', 'as an ai')):
        return None
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None


def generate_fitness_plan(*, age, weight_kg, height_cm, gender, fitness_goal, activity_level, bmr, bmi):
    prompt = _FITNESS_PROMPT.format(
        age=age, weight_kg=weight_kg, height_cm=height_cm, gender=gender,
        fitness_goal=fitness_goal, activity_level=activity_level, bmr=bmr, bmi=bmi,
    )
    response = _client.models.generate_content(model=_MODEL, contents=prompt)
    return _parse_json_response(response.text)


def generate_nutrition_plan(*, age, weight_kg, height_cm, gender, fitness_goal, activity_level, bmr, bmi):
    prompt = _NUTRITION_PROMPT.format(
        age=age, weight_kg=weight_kg, height_cm=height_cm, gender=gender,
        fitness_goal=fitness_goal, activity_level=activity_level, bmr=bmr, bmi=bmi,
    )
    response = _client.models.generate_content(model=_MODEL, contents=prompt)
    return _parse_json_response(response.text)


def analyze_food_image(image_bytes: bytes, mime_type: str = 'image/jpeg'):
    prompt = """Analyze this food image and return ONLY valid JSON:
{
  "foods_detected": [{"name": "string", "portion_estimate": "string", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}],
  "total_calories": 0,
  "total_protein_g": 0,
  "total_carbs_g": 0,
  "total_fat_g": 0,
  "confidence": "low"
}"""
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    response = _client.models.generate_content(model=_MODEL, contents=[prompt, image_part])
    return _parse_json_response(response.text)
