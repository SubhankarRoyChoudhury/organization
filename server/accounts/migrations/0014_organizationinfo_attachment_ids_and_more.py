from django.db import migrations, models
import django.contrib.postgres.fields


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0013_rename_accounts_lo_user_id_7e6b2a_idx_accounts_lo_user_id_99eafe_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="organizationinfo",
            name="attachment_ids",
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.IntegerField(blank=True, null=True),
                blank=True,
                default=list,
                null=True,
                size=None,
            ),
        ),
        migrations.AddField(
            model_name="organizationinfo",
            name="background_attachment_id",
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
