from django.contrib import admin
from django.contrib.auth.admin import UserAdmin


from .models import Organization, OrganizationUser,  User



@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email", "phone_number", "created_at")
    search_fields = ("name", "email", "phone_number")


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Additional info", {"fields": ("phone_number",)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Additional info", {"fields": ("email", "phone_number")}),
    )
    list_display = ("id", "username", "email", "phone_number", "is_staff")


@admin.register(OrganizationUser)
class OrganizationUserAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "company",
        "username",
        "email",
        "mobile",
        "role",
    )
    list_filter = ("role", "company")
    search_fields = (
        "username",
        "email",
        "mobile",
        "company__name",
    )
