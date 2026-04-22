from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import serializers

from company_account.models import CompanyUser

from .models import Appointment, Billing, Patient, Prescription


def _validate_company_user(user, company, field_name, *, expected_role=None):
    if not user:
        return
    if company and user.company_id != company.id:
        raise serializers.ValidationError(
            {field_name: "Selected user must belong to the same company."}
        )
    if expected_role and (user.role or "").lower() != expected_role.lower():
        raise serializers.ValidationError(
            {field_name: f"Selected user must have role '{expected_role}'."}
        )


class PatientSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.company_name", read_only=True)
    primary_doctor_name = serializers.CharField(source="primary_doctor.name", read_only=True)
    user_account_name = serializers.CharField(source="user_account.name", read_only=True)
    appointments_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "company",
            "company_name",
            "user_account",
            "user_account_name",
            "primary_doctor",
            "primary_doctor_name",
            "patient_id",
            "full_name",
            "email",
            "phone_number",
            "gender",
            "date_of_birth",
            "address",
            "emergency_contact_name",
            "emergency_contact_number",
            "notes",
            "appointments_count",
            "created_on",
            "updated_on",
        ]
        read_only_fields = [
            "patient_id",
            "appointments_count",
            "created_on",
            "updated_on",
        ]

    def validate(self, attrs):
        company = self.context["company"]
        user_account = attrs.get("user_account", getattr(self.instance, "user_account", None))
        primary_doctor = attrs.get(
            "primary_doctor", getattr(self.instance, "primary_doctor", None)
        )
        _validate_company_user(user_account, company, "user_account")
        _validate_company_user(
            primary_doctor,
            company,
            "primary_doctor",
            expected_role="doctor",
        )
        return attrs


class DoctorSerializer(serializers.ModelSerializer):
    doctor_id = serializers.SerializerMethodField()
    specialty = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    appointments_count = serializers.IntegerField(read_only=True)
    load = serializers.SerializerMethodField()

    class Meta:
        model = CompanyUser
        fields = [
            "id",
            "doctor_id",
            "name",
            "email",
            "mobile",
            "role",
            "medical_council_registration",
            "specialty",
            "appointments_count",
            "load",
            "status",
        ]

    def get_doctor_id(self, obj):
        return f"DOC-{obj.id:03d}"

    def get_specialty(self, obj):
        return (
            getattr(obj.doctor_type, "name", None)
            or getattr(obj.department, "name", None)
            or obj.job_title
            or "General Practice"
        )

    def get_status(self, obj):
        if obj.delist:
            return "Delisted"
        if obj.is_active:
            return "Available"
        if obj.is_approve:
            return "Approved"
        return "Pending"

    def get_load(self, obj):
        count = getattr(obj, "appointments_count", 0) or 0
        return f"{count} active"


class DoctorManageSerializer(serializers.ModelSerializer):
    specialty = serializers.CharField(required=False, allow_blank=True, write_only=True)
    status = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = CompanyUser
        fields = [
            "id",
            "company",
            "name",
            "username",
            "email",
            "mobile",
            "job_title",
            "specialty",
            "status",
            "password",
            "association_type",
            "medical_council_registration",
        ]
        extra_kwargs = {
            "username": {"required": False, "allow_blank": True},
            "email": {"required": False, "allow_null": True, "allow_blank": True},
            "mobile": {"required": False, "allow_blank": True},
            "job_title": {"required": False, "allow_blank": True},
            "association_type": {"required": False, "allow_blank": True},
            "medical_council_registration": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        company = self.context["company"]
        if self.instance and self.instance.company_id != company.id:
            raise serializers.ValidationError(
                {"company": "Selected doctor must belong to the same company."}
            )
        if not attrs.get("name") and not getattr(self.instance, "name", ""):
            raise serializers.ValidationError({"name": "This field is required."})
        email = (attrs.get("email") if "email" in attrs else getattr(self.instance, "email", "")) or ""
        mobile = (attrs.get("mobile") if "mobile" in attrs else getattr(self.instance, "mobile", "")) or ""
        medical_registration = (
            attrs.get("medical_council_registration")
            if "medical_council_registration" in attrs
            else getattr(self.instance, "medical_council_registration", "")
        ) or ""
        if isinstance(email, str):
            email = email.strip().lower()
            attrs["email"] = email or None
        if isinstance(mobile, str):
            mobile = mobile.strip()
            attrs["mobile"] = mobile
        if isinstance(medical_registration, str):
            medical_registration = medical_registration.strip()
            attrs["medical_council_registration"] = medical_registration

        if self.instance is None and not email:
            raise serializers.ValidationError(
                {"email": "Email is required to create a doctor user."}
            )
        if self.instance is None and not mobile:
            raise serializers.ValidationError(
                {"mobile": "Phone is required to create a doctor user."}
            )
        if self.instance is None and not medical_registration:
            raise serializers.ValidationError(
                {
                    "medical_council_registration": (
                        "Medical council registration is required to create a doctor user."
                    )
                }
            )

        email_qs = CompanyUser.objects.filter(company=company, role__iexact="doctor")
        mobile_qs = CompanyUser.objects.filter(company=company, role__iexact="doctor")
        if self.instance:
            email_qs = email_qs.exclude(pk=self.instance.pk)
            mobile_qs = mobile_qs.exclude(pk=self.instance.pk)
        if email and email_qs.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "A doctor with this email already exists for this company."}
            )
        if mobile and mobile_qs.filter(mobile=mobile).exists():
            raise serializers.ValidationError(
                {"mobile": "A doctor with this phone already exists for this company."}
            )
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            specialty = validated_data.pop("specialty", None)
            status_value = (validated_data.pop("status", "") or "").strip().lower()
            password = validated_data.pop("password", None)
            if specialty and not validated_data.get("job_title"):
                validated_data["job_title"] = specialty
            username = (validated_data.get("username") or "").strip()
            if not username:
                email = (validated_data.get("email") or "").strip().lower()
                mobile = (validated_data.get("mobile") or "").strip()
                name = (validated_data.get("name") or "").strip().lower().replace(" ", ".")
                username = email or mobile or name or f"doctor.{timezone.now().timestamp()}"
                validated_data["username"] = username
            validated_data["role"] = "doctor"
            validated_data["is_staff"] = True
            validated_data["is_assistant"] = True
            validated_data["is_active"] = status_value in {"available", "active", "approved"}
            validated_data["is_approve"] = status_value in {"approved", "available", "active"}
            doctor = super().create(validated_data)
            self._ensure_auth_user(doctor, password=password)
            return doctor

    def update(self, instance, validated_data):
        with transaction.atomic():
            specialty = validated_data.pop("specialty", None)
            status_value = validated_data.pop("status", None)
            password = validated_data.pop("password", None)
            if specialty is not None and not validated_data.get("job_title"):
                validated_data["job_title"] = specialty
            if status_value is not None:
                normalized = status_value.strip().lower()
                instance.is_active = normalized in {"available", "active", "approved"}
                instance.is_approve = normalized in {"approved", "available", "active"}
            doctor = super().update(instance, validated_data)
            self._ensure_auth_user(doctor, password=password)
            return doctor

    def _ensure_auth_user(self, doctor, *, password=None):
        User = get_user_model()
        email = (doctor.email or "").strip().lower()
        username = (doctor.username or email or "").strip().lower()
        phone_number = (doctor.mobile or "").strip()
        if not (email or username):
            return None

        query = Q()
        if email:
            query |= Q(email__iexact=email) | Q(username__iexact=email)
        if username:
            query |= Q(username__iexact=username)
        user = User.objects.filter(query).first()
        desired_active = bool(doctor.is_approve or doctor.is_active)

        if user:
            updates = []
            if email and user.email != email:
                user.email = email
                updates.append("email")
            if username and user.username != username:
                user.username = username
                updates.append("username")
            if phone_number and user.phone_number != phone_number:
                phone_conflict = User.objects.filter(phone_number=phone_number).exclude(
                    pk=user.pk
                )
                if phone_conflict.exists():
                    raise serializers.ValidationError(
                        {"mobile": "This phone number is already in use."}
                    )
                user.phone_number = phone_number
                updates.append("phone_number")
            if user.is_active != desired_active:
                user.is_active = desired_active
                updates.append("is_active")
            if password:
                user.set_password(password)
                updates.append("password")
            if updates:
                user.save(update_fields=updates)
            return user

        if not phone_number:
            raise serializers.ValidationError(
                {"mobile": "Phone is required to create login credentials."}
            )
        if User.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError(
                {"mobile": "This phone number is already in use."}
            )
        default_password = password or "abc123"
        return User.objects.create_user(
            username=email or username,
            email=email or None,
            phone_number=phone_number,
            password=default_password,
            is_active=desired_active,
        )


class AppointmentSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.company_name", read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_identifier = serializers.CharField(source="patient.patient_id", read_only=True)
    doctor_name = serializers.CharField(source="doctor.name", read_only=True)
    prescription_id = serializers.CharField(source="prescription.prescription_id", read_only=True)
    billing_id = serializers.CharField(source="billing.billing_id", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "company",
            "company_name",
            "appointment_id",
            "patient",
            "patient_name",
            "patient_identifier",
            "doctor",
            "doctor_name",
            "scheduled_for",
            "reason",
            "status",
            "consultation_notes",
            "prescription_id",
            "billing_id",
            "created_on",
            "updated_on",
        ]
        read_only_fields = [
            "appointment_id",
            "prescription_id",
            "billing_id",
            "created_on",
            "updated_on",
        ]

    def validate(self, attrs):
        company = self.context["company"]
        patient = attrs.get("patient", getattr(self.instance, "patient", None))
        doctor = attrs.get("doctor", getattr(self.instance, "doctor", None))

        if patient and patient.company_id != company.id:
            raise serializers.ValidationError(
                {"patient": "Selected patient must belong to the same company."}
            )

        _validate_company_user(doctor, company, "doctor", expected_role="doctor")
        return attrs


class PrescriptionSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.company_name", read_only=True)
    appointment_id = serializers.CharField(source="appointment.appointment_id", read_only=True)
    patient_name = serializers.CharField(source="appointment.patient.full_name", read_only=True)
    doctor_name = serializers.CharField(source="appointment.doctor.name", read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "company",
            "company_name",
            "prescription_id",
            "appointment",
            "appointment_id",
            "patient_name",
            "doctor_name",
            "summary",
            "medicines",
            "follow_up_in_days",
            "status",
            "created_on",
            "updated_on",
        ]
        read_only_fields = ["prescription_id", "created_on", "updated_on"]

    def validate(self, attrs):
        company = self.context["company"]
        appointment = attrs.get("appointment", getattr(self.instance, "appointment", None))
        if appointment and appointment.company_id != company.id:
            raise serializers.ValidationError(
                {"appointment": "Selected appointment must belong to the same company."}
            )
        return attrs


class BillingSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.company_name", read_only=True)
    appointment_id = serializers.CharField(source="appointment.appointment_id", read_only=True)
    patient_name = serializers.CharField(source="appointment.patient.full_name", read_only=True)

    class Meta:
        model = Billing
        fields = [
            "id",
            "company",
            "company_name",
            "billing_id",
            "appointment",
            "appointment_id",
            "patient_name",
            "subtotal",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "amount_paid",
            "status",
            "due_date",
            "paid_on",
            "notes",
            "created_on",
            "updated_on",
        ]
        read_only_fields = ["billing_id", "created_on", "updated_on"]

    def validate(self, attrs):
        company = self.context["company"]
        appointment = attrs.get("appointment", getattr(self.instance, "appointment", None))
        if appointment and appointment.company_id != company.id:
            raise serializers.ValidationError(
                {"appointment": "Selected appointment must belong to the same company."}
            )
        return attrs


def with_patient_counts(queryset):
    return queryset.annotate(appointments_count=Count("appointments", distinct=True))


def with_doctor_counts(queryset):
    return queryset.annotate(appointments_count=Count("clinic_appointments", distinct=True))
