from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers


from django.db.models import Q

from .models import Organization, OrganizationInfo, OrganizationUser


User = get_user_model()
ORGANIZATION_USER_CATEGORY_CHOICES = ("Vidya", "Swasthya", "Ashram")


def _is_level1(value):
    normalized = str(value or "").strip().lower()
    return normalized in {"lvl1", "level1"}


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    fatherOrHusband = serializers.CharField(max_length=50, required=False, allow_blank=True)
    aliasName = serializers.CharField(max_length=30, required=False, allow_blank=True)
    mobile = serializers.CharField(max_length=30, required=False, allow_blank=True)
    whatsapp_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    image_url = serializers.CharField(max_length=150, required=False, allow_blank=True)
    subscription_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    attachment_id = serializers.IntegerField(required=False, allow_null=True)
    registrationDate = serializers.DateTimeField(required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=120, required=False, allow_blank=True)
    state = serializers.CharField(max_length=120, required=False, allow_blank=True)
    country = serializers.CharField(max_length=120, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    department = serializers.IntegerField(required=False, allow_null=True)
    doctor_type = serializers.IntegerField(required=False, allow_null=True)
    administration_type = serializers.IntegerField(required=False, allow_null=True)
    staff_department = serializers.IntegerField(required=False, allow_null=True)
    staff_job_title = serializers.IntegerField(required=False, allow_null=True)
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True)
    level = serializers.CharField(max_length=100, required=False, allow_blank=True)
    association_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    medical_council_registration = serializers.CharField(max_length=120, required=False, allow_blank=True)
    is_approve = serializers.BooleanField(required=False)
    delist = serializers.BooleanField(required=False)
    created_by = serializers.CharField(max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(max_length=100, required=False, allow_blank=True)
    is_superuser = serializers.BooleanField(required=False)
    is_googleuser = serializers.BooleanField(required=False)
    firstLoggedIn = serializers.BooleanField(required=False)
    disclaimer = serializers.BooleanField(required=False)
    is_admin = serializers.BooleanField(required=False)
    can_access = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)
    is_verified = serializers.BooleanField(required=False)
    is_mobile_verified = serializers.BooleanField(required=False)
    about = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    is_staff = serializers.BooleanField(required=False)
    is_owner = serializers.BooleanField(required=False)
    is_manager = serializers.BooleanField(required=False)
    is_assistant = serializers.BooleanField(required=False)
    excellency_point = serializers.CharField(max_length=30, required=False, allow_blank=True)
    app_wise_home_pages = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=False,
        allow_empty=True,
    )
    password_reset_link_sent_at = serializers.DateTimeField(required=False, allow_null=True)
    password_reset_token = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True, default="user")
    organization_id = serializers.IntegerField(required=False)
    company_id = serializers.IntegerField(required=False)

    def _resolve_company_id(self, attrs):
        organization_id = attrs.get("organization_id")
        company_id = attrs.get("company_id")
        return company_id or organization_id

    def validate(self, attrs):
        company_id = self._resolve_company_id(attrs)
        if not company_id:
            raise serializers.ValidationError(
                {"company_id": "company_id or organization_id is required."}
            )
        if not Organization.objects.filter(id=company_id).exists():
            raise serializers.ValidationError("Organization not found.")
        attrs["company_id"] = company_id
        return attrs

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Phone number already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        def resolve_fk_id(app_label, model_name, field_label, value):
            if value is None:
                return None
            try:
                model_cls = apps.get_model(app_label, model_name)
            except LookupError:
                return None
            if not model_cls.objects.filter(id=value).exists():
                raise serializers.ValidationError(
                    {field_label: f"Invalid {field_label} id."}
                )
            return value

        organization_id = validated_data.pop("company_id")
        validated_data.pop("organization_id", None)
        if not validated_data.get("password"):
            validated_data["password"] = "abc123"
        role = validated_data.pop("role", "user")
        if not OrganizationUser.objects.filter(company_id=organization_id).exists():
            role = "admin"
        address = validated_data.pop("address", "")
        _city = validated_data.pop("city", "")
        _state = validated_data.pop("state", "")
        _country = validated_data.pop("country", "")
        _postal_code = validated_data.pop("postal_code", "")
        name = validated_data.pop("name", "").strip()
        father_or_husband = validated_data.pop("fatherOrHusband", "").strip() or None
        alias_name = validated_data.pop("aliasName", "").strip()
        mobile = validated_data.pop("mobile", "").strip()
        whatsapp_number = validated_data.pop("whatsapp_number", "").strip() or None
        image_url = validated_data.pop("image_url", "").strip()
        subscription_id = validated_data.pop("subscription_id", "").strip()
        attachment_id = validated_data.pop("attachment_id", None)
        registration_date = validated_data.pop("registrationDate", None)
        department_id = resolve_fk_id(
            "hospital_management",
            "Department",
            "department",
            validated_data.pop("department", None),
        )
        doctor_type_id = resolve_fk_id(
            "hospital_management",
            "DoctorType",
            "doctor_type",
            validated_data.pop("doctor_type", None),
        )
        administration_type_id = resolve_fk_id(
            "hospital_management",
            "AdministrationType",
            "administration_type",
            validated_data.pop("administration_type", None),
        )
        staff_department_id = resolve_fk_id(
            "hospital_management",
            "StaffDepartment",
            "staff_department",
            validated_data.pop("staff_department", None),
        )
        staff_job_title_id = resolve_fk_id(
            "hospital_management",
            "StaffJobTitle",
            "staff_job_title",
            validated_data.pop("staff_job_title", None),
        )
        job_title = validated_data.pop("job_title", "").strip()
        category = validated_data.pop("category", "").strip()
        level = validated_data.pop("level", "").strip()
        association_type = validated_data.pop("association_type", "").strip() or None
        medical_council_registration = validated_data.pop("medical_council_registration", "").strip()
        is_approve = validated_data.pop("is_approve", False)
        delist = validated_data.pop("delist", False)
        created_by = validated_data.pop("created_by", "").strip() or None
        updated_by = validated_data.pop("updated_by", "").strip() or None
        is_superuser = validated_data.pop("is_superuser", False)
        is_googleuser = validated_data.pop("is_googleuser", False)
        first_logged_in = validated_data.pop("firstLoggedIn", True)
        disclaimer = validated_data.pop("disclaimer", False)
        is_admin = validated_data.pop("is_admin", False)
        can_access = validated_data.pop("can_access", False)
        is_active = validated_data.pop("is_active", False)
        is_verified = validated_data.pop("is_verified", False)
        is_mobile_verified = validated_data.pop("is_mobile_verified", False)
        about = validated_data.pop("about", "").strip()
        is_staff = validated_data.pop("is_staff", False)
        is_owner = validated_data.pop("is_owner", False)
        is_manager = validated_data.pop("is_manager", False)
        is_assistant = validated_data.pop("is_assistant", False)
        excellency_point = validated_data.pop("excellency_point", "").strip()
        app_wise_home_pages = validated_data.pop("app_wise_home_pages", [])
        password_reset_link_sent_at = validated_data.pop("password_reset_link_sent_at", None)
        password_reset_token = validated_data.pop("password_reset_token", "").strip()
        if role == "admin":
            is_admin = True
            is_approve = True
            if not is_active:
                is_active = True
            if not category:
                category = "all"
            if not level:
                level = "Level1"

        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            raise serializers.ValidationError("Organization not found.")
        try:
            user = User.objects.create_user(**validated_data)
        except Exception as exc:
            raise serializers.ValidationError(str(exc))
        organization_user_data = {
            "user": user,
            "company": organization,
            "name": name or f"{user.first_name} {user.last_name}".strip() or user.username,
            "fatherOrHusband": father_or_husband,
            "aliasName": alias_name,
            "username": user.username,
            "email": user.email,
            "phone_number": user.phone_number,
            "mobile": mobile or user.phone_number,
            "image_url": image_url,
            "whatsapp_number": whatsapp_number,
            "subscription_id": subscription_id,
            "attachment_id": attachment_id,
            "role": role,
            "department_id": department_id,
            "doctor_type_id": doctor_type_id,
            "administration_type_id": administration_type_id,
            "staff_department_id": staff_department_id,
            "staff_job_title_id": staff_job_title_id,
            "job_title": job_title,
            "category": category,
            "level": level,
            "association_type": association_type,
            "medical_council_registration": medical_council_registration,
            "is_approve": is_approve,
            "delist": delist,
            "created_by": created_by,
            "updated_by": updated_by,
            "is_superuser": is_superuser,
            "is_googleuser": is_googleuser,
            "firstLoggedIn": first_logged_in,
            "disclaimer": disclaimer,
            "is_admin": is_admin,
            "can_access": can_access,
            "is_active": is_active,
            "is_verified": is_verified,
            "is_mobile_verified": is_mobile_verified,
            "about": about,
            "address": address,
            "is_staff": is_staff,
            "is_owner": is_owner,
            "is_manager": is_manager,
            "is_assistant": is_assistant,
            "excellency_point": excellency_point,
            "app_wise_home_pages": app_wise_home_pages,
            "password_reset_link_sent_at": password_reset_link_sent_at,
            "password_reset_token": password_reset_token,
        }
        if registration_date is not None:
            organization_user_data["registrationDate"] = registration_date

        try:
            OrganizationUser.objects.create(
                **organization_user_data,
            )
        except Exception as exc:
            raise serializers.ValidationError(str(exc))

        return user


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        login_identifier = attrs.get("login")
        password = attrs.get("password")

        user = User.objects.filter(
            Q(username=login_identifier)
            | Q(email__iexact=login_identifier)
            | Q(phone_number=login_identifier)
        ).first()

        if user is None or not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials.")

        attrs["user"] = user
        return attrs


class OrganizationInfoSerializer(serializers.ModelSerializer):
    organization_id = serializers.IntegerField(source="organization.id", read_only=True)
    id = serializers.IntegerField(source="organization.id", read_only=True)
    company_id = serializers.IntegerField(source="organization.id", read_only=True)
    company_name = serializers.CharField(source="organization_name", required=False, allow_blank=True)
    company_logo_id = serializers.IntegerField(source="organization_logo_id", required=False, allow_null=True)
    attachment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )
    background_attachment_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = OrganizationInfo
        fields = [
            "id",
            "organization_id",
            "company_id",
            "organization_logo_id",
            "company_logo_id",
            "attachment_ids",
            "background_attachment_id",
            "country",
            "organization_name",
            "company_name",
            "head_office",
            "head_office_state",
            "currency_code",
            "date_format",
            "language",
            "head_office_gstin",
            "address",
            "city",
            "pin",
            "admin_name",
            "mobile_no",
            "email",
            "comments",
            "branch_offices",
            "mobile_for_crm",
            "whatsapp_for_crm",
            "gmail_for_crm",
            "crm_gmail_password",
        ]

    def create(self, validated_data):
        raise NotImplementedError("Use update_or_create with organization explicitly.")


class OrganizationUserListSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(read_only=True)
    company_name = serializers.SerializerMethodField()
    organization = serializers.PrimaryKeyRelatedField(source="company", read_only=True)
    organization_name = serializers.SerializerMethodField()

    def get_company_name(self, obj):
        organization = getattr(obj, "company", None)
        return getattr(organization, "name", "") if organization else ""

    def get_organization_name(self, obj):
        organization = getattr(obj, "company", None)
        return getattr(organization, "name", "") if organization else ""

    class Meta:
        model = OrganizationUser
        fields = [
            "id",
            "user",
            "company",
            "company_name",
            "organization",
            "organization_name",
            "username",
            "email",
            "phone_number",
            "mobile",
            "name",
            "image_url",
            "attachment_id",
            "address",
            "role",
            "category",
            "level",
            "is_approve",
            "delist",
            "delisted_by",
            "delisted_on",
            "created_on",
            "updated_on",
        ]


class OrganizationUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationUser
        fields = ["role", "level", "category", "is_approve", "delist"]

    def update(self, instance, validated_data):
        request = self.context.get("request")
        role = validated_data.get("role", instance.role)

        if "role" in validated_data:
            instance.role = role
            if str(role).strip().lower() == "admin":
                instance.is_admin = True
                instance.is_approve = True
                instance.is_active = True

        if "level" in validated_data:
            instance.level = validated_data["level"]
            if _is_level1(instance.level):
                instance.category = "all"

        if "category" in validated_data:
            if not _is_level1(instance.level):
                instance.category = validated_data["category"]

        if "is_approve" in validated_data:
            instance.is_approve = validated_data["is_approve"]
            if instance.is_approve:
                instance.is_active = True

        if "delist" in validated_data:
            instance.delist = validated_data["delist"]
            if instance.delist:
                instance.delisted_by = (
                    getattr(request.user, "username", None) if request else None
                )
                instance.delisted_on = timezone.now()
            else:
                instance.delisted_by = ""
                instance.delisted_on = None

        if request and request.user and request.user.is_authenticated:
            instance.updated_by = request.user.username
        instance.updated_on = timezone.now()
        instance.save()
        return instance


class OrganizationSerializer(serializers.ModelSerializer):
    admin_user_display = serializers.SerializerMethodField()

    def get_admin_user_display(self, obj):
        admin_user = (
            obj.organization_users.filter(Q(is_admin=True) | Q(role__iexact="admin"))
            .order_by("-created_at")
            .first()
        )
        if not admin_user:
            return ""
        return admin_user.username or admin_user.name or ""

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "admin_user_name",
            "admin_user_display",
            "email",
            "phone_number",
            "address",
            "city",
            "state",
            "country",
            "postal_code",
            "is_active",
            "is_approve",
            "is_approved",
            "delist",
            "registrationDate",
            "active_from",
            "active_upto",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        validated_data["name"] = (validated_data.get("name") or "").strip()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "name" in validated_data:
            validated_data["name"] = (validated_data.get("name") or "").strip()
        if "is_approve" in validated_data and "is_approved" not in validated_data:
            validated_data["is_approved"] = validated_data["is_approve"]
        if "is_approved" in validated_data and "is_approve" not in validated_data:
            validated_data["is_approve"] = validated_data["is_approved"]
        return super().update(instance, validated_data)


class OrganizationProvisionSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    org_code = serializers.CharField(max_length=6)
    admin_name = serializers.CharField(max_length=50)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=6)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=120, required=False, allow_blank=True)
    state = serializers.CharField(max_length=120, required=False, allow_blank=True)
    country = serializers.CharField(max_length=120, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def _sanitize_org_code(self, value):
        return "".join(ch for ch in str(value or "").strip().lower() if ch.isalnum())[:6]

    def _sanitize_username_base(self, value):
        raw = str(value or "").strip().lower()
        if "." in raw:
            raw = raw.split(".", 1)[0]
        sanitized = []
        for ch in raw:
            if ch.isalnum() or ch == "_":
                sanitized.append(ch)
            elif ch.isspace():
                sanitized.append("_")
        return "".join(sanitized).strip("_")

    def validate_name(self, value):
        normalized = str(value or "").strip()
        if Organization.objects.filter(name__iexact=normalized).exists():
            raise serializers.ValidationError("Organization name already exists.")
        return normalized

    def validate_org_code(self, value):
        normalized = self._sanitize_org_code(value)
        if len(normalized) < 3:
            raise serializers.ValidationError("Org code must be at least 3 characters.")
        return normalized

    def validate_admin_name(self, value):
        normalized = str(value or "").strip()
        if not normalized:
            raise serializers.ValidationError("Admin name is required.")
        return normalized

    def validate(self, attrs):
        username_base = self._sanitize_username_base(attrs.get("username"))
        org_code = attrs.get("org_code")

        if not username_base:
            raise serializers.ValidationError({"username": "Username is required."})

        final_username = f"{username_base}.{org_code}"
        email = str(attrs.get("email") or "").strip()
        phone_number = str(attrs.get("phone_number") or "").strip()

        if User.objects.filter(username__iexact=final_username).exists():
            raise serializers.ValidationError({"username": "Username already exists."})
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "Email already exists."})
        if User.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError({"phone_number": "Phone number already exists."})

        attrs["username"] = final_username
        attrs["email"] = email
        attrs["phone_number"] = phone_number
        return attrs
