# Generated manually to store the academic year for each StudentsMark.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("school_management", "0022_alter_studentsmark_unique_constraint"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentsmark",
            name="academic_year",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="student_marks",
                to="school_management.academicyear",
            ),
        ),
    ]
