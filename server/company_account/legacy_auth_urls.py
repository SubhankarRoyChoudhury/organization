from django.urls import path

from . import legacy_frontend_views


urlpatterns = [
    path("user_info/", legacy_frontend_views.legacy_user_info),
    path("o/token/", legacy_frontend_views.legacy_token_login),
    path("logout/", legacy_frontend_views.legacy_logout),
    path(
        "doctor-companies/<str:username>",
        legacy_frontend_views.legacy_doctor_companies,
    ),
]
