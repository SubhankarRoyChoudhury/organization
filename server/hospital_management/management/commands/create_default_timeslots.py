from datetime import time

from django.core.management.base import BaseCommand, CommandError

from company_account.models import Companies
from hospital_management.models import TimeSlot


DEFAULT_SLOTS = [
    (time(8, 0), time(10, 0)),
    (time(8, 0), time(12, 0)),
    (time(10, 0), time(12, 0)),
    (time(10, 0), time(14, 0)),
    (time(12, 0), time(14, 0)),
    (time(12, 0), time(16, 0)),
    (time(14, 0), time(16, 0)),
    (time(14, 0), time(18, 0)),
    (time(16, 0), time(18, 0)),
    (time(18, 0), time(20, 0)),
]


class Command(BaseCommand):
    help = "Create default time slots for a company (or every company)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            dest="company_id",
            help="Only create slots for the specified company id",
        )

    def handle(self, *args, **options):
        company_id = options.get("company_id")

        companies = Companies.objects.all()
        if company_id:
            companies = companies.filter(id=company_id)
            if not companies.exists():
                raise CommandError(f"No company found with id {company_id}")

        created_total = 0
        for company in companies:
            created_for_company = 0
            for start, end in DEFAULT_SLOTS:
                _, created = TimeSlot.objects.get_or_create(
                    companies=company,
                    start_time=start,
                    end_time=end,
                )
                if created:
                    created_for_company += 1

            created_total += created_for_company
            self.stdout.write(
                self.style.SUCCESS(
                    f"{company.company_name}: created {created_for_company} new slot(s)."
                )
            )

        if created_total == 0:
            self.stdout.write(self.style.WARNING("No new slots were created."))
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Finished. {created_total} slot(s) created.")
            )
