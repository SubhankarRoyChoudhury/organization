import os
import uuid
import re
from django.db import models
from django.db.models import Max
from django.utils import timezone
from django.utils.text import slugify
from django.contrib.postgres.fields import ArrayField 
from django.contrib.postgres.fields import JSONField

from company_account.models import Companies, CompanyUser


def _build_companies_media_prefix(companies):
    """Return folder name like `acme-health_5` for consistent media grouping."""
    if not companies:
        return "companies_unknown"
    label = _get_company_label(companies) or "companies"
    slug = slugify(label)
    return f"{slug}_{companies.id}"


def _get_company_label(companies):
    if not companies:
        return None
    return getattr(companies, "company_name", None) or getattr(companies, "name", None)


def _profile_upload_path(instance, filename, role_prefix):
    companies_segment = _build_companies_media_prefix(getattr(instance, "companies", None))
    entity_id = getattr(instance, "pk", None) or "pending"
    base, ext = os.path.splitext(filename)
    ext = ext.lower() or ".jpg"
    unique_suffix = uuid.uuid4().hex[:8]
    final_name = f"profile_{unique_suffix}{ext}"
    return os.path.join(
        companies_segment,
        role_prefix,
        f"{role_prefix}_{entity_id}",
        final_name,
    )


def doctor_profile_upload_to(instance, filename):
    return _profile_upload_path(instance, filename, "doctor")


def administration_profile_upload_to(instance, filename):
    return _profile_upload_path(instance, filename, "administration")


# Create your models here.

# class Companies(models.Model):
#     name = models.CharField(max_length=150)
#     code = models.CharField(max_length=50, unique=True)
#     admin_user_name = models.CharField(max_length=150, unique=True, null=True, blank=True, default=None)
#     email = models.EmailField(null=True, blank=True, default=None)
#     phone = models.CharField(max_length=30, null=True, blank=True, default=None)
#     address = models.TextField(null=True, blank=True, default=None)
#     city = models.CharField(max_length=80, null=True, blank=True, default=None)
#     state = models.CharField(max_length=80, null=True, blank=True, default=None)
#     country = models.CharField(max_length=80, null=True, blank=True, default=None)
#     is_active = models.BooleanField(default=True)
#     created_by = models.CharField(max_length=100, null=True, blank=True, default=None)
#     created_on = models.DateTimeField(blank=True, null=True, default=timezone.now)
#     updated_by = models.CharField(max_length=100, null=True, blank=True, default=None)
#     updated_on = models.DateTimeField(blank=True, null=True, default=timezone.now)

#     class Meta:
#         ordering = ('name',)

#     def __str__(self):
#         label = self.code or "N/A"
#         return f'{self.id} - {label} - {self.name}'


class Department(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name='departments',
        null=True,
        blank=True,
    )
    name = models.CharField(
        max_length=100, unique=False, null=True, blank=True, default=None)
  
    is_approve = models.BooleanField(default=False)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(
        max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)


    def __str__(self):
        return f'{self.id},{self.name}'
    
class StaffDepartment(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name='staff_departments',
        null=True,
        blank=True,
    )
    name = models.CharField(
        max_length=100, unique=True, null=True, blank=True, default=None)
    
    code = models.CharField(max_length=20, unique=True)
  
    is_approve = models.BooleanField(default=False)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(
        max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)


    def __str__(self):
        return f'{self.id},{self.name}'
    
class StaffJobTitle(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name='staff_department_job_titles',
        null=True,
        blank=True,
    )
    staff_department = models.ForeignKey(
        StaffDepartment,
        on_delete=models.CASCADE,
        related_name="staff_department_job_titles"
    )
    name = models.CharField(max_length=100)    
    is_approve = models.BooleanField(default=False)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(
        max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)
    def __str__(self):
        return f"{self.id},{self.name} ({self.staff_department.name})"
    
    
class DoctorType(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name='doctor_types',
        null=True,
        blank=True,
    )
    name = models.CharField(
        max_length=100, unique=False, null=True, blank=True, default=None)
  
    is_approve = models.BooleanField(default=False)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(
        max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)


    def __str__(self):
        return f'{self.id},{self.name}'
    
class AdministrationType(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name='administration_types',
        null=True,
        blank=True,
    )
    name = models.CharField(
        max_length=100, unique=False, null=True, blank=True, default=None)
  
    is_approve = models.BooleanField(default=False)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(
        max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)


    def __str__(self):
        return f'{self.id},{self.name}'
    
    
class DoctorFees(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name='doctor_fees',
        null=True,
        blank=True,
    )
    doctor = models.ForeignKey(
        CompanyUser,
        on_delete=models.CASCADE,
        related_name='fee_entries',
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='doctor_fees',
        null=True,
        blank=True,
    )
    doctor_type = models.ForeignKey(
        DoctorType,
        on_delete=models.CASCADE,
        related_name='doctor_fees',
        null=True,
        blank=True,
    )
    fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(auto_now=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(
        max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)

    class Meta:
        unique_together = ('companies', 'doctor')
        ordering = ('doctor__name',)

    def __str__(self):
        doctor_name = self.doctor.name if self.doctor else "Doctor"
        return f"{doctor_name} - {self.fees}"

class TimeSlot(models.Model):
    """
    Defines reusable timing ranges (like '10:00 AM - 12:00 PM')
    so that you can reuse them for multiple doctors.
    """
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name='time_slots',
        null=True,
        blank=True,
    )
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"{self.id} - {self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')}"

class DoctorSchedule(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name='doctor_schedules',
        null=True,
        blank=True,
    )
    doctor = models.ForeignKey(
        CompanyUser, on_delete=models.CASCADE, related_name="schedules"
    )

    # ✅ Store day-to-timeslot mapping as JSON
    available_day_slots = models.JSONField(
        blank=True,
        null=True,
        help_text="Dictionary mapping days to one or more time slot IDs, e.g. {'Monday': [1, 2]}"
    )

    association_type = models.CharField(
        max_length=100, null=True, blank=True, help_text="OPD / Consultation / Surgery / Other"
    )
    is_available = models.BooleanField(default=True)
    delist = models.BooleanField(default=False)
    absent_dates = models.JSONField(default=list, blank=True)

    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=100, null=True, blank=True, default=None)

    class Meta:
        ordering = ["-doctor"]

    def __str__(self):
        return f"{self.doctor.name} - {self.available_day_slots}"


class DutyRoaster(models.Model):
    SHIFT_CHOICES = (
        ("M", "Morning"),
        ("G", "General"),
        ("E", "Evening"),
        ("N", "Night"),
        ("O", "Off"),
        ("C", "On-call"),
    )

    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="duty_roasters",
        null=True,
        blank=True,
    )
    staff = models.ForeignKey(
        CompanyUser,
        on_delete=models.CASCADE,
        related_name="duty_roasters",
    )
    role = models.CharField(max_length=50, null=True, blank=True, default=None)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duty_roasters",
    )
    doctor_type = models.ForeignKey(
        DoctorType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duty_roasters",
    )
    administration_type = models.ForeignKey(
        AdministrationType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duty_roasters",
    )
    job_title = models.CharField(max_length=100, null=True, blank=True, default=None)
    staff_department = models.ForeignKey(
        StaffDepartment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duty_roasters",
    )
    staff_job_title = models.ForeignKey(
        StaffJobTitle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duty_roasters",
    )
    duty_date = models.DateField()
    shift = models.CharField(max_length=1, choices=SHIFT_CHOICES, default="M")
    time_slot = models.CharField(max_length=50, null=True, blank=True, default=None)
    on_call_time = models.TimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True, default=None)

    created_by = models.CharField(max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(auto_now=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default="")
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)

    class Meta:
        ordering = ("-duty_date", "-created_on")

    def __str__(self):
        staff_name = getattr(self.staff, "name", None) or "Staff"
        return f"{staff_name} - {self.duty_date} - {self.get_shift_display()}"
    

class Patient(models.Model):
    """
    Stores patient OPD booking details (One record = One ticket).
    """

    # 🔹 Companies Context
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="opd_bookings",
        null=True,
        blank=True,
    )

    patient_id = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        help_text="Auto-generated ticket number"
    )

    # 🔹 Patient Details
    name = models.CharField(max_length=150)
    
    gender = models.CharField(max_length=20, null=True, blank=True)
    mobile = models.CharField(max_length=20, null=True, blank=True)
    dateOfBirth = models.CharField(max_length=20, null=True, blank=True)

    country = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    district = models.CharField(max_length=100, null=True, blank=True)
    ps = models.CharField(max_length=100, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    pin = models.CharField(max_length=10, null=True, blank=True)

    health_insurance_company = models.CharField(max_length=150, null=True, blank=True)
    policy_no = models.CharField(max_length=100, null=True, blank=True)
    policy_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)


    # 🔹 Audit Fields
    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return f"Patient # {self.id}-{self.patient_id or self.id} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.patient_id:
            # companies prefix = first 3 alnum chars from companies name (upper), fallback PAT
            company_name = (
                self.companies.company_name
                if self.companies and self.companies.company_name
                else None
            )
            if company_name:
                filtered = "".join(ch for ch in company_name.upper() if ch.isalnum())
                prefix = (filtered[:3] or "PAT").ljust(3, "X")
            else:
                prefix = "PAT"

            base = f"{prefix}-PAT-"

            # Only consider IDs in the same pattern (and optionally same companies)
            qs = Patient.objects.filter(patient_id__startswith=base)
            if self.companies_id:
                qs = qs.filter(companies_id=self.companies_id)

            # Find max existing sequence safely
            max_seq = 0
            for pid in qs.values_list("patient_id", flat=True):
                m = re.match(rf"^{re.escape(base)}(\d+)$", pid or "")
                if m:
                    max_seq = max(max_seq, int(m.group(1)))

            self.patient_id = f"{base}{max_seq + 1:04d}"

        super().save(*args, **kwargs)



class OPDTicketBooking(models.Model):
    """
    Stores patient OPD booking details (One record = One ticket).
    """

    # 🔹 Companies Context
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="patient",
        null=True,
        blank=True,
    )

    # 🔹 Visit Details
    visitDate = models.DateField(null=False, blank=False)
    ticket_no = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        help_text="Auto-generated ticket number"
    )

    patient = models.ForeignKey(
        Patient,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opd_tickets",
    )

    # 🔹 Patient Details
    name = models.CharField(max_length=150)
    gender = models.CharField(max_length=20, null=True, blank=True)
    mobile = models.CharField(max_length=20, null=True, blank=True)
    dateOfBirth = models.CharField(max_length=20, null=True, blank=True)

    country = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    district = models.CharField(max_length=100, null=True, blank=True)
    ps = models.CharField(max_length=100, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    pin = models.CharField(max_length=10, null=True, blank=True)

    health_insurance_company = models.CharField(max_length=150, null=True, blank=True)
    policy_no = models.CharField(max_length=100, null=True, blank=True)
    policy_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # 🔹 Doctor / Department
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opd_bookings",
    )

    doctor = models.ForeignKey(
        CompanyUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opd_bookings",
    )
    doctorSchedule = models.ForeignKey(
        TimeSlot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opd_bookings",
    )
    fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    advance_received_amt = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    receipt_transfer_no = models.CharField(max_length=100, null=True, blank=True)

    # 🔹 Status
    is_cancelled = models.BooleanField(default=False)
    cancelled_on = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.CharField(max_length=150, null=True, blank=True)

    # 🔹 Audit Fields
    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return f"OPD Ticket #{self.ticket_no or self.id} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.ticket_no:
            visit_date = self.visitDate or timezone.now().date()
            date_part = visit_date.strftime("%d-%b")
            existing_today = OPDTicketBooking.objects.filter(
                visitDate=visit_date
            ).exclude(pk=self.pk).values_list('ticket_no', flat=True)
            sequence = 1
            if existing_today:
                numbers = []
                for t in existing_today:
                    try:
                        suffix = t.split('-')[-1]
                        numbers.append(int(suffix))
                    except (ValueError, AttributeError):
                        continue
                if numbers:
                    sequence = max(numbers) + 1
            self.ticket_no = f"{date_part}-{sequence:03d}"
        super().save(*args, **kwargs)


class Floor(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="floor",
        null=True,
        blank=True,
    )
    

    # 🔹 Patient Details
    floor_no = models.CharField(max_length=150)
    
    status = models.BooleanField(default=False)
    # 🔹 Audit Fields
    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)
    
    def __str__(self):
        return f"{self.id} - {self.name}"
    
    
class Ward(models.Model):
    GENDER_CHOICES = [
        ("male", "Male Ward"),
        ("female", "Female Ward"),
        ("mixed", "Mixed Ward"),
    ]

    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="ward",
        null=True,
        blank=True,
    )

    # 🔹 Patient Details
    name = models.CharField(max_length=150)
    ward_code = models.CharField(max_length=30, unique=True, null=True, blank=True)
    gender_type = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        default="mixed",
    )
    
    status = models.BooleanField(default=False)
    
    # 🔹 Audit Fields
    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)
    
    def __str__(self):
        return f"{self.ward_code} - {self.name}"

    def _code_prefix(self):
        tokens = re.findall(r"[A-Za-z0-9]+", (self.name or "").upper())
        if not tokens:
            return "WARD"
        if len(tokens) == 1:
            segment = tokens[0]
            return segment if len(segment) <= 3 else segment[:3]
        prefix = "".join(token[0] for token in tokens[:3])
        return prefix or "WARD"

    def _next_code(self):
        prefix = self._code_prefix()
        base_qs = Ward.objects.exclude(pk=self.pk)
        if self.companies_id:
            base_qs = base_qs.filter(companies_id=self.companies_id)
        existing_codes = base_qs.filter(ward_code__startswith=f"{prefix}-").values_list('ward_code', flat=True)
        pattern = re.compile(rf"^{prefix}-(\d+)$")
        max_existing = 0
        for code in existing_codes:
            match = pattern.match(code or "")
            if match:
                max_existing = max(max_existing, int(match.group(1)))
        return f"{prefix}-{max_existing + 1}"

    def save(self, *args, **kwargs):
        if not self.ward_code and self.name:
            self.ward_code = self._next_code()
        super().save(*args, **kwargs)
    
class Room(models.Model):

    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="rooms",
        null=True,
        blank=True,
    )

    # 🔹 Room Details
    room_no = models.CharField(max_length=50, unique=True)
    room_type = models.CharField(max_length=50, null=True, blank=True)

    ward = models.ForeignKey(
        Ward,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rooms"
    )

    floor = models.ForeignKey(
        Floor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rooms"
    )

    price_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    status = models.CharField(max_length=50, null=True, blank=True)
    # status2 = models.CharField(max_length=50, null=True, blank=True)

    # 🔹 Audit Fields
    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)

    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)

    def __str__(self):
        return f"{self.room_no}"


class Bed(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="bed",
        null=True,
        blank=True,
    )

    # 🔹 Patient Details
    bed_no = models.CharField(max_length=150)
    room = models.ForeignKey(
        Room,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="beds",
    )
    
    status = models.CharField(max_length=150)
    is_available = models.BooleanField(default=True)
    
    # 🔹 Audit Fields
    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)
    
    def __str__(self):
        room_label = f" ({self.room.room_no})" if self.room else ""
        return f"{self.bed_no}{room_label}"





class InsuaranceProvider(models.Model):
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    ]

    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="insuarance_providers",
        null=True,
        blank=True,
    )

    provider_name = models.CharField(max_length=150)
    plan_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=254, null=True, blank=True, default="")
    contact_number = models.CharField(max_length=20, null=True, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Active")

    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default="")
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.id} - {self.provider_name} - {self.plan_name}"



class RateChart(models.Model):
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="rate_chart",
        null=True,
        blank=True,
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rate_chart",
    )

    insuarance_provider = models.ForeignKey(
        InsuaranceProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rate_charts",
    )
    
    name = models.CharField(max_length=200)  # e.g. "Appendectomy"
    
    fixed_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    
    # Effective dates for rate revisions
    effective_from = models.DateField(default=timezone.now)
    effective_to = models.DateField(blank=True, null=True)
    
    status = models.CharField(max_length=255)
    
    is_active = models.BooleanField(default=True)
    
    
    # 🔹 Audit Fields
    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default='')
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)
    
    def __str__(self):
        department_label = f" ({self.department.name})" if self.department else ""
        return f"{department_label}"

class IPDBooking(models.Model):
    STATUS_CHOICES = [
        ("ADMITTED", "Admitted"),
        ("TRANSFERRED", "Transferred"),
        ("DISCHARGED", "Discharged"),
    ]

    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="ipd_bookings",
        null=True,
        blank=True,
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="ipd_bookings",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ipd_bookings",
    )
    rate_chart = models.ForeignKey(
        RateChart,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ipd_bookings",
    )
    treatment_doctor = models.ForeignKey(
        CompanyUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treatment_ipd_bookings",
    )
    recommended_doctor = models.CharField(max_length=150, blank=True, default="")
    consulting_doctors = models.ManyToManyField(
        CompanyUser,
        blank=True,
        related_name="consulting_ipd_bookings",
    )
    ward = models.ForeignKey(
        Ward,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ipd_bookings",
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ipd_bookings",
    )
    bed = models.ForeignKey(
        Bed,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ipd_bookings",
    )
    mobile = models.CharField(max_length=20, blank=True, default="")
    related_person = models.CharField(max_length=150, blank=True, default="")
    relationship = models.CharField(max_length=100, blank=True, default="")
    address = models.TextField(blank=True, default="")
    admission_date = models.DateField(default=timezone.now)
    insurance_provider = models.ForeignKey(
        InsuaranceProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ipd_bookings",
    )
    policy_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    insurance_number = models.CharField(max_length=150, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="ADMITTED"
    )
    admission_reason = models.TextField(blank=True, default="")
    ipd_no = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        help_text="Auto-generated IPD number",
    )
    discharge_date = models.DateTimeField(null=True, blank=True)
    discharge_summary = models.TextField(blank=True, default="")

    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default="")
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)

    def __str__(self):
        patient_name = self.patient.name if self.patient else "Unknown"
        label = self.ipd_no or f"#{self.id}"
        return f"IPD Booking {label} - {patient_name}"

    def save(self, *args, **kwargs):
        if not self.ipd_no:
            company_name = _get_company_label(self.companies)
            if company_name:
                filtered = "".join(ch for ch in company_name.upper() if ch.isalnum())
                prefix = (filtered[:3] or "IPD").ljust(3, "X")
            else:
                prefix = "IPD"
            base = f"IPD/{prefix}/"
            qs = IPDBooking.objects.filter(ipd_no__startswith=base)
            if self.companies_id:
                qs = qs.filter(companies_id=self.companies_id)
            max_seq = 0
            for ipd_no in qs.values_list("ipd_no", flat=True):
                match = re.match(rf"^{re.escape(base)}(\d+)$", ipd_no or "")
                if match:
                    max_seq = max(max_seq, int(match.group(1)))
            self.ipd_no = f"{base}{max_seq + 1:04d}"
        super().save(*args, **kwargs)


class IPDBilling(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
    ]
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="ipd_billings",
        null=True,
        blank=True,
    )
    ipd_booking = models.ForeignKey(
        IPDBooking,
        on_delete=models.CASCADE,
        related_name="billings",
    )
    ipd_billing_no = models.CharField(
        max_length=25,
        unique=True,
        blank=True,
        null=True,
        help_text="Auto-generated IPD billing number",
    )
    line_items = models.JSONField(default=list, blank=True)
    additional_admissions = models.JSONField(default=list, blank=True)
    is_final_billing = models.BooleanField(default=False)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING"
    )
    remarks = models.TextField(blank=True, default="")

    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)

    class Meta:
        ordering = ("-created_on",)

    def __str__(self):
        label = self.ipd_billing_no or f"#{self.id}"
        return f"IPD Billing {label} for Booking {self.ipd_booking_id}"

    def save(self, *args, **kwargs):
        if not self.ipd_billing_no:
            company_name = _get_company_label(self.companies)
            if company_name:
                filtered = "".join(ch for ch in company_name.upper() if ch.isalnum())
                prefix = (filtered[:3] or "IPD").ljust(3, "X")
            else:
                prefix = "IPD"
            base = f"IPDB/{prefix}/"
            qs = IPDBilling.objects.filter(ipd_billing_no__startswith=base)
            if self.companies_id:
                qs = qs.filter(companies_id=self.companies_id)
            max_seq = 0
            for billing_no in qs.values_list("ipd_billing_no", flat=True):
                match = re.match(rf"^{re.escape(base)}(\d+)$", billing_no or "")
                if match:
                    max_seq = max(max_seq, int(match.group(1)))
            self.ipd_billing_no = f"{base}{max_seq + 1:04d}"
        super().save(*args, **kwargs)


class IPDPayment(models.Model):
    PAYMENT_STAGE_CHOICES = [
        ("ADVANCE", "Advance"),
        ("INTERIM", "Interim"),
        ("FINAL", "Final"),
        ("REFUND", "Refund"),
    ]

    PAYMENT_MODE_CHOICES = [
        ("CASH", "Cash"),
        ("CARD", "Card"),
        ("UPI", "UPI"),
        ("BANK", "Bank"),
    ]

    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="ipd_payments",
        null=True,
        blank=True,
    )
    ipd_booking = models.ForeignKey(
        IPDBooking,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    ipd_billing = models.ForeignKey(
        IPDBilling,
        on_delete=models.SET_NULL,
        related_name="payments",
        null=True,
        blank=True,
    )
    payment_payload = models.JSONField(default=dict, blank=True)
    
    receipt_no = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        default="",
    )
    payment_date = models.DateField()
    payment_stage = models.CharField(
        max_length=20, choices=PAYMENT_STAGE_CHOICES, default="ADVANCE"
    )
    payment_mode = models.CharField(
        max_length=20, choices=PAYMENT_MODE_CHOICES, default="CASH"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    room_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reference_no = models.CharField(max_length=150, blank=True, default="")
    remarks = models.TextField(blank=True, default="")
    is_cancelled = models.BooleanField(default=False)

    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)

    class Meta:
        ordering = ("-created_on",)

    def __str__(self):
        receipt = self.receipt_no or "Pending"
        return f"IPD Payment {receipt}"

    def _generate_receipt_no(self):
        prefix = "IPD-REC-"
        last_receipt = (
            IPDPayment.objects.filter(companies=self.companies)
            .order_by("-id")
            .values_list("receipt_no", flat=True)
            .first()
        )
        next_sequence = 1
        if last_receipt:
            match = re.search(r"IPD-REC-(\d+)", last_receipt)
            if match:
                next_sequence = int(match.group(1)) + 1
        return f"{prefix}{next_sequence:03d}"

    def _build_payment_payload(self):
        if not self.ipd_billing:
            return {}
        billing_no = self.ipd_billing.ipd_billing_no or f"#{self.ipd_billing_id}"
        return {
            billing_no: {
                "receipt_no": self.receipt_no or "",
                "payment_date": self.payment_date.isoformat()
                if self.payment_date
                else "",
                "payment_stage": self.payment_stage,
                "payment_mode": self.payment_mode,
                "amount": float(self.amount or 0),
                "due_amount": float(self.due_amount or 0),
                "room_rate": float(self.room_rate or 0),
                "reference_no": self.reference_no or "",
                "remarks": self.remarks or "",
                "is_cancelled": bool(self.is_cancelled),
            }
        }

    def save(self, *args, **kwargs):
        if not self.companies and self.ipd_booking and self.ipd_booking.companies:
            self.companies = self.ipd_booking.companies
        if not self.receipt_no:
            self.receipt_no = self._generate_receipt_no()
        if not self.payment_payload:
            self.payment_payload = self._build_payment_payload()
        super().save(*args, **kwargs)



class EmergencyVisit(models.Model):

    TRIAGE_CHOICES = [
        ("Critical", "Critical"),
        ("Urgent", "Urgent"),
        ("Stable", "Stable"),
        ("Deceased/Dead on arrival", "Deceased/Dead on arrival"),
    ]

    STATUS_CHOICES = [
        ("REGISTERED", "Registered"),
        ("TRIAGED", "Triaged"),
        ("UNDER_TREATMENT", "Under Treatment"),
        ("OBSERVATION", "Observation"),
        ("ADMITTED", "Admitted"),
        ("DISCHARGED", "Discharged"),
        ("REFERRED", "Referred"),
        ("LAMA", "LAMA"),
        ("DEATH", "Death"),
    ]

    # If you already have a Patient model, link it here:
    # patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, null=True, blank=True)

    # Basic identity (for walk-in unknown patients too)
    companies = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="emer_bookings",
        null=True,
        blank=True,
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="emer_bookings",
    )
    
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    mobile_no = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    # ER identifiers
    emer_no = models.CharField(max_length=30, unique=True, editable=False)
    visit_datetime = models.DateTimeField(default=timezone.now)

    # Arrival / referral
    brought_by_name = models.CharField(max_length=255, blank=True, null=True)
    brought_by_mobile = models.CharField(max_length=15, blank=True, null=True)

    referred_from = models.CharField(max_length=255, blank=True, null=True)
    referral_note = models.TextField(blank=True, null=True)

    # Complaint & triage
    triage_level = models.CharField(max_length=255, choices=TRIAGE_CHOICES)

    # department = models.ForeignKey(
    #         Department,
    #         on_delete=models.SET_NULL,
    #         null=True,
    #         blank=True,
    #         related_name="emer_bookings",
    #     )
    # Doctor assignment
    attending_doctor_name = models.ForeignKey(
        CompanyUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emer_bookings",
    )
    assigned_datetime = models.DateTimeField(blank=True, null=True)

    # Outcome
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="REGISTERED")
    outcome_datetime = models.DateTimeField(blank=True, null=True)
    discharge_summary = models.TextField(blank=True, null=True)

    # Audit
    created_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(max_length=150, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, null=True, blank=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(max_length=100, blank=True, null=True, default="")
    delisted_on = models.DateTimeField(blank=True, null=True, default=None)

    def _get_companies_segment(self):
        if not self.companies:
            return "UNK"
        company_name = _get_company_label(self.companies)
        if not company_name:
            return "UNK"
        raw = company_name.strip().upper()
        cleaned = re.sub(r"[^A-Z0-9]", "", raw)
        segment = cleaned[:3]
        if len(segment) < 3:
            segment = segment.ljust(3, "X")
        return segment

    def save(self, *args, **kwargs):
        if not self.emer_no:
            companies_segment = self._get_companies_segment()
            prefix = f"EMER/{companies_segment}/"
            last = EmergencyVisit.objects.filter(
                emer_no__startswith=prefix
            ).aggregate(mx=Max("emer_no"))["mx"]
            if last:
                last_no = int(last.split("/")[-1])
            else:
                last_no = 0
            self.emer_no = f"{prefix}{last_no + 1:03d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.emer_no} - {self.patient}"
