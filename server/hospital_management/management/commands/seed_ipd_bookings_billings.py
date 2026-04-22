import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from faker import Faker

from hospital_management.models import (
    Bed,
    Department,
    IPDBilling,
    IPDBooking,
    InsuaranceProvider,
    Patient,
    RateChart,
    Room,
    Ward,
)
from company_account.models import Companies, CompanyUser


class Command(BaseCommand):
    help = "Seed fake IPD bookings and billings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=25,
            help="Number of IPD bookings to create.",
        )
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Company ID to attach bookings to.",
        )
        parser.add_argument(
            "--created-by",
            type=str,
            default="faker",
            help="created_by value for generated records.",
        )

    def handle(self, *args, **options):
        count = options["count"]
        company_id = options["company_id"]
        created_by = options["created_by"]

        if count <= 0:
            self.stdout.write(self.style.WARNING("Count must be > 0."))
            return

        if company_id:
            companies = list(Companies.objects.filter(id=company_id))
            if not companies:
                self.stdout.write(
                    self.style.ERROR(f"Company {company_id} not found.")
                )
                return
        else:
            companies = list(Companies.objects.all())
            if not companies:
                self.stdout.write(
                    self.style.ERROR("No companies found to attach bookings.")
                )
                return

        faker = Faker("en_IN")
        relationships = [
            "Father",
            "Mother",
            "Spouse",
            "Sibling",
            "Guardian",
            "Relative",
        ]

        created = 0
        with transaction.atomic():
            for _ in range(count):
                company = (
                    companies[0]
                    if len(companies) == 1
                    else random.choice(companies)
                )
                patient_qs = Patient.objects.filter(companies=company)
                patient = (
                    patient_qs.order_by("?").first()
                    if patient_qs.exists()
                    else None
                )
                if not patient:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Skipping booking for company {company.id} - no patients."
                        )
                    )
                    continue

                department = (
                    Department.objects.filter(companies=company)
                    .order_by("?")
                    .first()
                )
                rate_chart = (
                    RateChart.objects.filter(companies=company)
                    .order_by("?")
                    .first()
                )
                ward = (
                    Ward.objects.filter(companies=company)
                    .order_by("?")
                    .first()
                )
                room = (
                    Room.objects.filter(companies=company)
                    .order_by("?")
                    .first()
                )
                bed = (
                    Bed.objects.filter(companies=company)
                    .order_by("?")
                    .first()
                )
                doctor = (
                    CompanyUser.objects.filter(company=company, role__iexact="doctor")
                    .order_by("?")
                    .first()
                )
                insurance_provider = (
                    InsuaranceProvider.objects.filter(
                        companies=company,
                        delist=False,
                    )
                    .order_by("?")
                    .first()
                )

                admission_date = faker.date_between(
                    start_date="-60d", end_date="today"
                )
                booking = IPDBooking.objects.create(
                    companies=company,
                    patient=patient,
                    department=department,
                    rate_chart=rate_chart,
                    treatment_doctor=doctor,
                    recommended_doctor=doctor.full_name
                    if doctor
                    else faker.name(),
                    ward=ward,
                    room=room,
                    bed=bed,
                    mobile=patient.mobile or faker.numerify("##########"),
                    related_person=faker.name(),
                    relationship=random.choice(relationships),
                    address=patient.address or faker.address(),
                    admission_date=admission_date,
                    insurance_provider=insurance_provider,
                    policy_amount=round(random.uniform(10000, 500000), 2)
                    if insurance_provider
                    else None,
                    insurance_number=faker.bothify(text="INS-#####"),
                    status="ADMITTED",
                    admission_reason=faker.sentence(nb_words=6),
                    created_by=created_by,
                )

                line_items = [
                    {
                        "item": "Room Charges",
                        "rate": 1500,
                        "qty": 3,
                        "amount": 4500,
                        "description": "Room charges",
                    },
                    {
                        "item": "Doctor Charges",
                        "rate": 800,
                        "qty": 2,
                        "amount": 1600,
                        "description": "Consultation",
                    },
                    {
                        "item": "Other Charges",
                        "rate": 0,
                        "qty": 1,
                        "amount": 300,
                        "description": "Miscellaneous",
                    },
                ]
                total_amount = sum(item["amount"] for item in line_items)

                IPDBilling.objects.create(
                    companies=company,
                    ipd_booking=booking,
                    line_items=line_items,
                    total_amount=total_amount,
                    status="PAID" if faker.boolean(chance_of_getting_true=30) else "PENDING",
                    remarks=faker.sentence(nb_words=8),
                    created_by=created_by,
                )

                created += 1

        target = f" for company {company_id}" if company_id else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"Created {created} IPD bookings and billings{target}."
            )
        )
