import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from faker import Faker

# python manage.py seed_school_people --company-id 3 --students 20 --teachers 5 --non-teaching-staff 4 --academic-year-id 1 --class-id 1 --section-id 1 --seed 42



from company_account.models import Companies, CompanyUser
from school_management.models import (
    AcademicYear,
    ClassList,
    NonTeacherStaffList,
    SectionList,
    StudentAcademicRecord,
    StudentList,
    TeacherList,
)


class Command(BaseCommand):
    help = (
        "Seed school student, student academic record, teacher, and non-teaching "
        "staff data."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            required=True,
            help="Company ID for all created records.",
        )
        parser.add_argument(
            "--students",
            type=int,
            default=10,
            help="Number of students to create.",
        )
        parser.add_argument(
            "--teachers",
            type=int,
            default=5,
            help="Number of teachers to create.",
        )
        parser.add_argument(
            "--non-teaching-staff",
            type=int,
            default=3,
            help="Number of non-teaching staff to create.",
        )
        parser.add_argument(
            "--academic-year-id",
            type=int,
            default=None,
            help="Academic year ID for student academic records.",
        )
        parser.add_argument(
            "--class-id",
            type=int,
            default=None,
            help="Class ID for student academic records.",
        )
        parser.add_argument(
            "--section-id",
            type=int,
            default=None,
            help="Section ID for student academic records.",
        )
        parser.add_argument(
            "--password",
            type=str,
            default="abc123",
            help="Password for created auth users.",
        )
        parser.add_argument(
            "--created-by",
            type=str,
            default="seed-script",
            help="created_by / updated_by value for generated records.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=None,
            help="Optional random seed for deterministic output.",
        )

    def handle(self, *args, **options):
        company_id = options["company_id"]
        student_count = options["students"]
        teacher_count = options["teachers"]
        non_teaching_count = options["non_teaching_staff"]
        academic_year_id = options["academic_year_id"]
        class_id = options["class_id"]
        section_id = options["section_id"]
        password = options["password"]
        created_by = options["created_by"]
        seed = options["seed"]

        self._validate_counts(student_count, teacher_count, non_teaching_count)

        company = Companies.objects.filter(id=company_id, delist=False).first()
        if not company:
            raise CommandError(f"Company {company_id} not found.")

        academic_context = self._resolve_academic_context(
            company_id=company_id,
            academic_year_id=academic_year_id,
            class_id=class_id,
            section_id=section_id,
        )

        faker = Faker("en_IN")
        if seed is not None:
            random.seed(seed)
            Faker.seed(seed)
            faker.seed_instance(seed)

        summary = {
            "teachers": 0,
            "non_teaching_staff": 0,
            "students": 0,
            "student_academic_records": 0,
        }

        with transaction.atomic():
            for _ in range(teacher_count):
                self._create_teacher(
                    faker=faker,
                    company=company,
                    password=password,
                    created_by=created_by,
                )
                summary["teachers"] += 1

            for _ in range(non_teaching_count):
                self._create_non_teaching_staff(
                    faker=faker,
                    company=company,
                    password=password,
                    created_by=created_by,
                )
                summary["non_teaching_staff"] += 1

            for index in range(student_count):
                _, student_record = self._create_student(
                    faker=faker,
                    company=company,
                    password=password,
                    created_by=created_by,
                )
                summary["students"] += 1

                if academic_context is not None:
                    self._create_student_academic_record(
                        faker=faker,
                        company=company,
                        student=student_record,
                        academic_year=academic_context["academic_year"],
                        class_details=academic_context["class_details"],
                        section_details=academic_context["section_details"],
                        created_by=created_by,
                        index=index,
                    )
                    summary["student_academic_records"] += 1

        academic_message = ""
        if academic_context is None:
            academic_message = (
                " Academic records were skipped because academic year, class, and "
                "section were not provided together."
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Created "
                f"{summary['teachers']} teachers, "
                f"{summary['non_teaching_staff']} non-teaching staff, "
                f"{summary['students']} students, and "
                f"{summary['student_academic_records']} student academic records."
                f"{academic_message}"
            )
        )

    def _validate_counts(self, student_count, teacher_count, non_teaching_count):
        for label, value in (
            ("students", student_count),
            ("teachers", teacher_count),
            ("non-teaching-staff", non_teaching_count),
        ):
            if value < 0:
                raise CommandError(f"{label} count cannot be negative.")

    def _resolve_academic_context(
        self,
        company_id,
        academic_year_id,
        class_id,
        section_id,
    ):
        provided_values = [academic_year_id, class_id, section_id]
        if all(value is None for value in provided_values):
            return None

        if any(value is None for value in provided_values):
            raise CommandError(
                "Provide --academic-year-id, --class-id, and --section-id together "
                "to create student academic records."
            )

        academic_year = AcademicYear.objects.filter(
            id=academic_year_id,
            company_id=company_id,
            delist=False,
        ).first()
        if not academic_year:
            raise CommandError(
                f"AcademicYear {academic_year_id} not found for company {company_id}."
            )

        class_details = ClassList.objects.filter(
            id=class_id,
            company_id=company_id,
            delist=False,
        ).first()
        if not class_details:
            raise CommandError(
                f"Class {class_id} not found for company {company_id}."
            )

        section_details = SectionList.objects.filter(
            id=section_id,
            company_id=company_id,
            delist=False,
        ).first()
        if not section_details:
            raise CommandError(
                f"Section {section_id} not found for company {company_id}."
            )

        if section_details.class_details_id != class_details.id:
            raise CommandError(
                f"Section {section_id} does not belong to class {class_id}."
            )

        return {
            "academic_year": academic_year,
            "class_details": class_details,
            "section_details": section_details,
        }

    def _create_teacher(self, faker, company, password, created_by):
        profile = self._build_profile(faker, role="teacher")
        auth_user = self._create_auth_user(
            username=profile["username"],
            email=profile["email"],
            phone_number=profile["mobile"],
            password=password,
        )

        company_user = CompanyUser.objects.create(
            company=company,
            organization_id=company.organization_id,
            name=profile["name"],
            username=auth_user.username,
            mobile=profile["mobile"],
            email=profile["email"],
            dob=profile["dob_datetime"],
            qualification=profile["qualification"],
            experience=profile["experience"],
            address=profile["address"],
            state=profile["state"],
            city=profile["city"],
            pin=profile["pin"],
            role="teacher",
            can_access=True,
            is_active=True,
            created_by=created_by,
            updated_by=created_by,
            created_on=timezone.now(),
            updated_on=timezone.now(),
        )
        TeacherList.objects.create(
            company=company,
            name=profile["name"],
            username=auth_user.username,
            mobile=profile["mobile"],
            email=profile["email"],
            dob=profile["dob_datetime"],
            qualification=profile["qualification"],
            experience=profile["experience"],
            address=profile["address"],
            state=profile["state"],
            city=profile["city"],
            pin=profile["pin"],
            created_by=created_by,
            updated_by=created_by,
            created_on=timezone.now(),
            updated_on=timezone.now(),
        )
        return auth_user, company_user

    def _create_non_teaching_staff(self, faker, company, password, created_by):
        profile = self._build_profile(faker, role="non_teaching")
        auth_user = self._create_auth_user(
            username=profile["username"],
            email=profile["email"],
            phone_number=profile["mobile"],
            password=password,
        )

        company_user = CompanyUser.objects.create(
            company=company,
            organization_id=company.organization_id,
            name=profile["name"],
            username=auth_user.username,
            mobile=profile["mobile"],
            email=profile["email"],
            dob=profile["dob_datetime"],
            qualification=profile["qualification"],
            experience=profile["experience"],
            address=profile["address"],
            state=profile["state"],
            city=profile["city"],
            pin=profile["pin"],
            role="non-teaching",
            can_access=True,
            is_active=True,
            created_by=created_by,
            updated_by=created_by,
            created_on=timezone.now(),
            updated_on=timezone.now(),
        )
        NonTeacherStaffList.objects.create(
            company=company,
            name=profile["name"],
            username=auth_user.username,
            mobile=profile["mobile"],
            email=profile["email"],
            dob=profile["dob_datetime"],
            qualification=profile["qualification"],
            experience=profile["experience"],
            address=profile["address"],
            state=profile["state"],
            city=profile["city"],
            pin=profile["pin"],
            created_by=created_by,
            updated_by=created_by,
            created_on=timezone.now(),
            updated_on=timezone.now(),
        )
        return auth_user, company_user

    def _create_student(self, faker, company, password, created_by):
        profile = self._build_profile(faker, role="student")
        auth_user = self._create_auth_user(
            username=profile["username"],
            email=profile["email"],
            phone_number=profile["mobile"],
            password=password,
        )

        company_user = CompanyUser.objects.create(
            company=company,
            organization_id=company.organization_id,
            name=profile["name"],
            username=auth_user.username,
            mobile=profile["mobile"],
            email=profile["email"],
            dob=profile["dob_datetime"],
            fatherOrHusband=profile["guardian_name"],
            address=profile["address"],
            state=profile["state"],
            city=profile["city"],
            pin=profile["pin"],
            role="student",
            can_access=True,
            is_active=True,
            created_by=created_by,
            updated_by=created_by,
            created_on=timezone.now(),
            updated_on=timezone.now(),
        )

        student_record = StudentList.objects.create(
            company=company,
            name=profile["name"],
            username=company_user.username,
            mobile=profile["mobile"],
            email=profile["email"],
            dob=profile["dob_date"],
            guardian_name=profile["guardian_name"],
            address=profile["address"],
            state=profile["state"],
            city=profile["city"],
            pin=profile["pin"],
            created_by=created_by,
            updated_by=created_by,
            created_on=timezone.now(),
            updated_on=timezone.now(),
        )
        return company_user, student_record

    def _create_student_academic_record(
        self,
        faker,
        company,
        student,
        academic_year,
        class_details,
        section_details,
        created_by,
        index,
    ):
        admission_date = faker.date_between(
            start_date=academic_year.start_date,
            end_date=academic_year.end_date,
        )
        roll_number = self._generate_unique_roll_number(
            company_id=company.id,
            academic_year_id=academic_year.id,
            base_number=index + 1,
        )
        StudentAcademicRecord.objects.create(
            company=company,
            student=student,
            academic_year=academic_year,
            class_details=class_details,
            section_details=section_details,
            roll_number=roll_number,
            admission_date=admission_date,
            status="active",
            remarks="Generated by seed_school_people command.",
            created_by=created_by,
            updated_by=created_by,
            created_on=timezone.now(),
            updated_on=timezone.now(),
        )

    def _build_profile(self, faker, role):
        full_name = faker.name()
        username = self._generate_unique_username(full_name, role)
        email = self._generate_unique_email(username)
        mobile = self._generate_unique_phone()
        dob_date = faker.date_of_birth(
            minimum_age=8 if role == "student" else 24,
            maximum_age=20 if role == "student" else 60,
        )

        return {
            "name": full_name,
            "username": username,
            "email": email,
            "mobile": mobile,
            "dob_date": dob_date,
            "dob_datetime": timezone.make_aware(
                timezone.datetime.combine(dob_date, timezone.datetime.min.time())
            ),
            "guardian_name": faker.name() if role == "student" else "",
            "qualification": faker.job() if role != "student" else "",
            "experience": str(random.randint(1, 20)) if role != "student" else "",
            "address": faker.address().replace("\n", ", "),
            "state": faker.state(),
            "city": faker.city(),
            "pin": faker.postcode(),
        }

    def _create_auth_user(self, username, email, phone_number, password):
        user_model = get_user_model()
        return user_model.objects.create_user(
            username=username,
            email=email,
            phone_number=phone_number,
            password=password,
        )

    def _generate_unique_username(self, full_name, role):
        user_model = get_user_model()
        base = "".join(
            char.lower() for char in full_name if char.isalnum()
        )[:18]
        if not base:
            base = role

        candidate = f"{role[:3]}_{base}"
        suffix = 1
        while (
            user_model.objects.filter(username__iexact=candidate).exists()
            or CompanyUser.objects.filter(username__iexact=candidate).exists()
        ):
            suffix += 1
            candidate = f"{role[:3]}_{base}{suffix}"
        return candidate

    def _generate_unique_email(self, username):
        user_model = get_user_model()
        candidate = f"{username}@example.com"
        suffix = 1
        while (
            user_model.objects.filter(email__iexact=candidate).exists()
            or CompanyUser.objects.filter(email__iexact=candidate).exists()
            or StudentList.objects.filter(email__iexact=candidate).exists()
        ):
            suffix += 1
            candidate = f"{username}{suffix}@example.com"
        return candidate

    def _generate_unique_phone(self):
        user_model = get_user_model()
        candidate = str(random.randint(6000000000, 9999999999))
        while (
            user_model.objects.filter(phone_number=candidate).exists()
            or CompanyUser.objects.filter(mobile=candidate).exists()
            or StudentList.objects.filter(mobile=candidate).exists()
        ):
            candidate = str(random.randint(6000000000, 9999999999))
        return candidate

    def _generate_unique_roll_number(self, company_id, academic_year_id, base_number):
        candidate = f"R{base_number:04d}"
        suffix = 1
        while StudentAcademicRecord.objects.filter(
            company_id=company_id,
            academic_year_id=academic_year_id,
            roll_number=candidate,
        ).exists():
            suffix += 1
            candidate = f"R{base_number:04d}-{suffix}"
        return candidate
