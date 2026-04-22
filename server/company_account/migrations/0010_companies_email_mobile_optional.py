from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("company_account", "0009_companyuser_teacher_subject_and_class_lists"),
    ]

    operations = [
        migrations.AlterField(
            model_name="companies",
            name="email",
            field=models.EmailField(
                blank=True,
                default=None,
                max_length=60,
                null=True,
                verbose_name="email",
            ),
        ),
        migrations.AlterField(
            model_name="companies",
            name="mobile",
            field=models.CharField(
                blank=True,
                default=None,
                max_length=100,
                null=True,
            ),
        ),
    ]
