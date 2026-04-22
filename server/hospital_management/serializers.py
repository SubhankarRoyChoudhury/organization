# serializers.py


from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q

from shared.views import getImageAsBase64

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
    IPDPayment,
    RateChart,
    InsuaranceProvider,
    Patient,
    TimeSlot,
    Bed,
    Ward,
    Room,
    Floor,
    EmergencyVisit,
    DutyRoaster,
)
from company_account.models import CompanyUser


class CompanySerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Companies
        fields = [
            'id',
            'name',
            'code',
            'admin_user_name',
            'password',
            'email',
            'phone',
            'address',
            'city',
            'state',
            'country',
            'is_active',
            'created_by',
            'created_on',
            'updated_by',
            'updated_on',
        ]
        extra_kwargs = {
            'admin_user_name': {'required': False, 'allow_null': True, 'allow_blank': True},
        }

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError(
                {'password': 'Password is required when creating a company.'}
            )
        email = attrs.get('email') or getattr(self.instance, 'email', None)
        if not email:
            raise serializers.ValidationError({'email': 'Email is required.'})
        return super().validate(attrs)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        self._ensure_unique_admin_email(validated_data.get('email'))
        company = super().create(validated_data)
        self._upsert_admin_user(company, password, ensure_password=True)
        return company

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        new_email = validated_data.get('email', instance.email)
        if new_email and new_email != instance.email:
            self._ensure_unique_admin_email(new_email, ignore_username=instance.email)
        previous_username = instance.email
        company = super().update(instance, validated_data)
        self._upsert_admin_user(company, password, previous_username=previous_username)
        return company

    def _ensure_unique_admin_email(self, email, ignore_username=None):
        User = get_user_model()
        qs = User.objects.filter(username=email)
        if ignore_username:
            qs = qs.exclude(username=ignore_username)
        if qs.exists():
            raise serializers.ValidationError(
                {'email': 'A user with this email already exists.'}
            )

    def _upsert_admin_user(self, company, password=None, previous_username=None, ensure_password=False):
        username = company.email
        if not username:
            raise serializers.ValidationError({'email': 'Email is required to provision admin user.'})

        User = get_user_model()
        user = None
        lookup_usernames = []
        if previous_username:
            lookup_usernames.append(previous_username)
        lookup_usernames.append(username)
        for uname in lookup_usernames:
            user = User.objects.filter(username=uname).first()
            if user:
                break

        if not user:
            if ensure_password and not password:
                raise serializers.ValidationError(
                    {'password': 'Password is required to create the admin user.'}
                )
            if not password:
                return
            user = User(username=username)
        else:
            user.username = username

        email = company.email or getattr(user, 'email', '') or ''
        if hasattr(user, 'email'):
            user.email = email

        if password:
            user.set_password(password)

        if hasattr(user, 'is_staff'):
            user.is_staff = True
        if hasattr(user, 'is_active'):
            user.is_active = True

        user.save()


class DepartmentSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=False,
    )
    company_name = serializers.CharField(
        source="companies.company_name",
        read_only=True,
    )

    class Meta:
        model = Department
        fields = ['id', 'company', 'company_name', 'name', 'is_approve']



class StaffDepartmentSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )
    company_name = serializers.CharField(
        source="companies.company_name",
        read_only=True,
    )

    class Meta:
        model = StaffDepartment
        fields = ['id', 'company', 'company_name', 'name', 'code', 'is_approve']
        

class StaffJobTitleSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )
    company_name = serializers.CharField(
        source="companies.company_name",
        read_only=True,
    )
    staff_department = serializers.PrimaryKeyRelatedField(
        queryset=StaffDepartment.objects.all(),
        required=True,
    )
    staff_department_name = serializers.CharField(
        source="staff_department.name",
        read_only=True,
    )
    class Meta:
        model = StaffJobTitle
        fields = [
            'id',
            'company',
            'company_name',
            'staff_department',
            'staff_department_name',
            'name',
            'is_approve',
        ]

class DoctorTypeSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )
    company_name = serializers.CharField(
        source="companies.company_name",
        read_only=True,
    )

    class Meta:
        model = DoctorType
        fields = ['id', 'company', 'company_name', 'name', 'is_approve']


class AdministrationTypeSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )
    company_name = serializers.CharField(
        source="companies.company_name",
        read_only=True,
    )

    class Meta:
        model = AdministrationType
        fields = ['id', 'company', 'company_name', 'name', 'is_approve', 'created_by']




class DoctorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    full_name = serializers.CharField(source='name')
    phone = serializers.CharField(source='mobile')
    department_name = serializers.CharField(source='department.name', read_only=True)
    doctor_type_name = serializers.CharField(source='doctor_type.name', read_only=True)
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanyUser
        fields = [
            'id',
            'company',
            'company_name',
            'full_name',
            'email',
            'phone',
            'whatsapp_number',
            'attachment_id',
            'image_url',
            'password',
            'department',
            'department_name',
            'doctor_type',
            'doctor_type_name',
            'role',
            'association_type',
            'medical_council_registration',
            'is_approve',
            'delist',
            'created_by',
            'created_on',
            'updated_by',
            'updated_on',
            'delisted_by',
            'delisted_on',
        ]
        extra_kwargs = {
            'company': {'required': True},
        }

    def get_image_url(self, obj):
        if getattr(obj, 'image_url', None):
            return obj.image_url
        attachment_id = getattr(obj, 'attachment_id', None)
        if not attachment_id:
            return None
        request = self.context.get('request') if hasattr(self, 'context') else None
        if not request:
            return None
        return getImageAsBase64(request, attachment_id)

    def validate_email(self, value):
        """
        ✅ Ensure email is unique per company in CompanyUser table
        """
        if self.instance and value == self.instance.email:
            return value
        company = self.initial_data.get('company') or getattr(self.instance, 'company', None)
        doctor_qs = CompanyUser.objects.filter(email=value)
        if company:
            doctor_qs = doctor_qs.filter(company=company)

        if self.instance:
            doctor_qs = doctor_qs.exclude(pk=self.instance.pk)

        if doctor_qs.exists():
            raise serializers.ValidationError(
                "This email is already registered for this company."
            )
        return value

    def validate_phone(self, value):
        """
        ✅ Ensure phone number is unique per company in CompanyUser table
        """
        if self.instance and value == self.instance.mobile:
            return value
        company = self.initial_data.get('company') or getattr(self.instance, 'company', None)
        qs = CompanyUser.objects.filter(mobile=value)
        if company:
            qs = qs.filter(company=company)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "This phone number is already in use for this company."
            )
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError(
                {"password": "Password is required when creating a doctor."}
            )
        role = (
            attrs.get('role')
            or getattr(self.instance, 'role', '')
            or ''
        ).lower()
        medical_registration = (
            attrs.get('medical_council_registration')
            if 'medical_council_registration' in attrs
            else getattr(self.instance, 'medical_council_registration', None)
        )
        if isinstance(medical_registration, str):
            medical_registration = medical_registration.strip()
            attrs['medical_council_registration'] = medical_registration
        if self.instance is None and role == 'doctor' and not str(
            medical_registration or ""
        ).strip():
            raise serializers.ValidationError(
                {
                    "medical_council_registration": (
                        "Medical council registration is required when creating a doctor."
                    )
                }
            )

        company = attrs.get('company') or getattr(self.instance, 'company', None)
        department = attrs.get('department') if 'department' in attrs else getattr(self.instance, 'department', None)
        doctor_type = attrs.get('doctor_type') if 'doctor_type' in attrs else getattr(self.instance, 'doctor_type', None)

        errors = {}
        if department and company and getattr(department, 'companies_id', None) != company.id:
            errors['department'] = "Department must belong to the same company."
        if doctor_type and company and getattr(doctor_type, 'companies_id', None) != company.id:
            errors['doctor_type'] = "Doctor type must belong to the same company."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        """
        ✅ Create both User and CompanyUser entries
        """
        password = validated_data.pop('password', None)

        User = get_user_model()

        email = validated_data.get('email')
        username = (email or validated_data.get('username') or "").strip().lower()
        user = User.objects.filter(
            Q(email__iexact=email) | Q(username__iexact=username)
        ).first() if username or email else None
        if user:
            updates = []
            if password:
                user.set_password(password)
                updates.append('password')
            desired_active = validated_data.get('is_approve', False)
            if user.is_active != desired_active:
                user.is_active = desired_active
                updates.append('is_active')
            if updates:
                user.save(update_fields=updates)
        elif username:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=validated_data.get('is_approve', False),
            )

        validated_data.setdefault('username', username)
        validated_data.setdefault('is_staff', True)
        validated_data.setdefault('is_active', validated_data.get('is_approve', False))
        validated_data.setdefault('is_assistant', True)

        return CompanyUser.objects.create(**validated_data)

    def update(self, instance, validated_data):
        User = get_user_model()
        new_email = validated_data.get('email', instance.email)
        email_changed = new_email != instance.email

        if email_changed:
            user = User.objects.filter(email=instance.email).first()
            if user:
                user.email = new_email
                user.username = new_email
                user.save(update_fields=['email', 'username'])

        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            if attr in ('department', 'doctor_type') and not value:
                value = None
            setattr(instance, attr, value)

        if email_changed and new_email:
            instance.username = new_email

        instance.save()

        if password:
            user = User.objects.filter(
                Q(email__iexact=new_email) | Q(username__iexact=instance.username)
            ).first()
            if user:
                user.set_password(password)
                user.save(update_fields=['password'])
        return instance
    
    
    


class TimeSlotSerializer(serializers.ModelSerializer):
    """Serializer for TimeSlot model"""

    # Optional: return human-readable format directly
    display_time = serializers.SerializerMethodField()
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=False,
    )
    company_name = serializers.CharField(
        source="companies.company_name",
        read_only=True,
    )

    class Meta:
        model = TimeSlot
        fields = ['id', 'company', 'company_name', 'start_time', 'end_time', 'display_time']
        extra_kwargs = {'company': {'required': False}}

    def get_display_time(self, obj):
        """Return '10:00 AM - 12:00 PM' style string"""
        return f"{obj.start_time.strftime('%I:%M %p')} - {obj.end_time.strftime('%I:%M %p')}"

    def validate(self, attrs):
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be greater than start time."}
            )
        return attrs
    
    
class DoctorScheduleSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    doctor_department = serializers.CharField(source='doctor.department.name', read_only=True)
    doctor_department_id = serializers.IntegerField(
        source='doctor.department.id', read_only=True
    )
    doctor_type_name = serializers.CharField(source='doctor.doctor_type.name', read_only=True)
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )
    company_name = serializers.CharField(source='companies.company_name', read_only=True)
    readable_schedule = serializers.SerializerMethodField()

    class Meta:
        model = DoctorSchedule
        fields = [
            'id',
            'company',
            'company_name',
            'doctor',
            'doctor_name',
            'doctor_department',
            'doctor_department_id',
            'doctor_type_name',
            'available_day_slots',  # ✅ JSON format
            'association_type',
            'is_available',
            'delist',
            'absent_dates',
            'readable_schedule',
            'created_on',
        ]
        extra_kwargs = {'company': {'required': True}}

    def get_readable_schedule(self, obj):
        """Convert IDs to readable times for frontend."""
        if not obj.available_day_slots:
            return {}
        readable = {}
        for day, value in obj.available_day_slots.items():
            slot_ids = value if isinstance(value, (list, tuple, set)) else [value]
            displays = []
            for slot_id in slot_ids:
                try:
                    slot = TimeSlot.objects.get(id=slot_id)
                    displays.append(
                        f"{slot.start_time.strftime('%I:%M %p')} - {slot.end_time.strftime('%I:%M %p')}"
                    )
                except TimeSlot.DoesNotExist:
                    displays.append("N/A")
            if not displays:
                continue
            readable[day] = displays[0] if len(displays) == 1 else displays
        return readable

    def validate(self, attrs):
        company = attrs.get('companies') or getattr(self.instance, 'companies', None)
        doctor = attrs.get('doctor') if 'doctor' in attrs else getattr(self.instance, 'doctor', None)
        if doctor and company and doctor.company_id != company.id:
            raise serializers.ValidationError(
                {'doctor': 'Doctor must belong to the same company as the schedule.'}
            )
        return attrs


class OPDTicketBookingSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )
    company_name = serializers.CharField(source='companies.company_name', read_only=True)
    company_address = serializers.CharField(source='companies.address', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    doctor_type_name = serializers.CharField(source='doctor.doctor_type.name', read_only=True)
    doctorSchedule = serializers.PrimaryKeyRelatedField(
        queryset=TimeSlot.objects.all(),
        allow_null=True,
        required=False,
    )
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    patient = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        write_only=True,
        required=True
    )
    start_time = serializers.TimeField(
        source='doctorSchedule.start_time', read_only=True
    )
    end_time = serializers.TimeField(
        source='doctorSchedule.end_time', read_only=True
    )
    doctor_schedule_display = serializers.SerializerMethodField()

    class Meta:
        model = OPDTicketBooking
        fields = [
            'id',
            'company',
            'company_name',
            'patient',
            'patient_id',
            'company_address',
            'visitDate',
            'ticket_no',
            'name',
            'gender',
            'mobile',
            'dateOfBirth',
            'country',
            'state',
            'district',
            'ps',
            'address',
            'pin',
            'health_insurance_company',
            'policy_no',
            'policy_amount',
            'department',
            'department_name',
            'doctor',
            'doctor_name',
            'doctor_type_name',
            'fees',
            'advance_received_amt',
            'receipt_transfer_no',
            'doctorSchedule',
            'start_time',
            'end_time',
            'doctor_schedule_display',
            'is_cancelled',
            'created_on',
        ]
        read_only_fields = ['ticket_no', 'created_on']
        extra_kwargs = {
            'company': {'required': True},
            'visitDate': {'required': True},
            'name': {'required': True},
        }

    def get_doctor_schedule_display(self, obj):
        if not obj.doctor or not obj.doctorSchedule:
            return {}

        slot_id = obj.doctorSchedule.id
        schedules = DoctorSchedule.objects.filter(
            doctor=obj.doctor,
            companies=obj.companies,
        )

        for schedule in schedules:
            mapping = schedule.available_day_slots or {}
            for day, mapped_slot in mapping.items():
                slot_ids = (
                    mapped_slot
                    if isinstance(mapped_slot, (list, tuple, set))
                    else [mapped_slot]
                )
                if any(str(slot) == str(slot_id) for slot in slot_ids):
                    start = obj.doctorSchedule.start_time.strftime('%I:%M %p')
                    end = obj.doctorSchedule.end_time.strftime('%I:%M %p')
                    return {day: f"{start} - {end}"}

        start = obj.doctorSchedule.start_time.strftime('%I:%M %p')
        end = obj.doctorSchedule.end_time.strftime('%I:%M %p')
        return {"": f"{start} - {end}"}


class EmergencyVisitSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )
    company_name = serializers.CharField(source='companies.company_name', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    attending_doctor_display = serializers.CharField(
        source='attending_doctor_name.name', read_only=True
    )
    attending_doctor_id = serializers.IntegerField(
        source='attending_doctor_name.id', read_only=True
    )
    patient = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        write_only=True,
        required=True,
    )
    attending_doctor_name = serializers.PrimaryKeyRelatedField(
        queryset=CompanyUser.objects.filter(role__iexact="doctor"),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = EmergencyVisit
        fields = [
            'id',
            'company',
            'company_name',
            'patient',
            'patient_id',
            'patient_name',
            'age',
            'gender',
            'mobile_no',
            'address',
            'emer_no',
            'visit_datetime',
            'brought_by_name',
            'brought_by_mobile',
            'referred_from',
            'referral_note',
            'triage_level',
            'attending_doctor_name',
            'attending_doctor_id',
            'attending_doctor_display',
            'assigned_datetime',
            'status',
            'outcome_datetime',
            'discharge_summary',
            'created_on',
        ]
        read_only_fields = ['emer_no', 'created_on']
        extra_kwargs = {
            'company': {'required': True},
            'triage_level': {'required': True},
            'status': {'required': True},
        }


class IPDBookingSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )
    company_name = serializers.CharField(source='companies.company_name', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    rate_chart_name = serializers.CharField(source='rate_chart.name', read_only=True)
    treatment_doctor_name = serializers.CharField(
        source='treatment_doctor.name', read_only=True
    )
    ward_name = serializers.CharField(source='ward.name', read_only=True)
    room_no = serializers.CharField(source='room.room_no', read_only=True)
    bed_no = serializers.CharField(source='bed.bed_no', read_only=True)
    insurance_provider_name = serializers.CharField(
        source='insurance_provider.provider_name',
        read_only=True,
    )
    consulting_doctors = serializers.PrimaryKeyRelatedField(
        queryset=CompanyUser.objects.filter(role__iexact="doctor"),
        many=True,
        required=False,
    )

    class Meta:
        model = IPDBooking
        fields = [
            'id',
            'company',
            'company_name',
            'ipd_no',
            'patient',
            'patient_name',
            'department',
            'department_name',
            'rate_chart',
            'rate_chart_name',
            'treatment_doctor',
            'treatment_doctor_name',
            'recommended_doctor',
            'consulting_doctors',
            'ward',
            'ward_name',
            'room',
            'room_no',
            'bed',
            'bed_no',
            'mobile',
            'related_person',
            'relationship',
            'address',
            'admission_date',
            'insurance_provider',
            'insurance_provider_name',
            'policy_amount',
            'insurance_number',
            'status',
            'admission_reason',
            'discharge_date',
            'discharge_summary',
            'created_on',
            'updated_on',
        ]
        read_only_fields = ('created_on', 'updated_on')

    def validate(self, attrs):
        company = attrs.get('companies') or getattr(self.instance, 'companies', None)
        patient = attrs.get('patient') if 'patient' in attrs else getattr(self.instance, 'patient', None)
        department = attrs.get('department') if 'department' in attrs else getattr(self.instance, 'department', None)
        treatment_doctor = attrs.get('treatment_doctor') if 'treatment_doctor' in attrs else getattr(self.instance, 'treatment_doctor', None)
        ward = attrs.get('ward') if 'ward' in attrs else getattr(self.instance, 'ward', None)
        room = attrs.get('room') if 'room' in attrs else getattr(self.instance, 'room', None)
        bed = attrs.get('bed') if 'bed' in attrs else getattr(self.instance, 'bed', None)
        rate_chart = (
            attrs.get('rate_chart')
            if 'rate_chart' in attrs
            else getattr(self.instance, 'rate_chart', None)
        )
        insurance_provider = (
            attrs.get('insurance_provider')
            if 'insurance_provider' in attrs
            else getattr(self.instance, 'insurance_provider', None)
        )
        policy_amount = (
            attrs.get('policy_amount')
            if 'policy_amount' in attrs
            else getattr(self.instance, 'policy_amount', None)
        )

        errors = {}

        def ensure_same_company(obj, field_name):
            if not obj or not company:
                return
            obj_company_id = getattr(obj, 'company_id', None)
            if obj_company_id is None:
                obj_company_id = getattr(obj, 'companies_id', None)
            if obj_company_id != company.id:
                errors[field_name] = 'Selection must belong to the same company.'

        ensure_same_company(patient, 'patient')
        ensure_same_company(department, 'department')
        ensure_same_company(treatment_doctor, 'treatment_doctor')
        ensure_same_company(ward, 'ward')
        ensure_same_company(room, 'room')
        ensure_same_company(bed, 'bed')
        ensure_same_company(rate_chart, 'rate_chart')
        ensure_same_company(insurance_provider, 'insurance_provider')
        if policy_amount is not None and policy_amount < 0:
            errors['policy_amount'] = 'Policy amount cannot be negative.'

        if rate_chart and department and rate_chart.department_id != department.id:
            errors['rate_chart'] = 'Rate chart must belong to the selected department.'

        if bed:
            current_bed = getattr(self.instance, 'bed', None)
            if not bed.is_available and bed != current_bed:
                errors['bed'] = 'Selected bed is already occupied.'
            if room and bed.room_id and bed.room_id != room.id:
                errors['bed'] = 'Bed must belong to the selected room.'
        if room and ward and room.ward_id and room.ward_id != ward.id:
            errors['room'] = 'Room must belong to the selected ward.'

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def _mark_bed_available(self, bed):
        if not bed:
            return
        updates = []
        if bed.is_available is False:
            bed.is_available = True
            updates.append('is_available')
        if (bed.status or '').upper() != 'AVAILABLE':
            bed.status = 'AVAILABLE'
            updates.append('status')
        if updates:
            bed.save(update_fields=updates + ['updated_on'])
        else:
            bed.save(update_fields=['updated_on'])

    def _mark_bed_occupied(self, bed):
        if not bed:
            return
        updates = []
        if bed.is_available:
            bed.is_available = False
            updates.append('is_available')
        if (bed.status or '').upper() in ('', 'AVAILABLE'):
            bed.status = 'OCCUPIED'
            updates.append('status')
        if updates:
            bed.save(update_fields=updates + ['updated_on'])
        else:
            bed.save(update_fields=['updated_on'])

    def create(self, validated_data):
        consulting_doctors = validated_data.pop('consulting_doctors', [])
        with transaction.atomic():
            booking = IPDBooking.objects.create(**validated_data)
            if consulting_doctors:
                booking.consulting_doctors.set(consulting_doctors)
            if booking.bed:
                if booking.status == 'DISCHARGED':
                    self._mark_bed_available(booking.bed)
                else:
                    self._mark_bed_occupied(booking.bed)
        return booking

    def update(self, instance, validated_data):
        consulting_doctors = validated_data.pop('consulting_doctors', None)
        old_bed = instance.bed
        old_status = instance.status
        with transaction.atomic():
            booking = super().update(instance, validated_data)
            if consulting_doctors is not None:
                booking.consulting_doctors.set(consulting_doctors)
            new_bed = booking.bed

            if old_bed and (not new_bed or old_bed.id != new_bed.id):
                self._mark_bed_available(old_bed)

            if new_bed:
                if booking.status == 'DISCHARGED':
                    self._mark_bed_available(new_bed)
                else:
                    self._mark_bed_occupied(new_bed)

            if booking.status == 'DISCHARGED' and old_bed and not new_bed:
                self._mark_bed_available(old_bed)

        return booking


class IPDPaymentSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=False,
    )
    patient_name = serializers.CharField(
        source='ipd_booking.patient.name', read_only=True
    )
    ipd_booking_code = serializers.SerializerMethodField()
    ipd_billing_no = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    ipd_billing_no_display = serializers.CharField(
        source='ipd_billing.ipd_billing_no', read_only=True
    )

    class Meta:
        model = IPDPayment
        fields = [
            'id',
            'company',
            'ipd_booking',
            'ipd_billing',
            'ipd_billing_no',
            'ipd_billing_no_display',
            'ipd_booking_code',
            'patient_name',
            'receipt_no',
            'payment_date',
            'payment_stage',
            'payment_mode',
            'amount',
            'due_amount',
            'room_rate',
            'reference_no',
            'remarks',
            'is_cancelled',
            'payment_payload',
            'created_by',
            'created_on',
            'updated_on',
        ]
        read_only_fields = (
            'company',
            'receipt_no',
            'created_on',
            'updated_on',
        )

    def get_ipd_booking_code(self, obj):
        if obj.ipd_booking_id:
            return f"IPD-{obj.ipd_booking_id:04d}"
        return None

    def validate(self, attrs):
        company = (
            attrs.get('companies')
            or getattr(self.instance, 'companies', None)
            or self.context.get('company')
        )
        if not company:
            raise serializers.ValidationError(
                {'company': 'Companies context is required.'}
            )
        attrs['companies'] = company

        ipd_booking = (
            attrs.get('ipd_booking')
            if 'ipd_booking' in attrs
            else getattr(self.instance, 'ipd_booking', None)
        )
        ipd_billing = (
            attrs.get('ipd_billing')
            if 'ipd_billing' in attrs
            else getattr(self.instance, 'ipd_billing', None)
        )
        ipd_billing_no = attrs.get('ipd_billing_no')
        if ipd_billing_no:
            billing = IPDBilling.objects.filter(
                ipd_billing_no=ipd_billing_no
            ).first()
            if not billing:
                raise serializers.ValidationError(
                    {'ipd_billing_no': 'IPD billing not found.'}
                )
            if billing.companies_id != company.id:
                raise serializers.ValidationError(
                    {'ipd_billing_no': 'Billing must belong to the same company.'}
                )
            ipd_billing = billing
            attrs['ipd_billing'] = billing
            if not ipd_booking:
                ipd_booking = billing.ipd_booking
                attrs['ipd_booking'] = billing.ipd_booking
            attrs.pop('ipd_billing_no', None)
        if ipd_booking and ipd_booking.companies_id != company.id:
            raise serializers.ValidationError(
                {'ipd_booking': 'Booking must belong to the same company.'}
            )
        if ipd_billing and ipd_billing.companies_id != company.id:
            raise serializers.ValidationError(
                {'ipd_billing': 'Billing must belong to the same company.'}
            )
        if ipd_billing and ipd_booking and ipd_billing.ipd_booking_id != ipd_booking.id:
            raise serializers.ValidationError(
                {'ipd_billing': 'Billing does not match the selected booking.'}
            )

        if ipd_booking:
            def coalesce(field_name):
                value = attrs.get(field_name)
                if value not in (None, '', []):
                    return
                booking_value = getattr(ipd_booking, field_name, None)
                if booking_value not in (None, '', []):
                    attrs[field_name] = booking_value

            coalesce('room_rate')
        return attrs

    def create(self, validated_data):
        if not validated_data.get('companies'):
            validated_data['companies'] = self.context.get('company')
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get('companies'):
            validated_data['companies'] = instance.companies
        return super().update(instance, validated_data)


class IPDBillingSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )
    patient_name = serializers.CharField(
        source='ipd_booking.patient.name', read_only=True
    )
    patient_mobile = serializers.CharField(
        source='ipd_booking.patient.mobile', read_only=True
    )
    department_name = serializers.CharField(
        source='ipd_booking.department.name', read_only=True
    )
    admission_date = serializers.DateField(
        source='ipd_booking.admission_date', read_only=True
    )
    rate_chart_name = serializers.CharField(
        source='ipd_booking.rate_chart.name', read_only=True
    )
    ward_name = serializers.CharField(
        source='ipd_booking.ward.name', read_only=True
    )
    room_no = serializers.CharField(
        source='ipd_booking.room.room_no', read_only=True
    )
    bed_no = serializers.CharField(
        source='ipd_booking.bed.bed_no', read_only=True
    )
    insurance_provider_name = serializers.CharField(
        source='ipd_booking.insurance_provider.provider_name',
        read_only=True,
    )
    ipd_booking_code = serializers.SerializerMethodField()

    class Meta:
        model = IPDBilling
        fields = [
            'id',
            'company',
            'ipd_booking',
            'ipd_billing_no',
            'ipd_booking_code',
            'patient_name',
            'patient_mobile',
            'department_name',
            'admission_date',
            'rate_chart_name',
            'ward_name',
            'room_no',
            'bed_no',
            'insurance_provider_name',
            'line_items',
            'additional_admissions',
            'is_final_billing',
            'total_amount',
            'status',
            'remarks',
            'created_by',
            'created_on',
            'updated_on',
        ]
        read_only_fields = (
            'created_on',
            'updated_on',
        )

    def get_ipd_booking_code(self, obj):
        if obj.ipd_booking_id:
            return f"IPD-{obj.ipd_booking_id:04d}"
        return None

    def validate(self, attrs):
        company = (
            attrs.get('companies')
            or getattr(self.instance, 'companies', None)
            or self.context.get('company')
        )
        if not company:
            raise serializers.ValidationError(
                {'company': 'Companies context is required.'}
            )
        attrs['companies'] = company

        ipd_booking = (
            attrs.get('ipd_booking')
            if 'ipd_booking' in attrs
            else getattr(self.instance, 'ipd_booking', None)
        )
        if ipd_booking and ipd_booking.companies_id != company.id:
            raise serializers.ValidationError(
                {'ipd_booking': 'Booking must belong to the same company.'}
            )
        line_items = attrs.get('line_items')
        if line_items is not None and not isinstance(line_items, list):
            raise serializers.ValidationError(
                {'line_items': 'Line items must be a list.'}
            )
        if isinstance(line_items, list):
            for item in line_items:
                if not isinstance(item, dict):
                    raise serializers.ValidationError(
                        {'line_items': 'Each line item must be an object.'}
                    )
                missing = [
                    key
                    for key in ('item', 'rate', 'qty', 'amount')
                    if key not in item
                ]
                if missing:
                    raise serializers.ValidationError(
                        {
                            'line_items': (
                                'Each line item must include item, rate, '
                                'qty, and amount.'
                            )
                        }
                    )
        additional_admissions = attrs.get('additional_admissions')
        if additional_admissions is not None and not isinstance(
            additional_admissions, list
        ):
            raise serializers.ValidationError(
                {
                    'additional_admissions': (
                        'Additional admissions must be a list.'
                    )
                }
            )
        if isinstance(additional_admissions, list):
            for entry in additional_admissions:
                if not isinstance(entry, dict):
                    raise serializers.ValidationError(
                        {
                            'additional_admissions': (
                                'Each additional admission must be an object.'
                            )
                        }
                    )
                missing = [
                    key
                    for key in (
                        'department_id',
                        'rate_chart_id',
                        'surgery_rate',
                    )
                    if key not in entry
                ]
                if missing:
                    raise serializers.ValidationError(
                        {
                            'additional_admissions': (
                                'Each additional admission must include '
                                'department_id, rate_chart_id, and '
                                'surgery_rate.'
                            )
                        }
                    )
        return attrs

    def create(self, validated_data):
        if not validated_data.get('companies'):
            validated_data['companies'] = self.context.get('company')
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get('companies'):
            validated_data['companies'] = instance.companies
        return super().update(instance, validated_data)


class PatientSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source='companies.company_name',
        read_only=True
    )

    class Meta:
        model = Patient
        fields = [
            'id',
            'companies',
            'company_name',
            'patient_id',
            'name',
            'gender',
            'mobile',
            'dateOfBirth',
            'country',
            'state',
            'district',
            'ps',
            'address',
            'pin',
            'health_insurance_company',
            'policy_no',
            'policy_amount',
            'created_on',
        ]
        read_only_fields = ['patient_id', 'created_on']
        extra_kwargs = {
            'companies': {'required': True},
            'name': {'required': True},
        }


class RateChartSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    insuarance_provider_name = serializers.CharField(
        source='insuarance_provider.provider_name',
        read_only=True,
    )

    class Meta:
        model = RateChart
        fields = [
            'id',
            'companies',
            'department',
            'department_name',
            'insuarance_provider',
            'insuarance_provider_name',
            'name',
            'fixed_amount',
            'effective_from',
            'effective_to',
            'status',
            'is_active',
            'created_on',
            'updated_on',
        ]
        read_only_fields = ('created_on', 'updated_on')

    def validate(self, attrs):
        company = self.context.get('company')
        if not company:
            company = (
                attrs.get('companies')
                or getattr(self.instance, 'companies', None)
            )
        if company is None:
            raise serializers.ValidationError(
                {'companies': 'Companies context is required.'}
            )
        attrs['companies'] = company

        department = (
            attrs.get('department')
            if 'department' in attrs
            else getattr(self.instance, 'department', None)
        )
        if department and department.companies_id != company.id:
            raise serializers.ValidationError(
                {'department': 'Department must belong to the same company.'}
            )

        insuarance_provider = (
            attrs.get('insuarance_provider')
            if 'insuarance_provider' in attrs
            else getattr(self.instance, 'insuarance_provider', None)
        )
        if (
            insuarance_provider
            and insuarance_provider.companies_id != company.id
        ):
            raise serializers.ValidationError(
                {
                    'insuarance_provider':
                    'Insuarance provider must belong to the same company.'
                }
            )

        effective_from = attrs.get('effective_from') or getattr(
            self.instance, 'effective_from', None
        )
        effective_to = attrs.get('effective_to') or getattr(
            self.instance, 'effective_to', None
        )
        if effective_from and effective_to and effective_to < effective_from:
            raise serializers.ValidationError(
                {'effective_to': 'Effective to must be on or after effective from.'}
            )

        if not attrs.get('status') and not self.instance:
            attrs['status'] = 'Active'
        return attrs


class InsuaranceProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuaranceProvider
        fields = [
            'id',
            'companies',
            'provider_name',
            'plan_name',
            'email',
            'contact_number',
            'status',
            'created_on',
            'updated_on',
            'created_by',
            'updated_by',
        ]
        read_only_fields = ('created_on', 'updated_on')

    def validate(self, attrs):
        company = self.context.get('company')
        if not company:
            company = (
                attrs.get('companies')
                or getattr(self.instance, 'companies', None)
            )
        if company is None:
            raise serializers.ValidationError(
                {'companies': 'Companies context is required.'}
            )
        attrs['companies'] = company

        provider_name = attrs.get('provider_name')
        if provider_name is not None:
            attrs['provider_name'] = str(provider_name).strip()

        plan_name = attrs.get('plan_name')
        if plan_name is not None:
            attrs['plan_name'] = str(plan_name).strip()

        email = attrs.get('email')
        if email is not None:
            attrs['email'] = str(email).strip()

        contact_number = attrs.get('contact_number')
        if contact_number is not None:
            attrs['contact_number'] = str(contact_number).strip()

        if not attrs.get('status') and not self.instance:
            attrs['status'] = 'Active'

        return attrs


class DoctorFeesSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    doctor_type_name = serializers.CharField(source='doctor_type.name', read_only=True)
    company = serializers.PrimaryKeyRelatedField(
        source="companies",
        queryset=Companies.objects.all(),
        required=True,
    )

    class Meta:
        model = DoctorFees
        fields = [
            'id',
            'company',
            'doctor',
            'doctor_name',
            'department',
            'department_name',
            'doctor_type',
            'doctor_type_name',
            'fees',
            'created_on',
            'updated_on',
        ]
        read_only_fields = ('company', 'created_on', 'updated_on')

    def validate(self, attrs):
        company = (
            attrs.get('companies')
            or getattr(self.instance, 'companies', None)
            or self.context.get('company')
        )
        if not company:
            raise serializers.ValidationError({'company': 'Companies context is required.'})
        attrs['companies'] = company

        doctor = attrs.get('doctor') if 'doctor' in attrs else getattr(self.instance, 'doctor', None)
        department = attrs.get('department') if 'department' in attrs else getattr(self.instance, 'department', None)
        doctor_type = attrs.get('doctor_type') if 'doctor_type' in attrs else getattr(self.instance, 'doctor_type', None)

        errors = {}
        if doctor and doctor.company_id != company.id:
            errors['doctor'] = 'Doctor must belong to the same company.'
        if department and department.companies_id != company.id:
            errors['department'] = 'Department must belong to the same company.'
        if doctor_type and doctor_type.companies_id != company.id:
            errors['doctor_type'] = 'Doctor type must belong to the same company.'

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        if not validated_data.get('companies'):
            validated_data['companies'] = self.context.get('company')
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get('companies'):
            validated_data['companies'] = instance.companies
        return super().update(instance, validated_data)



class DutyRoasterSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    staff_username = serializers.CharField(source='staff.username', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    doctor_type_name = serializers.CharField(source='doctor_type.name', read_only=True)
    administration_type_name = serializers.CharField(
        source='administration_type.name', read_only=True
    )
    staff_department_name = serializers.CharField(
        source='staff_department.name', read_only=True
    )
    staff_job_title_name = serializers.CharField(
        source='staff_job_title.name', read_only=True
    )

    class Meta:
        model = DutyRoaster
        fields = [
            'id',
            'companies',
            'staff',
            'staff_name',
            'staff_username',
            'role',
            'department',
            'department_name',
            'doctor_type',
            'doctor_type_name',
            'administration_type',
            'administration_type_name',
            'job_title',
            'staff_department',
            'staff_department_name',
            'staff_job_title',
            'staff_job_title_name',
            'duty_date',
            'shift',
            'time_slot',
            'on_call_time',
            'notes',
            'created_on',
            'updated_on',
        ]
        read_only_fields = ('created_on', 'updated_on')

    def validate(self, attrs):
        company = (
            attrs.get('companies')
            or getattr(self.instance, 'companies', None)
            or self.context.get('company')
        )
        if not company:
            raise serializers.ValidationError({'companies': 'Companies context is required.'})
        attrs['companies'] = company

        staff = attrs.get('staff') if 'staff' in attrs else getattr(self.instance, 'staff', None)
        department = attrs.get('department') if 'department' in attrs else getattr(self.instance, 'department', None)
        doctor_type = attrs.get('doctor_type') if 'doctor_type' in attrs else getattr(self.instance, 'doctor_type', None)
        administration_type = attrs.get('administration_type') if 'administration_type' in attrs else getattr(self.instance, 'administration_type', None)
        staff_department = attrs.get('staff_department') if 'staff_department' in attrs else getattr(self.instance, 'staff_department', None)
        staff_job_title = attrs.get('staff_job_title') if 'staff_job_title' in attrs else getattr(self.instance, 'staff_job_title', None)
        role_value = attrs.get('role') if 'role' in attrs else getattr(self.instance, 'role', None)
        if not role_value and staff is not None:
            role_value = getattr(staff, 'role', None)
        normalized_role = str(role_value or '').strip().lower()

        # Ensure staff roster entries inherit title/department from the staff profile.
        if 'staff' in normalized_role:
            if not staff_job_title and staff is not None:
                staff_job_title = getattr(staff, 'staff_job_title', None)
                if staff_job_title is not None:
                    attrs['staff_job_title'] = staff_job_title
            if not staff_department and staff is not None:
                staff_department = getattr(staff, 'staff_department', None)
                if staff_department is not None:
                    attrs['staff_department'] = staff_department
            if not staff_department and staff_job_title is not None:
                staff_department = getattr(staff_job_title, 'staff_department', None)
                if staff_department is not None:
                    attrs['staff_department'] = staff_department

        errors = {}
        if staff and staff.company_id != company.id:
            errors['staff'] = 'Staff must belong to the same company.'
        if department and department.companies_id != company.id:
            errors['department'] = 'Department must belong to the same company.'
        if doctor_type and doctor_type.companies_id != company.id:
            errors['doctor_type'] = 'Doctor type must belong to the same company.'
        if administration_type and administration_type.companies_id != company.id:
            errors['administration_type'] = 'Administration type must belong to the same company.'
        if staff_department and staff_department.companies_id != company.id:
            errors['staff_department'] = 'Staff department must belong to the same company.'
        if staff_job_title and staff_job_title.companies_id != company.id:
            errors['staff_job_title'] = 'Staff job title must belong to the same company.'
        if (
            staff_job_title
            and staff_department
            and staff_job_title.staff_department_id != staff_department.id
        ):
            errors['staff_job_title'] = 'Staff job title must belong to the selected staff department.'
        if 'staff' in normalized_role and not staff_job_title:
            errors['staff_job_title'] = (
                'Staff job title is required for staff duty roster. '
                'Please assign a staff job title to this user.'
            )

        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class AdministrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    full_name = serializers.CharField(source='name')
    phone = serializers.CharField(source='mobile')
    administration_type_name = serializers.CharField(
        source='administration_type.name', read_only=True
    )
    staff_department_name = serializers.CharField(
        source='staff_department.name', read_only=True
    )
    staff_job_title_name = serializers.CharField(
        source='staff_job_title.name', read_only=True
    )
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    can_access = serializers.BooleanField(required=False)
    image_url = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = CompanyUser
        fields = [
            'id', 'company', 'company_name',
            'full_name', 'email', 'phone', 'whatsapp_number', 'password', 'role',
            'administration_type', 'administration_type_name',
            'staff_department', 'staff_department_name',
            'staff_job_title', 'staff_job_title_name',
            'job_title',
            'attachment_id',
            'image_url',
            'profile_image',
            'is_approve', 'can_access', 'delist', 'created_by', 'created_on',
            'updated_by', 'updated_on', 'delisted_by', 'delisted_on',
        ]
        extra_kwargs = {
            'company': {'required': True},
            'job_title': {'required': False},
        }

    def get_image_url(self, obj):
        if getattr(obj, 'image_url', None):
            return obj.image_url
        attachment_id = getattr(obj, 'attachment_id', None)
        if not attachment_id:
            return None
        request = self.context.get('request') if hasattr(self, 'context') else None
        if not request:
            return None
        return getImageAsBase64(request, attachment_id)

    def get_profile_image(self, obj):
        return self.get_image_url(obj)

    def validate_email(self, value):
        if self.instance and value == self.instance.email:
            return value
        User = get_user_model()
        user_qs = User.objects.filter(email=value)
        admin_qs = CompanyUser.objects.filter(email=value, role__iexact='administration')
        if self.instance:
            admin_qs = admin_qs.exclude(pk=self.instance.pk)
        if user_qs.exists() or admin_qs.exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate_phone(self, value):
        User = get_user_model()
        user_qs = User.objects.filter(phone_number=value)
        if self.instance:
            current_email = (self.instance.email or "").strip()
            current_username = (self.instance.username or "").strip()
            user_lookup = Q()
            if current_email:
                user_lookup |= Q(email__iexact=current_email) | Q(username__iexact=current_email)
            if current_username:
                user_lookup |= Q(username__iexact=current_username)
            if user_lookup:
                user_qs = user_qs.exclude(user_lookup)
        if self.instance and value == self.instance.mobile:
            return value
        qs = CompanyUser.objects.filter(mobile=value, role__iexact='administration')
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if user_qs.exists() or qs.exists():
            raise serializers.ValidationError("This phone number is already in use.")
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError(
                {'password': 'Password is required when creating an administration user.'}
            )
        role = (attrs.get('role') or getattr(self.instance, 'role', '') or '').lower()
        if self.instance is None and role == 'administration' and not attrs.get('job_title'):
            raise serializers.ValidationError(
                {'job_title': 'Job title is required when creating an administration user.'}
            )
        if self.instance is None and role == 'staff':
            if not attrs.get('staff_department'):
                raise serializers.ValidationError(
                    {'staff_department': 'Staff department is required when creating a staff user.'}
                )
            if not attrs.get('staff_job_title'):
                raise serializers.ValidationError(
                    {'staff_job_title': 'Staff job title is required when creating a staff user.'}
                )
        company = attrs.get('company') or getattr(self.instance, 'company', None)
        administration_type = (
            attrs.get('administration_type')
            if 'administration_type' in attrs
            else getattr(self.instance, 'administration_type', None)
        )
        if administration_type and company and administration_type.companies_id != company.id:
            raise serializers.ValidationError(
                {'administration_type': 'Administration type must belong to the same company.'}
            )
        staff_department = (
            attrs.get('staff_department')
            if 'staff_department' in attrs
            else getattr(self.instance, 'staff_department', None)
        )
        if staff_department and company and staff_department.companies_id != company.id:
            raise serializers.ValidationError(
                {'staff_department': 'Staff department must belong to the same company.'}
            )
        staff_job_title = (
            attrs.get('staff_job_title')
            if 'staff_job_title' in attrs
            else getattr(self.instance, 'staff_job_title', None)
        )
        if staff_job_title and company and staff_job_title.companies_id != company.id:
            raise serializers.ValidationError(
                {'staff_job_title': 'Staff job title must belong to the same company.'}
            )
        if staff_job_title and staff_department and staff_job_title.staff_department_id != staff_department.id:
            raise serializers.ValidationError(
                {'staff_job_title': 'Staff job title must belong to the selected staff department.'}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        User = get_user_model()
        email = validated_data.get('email')
        username = (email or validated_data.get('username') or "").strip().lower()
        phone_number = (validated_data.get('mobile') or "").strip()
        user = User.objects.filter(
            Q(email__iexact=email) | Q(username__iexact=username)
        ).first() if username or email else None
        if user:
            updates = []
            if phone_number and user.phone_number != phone_number:
                if User.objects.filter(phone_number=phone_number).exclude(pk=user.pk).exists():
                    raise serializers.ValidationError(
                        {'phone': 'This phone number is already in use.'}
                    )
                user.phone_number = phone_number
                updates.append('phone_number')
            if password:
                user.set_password(password)
                updates.append('password')
            desired_active = validated_data.get('is_approve', False)
            if user.is_active != desired_active:
                user.is_active = desired_active
                updates.append('is_active')
            if updates:
                user.save(update_fields=updates)
        elif username:
            user = User.objects.create_user(
                username=username,
                email=email,
                phone_number=phone_number,
                password=password,
                is_active=validated_data.get('is_approve', False),
            )

        validated_data.setdefault('username', username)
        validated_data.setdefault('role', 'administration')
        validated_data.setdefault('is_staff', True)
        validated_data.setdefault('is_active', validated_data.get('is_approve', False))

        return CompanyUser.objects.create(**validated_data)

    def update(self, instance, validated_data):
        User = get_user_model()
        new_email = validated_data.get('email', instance.email)
        email_changed = new_email != instance.email

        user = None
        if email_changed:
            user = User.objects.filter(email=instance.email).first()
            if user:
                user.email = new_email
                user.username = new_email
                user.save(update_fields=['email', 'username'])
        else:
            user = User.objects.filter(email=new_email).first()

        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            if attr == 'administration_type' and not value:
                value = None
            setattr(instance, attr, value)

        if email_changed and new_email:
            instance.username = new_email

        instance.save()

        if password and user:
            user.set_password(password)
            user.save(update_fields=['password'])

        return instance


class DelistedCompanyUserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='name')
    phone = serializers.CharField(source='mobile')
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    doctor_type_name = serializers.CharField(source='doctor_type.name', read_only=True)
    administration_type_name = serializers.CharField(
        source='administration_type.name', read_only=True
    )
    staff_department_name = serializers.CharField(
        source='staff_department.name', read_only=True
    )
    staff_job_title_name = serializers.CharField(
        source='staff_job_title.name', read_only=True
    )
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanyUser
        fields = [
            'id',
            'company',
            'company_name',
            'full_name',
            'email',
            'phone',
            'whatsapp_number',
            'role',
            'department_name',
            'doctor_type_name',
            'medical_council_registration',
            'administration_type_name',
            'staff_department_name',
            'staff_job_title_name',
            'job_title',
            'attachment_id',
            'image_url',
            'is_approve',
            'delist',
            'delisted_by',
            'delisted_on',
        ]

    def get_image_url(self, obj):
        if getattr(obj, 'image_url', None):
            return obj.image_url
        attachment_id = getattr(obj, 'attachment_id', None)
        if not attachment_id:
            return None
        request = self.context.get('request') if hasattr(self, 'context') else None
        if not request:
            return None
        return getImageAsBase64(request, attachment_id)


class WardSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source='companies.company_name',
        read_only=True,
    )
    gender_type_display = serializers.CharField(
        source='get_gender_type_display',
        read_only=True,
    )

    class Meta:
        model = Ward
        fields = [
            'id',
            'companies',
            'company_name',
            'name',
            'ward_code',
            'gender_type',
            'gender_type_display',
            'status',
            'created_on',
            'created_by',
            'updated_on',
            'updated_by',
            'delist',
        ]
        read_only_fields = ['created_on', 'updated_on']
        extra_kwargs = {
            'companies': {'required': True},
            'name': {'required': True},
            'ward_code': {'read_only': True},
        }


class RoomSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source='companies.company_name',
        read_only=True,
    )
    ward_name = serializers.CharField(source='ward.name', read_only=True)
    ward_gender_type = serializers.CharField(source='ward.get_gender_type_display', read_only=True)
    floor_label = serializers.CharField(source='floor.floor_no', read_only=True)

    class Meta:
        model = Room
        fields = [
            'id',
            'companies',
            'company_name',
            'room_no',
            'room_type',
            'ward',
            'ward_name',
            'ward_gender_type',
            'floor',
            'floor_label',
            'price_per_day',
            'status',
            'created_on',
            'created_by',
            'updated_on',
            'updated_by',
            'delist',
        ]
        read_only_fields = ['created_on', 'updated_on']
        extra_kwargs = {
            'companies': {'required': True},
            'room_no': {'required': True},
        }

    def validate(self, attrs):
        company = attrs.get('companies') or getattr(self.instance, 'companies', None)
        ward = attrs.get('ward') if 'ward' in attrs else getattr(self.instance, 'ward', None)
        floor = attrs.get('floor') if 'floor' in attrs else getattr(self.instance, 'floor', None)
        errors = {}
        if company and ward and ward.companies_id != company.id:
            errors['ward'] = 'Ward must belong to the same company.'
        if company and floor and floor.companies_id != company.id:
            errors['floor'] = 'Floor must belong to the same company.'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class BedSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source='companies.company_name',
        read_only=True,
    )
    room_no = serializers.CharField(source='room.room_no', read_only=True)
    ward_name = serializers.CharField(source='room.ward.name', read_only=True)
    ward_gender_type = serializers.CharField(
        source='room.ward.get_gender_type_display', read_only=True
    )

    class Meta:
        model = Bed
        fields = [
            'id',
            'companies',
            'company_name',
            'bed_no',
            'room',
            'room_no',
            'ward_name',
            'ward_gender_type',
            'status',
            'is_available',
            'created_on',
            'updated_on',
            'delist',
        ]
        read_only_fields = ['created_on', 'updated_on']

        extra_kwargs = {
            'companies': {'required': True},
            'bed_no': {'required': True},
            'status': {'required': False},
        }

    def create(self, validated_data):
        # Nothing extra needed because model has no extra fields
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Nothing extra needed
        return super().update(instance, validated_data)
