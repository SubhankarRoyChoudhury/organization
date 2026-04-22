from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("school_management", "0030_alter_studentacademicrecord_status"),
    ]

    operations = [
        migrations.AlterField(
            model_name="studentfeescollection",
            name="installment_name",
            field=models.CharField(
                choices=[
                    ("monthly", "Monthly"),
                    ("quarterly", "Quarterly"),
                    ("half_yearly", "Half Yearly"),
                    ("yearly", "Yearly"),
                    ("due", "Due"),
                    ("one_time", "One Time"),
                ],
                default="monthly",
                max_length=20,
            ),
        ),
    ]

