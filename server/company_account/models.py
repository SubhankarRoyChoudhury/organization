from email.policy import default
from django.db import models
from django.db.models import Q
from django.utils import timezone

from django.contrib.postgres.fields.array import ArrayField


class Companies(models.Model):
    company_name = models.CharField(
        max_length=100, unique=True, null=False, default=None)
    company_id = models.CharField(
        max_length=50,  null=True, blank=True, default=None)
    organization_id = models.CharField(
        max_length=50,  null=True, blank=True, default=None)
    username = models.CharField(max_length=100, default="", null=True)
    address = models.CharField(
        max_length=100, unique=False, default=None, null=True, blank=True)
    pin = models.CharField(max_length=30, unique=False,
                           default=None, null=True, blank=True)
    admin_name = models.CharField(max_length=50, unique=False, default=None)
    father_name = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    mobile = models.CharField(
        max_length=100, unique=False, null=True, blank=True, default=None)
    email = models.EmailField(
        verbose_name="email",
        max_length=60,
        unique=False,
        null=True,
        blank=True,
        default=None,
    )
    registrationDate = models.DateTimeField(default=timezone.now)
    main_group = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    sub_group = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    school_category = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    location = models.CharField(
        max_length=120, null=True, blank=True, default=None)
    district = models.CharField(
        max_length=120, null=True, blank=True, default=None)
    school_code = models.CharField(
        max_length=50, null=True, blank=True, default=None)
    start_date = models.DateField(null=True, blank=True, default=None)
    subscription_plan = models.CharField(
        max_length=100, blank=True, null=True, default="free")
    is_approved = models.BooleanField(default=False)
    active_from = models.DateTimeField(blank=True, null=True, default=None)
    active_upto = models.DateTimeField(blank=True, null=True, default=None)
    is_new = models.BooleanField(default=True)

    project_mgmt = models.BooleanField(default=False)
    time_schedule = models.BooleanField(default=False)
    hrm = models.BooleanField(default=False)
    billing = models.BooleanField(default=False)
    account = models.BooleanField(default=False)
    statutory = models.BooleanField(default=False)
    asset = models.BooleanField(default=False)
    asset_lite = models.BooleanField(default=False)
    inventry = models.BooleanField(default=False)
    inventory_lite = models.BooleanField(default=False)
    crm = models.BooleanField(default=False)
    hotel = models.BooleanField(default=False)
    production = models.BooleanField(default=False)
    class_planner = models.BooleanField(default=False)
    test = models.BooleanField(default=False)
    delist = models.BooleanField(default=False)
    # logo_id_while_create = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f'{self.id},{self.company_id}'


class CompanyUser(models.Model):
    company = models.ForeignKey(Companies, on_delete=models.CASCADE,
                                null=False, blank=False, default=None, related_name='company_user')
    organization_id = models.CharField(
        max_length=50,  null=True, blank=True, default=None)
    name = models.CharField(max_length=50, default=None)
    fatherOrHusband = models.CharField(
        max_length=50, default=None, null=True, blank=True)
    aliasName = models.CharField(
        max_length=30, default='', null=True, blank=True)
    username = models.CharField(
        max_length=100, null=False, default="")
    email = models.EmailField(verbose_name="email",
                              max_length=60, unique=False, null=True)
    mobile = models.CharField(max_length=30, null=True, default='', blank=True)
    image_url = models.CharField(
        max_length=150, default='', null=True, blank=True)
    whatsapp_number = models.CharField(
        max_length=20, null=True, blank=True, default=None
    )
    subscription_id = models.CharField(
        max_length=100, default='', null=True, blank=True)
    # companies_ids = ArrayField(models.IntegerField(
    #     null=True, blank=True), null=True, blank=True, default=list)
    attachment_id = models.IntegerField(null=True, blank=True)
    registrationDate = models.DateTimeField(default=timezone.now)
    role = models.CharField(max_length=50, default=None, null=True, blank=True)
    department = models.ForeignKey(
        "hospital_management.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_users",
    )
    doctor_type = models.ForeignKey(
        "hospital_management.DoctorType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_users",
    )
    administration_type = models.ForeignKey(
        "hospital_management.AdministrationType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_users",
    )
    staff_department = models.ForeignKey(
        "hospital_management.StaffDepartment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_users",
    )
    staff_job_title = models.ForeignKey(
        "hospital_management.StaffJobTitle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_users",
    )
    job_title = models.CharField(
        max_length=100, default='', null=True, blank=True)
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
    # agree_disclaimer = models.BooleanField(default=False,null=True,blank=True)
    disclaimer = models.BooleanField(default=False)
    # Please don't use "is_admin" field, check the status from UserGroup table.
    is_admin = models.BooleanField(default=False)
    can_access = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_mobile_verified = models.BooleanField(default=False)
    about = models.CharField(max_length=1000, blank=False, null=True)
    dob = models.DateTimeField(null=True, blank=True)
    qualification = models.CharField(max_length=100, null=True, default='')
    experience = models.CharField(max_length=100, null=True, default='')
    address = models.CharField(max_length=1000, blank=False, null=True)
    country = models.CharField(max_length=100, null=True, default='')
    state = models.CharField(max_length=50, null=True, default='')
    city = models.CharField(max_length=50, null=True, default='')
    pin = models.CharField(max_length=50, null=True, default='')
    main_subject = models.JSONField(null=True, blank=True, default=list)
    others_subject = models.JSONField(null=True, blank=True, default=list)
    preferableClass = models.JSONField(null=True, blank=True, default=list)
    is_head_master = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_owner = models.BooleanField(default=False)
    # Please don't use "is_manager" field, check the status from UserGroup table.
    is_manager = models.BooleanField(default=False)
    # Please don't use "is_assistant" field, check the status from UserGroup table.
    is_assistant = models.BooleanField(default=False)
    excellency_point = models.CharField(
        max_length=30, null=True, default='', blank=True)
    app_wise_home_pages = ArrayField(models.CharField(
        max_length=500, blank=True, null=True, default=''), null=True, blank=True, default=list)
    password_reset_link_sent_at = models.DateTimeField(null=True, blank=True)
    password_reset_token = models.CharField(
        max_length=150, default='', null=True, blank=True)

    def __str__(self):
        return f'{self.id},{self.name}'


class StatutoryRegister(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False, default=0)
    desc = models.CharField(max_length=500, null=True, blank=True, default='')
    registration_no = models.CharField(
        max_length=50, null=True, blank=True, default='')
    renewed_type = models.CharField(max_length=30, blank=False, null=True)
    since = models.DateTimeField(default=timezone.now)
    renewal_date = models.DateTimeField(default=None, blank=True, null=True)

    note = models.CharField(max_length=1000, blank=False, null=True)
    attachment_id = models.CharField(
        max_length=50, null=True, blank=True, default='')


class Owners(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False, default=0)
    Name = models.CharField(max_length=50, null=True, default='')
    Designation = models.CharField(max_length=50, null=True, default='')
    email = models.EmailField(verbose_name="email",
                              max_length=60, unique=False, null=True, blank=True)
    note = models.CharField(max_length=1000, blank=False, null=True)
    otherid = models.CharField(max_length=50, null=True, default='')
    primary_admin = models.BooleanField(default=False)
    Pan = models.CharField(max_length=50, null=True, blank=True, default='')
    created_by = models.CharField(max_length=30, blank=False, null=True)
    created_on = models.DateTimeField(default=timezone.now)


class StatutoryRegisterCustomField(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False, default=0)
    name = models.CharField(max_length=100, null=False,
                            blank=False, default='')
    field_type = models.CharField(
        max_length=20, null=False, blank=False, default='text')
    created_by = models.CharField(max_length=30, blank=False, null=True)
    created_on = models.DateTimeField(default=timezone.now)


class StatutoryRegisterCustomValue(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False, default=0)
    statutory_register = models.ForeignKey(
        StatutoryRegister, on_delete=models.CASCADE, null=False, blank=False)
    custom_field = models.ForeignKey(
        StatutoryRegisterCustomField, on_delete=models.CASCADE, null=False, blank=False)
    value = models.CharField(max_length=500, null=True, blank=True, default='')


class CompanyInfo(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False, default=0)
    company_logo_id = models.IntegerField(null=True, blank=True)
    organization_id = models.CharField(
        max_length=50,  null=True, blank=True, default=None)
    country = models.CharField(max_length=100, null=True, default='')
    company_name = models.CharField(max_length=100, null=True, default='')
    head_office = models.CharField(max_length=100, null=True, default='')
    head_office_state = models.CharField(max_length=100, null=True, default='')
    currency_code = models.CharField(max_length=50, null=True, default='USD')
    date_format = models.CharField(
        max_length=50, null=True, default='MMM DD, YYYY')
    owner = models.ForeignKey(
        Owners, on_delete=models.CASCADE, null=True, blank=True,)
    statutory = models.ForeignKey(
        StatutoryRegister, on_delete=models.CASCADE, null=True, blank=True,)
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


class UserConfig(models.Model):
    username = models.CharField(max_length=50)
    dashboard = models.JSONField(default=dict, null=True, blank=True)


class TableConfig(models.Model):
    table_name = models.CharField(
        max_length=50, null=False, blank=False, default='')
    username = models.CharField(
        max_length=50, null=False, blank=False, default='')
    config = models.JSONField(null=True, blank=True, default=dict)

    class Meta:
        unique_together = ('table_name', 'username')


class Application(models.Model):
    name = models.CharField(max_length=50, unique=True,
                            null=False, blank=False, default='')
    url = models.CharField(max_length=250,
                           null=True, blank=True, default='')
    color = models.CharField(max_length=50, null=True, blank=True, default='')
    icon = models.CharField(max_length=50, null=True, blank=True, default='')

    def __str__(self):
        return f'{self.id}, {self.name}'


class WebUrl(models.Model):
    app = models.ForeignKey(
        Application, on_delete=models.CASCADE, related_name='web_url')
    url = models.CharField(max_length=500, null=False,
                           blank=False, unique=True, default=None)

    def __str__(self):
        return f'{self.id}, {self.url}'


class Api(models.Model):
    weburl = models.ForeignKey(
        WebUrl, on_delete=models.SET_NULL, null=True, blank=True, related_name='api')
    api = models.CharField(max_length=500, null=False,
                           blank=False, unique=True)


class UserRight(models.Model):
    app = models.ForeignKey(Application, on_delete=models.CASCADE)
    user = models.ForeignKey(CompanyUser, on_delete=models.CASCADE)
    can_visit = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_view_report = models.BooleanField(default=False)

    class Meta:
        unique_together = ('app', 'user')

    def __str__(self):
        return f'{self.id}, {self.app}, {self.user}'


# ACCESS_PERMISSION_CHOICES = (
#     ("no_permission", "No Permission"),
#     ("read_write", "Read & Write"),
# )

class UserGroup(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False, default=0)
    name = models.CharField(max_length=50, blank=False, null=False)
    user_ids = ArrayField(models.IntegerField(
        null=False, blank=False), null=False, blank=False, default=list)
    app_wise_home_pages = ArrayField(models.CharField(
        max_length=500, blank=True, null=True, default=''), null=True, blank=True, default=list)

    class Meta:
        unique_together = ('company_id', 'name')

    def __str__(self):
        return f'{self.id}, {self.name}'


class UrlBasedAccessControl(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False)
    user = models.ForeignKey(CompanyUser, on_delete=models.CASCADE,
                             null=True, blank=True, related_name='company_user')
    user_group = models.ForeignKey(
        UserGroup, on_delete=models.CASCADE, null=True, blank=True)
    # weburl = models.ForeignKey(WebUrl, on_delete=models.CASCADE)
    weburl = models.CharField(
        max_length=200, blank=False, null=False, default='')
    access = models.BooleanField(default=False)
    # read = models.BooleanField(default=False)
    add = models.BooleanField(default=False)
    edit = models.BooleanField(default=False)
    delete = models.BooleanField(default=False)
    print_download = models.BooleanField(default=False)
    # download = models.BooleanField(default=False)

    class Meta:
        unique_together = ('company', 'user', 'user_group', 'weburl')

    def __str__(self):
        return f'{self.id}, {self.user}, {self.weburl}'


class AllWebUrls(models.Model):
    url = models.CharField(
        max_length=500, blank=False, null=False, unique=True, default='')


class ActivityLog(models.Model):
    company_user = models.ForeignKey(
        CompanyUser, on_delete=models.CASCADE, null=False, blank=False)
    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="company_activity_logs",
    )
    token = models.CharField(null=False, blank=False, default=None)
    active_from = models.DateTimeField(null=False, blank=False, default=None)
    active_to = models.DateTimeField(null=True, blank=True, default=None)


class BusinessType(models.Model):
    name = models.CharField(max_length=200, default=None)

    def __str__(self):
        return f'{self.id},{self.name}'


class UserActivity(models.Model):
    company_user = models.ForeignKey(
        CompanyUser, on_delete=models.CASCADE, null=False, blank=False)
    token = models.CharField(null=False, blank=False, default=None)
    active_from = models.DateTimeField(null=False, blank=False, default=None)
    active_to = models.DateTimeField(null=True, blank=True, default=None)


class AppAccessControl(models.Model):
    company = models.ForeignKey(Companies, on_delete=models.CASCADE)
    application = models.ForeignKey(Application, on_delete=models.CASCADE)
    user = models.ForeignKey(
        CompanyUser, on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(
        UserGroup, on_delete=models.CASCADE, null=True, blank=True)

    # action flags (keep consistent with existing UI)
    can_access = models.BooleanField(default=False)
    can_add = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_print = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "application", "user"],
                name="uniq_app_perm_user",
                condition=Q(user__isnull=False),
            ),
            models.UniqueConstraint(
                fields=["company", "application", "group"],
                name="uniq_app_perm_group",
                condition=Q(group__isnull=False),
            ),
        ]
        indexes = [
            models.Index(fields=["company", "application"]),
            models.Index(fields=["company", "user"]),
        ]
