from django.urls import path

from . import legacy_frontend_views


urlpatterns = [
    path("getCurrentUser/", legacy_frontend_views.legacy_get_current_user),
    path(
        "getCompanyUserDetailsbyusername/<str:username>/",
        legacy_frontend_views.legacy_company_user_details_by_username,
    ),
    path(
        "getAllActiveCompanyUser/",
        legacy_frontend_views.legacy_get_all_active_company_users,
    ),
    path(
        "getAppAccessMatrix/<str:access_for>/<str:id>/",
        legacy_frontend_views.legacy_get_app_access_matrix,
    ),
    path(
        "updateAppAccessControl/",
        legacy_frontend_views.legacy_update_app_access_control,
    ),
]
