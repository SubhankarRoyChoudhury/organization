from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("school_management", "0031_alter_studentfeescollection_installment_name"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="studentfeescollection",
            unique_together=set(),
        ),
    ]

