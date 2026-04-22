from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_remove_organization_code_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="LoginActivity",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("access_token", models.CharField(default="", max_length=512)),
                ("active_from", models.DateTimeField()),
                ("active_to", models.DateTimeField(blank=True, default=None, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="login_activities",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="loginactivity",
            index=models.Index(fields=["user", "active_from"], name="accounts_lo_user_id_7e6b2a_idx"),
        ),
        migrations.AddIndex(
            model_name="loginactivity",
            index=models.Index(fields=["access_token"], name="accounts_lo_access__0df5fa_idx"),
        ),
    ]
