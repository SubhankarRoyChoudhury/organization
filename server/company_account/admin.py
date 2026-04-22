from django.contrib import admin
from accounts.models import Organization
from .models import AllWebUrls, Api, AppAccessControl, BusinessType, CompanyUser, Companies, CompanyInfo, Owners, StatutoryRegister, TableConfig, UrlBasedAccessControl, UserConfig, Application, UserGroup, UserRight, WebUrl, ActivityLog

# Register your models here.
# allModels = [CompanyInfo]


class TableConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'table_name', 'username', 'config']


admin.site.register(TableConfig, TableConfigAdmin)


class UserConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'dashboard']


admin.site.register(UserConfig, UserConfigAdmin)


class CompanyInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_id', 'company_logo_id', 'country', 'company_name', 'head_office_gstin',
                    'currency_code', 'date_format', 'language',
                    'address', 'country', 'head_office_state', 'city', 'pin', 'admin_name', 'mobile_no', 'email',  'comments', 'branch_offices']

    search_fields = ['id', 'company__id', 'company_logo_id', 'country', 'company_name', 'head_office_state', 'currency_code', 'date_format', 'language',
                     'address', 'city', 'pin', 'admin_name', 'head_office_gstin', 'mobile_no', 'email',  'comments', 'branch_offices']


admin.site.register(CompanyInfo, CompanyInfoAdmin)


class OwnersAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_id', 'Name', 'Designation',
                    'otherid', 'primary_admin', 'Pan', 'created_by', 'created_on',]

    search_fields = ['id', 'company_id', 'Name', 'Designation',
                     'otherid', 'primary_admin', 'Pan', 'created_by', 'created_on',]


admin.site.register(Owners, OwnersAdmin)


class StatutoryRegisterAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_id',  'since', 'renewal_date',
                    'renewed_type', 'note', 'registration_no', 'desc', 'attachment_id']

    search_fields = ['id', 'company_id',  'since', 'renewal_date',
                     'renewed_type', 'note', 'registration_no', 'desc', 'attachment_id']


admin.site.register(StatutoryRegister, StatutoryRegisterAdmin)


class CompanyUserAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_id', 'name', 'role', 'doctor_type', 'department', 'administration_type', 'job_title', 'staff_department', 'staff_job_title', 'medical_council_registration', 'main_subject', 'others_subject', 'preferableClass', 'is_head_master', 'is_approve', 'created_by', 'fatherOrHusband', 'aliasName', 'username', 'email', 'mobile', 'image_url', 'attachment_id', 'subscription_id', 'firstLoggedIn',
                    'registrationDate', 'is_superuser', 'is_admin', 'is_active', 'can_access', 'is_staff', 'is_owner', 'is_manager', 'is_assistant', 'is_verified', 'is_mobile_verified', 'about', 'address', "is_googleuser", 'excellency_point', 'app_wise_home_pages', 'password_reset_link_sent_at']
    search_fields = ['id', 'company__id' 'name', 'role', 'medical_council_registration', 'main_subject', 'others_subject', 'preferableClass', 'fatherOrHusband', 'aliasName', 'username', 'email', 'mobile', 'image_url', 'attachment_id',
                     'registrationDate', 'is_superuser', 'is_admin', 'is_active', 'is_staff', 'is_owner', 'is_manager', 'is_assistant', 'excellency_point', 'app_wise_home_pages', 'password_reset_link_sent_at']

    list_filter = ['company_id']


admin.site.register(CompanyUser, CompanyUserAdmin)


class CompaniesAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'company_id',
        'organization_id',
        'organization_name',
        'company_name',
        'username',
        'email',
        'admin_name',
        'registrationDate',
        'main_group',
        'sub_group',
        'school_category',
        'is_approved',
        'active_from',
        'active_upto',
        'is_new',
        'subscription_plan',
        # 'gtm',
        'project_mgmt',
        'hrm',
        'billing',
        'account',
        'statutory',
        'asset',
        'inventry',
        'inventory_lite',
        'time_schedule',
        'crm',
        'hotel',
        'production',
        'class_planner',
        # "logo_id_while_create"
    ]

    search_fields = [
        'id',
        'company_id',
        'organization_id',
        'company_name',
        'username',
        'email',
        'admin_name',
    ]

    @admin.display(description="Organization ID")
    def organization_id(self, obj):
        return obj.organization_id or "-"

    @admin.display(description="Organization Name")
    def organization_name(self, obj):
        organization_id = str(obj.organization_id or "").strip()
        if not organization_id:
            return "-"

        organization = Organization.objects.filter(
            id=organization_id).only("name").first()
        return organization.name if organization else "-"


admin.site.register(Companies, CompaniesAdmin)


class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'url', 'color', 'icon']
    search_fields = ['id', 'name', 'url', 'color', 'icon']


admin.site.register(Application, ApplicationAdmin)


class UserRightAdmin(admin.ModelAdmin):
    list_display = ['id', 'app_id', 'user_id',
                    'can_visit', 'can_edit', 'can_view_report']
    search_fields = ['id', 'app__id', 'user__id',
                     'can_visit', 'can_edit', 'can_view_report']


admin.site.register(UserRight, UserRightAdmin)


class WebUrlAdmin(admin.ModelAdmin):
    list_display = ['id', 'app_id', 'url']
    search_fields = ['id', 'app__id', 'url']


admin.site.register(WebUrl, WebUrlAdmin)


class UrlBasedAccessControlAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'user', 'user_group',
                    'weburl', 'access', 'add', 'edit', 'delete', 'print_download']
    search_fields = ['id', 'company__id', 'user__id', 'user_group__id',
                     'weburl', 'access', 'add', 'edit', 'delete', 'print_download']


admin.site.register(UrlBasedAccessControl, UrlBasedAccessControlAdmin)


class AppAccessControlAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'company',
        'application',
        'user',
        'group',
        'can_access',
        'can_add',
        'can_edit',
        'can_delete',
        'can_print',
    ]
    search_fields = [
        'id',
        'company__id',
        'application__id',
        'user__id',
        'group__id',
        'can_access',
        'can_add',
        'can_edit',
        'can_delete',
        'can_print',
    ]


admin.site.register(AppAccessControl, AppAccessControlAdmin)


class ApiAdmin(admin.ModelAdmin):
    list_display = ['id', 'weburl', 'api']
    search_fields = ['id', 'weburl__id', 'api']


admin.site.register(Api, ApiAdmin)


class UserGroupAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'name', 'user_ids', 'app_wise_home_pages']
    search_fields = ['id', 'company__id', 'name',
                     'user_ids', 'app_wise_home_pages']


admin.site.register(UserGroup, UserGroupAdmin)


class AllWebUrlsAdmin(admin.ModelAdmin):
    list_display = ['id', 'url']
    search_fields = ['id', 'url']


admin.site.register(AllWebUrls, AllWebUrlsAdmin)


class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_user',
                    'token', 'active_from', 'active_to']
    search_fields = ['id', 'company_user__id',
                     'token', 'active_from', 'active_to']


admin.site.register(ActivityLog, ActivityLogAdmin)


class BusinessTypeAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'name'
    ]


admin.site.register(BusinessType, BusinessTypeAdmin)
