import random

from django.core.management.base import BaseCommand
from django.db import transaction

from faker import Faker

from hospital_management.models import Company, Patient


class Command(BaseCommand):
    help = "Seed fake Patient records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=50,
            help="Number of patients to create.",
        )
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Company ID to attach patients to.",
        )
        parser.add_argument(
            "--created-by",
            type=str,
            default="faker",
            help="created_by value for generated patients.",
        )

    def handle(self, *args, **options):
        count = options["count"]
        company_id = options["company_id"]
        created_by = options["created_by"]

        if count <= 0:
            self.stdout.write(self.style.WARNING("Count must be > 0."))
            return

        company = None
        if company_id:
            company = Company.objects.filter(id=company_id).first()
            if not company:
                self.stdout.write(
                    self.style.ERROR(f"Company {company_id} not found.")
                )
                return
        else:
            company_ids = list(Company.objects.values_list("id", flat=True))
            if company_ids:
                company = Company.objects.get(id=random.choice(company_ids))

        faker = Faker("en_IN")
        genders = ["Male", "Female", "Other"]

        created = 0
        with transaction.atomic():
            for _ in range(count):
                dob = faker.date_of_birth(minimum_age=1, maximum_age=90)
                Patient.objects.create(
                    company=company,
                    name=faker.name(),
                    gender=faker.random_element(genders),
                    mobile=faker.numerify("##########"),
                    dateOfBirth=dob.isoformat(),
                    country="India",
                    state=faker.state(),
                    district=faker.city(),
                    ps=faker.city_suffix(),
                    address=faker.address(),
                    pin=faker.numerify("######"),
                    aadhaar=faker.numerify("############"),
                    healthId=str(faker.uuid4()),
                    healthIdNumber=faker.bothify(text="##??-####-####"),
                    created_by=created_by,
                )
                created += 1

        target = f" for company {company_id}" if company_id else ""
        self.stdout.write(
            self.style.SUCCESS(f"Created {created} patients{target}.")
        )
