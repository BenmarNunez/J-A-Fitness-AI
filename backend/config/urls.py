from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/profile/', include('apps.users.profile_urls')),
    path('api/admin/', include('apps.users.admin_urls')),
    path('api/fitness/', include('apps.fitness.urls')),
    path('api/nutrition/', include('apps.nutrition.urls')),
    path('api/ai/', include('apps.ai_module.urls')),
    path('api/equipment/', include('apps.equipment.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
