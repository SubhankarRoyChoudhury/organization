from django.db import migrations


def forwards_func(apps, schema_editor):
    OrganizationUser = apps.get_model("accounts", "OrganizationUser")
    OrganizationUser.objects.filter(level__iexact="lvl1").update(level="Level1")
    OrganizationUser.objects.filter(level__iexact="lvl2").update(level="Level2")


def reverse_func(apps, schema_editor):
    OrganizationUser = apps.get_model("accounts", "OrganizationUser")
    OrganizationUser.objects.filter(level__iexact="level1").update(level="lvl1")
    OrganizationUser.objects.filter(level__iexact="level2").update(level="lvl2")


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0014_organizationinfo_attachment_ids_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards_func, reverse_func),
    ]
