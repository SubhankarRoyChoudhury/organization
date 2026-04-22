from django.contrib import admin
from company_account.models import Companies
from .models import (
    AdministrationType,
    Companies,
    Department,
    StaffDepartment,
    StaffJobTitle,
    DoctorSchedule,
    DoctorType,
    DoctorFees,
    OPDTicketBooking,
    IPDBooking,
    IPDBilling,
    TimeSlot,
    Patient,
    Floor,
    Ward,
    Bed,
    Room,
    IPDPayment,
    RateChart,
    InsuaranceProvider,
    EmergencyVisit,
    DutyRoaster,
)

from django.utils.html import format_html


# =========================
# Companies Admin
# =========================
# @admin.register(Companies)
# class CompanyAdmin(admin.ModelAdmin):
#     list_display = (
#         'id',
#         'name',
#         'code',
#         'email',
#         'admin_user_name',
#         'is_active',
#         'created_on',
#         'updated_on',
#     )
#     search_fields = ('name', 'code', 'email', 'phone')
#     list_filter = ('is_active', 'country')
#     ordering = ('name',)


# =========================
# Department Admin
# =========================
class DepartmentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'companies',
        'name',
        'is_approve',
        'created_by',
        'created_on',
        'updated_by',
        'updated_on',
        'delist',
    )
    list_filter = ('name', 'delist', 'created_on')
    ordering = ('-created_on',)

admin.site.register(Department, DepartmentAdmin)



# =========================
# Staff Department Admin
# =========================
class StaffDepartmentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'companies',
        'name',
        'code',
        'is_approve',
        'created_by',
        'created_on',
        'updated_by',
        'updated_on',
        'delist',
    )
    list_filter = ('name', 'delist', 'created_on')
    ordering = ('-created_on',)

admin.site.register(StaffDepartment, StaffDepartmentAdmin)


# =========================
# Staff Job Title Admin
# =========================
class StaffJobTitleAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'companies',
        'staff_department',
        'name',
        'is_approve',
        'created_by',
        'created_on',
        'updated_by',
        'updated_on',
        'delist',
    )
    list_filter = ('staff_department', 'delist', 'created_on')
    ordering = ('-created_on',)

admin.site.register(StaffJobTitle, StaffJobTitleAdmin)


# =========================
# Doctor Type Admin
# =========================
class DoctorTypeAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'companies',
        'name',
        'is_approve',
        'created_by',
        'created_on',
        'updated_by',
        'updated_on',
        'delist',
    )
    list_filter = ('name', 'delist', 'created_on')
    ordering = ('-created_on',)

admin.site.register(DoctorType, DoctorTypeAdmin)


# =========================
# Administration Type Admin
# =========================
class AdministrationTypeAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'companies',
        'name',
        'is_approve',
        'created_by',
        'created_on',
        'updated_by',
        'updated_on',
        'delist',
    )
    list_filter = ('name', 'delist', 'created_on')
    ordering = ('-created_on',)

admin.site.register(AdministrationType, AdministrationTypeAdmin)


# =========================
# TimeSlot Admin
# =========================
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'companies',
        'start_time',
        'end_time',
        'display_time',
    )
    ordering = ('start_time',)

    def display_time(self, obj):
        """Readable time format"""
        return f"{obj.start_time.strftime('%I:%M %p')} - {obj.end_time.strftime('%I:%M %p')}"
    display_time.short_description = "Display Time"

admin.site.register(TimeSlot, TimeSlotAdmin)


# =========================
# Duty Roaster Admin
# =========================
class DutyRoasterAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "staff",
        "role",
        "department",
        "doctor_type",
        "administration_type",
        "staff_department",
        "staff_job_title",
        "duty_date",
        "shift",
        "time_slot",
        "on_call_time",
        "created_on",
        "delist",
    )
    list_filter = ("companies", "shift", "duty_date", "delist")
    search_fields = ("staff__name", "staff__username", "role")
    ordering = ("-duty_date", "-created_on")

admin.site.register(DutyRoaster, DutyRoasterAdmin)


# =========================
# Doctor Schedule Admin
# =========================
@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'companies',
        'doctor',
        'association_type',
        'get_day_slots',
        'is_available',
        'absent_dates',
        'created_on',
    )
    list_filter = ('association_type', 'is_available')
    search_fields = ('doctor__full_name', 'association_type')
    ordering = ('-created_on',)

    def get_day_slots(self, obj):
        """Show readable mapping of available days and their corresponding time slots."""
        if not obj.available_day_slots:
            return "-"

        lines = []
        try:
            for day, slot_value in obj.available_day_slots.items():
                slot_ids = slot_value if isinstance(slot_value, (list, tuple, set)) else [slot_value]
                display_parts = []
                for slot_id in slot_ids:
                    slot = TimeSlot.objects.filter(id=slot_id, companies=obj.companies).first()
                    if slot:
                        slot_display = f"{slot.start_time.strftime('%I:%M %p')} - {slot.end_time.strftime('%I:%M %p')}"
                        display_parts.append(slot_display)
                    else:
                        display_parts.append(f"<span style='color:#888'>Invalid Slot ({slot_id})</span>")
                if not display_parts:
                    continue
                joined = ", ".join(display_parts)
                lines.append(f"<b>{day}</b>: {joined}")
            # Show each day on a new line in admin
            return format_html("<br>".join(lines))
        except Exception as e:
            return format_html(f"<span style='color:red'>⚠️ Error: {str(e)}</span>")

    get_day_slots.short_description = "Available Day → Time Slot"


@admin.register(DoctorFees)
class DoctorFeesAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "doctor",
        "department",
        "doctor_type",
        "fees",
        "created_on",
        "updated_on",
    )
    list_filter = ("companies", "department", "doctor_type")
    search_fields = ("doctor__full_name", "doctor__email", "doctor__phone")
    ordering = ('-created_on',)


@admin.register(OPDTicketBooking)
class OPDTicketBookingAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'ticket_no',
        'companies',
        'visitDate',
        'fees',
        'patient',
        # 'doctorSchedule',
        'doctor_schedule_display',
        'name',
        'dateOfBirth',
        'department',
        'doctor',
        'mobile',
        'is_cancelled',
        'delist',
        'created_on',
    )
    list_filter = ('visitDate', 'department', 'doctor', 'is_cancelled')
    search_fields = ('ticket_no', 'name', 'mobile', 'policy_no')
    ordering = ('-created_on',)

    def doctor_schedule_display(self, obj):
        if not obj.doctorSchedule:
            return "-"

        start = obj.doctorSchedule.start_time.strftime('%I:%M %p')
        end = obj.doctorSchedule.end_time.strftime('%I:%M %p')
        display = f"{start} - {end}"

        schedules = DoctorSchedule.objects.filter(
            doctor=obj.doctor,
            companies=obj.companies,
        )
        for schedule in schedules:
            slots = schedule.available_day_slots or {}
            for day, slot_value in slots.items():
                slot_ids = slot_value if isinstance(slot_value, (list, tuple, set)) else [slot_value]
                for slot_id in slot_ids:
                    if str(slot_id) == str(obj.doctorSchedule_id):
                        return f"{day}: {display}"

        return display

    doctor_schedule_display.short_description = "Available Day → Time Slot"
    
    
# =========================
# Patient Admin
# =========================
@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "patient_id",
        "name",
        "mobile",
        'dateOfBirth',
        'address',
        "gender",
        "companies",
        "created_on",
    )
    search_fields = ("patient_id", "name", "mobile")
    list_filter = ("gender", "companies")
    ordering = ("-created_on",)


# =========================
# Floor Admin
# =========================
class FloorAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "floor_no",
        "status",
        "created_on",
        "updated_on",
        "delist",
    )
    search_fields = ("floor_no",)
    list_filter = ("companies", "status", "delist")
    ordering = ("floor_no",)
admin.site.register(Floor, FloorAdmin)

# =========================
# Ward Admin
# =========================
class WardAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "name",
        'gender_type',
        'status',
        "created_on",
        "updated_on",
        "delist",
    )
    search_fields = ("name",)
    list_filter = ("companies", "delist")
    ordering = ("name",)
admin.site.register(Ward, WardAdmin)

# =========================
# Bed Admin
# =========================
class BedAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "bed_no",
        "room_no",
        "status",
        "is_available",
        "created_on",
        "updated_on",
        "delist",
    )
    search_fields = ("bed_no",)
    list_filter = ("status", "is_available", "companies", "delist")
    ordering = ("bed_no",)

    def room_no(self, obj):
        return obj.room.room_no if obj.room else ""

    room_no.short_description = "room_no"
admin.site.register(Bed, BedAdmin)

class IPDBookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "ipd_no",
        "patient",
        "related_person",
        "relationship",
        "address",
        "mobile",
        "admission_date",
        "insurance_provider",
        "policy_amount",
        "treatment_doctor",
        "recommended_doctor",
        "ward",
        "room",
        "bed",
        "rate_chart",
        "status",
        "created_on",
    )
    list_filter = ("companies", "status", "ward", "insurance_provider")
    search_fields = (
        "patient__name",
        "bed__bed_no",
        "room__room_no",
        "insurance_provider__provider_name",
    )
    filter_horizontal = ("consulting_doctors",)
admin.site.register(IPDBooking, IPDBookingAdmin)

class IPDBillingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "ipd_booking",
        "ipd_billing_no",
        "total_amount",
        "status",
        "created_on",
    )
    list_filter = ("companies",)
    search_fields = (
        "ipd_booking__patient__name",
    )
    ordering = ("-created_on",)


admin.site.register(IPDBilling, IPDBillingAdmin)


class IPDPaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "ipd_booking",
        "ipd_billing",
        "receipt_no",
        "payment_date",
        "payment_stage",
        "payment_mode",
        "amount",
        "due_amount",
        "room_rate",
        "reference_no",
        "is_cancelled",
        "created_on",
    )
    list_filter = ("companies", "payment_stage", "payment_mode", "is_cancelled")
    search_fields = (
        "ipd_booking__patient__name",
        "receipt_no",
        "reference_no",
    )
    ordering = ("-created_on",)


admin.site.register(IPDPayment, IPDPaymentAdmin)

# =========================
class RateChartAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "insuarance_provider",
        "department",
        "name",
        "fixed_amount",
        "effective_from",
        "effective_to",
        "status",
        "is_active",
        "created_on",
        "updated_on",
    )
    list_filter = ("companies", "department", "is_active", "status")
    search_fields = ("name", "department__name")
    ordering = ("-created_on",)


admin.site.register(RateChart, RateChartAdmin)

# =========================
# Insuarance Provider Admin
# =========================
class InsuaranceProviderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "provider_name",
        "plan_name",
        "email",
        "contact_number",
        "status",
        "created_on",
        "updated_on",
        "delist",
    )
    list_filter = ("companies", "status", "delist")
    search_fields = ("provider_name", "plan_name", "email", "contact_number")
    ordering = ("-created_on",)


admin.site.register(InsuaranceProvider, InsuaranceProviderAdmin)

# =========================
# Room Admin
# =========================
class RoomAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "companies",
        "room_no",
        "get_floor",
        "get_ward",
        "price_per_day",
        "status",
        "created_on",
    )
    search_fields = ("room_no",)
    list_filter = ("companies", "status", "floor", "ward")
    ordering = ("room_no",)

    # Readable foreign fields
    def get_floor(self, obj):
        return obj.floor.floor_no if obj.floor else "—"
    get_floor.short_description = "Floor"

    def get_ward(self, obj):
        return obj.ward.name if obj.ward else "—"
    get_ward.short_description = "Ward"

    # def get_bed(self, obj):
    #     return obj.beds.bed_no if obj.beds else "—"
    # get_bed.short_description = "Bed"

admin.site.register(Room, RoomAdmin)

# =========================
# Emergency Visit Admin
# =========================
class EmergencyVisitAdmin(admin.ModelAdmin):
    list_display = (
        "emer_no",
        "companies",
        "patient",
        "triage_level",
        "status",
        "visit_datetime",
        "created_on",
    )
    list_filter = ("companies", "triage_level", "status")
    search_fields = ("emer_no", "patient__name")
    ordering = ("-visit_datetime",)

admin.site.register(EmergencyVisit, EmergencyVisitAdmin)
