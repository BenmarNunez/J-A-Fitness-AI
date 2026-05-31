import json
import re
from google import genai
from google.genai import types
from django.conf import settings

_client = genai.Client(api_key=settings.GEMINI_API_KEY)
_MODEL = 'gemini-2.5-flash'

# ── #3 Exercise Guide + Weight Suggestion + #3.1 Safety Warning ───────────────
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
- Body build (camera scan): {body_build}
  * Light build → emphasize compound lifts, progressive overload, slightly higher volume to build mass
  * Medium build → balanced strength + conditioning program
  * Heavy build → prioritize fat-burning cardio intervals, bodyweight/moderate weights, full-body circuits

SAFETY RULES:
- For heavy compound lifts (bench press, squat, deadlift, overhead press), set needs_spotter to true.
- suggested_weight_kg should be appropriate for a beginner-intermediate at this user's body weight.
- instructions should be 1-2 sentences on proper form.

Return ONLY valid JSON with this structure:
{{
  "goal": "string",
  "safety_note": "Always warm up for 5-10 minutes. Use a spotter or safety bars for heavy lifts. Stop immediately if you feel sharp pain.",
  "weekly_schedule": {{
    "monday": [{{
      "exercise": "name",
      "sets": 3,
      "reps": 10,
      "rest_seconds": 60,
      "suggested_weight_kg": 20,
      "instructions": "Brief form cue for this exercise.",
      "needs_spotter": false
    }}],
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

# ── #2 Pinoy Meal Plan ────────────────────────────────────────────────────────
_NUTRITION_PROMPT = """
You are a registered nutritionist specializing in Filipino cuisine. Generate a personalized daily meal plan using traditional Filipino foods.

User profile:
- Age: {age} years
- Weight: {weight_kg} kg
- Height: {height_cm} cm
- Gender: {gender}
- Goal: {fitness_goal}
- Activity level: {activity_level}
- BMI: {bmi}
- BMR: {bmr} kcal/day
- Body build (camera scan): {body_build}
  * Light build → higher protein, slight caloric surplus, 5-6 smaller meals
  * Medium build → balanced macros, 3 main meals + 2 snacks
  * Heavy build → caloric deficit, high protein, low simple carbs, more vegetables

Use authentic Filipino foods such as: kanin (steamed rice), bangus (milkfish), tilapia, tinola, sinigang, adobo (chicken/pork), monggo soup, ensaladang talong, ampalaya, kamote, taho, pandesal, lugaw, champorado, pinakbet, paksiw, grilled liempo, itlog (egg), tokwa (tofu), pechay, kangkong, sayote, ube, calamansi juice, buko (coconut water), etc.

Prioritize locally available, affordable Filipino ingredients. Balance macros while keeping meals culturally appropriate.

Return ONLY valid JSON with this structure:
{{
  "calories": 0,
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0,
  "meals": {{
    "breakfast": [{{"food": "Filipino food name", "portion": "amount in Filipino serving sizes", "calories": 0}}],
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


def generate_fitness_plan(*, age, weight_kg, height_cm, gender, fitness_goal, activity_level, bmr, bmi, body_build='medium'):
    prompt = _FITNESS_PROMPT.format(
        age=age, weight_kg=weight_kg, height_cm=height_cm, gender=gender,
        fitness_goal=fitness_goal, activity_level=activity_level, bmr=bmr, bmi=bmi,
        body_build=body_build or 'medium',
    )
    response = _client.models.generate_content(model=_MODEL, contents=prompt)
    return _parse_json_response(response.text)


def generate_nutrition_plan(*, age, weight_kg, height_cm, gender, fitness_goal, activity_level, bmr, bmi, body_build='medium'):
    prompt = _NUTRITION_PROMPT.format(
        age=age, weight_kg=weight_kg, height_cm=height_cm, gender=gender,
        fitness_goal=fitness_goal, activity_level=activity_level, bmr=bmr, bmi=bmi,
        body_build=body_build or 'medium',
    )
    response = _client.models.generate_content(model=_MODEL, contents=prompt)
    return _parse_json_response(response.text)


def generate_rest_day_plan(*, age, weight_kg, height_cm, gender, fitness_goal, activity_level, bmr, bmi, body_build='medium', reason='General recovery'):
    prompt = _FITNESS_PROMPT.format(
        age=age, weight_kg=weight_kg, height_cm=height_cm, gender=gender,
        fitness_goal=fitness_goal, activity_level=activity_level, bmr=bmr, bmi=bmi,
        body_build=body_build or 'medium',
    )
    rest_day_context = f"\n\nIMPORTANT: The user requested a rest day today due to: {reason}. Generate a modified exercise plan that resumes tomorrow with lighter intensity or active recovery exercises."
    prompt += rest_day_context

    response = _client.models.generate_content(model=_MODEL, contents=prompt)
    return _parse_json_response(response.text)


def analyze_food_image(image_bytes: bytes, mime_type: str = 'image/jpeg'):
    prompt = """Analyze this food image and return ONLY valid JSON. Focus on Filipino foods if present.
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
