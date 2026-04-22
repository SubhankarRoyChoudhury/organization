from datetime import datetime
from django.contrib.postgres.fields.array import ArrayField
from django.db import models
from django.db.models.base import Model
from django.utils import timezone
from django.core.exceptions import ValidationError
from accounts.models import Organization
from company_account.models import Companies
from django.db.models.deletion import CASCADE,  SET_NULL
# from customer_management.models import Customer


# Location section start
class Location(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False, related_name="location_to_company")
    name = models.CharField(max_length=50, null=False, default=None)
    address = models.CharField(max_length=200, null=False, default=None)
    country = models.CharField(max_length=50, null=False, default=None)
    state = models.CharField(max_length=50, null=False, default=None)
    city = models.CharField(max_length=50, null=False, default=None)
    pin = models.IntegerField(null=False, default=None)
    note = models.CharField(max_length=500, null=True,
                            blank=True, default=None)
    lat = models.CharField(max_length=50, null=True, default='0.0')
    lng = models.CharField(max_length=50, null=True, default='0.0')
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'name'],
                name='company_wise_location_unique',
            ),
        ]

    def clean(self):
        # Perform case-insensitive uniqueness check
        if Location.objects.filter(
                company=self.company,
                name__iexact=self.name).exclude(pk=self.pk).exists():

            if not self.pk:  # Check if the object is being created
                raise ValidationError('This location name is already exist.')

    def save(self, *args, **kwargs):
        # If the object is being created
        if not self.pk:
            try:
                self.clean()
                super().save(*args, **kwargs)
            except ValidationError:
                # Delete the created object if uniqueness check fails
                # self.delete()
                raise
        else:
            # If the object already exists, just save it
            super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.id},{self.name}'

class SubLocation(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False)
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=50, null=False,
                            blank=False, default=None)
    note = models.CharField(max_length=500, null=True,
                            blank=True, default=None)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    delist = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'location', 'name'],
                name='location_wise_sub_location_name_unique',
            ),
        ]

    def clean(self):
        # Perform case-insensitive uniqueness check
        if SubLocation.objects.filter(
                company=self.company,
                location=self.location,
                name__iexact=self.name).exclude(pk=self.pk).exists():

            if not self.pk:  # Check if the object is being created
                raise ValidationError('This sub location name already exist.')

    def save(self, *args, **kwargs):
        # If the object is being created
        if not self.pk:
            try:
                self.clean()
                super().save(*args, **kwargs)
            except ValidationError:
                # Delete the created object if uniqueness check fails
                # self.delete()
                raise
        else:
            # If the object already exists, just save it
            super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.id},{self.name}'

class Compartment(models.Model):
    company = models.ForeignKey(
        Companies, on_delete=models.CASCADE, null=False, blank=False)
    sub_location = models.ForeignKey(
        SubLocation, on_delete=models.CASCADE, null=False, blank=False)
    name = models.CharField(max_length=50, null=False,
                            blank=False, default=None)
    note = models.CharField(max_length=500, null=True,
                            blank=True, default=None)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'sub_location', 'name'],
                name='sub_location_wise_compartment_name_unique',
            ),
        ]

    def clean(self):
        # Perform case-insensitive uniqueness check
        if Compartment.objects.filter(
                company=self.company,
                sub_location=self.sub_location,
                name__iexact=self.name).exclude(pk=self.pk).exists():

            if not self.pk:  # Check if the object is being created
                raise ValidationError('This compartment name already exist.')

    def save(self, *args, **kwargs):
        # print("\n\n\n============================================\n")
        # print(args, kwargs)
        # If the object is being created
        if not self.pk:
            try:
                self.clean()
                super().save(*args, **kwargs)
            except ValidationError:
                # Delete the created object if uniqueness check fails
                # self.delete()
                raise
        else:
            # If the object already exists, just save it
            super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.id},{self.name}'

class LocationDesignationRate(models.Model):
    company = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=False, blank=False, default=0)
    location = models.ForeignKey(Location, on_delete=CASCADE, null=True, blank=True)
    designation = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    designation_code=models.CharField(
        max_length=100, null=True, blank=True, default=None)
    start_date = models.DateTimeField(null=True, blank=True, default='')
    basic_rate = models.DecimalField(
        null=True, blank=True, decimal_places=2, max_digits=10, default=0.0)
    allowance = models.DecimalField(
        null=True, blank=True, decimal_places=2, max_digits=10, default=0.0)
    incentive = models.DecimalField(
        null=True, blank=True, decimal_places=2, max_digits=10, default=0.0)
    gross_monthly_rate = models.DecimalField(
        null=True, blank=True, decimal_places=2, max_digits=10, default=0.0)
    ot_rate = models.DecimalField(
        null=True, blank=True, decimal_places=2, max_digits=10, default=0.0)
    note = models.CharField(max_length=500, null=True,
                            blank=True, default=None)
    salary_type = models.CharField(
        max_length=10, null=True, blank=False, default='Monthly')
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    updated_by = models.CharField(
        max_length=30, blank=True, null=True, default='')
    updated_on = models.DateTimeField(blank=True, null=True, default=None)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'location',
                        'designation', 'start_date'],
                name='location_designation_rate',
            ),
        ]

    def clean(self):
        # Perform case-insensitive uniqueness check
        if LocationDesignationRate.objects.filter(
                company_id=self.company,
                location=self.location,
                start_date=self.start_date,
                designation__iexact=self.designation,
        ).exclude(pk=self.pk).exists():
            raise ValidationError('This Location designation is not unique.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.id}'

# class LocationCustomerInfo(models.Model):
#     company = models.ForeignKey(
#         Organization, on_delete=models.CASCADE, null=False, blank=False, default=0)
#     location = models.ForeignKey(Location, on_delete=CASCADE, null=False, blank=False)
#     esi_reg_no = models.CharField(max_length=100, blank=True, null=True, default='')
#     p_tax_reg_no = models.CharField(max_length=100, blank=True, null=True, default='')
#     customer = models.ForeignKey(Customer, on_delete=CASCADE, null=False, blank=False)
#     principal_employer_name_adds = models.CharField(
#         max_length=200, blank=True, null=True, default='')
#     work_nature = models.CharField(
#         max_length=100, blank=True, null=True, default='')
#     created_by = models.CharField(
#         max_length=50, null=True, blank=False, default='')
#     created_on = models.DateTimeField(
#         blank=True, null=True, default=timezone.now)
#     updated_by = models.CharField(
#         max_length=30, blank=True, null=True, default='')
#     updated_on = models.DateTimeField(blank=True, null=True, default=None)

#     class Meta:
#         unique_together = ('company', 'location')

# Location section end

class MailFrequency(models.Model):
    company = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=False, blank=False, default=0)
    table_name = models.CharField(max_length=50, null=True)
    table_id = models.IntegerField(null=True, blank=True)
    first_mail_date = models.DateTimeField(null=True, blank=True)
    frequency = models.IntegerField(null=True, blank=True)
    frequency_type = models.CharField(max_length=10, null=False, default=None)
    repeat_times = models.IntegerField(null=True, blank=True)
    scheduled_dates = ArrayField(models.DateTimeField(
        null=True, blank=True), null=True, blank=True)
    next_mail_date = models.DateTimeField(null=True, blank=True)
    repeat_counter = models.IntegerField(null=True, blank=True)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(
        blank=True, null=True, default=timezone.now)
    updated_by = models.CharField(
        max_length=30, blank=True, null=True, default='')
    updated_on = models.DateTimeField(blank=True, null=True, default=None)

    class Meta:
        unique_together = ("company", "table_name", 'table_id')

    def __str__(self):
        return f'{self.id},  {self.table_name},  {self.table_id}'


class Attachment(models.Model):
    company = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=False, blank=False, default=0)
    name = models.CharField(max_length=200, null=False, default=None)
    type = models.CharField(max_length=200, null=False, default=None)
    url = models.CharField(max_length=200, null=False, default=None)
    thumbnail = models.BooleanField(default=False)
    uploaded_by = models.CharField(max_length=200, null=False, default=None)
    uploaded_on = models.DateTimeField(null=False, default=timezone.now)


class ChartConfig(models.Model):
    company = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=False, blank=False, default=0)
    username = models.CharField(max_length=50, null=False, default=None)
    chart_identity = models.CharField(max_length=50, null=False, default=None)
    graph_title = models.CharField(max_length=50, null=False, default='')
    graph_type = models.CharField(max_length=50, null=False, default=None)
    x_axis = models.CharField(max_length=50, null=False, default=None)
    y_axis = models.CharField(max_length=50, null=True, default=None)
    value = models.CharField(max_length=50, null=False, default=None)
    group_by = models.CharField(max_length=50, null=False, default=None)
    position = models.JSONField(null=True, blank=True, default=None)
    style = models.JSONField(null=True, blank=True, default=None)
    view = ArrayField(models.IntegerField(
        null=True, blank=True, default=None), null=True, blank=True, default=list)


class ErrorMessageList(models.Model):
    type = models.CharField(null=False, default=None)
    msg = models.CharField(null=False, default=None)


class AutoSuggestionModule(models.Model):
    type = models.CharField(null=True, default=None)
    src = models.CharField(null=True, default=None)
    notes = models.CharField(null=True, default=None)
