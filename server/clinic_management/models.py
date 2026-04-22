import re

from django.db import models
from django.utils import timezone

from company_account.models import Companies, CompanyUser


def _company_prefix(company, fallback):
    company_name = getattr(company, "company_name", "") or ""
    filtered = "".join(ch for ch in company_name.upper() if ch.isalnum())
    prefix = filtered[:3] if filtered else fallback
    return prefix.ljust(3, "X")


class ClinicBaseModel(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="%(class)ss",
        null=True,
        blank=True,
    )
    created_by = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default=None,
    )
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default=None,
    )
    updated_on = models.DateTimeField(auto_now=True)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        default="",
    )
    delisted_on = models.DateTimeField(
        blank=True,
        null=True,
        default=None,
    )

    class Meta:
        abstract = True


class Patient(ClinicBaseModel):
    BILLING_STATUS_CHOICES = [
        ("CURRENT", "Current"),
        ("PENDING", "Pending"),
        ("OVERDUE", "Overdue"),
    ]

    user_account = models.OneToOneField(
        CompanyUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clinic_patient_profile",
    )
    primary_doctor = models.ForeignKey(
        CompanyUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_clinic_patients",
    )
    patient_id = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
    )
    full_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=254, null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    emergency_contact_name = models.CharField(max_length=150, null=True, blank=True)
    emergency_contact_number = models.CharField(max_length=20, null=True, blank=True)
    billing_status = models.CharField(
        max_length=20,
        choices=BILLING_STATUS_CHOICES,
        null=True,
        blank=True,
        default=None,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["full_name", "-id"]

    def __str__(self):
        return self.patient_id or self.full_name

    def save(self, *args, **kwargs):
        if not self.patient_id:
            prefix = _company_prefix(self.company, "PAT")
            base = f"{prefix}-PAT-"
            queryset = Patient.objects.filter(patient_id__startswith=base)
            if self.company_id:
                queryset = queryset.filter(company_id=self.company_id)

            max_seq = 0
            pattern = re.compile(rf"^{re.escape(base)}(\d+)$")
            for existing_id in queryset.values_list("patient_id", flat=True):
                match = pattern.match(existing_id or "")
                if match:
                    max_seq = max(max_seq, int(match.group(1)))

            self.patient_id = f"{base}{max_seq + 1:03d}"

        if self.user_account and not self.full_name:
            self.full_name = self.user_account.name

        super().save(*args, **kwargs)


class Appointment(ClinicBaseModel):
    STATUS_CHOICES = [
        ("SCHEDULED", "Scheduled"),
        ("CHECKED_IN", "Checked In"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
        ("NO_SHOW", "No Show"),
    ]

    appointment_id = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    doctor = models.ForeignKey(
        CompanyUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clinic_appointments",
    )
    scheduled_for = models.DateTimeField()
    reason = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="SCHEDULED",
    )
    consultation_notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-scheduled_for", "-id"]

    def __str__(self):
        return self.appointment_id or f"Appointment {self.pk}"

    def save(self, *args, **kwargs):
        if not self.appointment_id:
            prefix = _company_prefix(self.company, "APT")
            base = f"{prefix}-APT-"
            queryset = Appointment.objects.filter(appointment_id__startswith=base)
            if self.company_id:
                queryset = queryset.filter(company_id=self.company_id)

            max_seq = 0
            pattern = re.compile(rf"^{re.escape(base)}(\d+)$")
            for existing_id in queryset.values_list("appointment_id", flat=True):
                match = pattern.match(existing_id or "")
                if match:
                    max_seq = max(max_seq, int(match.group(1)))

            self.appointment_id = f"{base}{max_seq + 1:04d}"

        super().save(*args, **kwargs)


class Prescription(ClinicBaseModel):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("READY", "Ready"),
        ("ISSUED", "Issued"),
    ]

    prescription_id = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
    )
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="prescription",
    )
    summary = models.TextField(blank=True, default="")
    medicines = models.JSONField(default=list, blank=True)
    follow_up_in_days = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="DRAFT",
    )

    class Meta:
        ordering = ["-created_on", "-id"]

    def __str__(self):
        return self.prescription_id or f"Prescription {self.pk}"

    def save(self, *args, **kwargs):
        if not self.prescription_id:
            prefix = _company_prefix(self.company, "PR")
            base = f"{prefix}-PR-"
            queryset = Prescription.objects.filter(prescription_id__startswith=base)
            if self.company_id:
                queryset = queryset.filter(company_id=self.company_id)

            max_seq = 0
            pattern = re.compile(rf"^{re.escape(base)}(\d+)$")
            for existing_id in queryset.values_list("prescription_id", flat=True):
                match = pattern.match(existing_id or "")
                if match:
                    max_seq = max(max_seq, int(match.group(1)))

            self.prescription_id = f"{base}{max_seq + 1:04d}"

        super().save(*args, **kwargs)


class Billing(ClinicBaseModel):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PARTIAL", "Partial"),
        ("PAID", "Paid"),
        ("VOID", "Void"),
    ]

    billing_id = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
    )
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="billing",
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
    )
    due_date = models.DateField(null=True, blank=True)
    paid_on = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_on", "-id"]

    def __str__(self):
        return self.billing_id or f"Billing {self.pk}"

    def save(self, *args, **kwargs):
        if not self.billing_id:
            prefix = _company_prefix(self.company, "INV")
            base = f"{prefix}-INV-"
            queryset = Billing.objects.filter(billing_id__startswith=base)
            if self.company_id:
                queryset = queryset.filter(company_id=self.company_id)

            max_seq = 0
            pattern = re.compile(rf"^{re.escape(base)}(\d+)$")
            for existing_id in queryset.values_list("billing_id", flat=True):
                match = pattern.match(existing_id or "")
                if match:
                    max_seq = max(max_seq, int(match.group(1)))

            self.billing_id = f"{base}{max_seq + 1:04d}"

        super().save(*args, **kwargs)
