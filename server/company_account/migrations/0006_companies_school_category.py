from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("company_account", "0005_rename_company_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="companies",
            name="school_category",
            field=models.CharField(blank=True, default=None, max_length=100, null=True),
        ),
    ]
