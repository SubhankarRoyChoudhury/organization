import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from faker import Faker

from hospital_management.models import (
    Department,
    OPDTicketBooking,
    Patient,
    TimeSlot,
)
from company_account.models import Companies, CompanyUser


class Command(BaseCommand):
    help = "Seed fake OPD ticket bookings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=50,
            help="Number of OPD ticket bookings to create.",
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
            help="created_by value for generated bookings.",
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
        genders = ["Male", "Female", "Other"]

        created = 0
        with transaction.atomic():
            for _ in range(count):
                company = (
                    companies[0]
                    if len(companies) == 1
                    else random.choice(companies)
                )

                patients_qs = Patient.objects.filter(companies=company)
                patient = (
                    patients_qs.order_by("?").first()
                    if patients_qs.exists()
                    else None
                )

                departments_qs = Department.objects.filter(companies=company)
                department = (
                    departments_qs.order_by("?").first()
                    if departments_qs.exists()
                    else None
                )

                doctors_qs = CompanyUser.objects.filter(
                    company=company,
                    role__iexact="doctor",
                )
                doctor = (
                    doctors_qs.order_by("?").first()
                    if doctors_qs.exists()
                    else None
                )

                schedules_qs = TimeSlot.objects.all()
                doctor_schedule = (
                    schedules_qs.order_by("?").first()
                    if schedules_qs.exists()
                    else None
                )

                if patient:
                    name = patient.name
                    gender = patient.gender or faker.random_element(genders)
                    mobile = patient.mobile or faker.numerify("##########")
                    date_of_birth = patient.dateOfBirth or faker.date_of_birth(
                        minimum_age=1, maximum_age=90
                    ).isoformat()
                    country = patient.country or "India"
                    state = patient.state or faker.state()
                    district = patient.district or faker.city()
                    ps = patient.ps or faker.city_suffix()
                    address = patient.address or faker.address()
                    pin = patient.pin or faker.numerify("######")
                    aadhaar = patient.aadhaar or faker.numerify("############")
                    health_id = patient.healthId or str(faker.uuid4())
                    health_id_number = patient.healthIdNumber or faker.bothify(
                        text="##??-####-####"
                    )
                else:
                    name = faker.name()
                    gender = faker.random_element(genders)
                    mobile = faker.numerify("##########")
                    date_of_birth = faker.date_of_birth(
                        minimum_age=1, maximum_age=90
                    ).isoformat()
                    country = "India"
                    state = faker.state()
                    district = faker.city()
                    ps = faker.city_suffix()
                    address = faker.address()
                    pin = faker.numerify("######")
                    aadhaar = faker.numerify("############")
                    health_id = str(faker.uuid4())
                    health_id_number = faker.bothify(text="##??-####-####")

                visit_date = faker.date_between(
                    start_date="-30d", end_date="today"
                )
                fees = faker.pydecimal(left_digits=3, right_digits=2, positive=True)
                advance = (
                    faker.pydecimal(left_digits=3, right_digits=2, positive=True)
                    if faker.boolean(chance_of_getting_true=60)
                    else None
                )
                is_cancelled = faker.boolean(chance_of_getting_true=10)

                OPDTicketBooking.objects.create(
                    companies=company,
                    visitDate=visit_date,
                    patient=patient,
                    name=name,
                    gender=gender,
                    mobile=mobile,
                    dateOfBirth=date_of_birth,
                    country=country,
                    state=state,
                    district=district,
                    ps=ps,
                    address=address,
                    pin=pin,
                    aadhaar=aadhaar,
                    healthId=health_id,
                    healthIdNumber=health_id_number,
                    department=department,
                    doctor=doctor,
                    doctorSchedule=doctor_schedule,
                    fees=fees,
                    advance_received_amt=advance,
                    receipt_transfer_no=faker.bothify(text="REC-#####")
                    if advance
                    else None,
                    is_cancelled=is_cancelled,
                    cancelled_on=timezone.now() if is_cancelled else None,
                    cancelled_by="system" if is_cancelled else None,
                    created_by=created_by,
                )
                created += 1

        target = f" for company {company_id}" if company_id else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"Created {created} OPD ticket bookings{target}."
            )
        )
