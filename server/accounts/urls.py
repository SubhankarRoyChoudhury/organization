from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CurrentUserAPIView,
    LoginAPIView,
    LogoutAPIView,
    OrganizationInfoAPIView,
    OrganizationEmailOtpAPIView,
    OrganizationEmailOtpVerifyAPIView,
    OrganizationInviteAPIView,
    OrganizationListCreateAPIView,
    OrganizationProvisionAPIView,
    OrganizationDetailAPIView,
    SchoolLoginRouteAPIView,
    OrganizationUserDetailAPIView,
    OrganizationUserListAPIView,
    RegisterAPIView,
    changeOrganizationUserImage,
    updateOrganizationUserProfile,
    
)

urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="register"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("current-user/", CurrentUserAPIView.as_view(), name="current-user"),
    path("organizations/email-otp/", OrganizationEmailOtpAPIView.as_view(), name="organization-email-otp"),
    path("organizations/email-otp/verify/", OrganizationEmailOtpVerifyAPIView.as_view(), name="organization-email-otp-verify"),
    path("organizations/invite/", OrganizationInviteAPIView.as_view(), name="organization-invite"),
    path("school-login-route/", SchoolLoginRouteAPIView.as_view(), name="school-login-route"),
    path("organization-info/", OrganizationInfoAPIView.as_view(), name="organization-info"),
    path("organizations/provision/", OrganizationProvisionAPIView.as_view(), name="organization-provision"),
    path("organizations/", OrganizationListCreateAPIView.as_view(), name="organization-list-create"),
    path("organizations/<int:pk>/", OrganizationDetailAPIView.as_view(), name="organization-detail"),
    path(
        "organization-users/",
        OrganizationUserListAPIView.as_view(),
        name="organization-user-list",
    ),
    path(
        "organization-users/profile/",
        updateOrganizationUserProfile,
        name="organization-user-profile",
    ),
    path(
        "organization-users/change-image/",
        changeOrganizationUserImage,
        name="organization-user-change-image",
    ),
    path(
        "organization-users/<str:username>/",
        OrganizationUserDetailAPIView.as_view(),
        name="organization-user-detail",
    ),
]
