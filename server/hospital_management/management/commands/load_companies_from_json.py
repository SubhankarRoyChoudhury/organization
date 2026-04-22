import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from hospital_management.models import Company
from hospital_management.serializers import CompanySerializer


class Command(BaseCommand):
    help = (
        "Load companies from a JSON file using CompanySerializer so that the linked "
        "admin users are created with the provided password."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default="hospital_management/fixtures/companies.json",
            help="Relative or absolute path to the JSON file to import.",
        )

    def handle(self, *args, **options):
        json_path = Path(options["path"]).resolve()
        if not json_path.exists():
            raise CommandError(f"File not found: {json_path}")

        with json_path.open("r", encoding="utf-8") as handle:
            try:
                payload = json.load(handle)
            except json.JSONDecodeError as exc:
                raise CommandError(f"Invalid JSON in {json_path}: {exc}") from exc

        created, updated = 0, 0
        for entry in payload:
            fields = entry.get("fields") or {}
            password = fields.pop("password", None)
            if not password:
                raise CommandError(
                    f"Missing password for company fixture entry: {fields.get('name') or entry}"
                )

            company_code = fields.get("code")
            instance = None
            if company_code:
                instance = Company.objects.filter(code=company_code).first()

            serializer = CompanySerializer(instance=instance, data={**fields, "password": password})
            serializer.is_valid(raise_exception=True)
            serializer.save()

            if instance:
                updated += 1
            else:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Companies imported successfully. Created: {created}, Updated: {updated}"
            )
        )
