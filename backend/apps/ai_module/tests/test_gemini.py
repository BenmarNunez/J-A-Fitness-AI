import pytest
from unittest.mock import patch, MagicMock
from apps.ai_module.gemini import generate_fitness_plan, generate_nutrition_plan


def test_generate_fitness_plan_returns_dict():
    mock_response = MagicMock()
    mock_response.text = '{"weekly_schedule": {"mon": "chest day"}, "goal": "build_muscle", "notes": "good", "estimated_weekly_calories_burned": 1200}'
    with patch('apps.ai_module.gemini._model') as mock_model:
        mock_model.generate_content.return_value = mock_response
        result = generate_fitness_plan(
            age=25, weight_kg=70, height_cm=175, gender='male',
            fitness_goal='build_muscle', activity_level='moderate',
            bmr=1668.75, bmi=22.86,
        )
    assert isinstance(result, dict)
    assert 'weekly_schedule' in result


def test_generate_fitness_plan_handles_invalid_json():
    mock_response = MagicMock()
    mock_response.text = 'Sorry, I cannot help with that.'
    with patch('apps.ai_module.gemini._model') as mock_model:
        mock_model.generate_content.return_value = mock_response
        result = generate_fitness_plan(
            age=25, weight_kg=70, height_cm=175, gender='male',
            fitness_goal='build_muscle', activity_level='moderate',
            bmr=1668.75, bmi=22.86,
        )
    assert result is None


def test_generate_nutrition_plan_returns_dict():
    mock_response = MagicMock()
    mock_response.text = '{"calories": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 60, "meals": {}, "hydration_ml": 2500, "notes": "good"}'
    with patch('apps.ai_module.gemini._model') as mock_model:
        mock_model.generate_content.return_value = mock_response
        result = generate_nutrition_plan(
            age=25, weight_kg=70, height_cm=175, gender='male',
            fitness_goal='build_muscle', bmr=1668.75, bmi=22.86,
            activity_level='moderate',
        )
    assert isinstance(result, dict)
    assert 'calories' in result


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


def test_generate_nutrition_plan_omits_training_context_section_when_not_provided():
    mock_response = MagicMock()
    mock_response.text = '{"calories": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 60, "meals": {}, "hydration_ml": 2500, "notes": "good"}'
    with patch('apps.ai_module.gemini._client') as mock_client:
        mock_client.models.generate_content.return_value = mock_response
        generate_nutrition_plan(
            age=25, weight_kg=70, height_cm=175, gender='male',
            fitness_goal='build_muscle', bmr=1668.75, bmi=22.86,
            activity_level='moderate',
        )
    call_kwargs = mock_client.models.generate_content.call_args.kwargs
    assert 'training context' not in call_kwargs['contents'].lower()
    assert 'unknown' not in call_kwargs['contents'].lower()
