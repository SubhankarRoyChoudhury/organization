from django.contrib import admin

from .models import Appointment, Billing, Patient, Prescription


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "patient_id",
        "full_name",
        "company",
        "primary_doctor",
        "created_on",
    )
    search_fields = (
        "patient_id",
        "full_name",
        "email",
        "phone_number",
        "company__company_name",
        "primary_doctor__name",
    )
    list_filter = ("company", "created_on")
    ordering = ("full_name", "-id")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "appointment_id",
        "patient",
        "doctor",
        "scheduled_for",
        "status",
        "company",
    )
    search_fields = (
        "appointment_id",
        "patient__full_name",
        "doctor__name",
        "company__company_name",
    )
    list_filter = ("status", "company", "scheduled_for")
    ordering = ("-scheduled_for", "-id")


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "prescription_id",
        "appointment",
        "status",
        "company",
        "created_on",
    )
    search_fields = (
        "prescription_id",
        "appointment__appointment_id",
        "appointment__patient__full_name",
        "appointment__doctor__name",
        "company__company_name",
    )
    list_filter = ("status", "company", "created_on")
    ordering = ("-created_on", "-id")


@admin.register(Billing)
class BillingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "billing_id",
        "appointment",
        "total_amount",
        "amount_paid",
        "status",
        "company",
        "created_on",
    )
    search_fields = (
        "billing_id",
        "appointment__appointment_id",
        "appointment__patient__full_name",
        "company__company_name",
    )
    list_filter = ("status", "company", "created_on")
    ordering = ("-created_on", "-id")
