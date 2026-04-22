from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("school_management", "0016_studentsmark"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="studentsmark",
            constraint=models.UniqueConstraint(
                fields=["company", "student_record"],
                name="unique_students_mark_per_company_student_record",
            ),
        ),
    ]
