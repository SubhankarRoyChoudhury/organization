from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("school_management", "0026_classfeestructure"),
    ]

    operations = [
        migrations.RenameField(
            model_name="classfeestructure",
            old_name="caution_money",
            new_name="exam_fee",
        ),
    ]
