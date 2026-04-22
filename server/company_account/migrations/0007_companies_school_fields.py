from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("company_account", "0006_companies_school_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="companies",
            name="district",
            field=models.CharField(blank=True, default=None, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="companies",
            name="location",
            field=models.CharField(blank=True, default=None, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="companies",
            name="school_code",
            field=models.CharField(blank=True, default=None, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="companies",
            name="start_date",
            field=models.DateField(blank=True, default=None, null=True),
        ),
    ]
