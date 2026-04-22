from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0015_normalize_organizationuser_level_values"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="email",
            field=models.EmailField(
                blank=True,
                default=None,
                max_length=254,
                null=True,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name="user",
            name="phone_number",
            field=models.CharField(
                blank=True,
                default=None,
                max_length=20,
                null=True,
                unique=True,
            ),
        ),
    ]
