from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("company_account", "0004_activitylog_organization"),
    ]

    operations = [
        migrations.RenameField(
            model_name="companies",
            old_name="main_category",
            new_name="main_group",
        ),
        migrations.RenameField(
            model_name="companies",
            old_name="sub_category",
            new_name="sub_group",
        ),
    ]
