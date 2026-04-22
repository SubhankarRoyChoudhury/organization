from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("company_account", "0008_companyuser_city_companyuser_dob_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="companyuser",
            name="main_subject",
            field=models.JSONField(blank=True, default=list, null=True),
        ),
        migrations.AddField(
            model_name="companyuser",
            name="others_subject",
            field=models.JSONField(blank=True, default=list, null=True),
        ),
        migrations.AddField(
            model_name="companyuser",
            name="preferableClass",
            field=models.JSONField(blank=True, default=list, null=True),
        ),
    ]
