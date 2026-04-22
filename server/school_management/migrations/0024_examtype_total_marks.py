# Generated manually to add total_marks to ExamType.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("school_management", "0023_studentsmark_academic_year"),
    ]

    operations = [
        migrations.AddField(
            model_name="examtype",
            name="total_marks",
            field=models.DecimalField(decimal_places=2, default=20, max_digits=6),
        ),
    ]
