from django.urls import path

from . import api_views
from . import views


urlpatterns = [
    path("companies/create/", api_views.create_company_account, name="company-account-create"),
    path("approveCompany/", views.approveCompany, name="approve-company"),
    path("delistCompany/", views.delistCompany, name="delist-company"),
    path(
        "sendResetPasswordMail/",
        views.sendResetPasswordMail,
        name="send-reset-password-mail",
    ),
    path(
        "checkResetPasswordToken/",
        views.checkResetPasswordToken,
        name="check-reset-password-token",
    ),
    path(
        "resetUserPassword/",
        views.resetUserPassword,
        name="reset-user-password",
    ),
    path("changeUserImage/", views.changeUserImage, name="change-user-image"),
    path("updateCompanyUserProfile/", views.updateCompanyUserProfile, name="update-company-user-profile"),
    path("getAllCompanies/", views.getAllCompanies, name="get-all-companies"),
    path(
        "organizations/companies/summary/",
        views.organization_company_summary,
        name="organization-company-summary",
    ),
    path(
        "organizations/companies/schools/",
        views.organization_school_list,
        name="organization-school-list",
    ),
    path(
        "organizations/companies/hospitals/",
        views.organization_hospital_list,
        name="organization-hospital-list",
    ),
    path(
        "companies/profit-loss-summary/",
        api_views.companies_profit_loss_summary,
        name="companies-profit-loss-summary",
    ),
    path("analytics/", views.activity_summary, name="activity-summary"),
    path(
        "company_total_usage/<int:id>/",
        views.company_total_usage,
        name="company-total-usage",
    ),
    path(
        "organization_total_usage/<int:id>/",
        views.organization_total_usage,
        name="organization-total-usage",
    ),
    path("legacy/current-user/", api_views.legacy_current_user, name="legacy-current-user"),
    path("legacy/company-info/", api_views.legacy_company_info, name="legacy-company-info"),
    path(
        "legacy/company-info/update/",
        api_views.legacy_update_company_info,
        name="legacy-company-info-update",
    ),
    path(
        "legacy/company-users/<str:username>/",
        api_views.legacy_company_user_by_username,
        name="legacy-company-user-by-username",
    ),
    path(
        "legacy/companies/<str:username>/",
        api_views.legacy_company_by_username,
        name="legacy-company-by-username",
    ),
    path(
        "companies/school-info/",
        api_views.current_school_info,
        name="company-school-info",
    ),
    path(
        "companies/teacher-count/",
        api_views.company_teacher_count,
        name="company-teacher-count",
    ),
    path(
        "companies/student-count/",
        api_views.company_student_count,
        name="company-student-count",
    ),
]
