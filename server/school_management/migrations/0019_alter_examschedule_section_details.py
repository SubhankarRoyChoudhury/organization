from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("school_management", "0018_classlist_subject"),
    ]

    operations = [
        migrations.AlterField(
            model_name="examschedule",
            name="section_details",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="exam_schedules",
                to="school_management.sectionlist",
            ),
        ),
        migrations.AlterField(
            model_name="examschedule",
            name="start_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="examschedule",
            name="end_time",
            field=models.TimeField(blank=True, null=True),
        ),
    ]
