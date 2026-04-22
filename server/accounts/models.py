from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone

from .managers import UserManager


class User(AbstractUser):
    email = models.EmailField(unique=True, null=True, blank=True, default=None)
    phone_number = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        default=None,
    )
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.username


class Organization(models.Model):
    name = models.CharField(max_length=255, unique=True)
    admin_user_name = models.CharField(max_length=150, unique=True, null=True, blank=True, default=None)
    email = models.EmailField(blank=True, default="")
    phone_number = models.CharField(max_length=20, blank=True, default="")
    address = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=120, blank=True, default="")
    state = models.CharField(max_length=120, blank=True, default="")
    country = models.CharField(max_length=120, blank=True, default="")
    postal_code = models.CharField(max_length=20, blank=True, default="")
    is_active = models.BooleanField(default=True)
    is_approve = models.BooleanField(default=False)
    delist = models.BooleanField(default=False)
    registrationDate = models.DateTimeField(default=timezone.now)
    is_approved = models.BooleanField(default=False)
    active_from = models.DateTimeField(blank=True, null=True, default=None)
    active_upto = models.DateTimeField(blank=True, null=True, default=None)
    created_by = models.CharField(max_length=100, null=True, blank=True, default=None)
    updated_by = models.CharField(max_length=100, null=True, blank=True, default=None)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id} - {self.name}"


class OrganizationUser(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="organization_user",
    )

    company = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="organization_users",
    )

    name = models.CharField(max_length=50, default=None)
    fatherOrHusband = models.CharField(
        max_length=50, default=None, null=True, blank=True
    )
    aliasName = models.CharField(
        max_length=30, default="", null=True, blank=True
    )
    username = models.CharField(max_length=100, null=False, default="")
    email = models.EmailField(verbose_name="email", max_length=60, unique=False, null=True)
    mobile = models.CharField(max_length=30, null=True, default="", blank=True)
    image_url = models.CharField(max_length=150, default="", null=True, blank=True)
    whatsapp_number = models.CharField(
        max_length=20, null=True, blank=True, default=None
    )
    subscription_id = models.CharField(
        max_length=100, default="", null=True, blank=True
    )
    attachment_id = models.IntegerField(null=True, blank=True)
    registrationDate = models.DateTimeField(default=timezone.now)
    role = models.CharField(max_length=50, default=None, null=True, blank=True)

    department = models.ForeignKey(
        "hospital_management.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organization_doctor_users",
    )
    doctor_type = models.ForeignKey(
        "hospital_management.DoctorType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organization_doctor_users",
    )
    administration_type = models.ForeignKey(
        "hospital_management.AdministrationType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organization_doctor_users",
    )
    staff_department = models.ForeignKey(
        "hospital_management.StaffDepartment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organization_staff_users",
    )
    staff_job_title = models.ForeignKey(
        "hospital_management.StaffJobTitle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organization_staff_users",
    )
    job_title = models.CharField(max_length=100, default="", null=True, blank=True)
    category = models.CharField(max_length=100, default="", null=True, blank=True)
    level = models.CharField(max_length=100, default="", null=True, blank=True)
    association_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default=None,
    )
    medical_council_registration = models.CharField(
        max_length=120,
        null=True,
        blank=True,
        default="",
    )

    # Keep for API compatibility
    phone_number = models.CharField(max_length=20, default="")

    is_approve = models.BooleanField(default=False)
    delist = models.BooleanField(default=False)
    delisted_by = models.CharField(
        max_length=100, blank=True, null=True, default=""
    )
    delisted_on = models.DateTimeField(
        blank=True, null=True, default=None
    )
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    updated_on = models.DateTimeField(default=timezone.now)

    is_superuser = models.BooleanField(default=False)
    is_googleuser = models.BooleanField(default=False)
    firstLoggedIn = models.BooleanField(default=True)
    disclaimer = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    can_access = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_mobile_verified = models.BooleanField(default=False)
    about = models.CharField(max_length=1000, blank=False, null=True)
    address = models.CharField(max_length=1000, blank=False, null=True)
    is_staff = models.BooleanField(default=False)
    is_owner = models.BooleanField(default=False)
    is_manager = models.BooleanField(default=False)
    is_assistant = models.BooleanField(default=False)
    excellency_point = models.CharField(
        max_length=30, null=True, default="", blank=True
    )
    app_wise_home_pages = ArrayField(
        models.CharField(max_length=500, blank=True, null=True, default=""),
        null=True,
        blank=True,
        default=list,
    )
    password_reset_link_sent_at = models.DateTimeField(null=True, blank=True)
    password_reset_token = models.CharField(
        max_length=150, default="", null=True, blank=True
    )

    # Legacy timestamp aliases still used in list/order code.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def organization(self):
        return self.company

    @organization.setter
    def organization(self, value):
        self.company = value

    def save(self, *args, **kwargs):
        if self.mobile and not self.phone_number:
            self.phone_number = self.mobile
        if self.phone_number and not self.mobile:
            self.mobile = self.phone_number
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id},{self.name}"


class LoginActivity(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="login_activities",
    )
    access_token = models.CharField(max_length=512, null=False, blank=False, default="")
    active_from = models.DateTimeField(null=False, blank=False)
    active_to = models.DateTimeField(null=True, blank=True, default=None)

    class Meta:
        indexes = [
            models.Index(fields=["user", "active_from"]),
            models.Index(fields=["access_token"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.active_from}"


class OrganizationInfo(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="organization_info",
        primary_key=True,
    )
    organization_logo_id = models.IntegerField(null=True, blank=True)
    attachment_ids = ArrayField(
        models.IntegerField(null=True, blank=True),
        null=True,
        blank=True,
        default=list,
    )
    background_attachment_id = models.IntegerField(null=True, blank=True)
    country = models.CharField(max_length=100, null=True, default='')
    organization_name = models.CharField(max_length=100, null=True, default='')
    head_office = models.CharField(max_length=100, null=True, default='')
    head_office_state = models.CharField(max_length=100, null=True, default='')
    currency_code = models.CharField(max_length=50, null=True, default='USD')
    date_format = models.CharField(
        max_length=50, null=True, default='MMM DD, YYYY')

    language = models.CharField(max_length=10, null=True, default='en-US')
    head_office_gstin = models.CharField(max_length=50, null=True, default='')
    address = models.CharField(max_length=50, null=True, default='')
    city = models.CharField(max_length=50, null=True, default='')
    pin = models.CharField(max_length=50, null=True, default='')
    admin_name = models.CharField(max_length=50, null=True, default='')
    mobile_no = models.CharField(max_length=15, default='9999999999')
    email = models.EmailField(max_length=50, null=True, default='')
    comments = models.CharField(
        max_length=300, default=None, null=True, blank=True)
    branch_offices = ArrayField(models.JSONField(
        null=True, blank=True, default=None), null=True, blank=True, default=list)

    mobile_for_crm = models.CharField(
        max_length=100, default=None, null=True, blank=True)
    whatsapp_for_crm = models.CharField(
        max_length=100, default=None, null=True, blank=True)
    gmail_for_crm = models.CharField(
        max_length=100, default=None, null=True, blank=True)
    crm_gmail_password = models.CharField(
        max_length=100, default=None, null=True, blank=True)


    def __str__(self):
        return f"{self.organization_id}"


class UserGroup(models.Model):
    name = models.CharField(max_length=120, unique=True)

    def __str__(self):
        return self.name
