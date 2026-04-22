from django.core.management.base import BaseCommand, CommandError

from company_account.models import Companies
from hospital_management.faker_seed import (
    DEFAULT_HOSPITAL_FAKER_CONFIG,
    seed_hospital_sidebar_faker_data,
)


class Command(BaseCommand):
    help = (
        "Seed company-scoped hospital dummy data for sidebar pages "
        "(departments, staff departments/job titles, doctor/admin/staff users). "
        "Doctor fees are excluded."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            required=True,
            help="Company ID for which faker data will be generated.",
        )
        parser.add_argument(
            "--created-by",
            type=str,
            default="faker",
            help="created_by value used in generated rows.",
        )
        parser.add_argument(
            "--default-password",
            type=str,
            default="abc123",
            help="Default password for generated auth users.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=None,
            help="Optional random seed for deterministic data generation.",
        )
        parser.add_argument(
            "--mode",
            type=str,
            choices=["target", "append"],
            default="target",
            help=(
                "target: keep minimum totals at requested values. "
                "append: add requested counts on top of existing rows."
            ),
        )
        parser.add_argument(
            "--departments",
            type=int,
            default=DEFAULT_HOSPITAL_FAKER_CONFIG["departments"],
            help="Target total departments for the company.",
        )
        parser.add_argument(
            "--doctor-types",
            type=int,
            default=DEFAULT_HOSPITAL_FAKER_CONFIG["doctor_types"],
            help="Target total doctor types for the company.",
        )
        parser.add_argument(
            "--administration-types",
            type=int,
            default=DEFAULT_HOSPITAL_FAKER_CONFIG["administration_types"],
            help="Target total administration types for the company.",
        )
        parser.add_argument(
            "--staff-departments",
            type=int,
            default=DEFAULT_HOSPITAL_FAKER_CONFIG["staff_departments"],
            help="Target total staff departments for the company.",
        )
        parser.add_argument(
            "--staff-job-titles-per-department",
            type=int,
            default=DEFAULT_HOSPITAL_FAKER_CONFIG["staff_job_titles_per_department"],
            help="Target job titles per staff department.",
        )
        parser.add_argument(
            "--doctors",
            type=int,
            default=DEFAULT_HOSPITAL_FAKER_CONFIG["doctors"],
            help="Target total doctors for the company.",
        )
        parser.add_argument(
            "--administrators",
            type=int,
            default=DEFAULT_HOSPITAL_FAKER_CONFIG["administrators"],
            help="Target total administration users for the company.",
        )
        parser.add_argument(
            "--staff",
            type=int,
            default=DEFAULT_HOSPITAL_FAKER_CONFIG["staff"],
            help="Target total staff users for the company.",
        )
        parser.add_argument(
            "--skip-time-slots",
            action="store_true",
            help="Do not create default time slots.",
        )
        parser.add_argument(
            "--skip-doctor-schedules",
            action="store_true",
            help="Do not create doctor schedules.",
        )

    def handle(self, *args, **options):
        company_id = options["company_id"]
        company = Companies.objects.filter(id=company_id).first()
        if company is None:
            raise CommandError(f"Company {company_id} not found.")

        count_fields = [
            "departments",
            "doctor_types",
            "administration_types",
            "staff_departments",
            "staff_job_titles_per_department",
            "doctors",
            "administrators",
            "staff",
        ]
        for field in count_fields:
            if options[field] < 0:
                raise CommandError(f"{field} must be >= 0.")
            if options[field] > 500:
                raise CommandError(f"{field} must be <= 500.")

        config = {
            "departments": options["departments"],
            "doctor_types": options["doctor_types"],
            "administration_types": options["administration_types"],
            "staff_departments": options["staff_departments"],
            "staff_job_titles_per_department": options[
                "staff_job_titles_per_department"
            ],
            "doctors": options["doctors"],
            "administrators": options["administrators"],
            "staff": options["staff"],
            "create_time_slots": not options["skip_time_slots"],
            "create_doctor_schedules": not options["skip_doctor_schedules"],
        }

        result = seed_hospital_sidebar_faker_data(
            company,
            created_by=options["created_by"],
            default_password=options["default_password"],
            seed=options["seed"],
            config=config,
            mode=options["mode"],
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Faker data generated for company "
                f"{result['company_id']} - {result['company_name']} "
                f"(mode={result['mode']})"
            )
        )
        self.stdout.write("Created:")
        for key, value in result["created"].items():
            self.stdout.write(f"  - {key}: {value}")
        self.stdout.write("Totals:")
        for key, value in result["totals"].items():
            self.stdout.write(f"  - {key}: {value}")
        self.stdout.write("Doctor fees: excluded (0 created).")
