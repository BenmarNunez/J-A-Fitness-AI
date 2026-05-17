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
