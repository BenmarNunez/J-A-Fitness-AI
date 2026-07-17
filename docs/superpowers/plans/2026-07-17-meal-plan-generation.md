# Meal Plan Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user generates a fitness plan, automatically generate a complementary Filipino meal plan alongside it, scaled to the workout's weekly frequency and estimated calorie burn.

**Architecture:** `generate_nutrition_plan` (in `apps/ai_module/gemini.py`) gains two optional context parameters — workout days/week and estimated weekly calories burned — folded into its existing prompt. `GenerateFitnessPlanView.post` (in `apps/fitness/views.py`) derives those two numbers from the fitness plan it just generated, calls `generate_nutrition_plan` with them, and returns both plans in one response. The standalone nutrition-generation endpoint/button is untouched.

**Tech Stack:** Django 5 + DRF, `google-genai` (existing Gemini wrapper), React 19 (frontend, manual browser verification — no frontend test runner in this repo).

---

### Task 1: Backend — extend the nutrition prompt with training context

**Files:**
- Modify: `backend/apps/ai_module/gemini.py`
- Test: `backend/apps/ai_module/tests/test_gemini.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/apps/ai_module/tests/test_gemini.py`:

```python
def test_generate_nutrition_plan_includes_training_context_in_prompt():
    mock_response = MagicMock()
    mock_response.text = '{"calories": 2200, "protein_g": 160, "carbs_g": 220, "fat_g": 70, "meals": {}, "hydration_ml": 2500, "notes": "good"}'
    with patch('apps.ai_module.gemini._client') as mock_client:
        mock_client.models.generate_content.return_value = mock_response
        result = generate_nutrition_plan(
            age=25, weight_kg=70, height_cm=175, gender='male',
            fitness_goal='build_muscle', bmr=1668.75, bmi=22.86,
            activity_level='moderate',
            workout_days_per_week=4,
            estimated_weekly_calories_burned=1500,
        )
    assert isinstance(result, dict)
    assert result['calories'] == 2200
    call_kwargs = mock_client.models.generate_content.call_args.kwargs
    assert 'workout days per week: 4' in call_kwargs['contents'].lower()
    assert 'estimated weekly calories burned from training: 1500' in call_kwargs['contents'].lower()


def test_generate_nutrition_plan_works_without_training_context():
    mock_response = MagicMock()
    mock_response.text = '{"calories": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 60, "meals": {}, "hydration_ml": 2500, "notes": "good"}'
    with patch('apps.ai_module.gemini._client') as mock_client:
        mock_client.models.generate_content.return_value = mock_response
        result = generate_nutrition_plan(
            age=25, weight_kg=70, height_cm=175, gender='male',
            fitness_goal='build_muscle', bmr=1668.75, bmi=22.86,
            activity_level='moderate',
        )
    assert isinstance(result, dict)
```

Note: these two new tests patch `apps.ai_module.gemini._client` (the actual client object used by the current `google-genai` SDK integration), matching how `generate_nutrition_plan` calls `_client.models.generate_content(...)` today. This differs from the two pre-existing tests in this file, which patch a `_model` attribute that doesn't exist in the current source — those two are already broken independent of this plan and are out of scope here; do not "fix" them as part of this task.

- [ ] **Step 2: Run the new tests to verify they fail**

Run (from `backend/`): `py -m pytest apps/ai_module/tests/test_gemini.py -k training_context -v`
Expected: FAIL — `TypeError: generate_nutrition_plan() got an unexpected keyword argument 'workout_days_per_week'`.

- [ ] **Step 3: Update the prompt template and function signature**

In `backend/apps/ai_module/gemini.py`, replace `_NUTRITION_PROMPT` (lines 60-96) with:

```python
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

Training context:
- Workout days per week: {workout_days_per_week}
- Estimated weekly calories burned from training: {estimated_weekly_calories_burned}
Scale the daily calorie target and macro breakdown to match this training intensity: more workout days or a higher estimated burn should raise the calorie target and protein needs; fewer workout days should lean toward maintenance or a deficit depending on the goal.

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
```

Replace the `generate_nutrition_plan` function (lines 121-128) with:

```python
def generate_nutrition_plan(*, age, weight_kg, height_cm, gender, fitness_goal, activity_level, bmr, bmi,
                             body_build='medium', workout_days_per_week=None, estimated_weekly_calories_burned=None):
    prompt = _NUTRITION_PROMPT.format(
        age=age, weight_kg=weight_kg, height_cm=height_cm, gender=gender,
        fitness_goal=fitness_goal, activity_level=activity_level, bmr=bmr, bmi=bmi,
        body_build=body_build or 'medium',
        workout_days_per_week=workout_days_per_week if workout_days_per_week is not None else 'unknown',
        estimated_weekly_calories_burned=(
            estimated_weekly_calories_burned if estimated_weekly_calories_burned is not None else 'unknown'
        ),
    )
    response = _client.models.generate_content(model=_MODEL, contents=prompt)
    return _parse_json_response(response.text)
```

- [ ] **Step 4: Run the new tests to verify they pass**

Run (from `backend/`): `py -m pytest apps/ai_module/tests/test_gemini.py -k "training_context or without_training_context" -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/ai_module/gemini.py backend/apps/ai_module/tests/test_gemini.py
git commit -m "feat: scale nutrition prompt to workout frequency and estimated burn"
```

---

### Task 2: Backend — combine fitness and nutrition generation

**Files:**
- Modify: `backend/apps/fitness/views.py`
- Test: `backend/apps/fitness/tests/test_fitness.py`

- [ ] **Step 1: Write the failing tests**

Check whether `backend/apps/fitness/tests/test_fitness.py` already defines `api_client` and `auth_client` fixtures (grep for `def api_client`). If not present yet, append this block first:

```python
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, active_user):
    token, _ = Token.objects.get_or_create(user=active_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return api_client
```

Then append (regardless of whether the block above was needed):

```python
from unittest.mock import patch


@pytest.mark.django_db
@patch('apps.fitness.views.generate_nutrition_plan')
@patch('apps.fitness.views.generate_fitness_plan')
def test_generate_fitness_plan_also_creates_nutrition_plan(mock_fitness, mock_nutrition, auth_client, active_user):
    active_user.profile.age = 25
    active_user.profile.weight_kg = 70
    active_user.profile.height_cm = 175
    active_user.profile.gender = 'male'
    active_user.profile.save()
    mock_fitness.return_value = {
        'goal': 'maintain',
        'weekly_schedule': {
            'monday': [{'exercise': 'Squat', 'sets': 3, 'reps': 10}],
            'tuesday': 'rest',
        },
        'estimated_weekly_calories_burned': 1200,
    }
    mock_nutrition.return_value = {
        'calories': 2200, 'protein_g': 160, 'carbs_g': 220, 'fat_g': 70,
        'meals': {'breakfast': [], 'lunch': [], 'dinner': [], 'snacks': []},
    }

    response = auth_client.post('/api/fitness/generate/')

    assert response.status_code == 201
    assert response.data['fitness_plan']['goal'] == 'maintain'
    assert response.data['nutrition_plan']['calories'] == 2200
    mock_nutrition.assert_called_once()
    call_kwargs = mock_nutrition.call_args.kwargs
    assert call_kwargs['workout_days_per_week'] == 1
    assert call_kwargs['estimated_weekly_calories_burned'] == 1200


@pytest.mark.django_db
@patch('apps.fitness.views.generate_nutrition_plan')
@patch('apps.fitness.views.generate_fitness_plan')
def test_fitness_plan_succeeds_even_if_nutrition_generation_fails(mock_fitness, mock_nutrition, auth_client, active_user):
    active_user.profile.age = 25
    active_user.profile.weight_kg = 70
    active_user.profile.height_cm = 175
    active_user.profile.gender = 'male'
    active_user.profile.save()
    mock_fitness.return_value = {
        'goal': 'maintain', 'weekly_schedule': {'monday': []}, 'estimated_weekly_calories_burned': 0,
    }
    mock_nutrition.return_value = None

    response = auth_client.post('/api/fitness/generate/')

    assert response.status_code == 201
    assert response.data['fitness_plan']['goal'] == 'maintain'
    assert response.data['nutrition_plan'] is None
    assert 'nutrition_error' in response.data
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `py -m pytest apps/fitness/tests/test_fitness.py -k nutrition -v`
Expected: FAIL — `KeyError: 'fitness_plan'` (the response is still the flat `FitnessPlanSerializer` shape).

- [ ] **Step 3: Rewrite the view**

In `backend/apps/fitness/views.py`, update the imports at the top. Replace lines 4-7 with:

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.permissions import IsActiveMember
from apps.ai_module.gemini import generate_fitness_plan, generate_rest_day_plan, generate_nutrition_plan
from apps.nutrition.models import NutritionPlan
from apps.nutrition.serializers import NutritionPlanSerializer
from .models import FitnessPlan, WorkoutLog, WorkoutSet, BodyMetric, RestDay
from .serializers import FitnessPlanSerializer, WorkoutLogSerializer, WorkoutSetSerializer, BodyMetricSerializer, RestDaySerializer
```

(If the Email Notifications plan has already run, it will have added `from apps.users.emails import send_plan_update_email` to this import block and a `WorkoutSetSerializer`/`WorkoutSet` import from the Workout Auto-Log plan — keep any such existing import lines alongside the ones above rather than removing them.)

Replace the entire `GenerateFitnessPlanView` class (originally lines 10-43) with:

```python
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
```

If the Email Notifications plan has already run, that plan added a `send_plan_update_email(request.user, 'fitness')` call right after the `FitnessPlan.objects.create(...)` block, and a second `send_plan_update_email(request.user, 'nutrition')` call right after the `NutritionPlan.objects.create(...)` block. When merging, re-add both calls at those same two positions in the rewritten method above (right after each `.objects.create(...)` call) — this plan's tests do not depend on them, but removing them would silently regress the Email Notifications feature.

- [ ] **Step 4: Run tests to verify they pass**

Run (from `backend/`): `py -m pytest apps/fitness/tests/test_fitness.py -v`
Expected: PASS — all tests in the file, including the two new ones and any pre-existing ones.

- [ ] **Step 5: Run the full backend suite to check for regressions**

Run (from `backend/`): `py -m pytest -v`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/fitness/views.py backend/apps/fitness/tests/test_fitness.py
git commit -m "feat: generate a complementary meal plan alongside fitness plan"
```

---

### Task 3: Frontend — surface the combined response

**Files:**
- Modify: `frontend/src/pages/FitnessPlan.jsx`

- [ ] **Step 1: Update imports and state**

In `frontend/src/pages/FitnessPlan.jsx`, add the import (after line 5, `import useFitnessStore from '../store/fitnessStore'`):

```javascript
import useNutritionStore from '../store/nutritionStore'
```

Update line 111 to also pull in the nutrition store setter:

```javascript
  const { activePlan, setPlans } = useFitnessStore()
  const { plans: nutritionPlans, setPlans: setNutritionPlans } = useNutritionStore()
```

Add state after line 121 (`const [restDaySuccess, setRestDaySuccess] = useState(false)`):

```javascript
  const [mealPlanReady, setMealPlanReady] = useState(false)
```

- [ ] **Step 2: Update handleGenerate**

Replace `handleGenerate` (lines 147-155):

```javascript
  const handleGenerate = async () => {
    setGenerating(true); setError('')
    try {
      const { data } = await api.post('/api/fitness/generate/')
      setPlans([data.fitness_plan])
      if (data.nutrition_plan) {
        setNutritionPlans([data.nutrition_plan, ...nutritionPlans])
        setMealPlanReady(true)
        setTimeout(() => setMealPlanReady(false), 6000)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed. Complete your profile first.')
    } finally { setGenerating(false) }
  }
```

- [ ] **Step 3: Add the meal-plan-ready toast**

Add this block near the other toast (after the `restDaySuccess` block, originally lines 393-397):

```jsx
      {mealPlanReady && (
        <div
          className="fixed bottom-6 right-24 bg-primary text-bg px-4 py-3 rounded-xl shadow-lg animate-fade-up z-50 border border-primary/20 cursor-pointer"
          onClick={() => navigate('/nutrition')}
        >
          <p className="text-sm font-medium">🥗 Meal plan generated too — tap to view →</p>
        </div>
      )}
```

- [ ] **Step 4: Manual verification**

1. Start both servers, log in as an active member with a complete profile (age/weight/height/gender).
2. Go to `/fitness-plan`, click "Generate Plan".
3. Confirm the fitness plan renders as before, and the green "Meal plan generated too" toast appears bottom-right.
4. Click the toast (or navigate to `/nutrition` manually) and confirm a fresh meal plan is shown with calories/macros/meals populated.
5. Independently, on `/nutrition`, click its own "Meal Plan" button and confirm standalone regeneration still works unaffected.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/FitnessPlan.jsx
git commit -m "feat: show generated meal plan link after fitness plan generation"
```

---

### Task 4: Full verification and push

- [ ] **Step 1: Run the full backend test suite**

Run (from `backend/`): `py -m pytest -v`
Expected: all tests pass.

- [ ] **Step 2: Live walkthrough**

Repeat Task 3 Step 4's manual verification end-to-end once more, watching the Network tab to confirm `POST /api/fitness/generate/` returns both `fitness_plan` and `nutrition_plan` in a single response, and that no duplicate `POST /api/nutrition/generate/` call fires automatically.

- [ ] **Step 3: Push**

```bash
git push
```
