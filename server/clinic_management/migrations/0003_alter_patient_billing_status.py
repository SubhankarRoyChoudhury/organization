from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinic_management", "0002_replace_clinicprofile_with_clinic_models"),
    ]

    operations = [
        migrations.AlterField(
            model_name="patient",
            name="billing_status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("CURRENT", "Current"),
                    ("PENDING", "Pending"),
                    ("OVERDUE", "Overdue"),
                ],
                default=None,
                max_length=20,
                null=True,
            ),
        ),
    ]
