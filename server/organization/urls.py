"""
URL configuration for organization project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import path, include
from django.urls import re_path
from functools import partial
from django.contrib.staticfiles.views import serve

urlpatterns = [
     path("api/admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/account/", include("company_account.api_urls")),
    path("api/account/", include("company_account.legacy_frontend_urls")),
    path("api/hospital_accounts/", include("company_account.legacy_auth_urls")),
    path("api/hospital_management/", include("hospital_management.urls")),
    path("api/shared_api/", include("shared.location_urls")),
    path("api/school-management/", include("school_management.urls")),

    re_path(r"^api/static/(?P<path>.*)$", partial(serve, insecure=True)),
]
# Serve Django/staticfiles assets (including admin CSS/JS) in development.
urlpatterns += staticfiles_urlpatterns()
