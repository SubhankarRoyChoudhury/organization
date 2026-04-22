from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_organizationuser_category_organizationuser_level"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="CompanyInfo",
            new_name="OrganizationInfo",
        ),
        migrations.RenameField(
            model_name="organizationinfo",
            old_name="company",
            new_name="organization",
        ),
        migrations.RemoveField(
            model_name="organizationinfo",
            name="id",
        ),
        migrations.AlterField(
            model_name="organizationinfo",
            name="organization",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                primary_key=True,
                related_name="organization_info",
                serialize=False,
                to="accounts.organization",
            ),
        ),
    ]
