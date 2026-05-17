from django.contrib import admin
from .models import FitnessPlan, WorkoutLog, WorkoutSet, BodyMetric

admin.site.register(FitnessPlan)
admin.site.register(WorkoutLog)
admin.site.register(BodyMetric)
