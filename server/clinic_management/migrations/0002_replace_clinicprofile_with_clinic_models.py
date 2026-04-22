import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinic_management", "0001_initial"),
    ]

    operations = [
        migrations.DeleteModel(
            name="ClinicProfile",
        ),
        migrations.CreateModel(
            name="Patient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_by", models.CharField(blank=True, default=None, max_length=100, null=True)),
                ("created_on", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_by", models.CharField(blank=True, default=None, max_length=100, null=True)),
                ("updated_on", models.DateTimeField(auto_now=True)),
                ("delist", models.BooleanField(default=False)),
                ("delisted_by", models.CharField(blank=True, default="", max_length=100, null=True)),
                ("delisted_on", models.DateTimeField(blank=True, default=None, null=True)),
                ("patient_id", models.CharField(blank=True, max_length=30, null=True, unique=True)),
                ("full_name", models.CharField(max_length=150)),
                ("email", models.EmailField(blank=True, max_length=254, null=True)),
                ("phone_number", models.CharField(blank=True, max_length=20, null=True)),
                ("gender", models.CharField(blank=True, max_length=20, null=True)),
                ("date_of_birth", models.DateField(blank=True, null=True)),
                ("address", models.TextField(blank=True, null=True)),
                ("emergency_contact_name", models.CharField(blank=True, max_length=150, null=True)),
                ("emergency_contact_number", models.CharField(blank=True, max_length=20, null=True)),
                ("billing_status", models.CharField(choices=[("CURRENT", "Current"), ("PENDING", "Pending"), ("OVERDUE", "Overdue")], default="CURRENT", max_length=20)),
                ("notes", models.TextField(blank=True, default="")),
                ("company", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="patients", to="company_account.companies")),
                ("primary_doctor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="primary_clinic_patients", to="company_account.companyuser")),
                ("user_account", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="clinic_patient_profile", to="company_account.companyuser")),
            ],
            options={
                "ordering": ["full_name", "-id"],
            },
        ),
        migrations.CreateModel(
            name="Appointment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_by", models.CharField(blank=True, default=None, max_length=100, null=True)),
                ("created_on", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_by", models.CharField(blank=True, default=None, max_length=100, null=True)),
                ("updated_on", models.DateTimeField(auto_now=True)),
                ("delist", models.BooleanField(default=False)),
                ("delisted_by", models.CharField(blank=True, default="", max_length=100, null=True)),
                ("delisted_on", models.DateTimeField(blank=True, default=None, null=True)),
                ("appointment_id", models.CharField(blank=True, max_length=30, null=True, unique=True)),
                ("scheduled_for", models.DateTimeField()),
                ("reason", models.CharField(blank=True, default="", max_length=255)),
                ("status", models.CharField(choices=[("SCHEDULED", "Scheduled"), ("CHECKED_IN", "Checked In"), ("COMPLETED", "Completed"), ("CANCELLED", "Cancelled"), ("NO_SHOW", "No Show")], default="SCHEDULED", max_length=20)),
                ("consultation_notes", models.TextField(blank=True, default="")),
                ("company", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="appointments", to="company_account.companies")),
                ("doctor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="clinic_appointments", to="company_account.companyuser")),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="appointments", to="clinic_management.patient")),
            ],
            options={
                "ordering": ["-scheduled_for", "-id"],
            },
        ),
        migrations.CreateModel(
            name="Prescription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_by", models.CharField(blank=True, default=None, max_length=100, null=True)),
                ("created_on", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_by", models.CharField(blank=True, default=None, max_length=100, null=True)),
                ("updated_on", models.DateTimeField(auto_now=True)),
                ("delist", models.BooleanField(default=False)),
                ("delisted_by", models.CharField(blank=True, default="", max_length=100, null=True)),
                ("delisted_on", models.DateTimeField(blank=True, default=None, null=True)),
                ("prescription_id", models.CharField(blank=True, max_length=30, null=True, unique=True)),
                ("summary", models.TextField(blank=True, default="")),
                ("medicines", models.JSONField(blank=True, default=list)),
                ("follow_up_in_days", models.PositiveIntegerField(blank=True, null=True)),
                ("status", models.CharField(choices=[("DRAFT", "Draft"), ("READY", "Ready"), ("ISSUED", "Issued")], default="DRAFT", max_length=20)),
                ("appointment", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="prescription", to="clinic_management.appointment")),
                ("company", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="prescriptions", to="company_account.companies")),
            ],
            options={
                "ordering": ["-created_on", "-id"],
            },
        ),
        migrations.CreateModel(
            name="Billing",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_by", models.CharField(blank=True, default=None, max_length=100, null=True)),
                ("created_on", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_by", models.CharField(blank=True, default=None, max_length=100, null=True)),
                ("updated_on", models.DateTimeField(auto_now=True)),
                ("delist", models.BooleanField(default=False)),
                ("delisted_by", models.CharField(blank=True, default="", max_length=100, null=True)),
                ("delisted_on", models.DateTimeField(blank=True, default=None, null=True)),
                ("billing_id", models.CharField(blank=True, max_length=30, null=True, unique=True)),
                ("subtotal", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("tax_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("discount_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("amount_paid", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("PARTIAL", "Partial"), ("PAID", "Paid"), ("VOID", "Void")], default="PENDING", max_length=20)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("paid_on", models.DateTimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, default="")),
                ("appointment", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="billing", to="clinic_management.appointment")),
                ("company", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="billings", to="company_account.companies")),
            ],
            options={
                "ordering": ["-created_on", "-id"],
            },
        ),
    ]
