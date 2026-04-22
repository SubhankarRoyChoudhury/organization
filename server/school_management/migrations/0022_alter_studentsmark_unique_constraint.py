# Generated manually to align StudentsMark uniqueness with exam schedule.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("school_management", "0021_alter_academicyear_start_date_and_end_date"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="studentsmark",
            name="unique_students_mark_per_company_student_record",
        ),
        migrations.AddConstraint(
            model_name="studentsmark",
            constraint=models.UniqueConstraint(
                fields=["company", "student_record", "exam_schedule"],
                name="unique_students_mark_per_company_student_record_exam_schedule",
            ),
        ),
    ]
