# Generated manually to convert total_marks fields from DecimalField to IntegerField.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("school_management", "0024_examtype_total_marks"),
    ]

    operations = [
        migrations.AlterField(
            model_name="examtype",
            name="total_marks",
            field=models.IntegerField(default=20),
        ),
        migrations.AlterField(
            model_name="examschedule",
            name="total_marks",
            field=models.IntegerField(default=100),
        ),
    ]
