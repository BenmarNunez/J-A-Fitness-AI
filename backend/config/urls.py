from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/profile/', include('apps.users.profile_urls')),
    path('api/admin/', include('apps.users.admin_urls')),
]
