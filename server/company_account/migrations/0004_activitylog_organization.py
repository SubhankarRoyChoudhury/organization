from django.db import migrations, models
import django.db.models.deletion


def backfill_activitylog_organization(apps, schema_editor):
    ActivityLog = apps.get_model("company_account", "ActivityLog")
    CompanyUser = apps.get_model("company_account", "CompanyUser")
    Organization = apps.get_model("accounts", "Organization")

    company_users = CompanyUser.objects.select_related("company").all()
    user_by_id = {user.id: user for user in company_users}

    updates = []
    for activity in ActivityLog.objects.filter(organization__isnull=True):
        company_user = user_by_id.get(activity.company_user_id)
        if not company_user:
            continue
        org_id = company_user.organization_id or getattr(
            company_user.company, "organization_id", None
        )
        if not org_id:
            continue
        try:
            org_id = int(org_id)
        except (TypeError, ValueError):
            continue
        organization = Organization.objects.filter(id=org_id).first()
        if organization:
            activity.organization_id = organization.id
            updates.append(activity)

    if updates:
        ActivityLog.objects.bulk_update(updates, ["organization"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_remove_organization_code_and_more"),
        ("company_account", "0003_companies_main_category_companies_sub_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="activitylog",
            name="organization",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="company_activity_logs",
                to="accounts.organization",
            ),
        ),
        migrations.RunPython(
            backfill_activitylog_organization,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
