import random
from datetime import time
from typing import Any, Dict, List

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q

from faker import Faker

from company_account.models import Companies, CompanyUser

from .models import (
    AdministrationType,
    Department,
    DoctorSchedule,
    DoctorType,
    StaffDepartment,
    StaffJobTitle,
    TimeSlot,
)


DEFAULT_HOSPITAL_FAKER_CONFIG: Dict[str, Any] = {
    "departments": 8,
    "doctor_types": 5,
    "administration_types": 4,
    "staff_departments": 4,
    "staff_job_titles_per_department": 3,
    "doctors": 12,
    "administrators": 8,
    "staff": 12,
    "create_time_slots": True,
    "create_doctor_schedules": True,
}


DEPARTMENT_NAMES = [
    "General Medicine",
    "Cardiology",
    "Orthopedics",
    "Neurology",
    "Pediatrics",
    "Gynecology",
    "ENT",
    "Dermatology",
    "Urology",
    "Oncology",
]

DOCTOR_TYPE_NAMES = [
    "Consultant",
    "Resident",
    "Visiting",
    "Specialist",
    "Surgeon",
    "Duty Doctor",
]

ADMINISTRATION_TYPE_NAMES = [
    "Reception",
    "Billing",
    "Operations",
    "HR",
    "Management",
]

STAFF_DEPARTMENT_NAMES = [
    "Nursing",
    "Pharmacy",
    "Laboratory",
    "Front Desk",
    "Housekeeping",
    "Security",
]

STAFF_JOB_TITLES = [
    "Senior Nurse",
    "Junior Nurse",
    "Ward Assistant",
    "Lab Technician",
    "Pharmacist",
    "Front Desk Executive",
    "Security Guard",
    "Housekeeping Staff",
]

ADMIN_JOB_TITLES = [
    "driver",
    "security_guard",
    "ot_nurse",
    "ward_nurse",
    "accounts_staff",
]

ASSOCIATION_TYPES = ["OPD", "Consultation", "Surgery", "Telemedicine"]
SCHEDULE_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


class HospitalSidebarFakerGenerator:
    def __init__(
        self,
        company: Companies,
        *,
        created_by: str = "faker",
        default_password: str = "abc123",
        seed: int | None = None,
        locale: str = "en_IN",
    ):
        self.company = company
        self.created_by = (created_by or "faker").strip()[:100]
        self.default_password = default_password or "abc123"
        self.faker = Faker(locale)
        self._seed = seed
        if seed is not None:
            random.seed(seed)
            self.faker.seed_instance(seed)
            Faker.seed(seed)

        self.created_counts = {
            "departments": 0,
            "doctor_types": 0,
            "administration_types": 0,
            "staff_departments": 0,
            "staff_job_titles": 0,
            "time_slots": 0,
            "doctors": 0,
            "administrators": 0,
            "staff": 0,
            "doctor_schedules": 0,
        }

    def run(
        self,
        config: Dict[str, Any] | None = None,
        *,
        mode: str = "target",
    ) -> Dict[str, Any]:
        cfg = dict(DEFAULT_HOSPITAL_FAKER_CONFIG)
        if config:
            cfg.update(config)

        normalized_mode = (mode or "target").strip().lower()
        if normalized_mode not in ("target", "append"):
            raise ValueError("mode must be either 'target' or 'append'")

        existing_departments = Department.objects.filter(
            companies=self.company,
            delist=False,
        ).count()
        existing_doctor_types = DoctorType.objects.filter(
            companies=self.company,
            delist=False,
        ).count()
        existing_administration_types = AdministrationType.objects.filter(
            companies=self.company,
            delist=False,
        ).count()
        existing_staff_departments = StaffDepartment.objects.filter(
            companies=self.company,
            delist=False,
        ).count()
        existing_doctors = CompanyUser.objects.filter(
            company=self.company,
            role__iexact="doctor",
            delist=False,
        ).count()
        existing_admins = CompanyUser.objects.filter(
            company=self.company,
            role__iexact="administration",
            delist=False,
        ).count()
        existing_staff = CompanyUser.objects.filter(
            company=self.company,
            role__iexact="staff",
            delist=False,
        ).count()

        if normalized_mode == "append":
            departments_target = existing_departments + max(cfg["departments"], 0)
            doctor_types_target = existing_doctor_types + max(cfg["doctor_types"], 0)
            administration_types_target = existing_administration_types + max(
                cfg["administration_types"], 0
            )
            staff_departments_target = existing_staff_departments + max(
                cfg["staff_departments"], 0
            )
            staff_job_titles_per_department = max(
                cfg["staff_job_titles_per_department"], 0
            )
            doctors_target = existing_doctors + max(cfg["doctors"], 0)
            administrators_target = existing_admins + max(cfg["administrators"], 0)
            staff_target = existing_staff + max(cfg["staff"], 0)
        else:
            departments_target = max(cfg["departments"], 1 if cfg["doctors"] > 0 else 0)
            doctor_types_target = max(cfg["doctor_types"], 1 if cfg["doctors"] > 0 else 0)
            administration_types_target = max(
                cfg["administration_types"],
                1 if cfg["administrators"] > 0 else 0,
            )
            staff_departments_target = max(
                cfg["staff_departments"],
                1 if cfg["staff"] > 0 else 0,
            )
            staff_job_titles_per_department = max(
                cfg["staff_job_titles_per_department"],
                1 if cfg["staff"] > 0 and staff_departments_target > 0 else 0,
            )
            doctors_target = cfg["doctors"]
            administrators_target = cfg["administrators"]
            staff_target = cfg["staff"]

        with transaction.atomic():
            departments = self._ensure_departments(departments_target)
            doctor_types = self._ensure_doctor_types(doctor_types_target)
            administration_types = self._ensure_administration_types(
                administration_types_target
            )
            staff_departments = self._ensure_staff_departments(
                staff_departments_target
            )
            self._ensure_staff_job_titles(
                staff_departments,
                staff_job_titles_per_department,
            )
            if cfg["create_time_slots"]:
                self._ensure_time_slots()
            self._ensure_doctors(
                doctors_target,
                departments=departments,
                doctor_types=doctor_types,
            )
            self._ensure_administrators(
                administrators_target,
                administration_types=administration_types,
            )
            self._ensure_staff(
                staff_target,
                staff_departments=staff_departments,
            )
            if cfg["create_doctor_schedules"]:
                self._ensure_doctor_schedules()

        return {
            "company_id": self.company.id,
            "company_name": self.company.company_name,
            "seed": self._seed,
            "mode": normalized_mode,
            "created": dict(self.created_counts),
            "totals": self._build_totals(),
            "doctor_fees_created": 0,
        }

    def _build_totals(self) -> Dict[str, int]:
        return {
            "departments": Department.objects.filter(
                companies=self.company,
                delist=False,
            ).count(),
            "doctor_types": DoctorType.objects.filter(
                companies=self.company,
                delist=False,
            ).count(),
            "administration_types": AdministrationType.objects.filter(
                companies=self.company,
                delist=False,
            ).count(),
            "staff_departments": StaffDepartment.objects.filter(
                companies=self.company,
                delist=False,
            ).count(),
            "staff_job_titles": StaffJobTitle.objects.filter(
                companies=self.company,
                delist=False,
            ).count(),
            "time_slots": TimeSlot.objects.filter(companies=self.company).count(),
            "doctors": CompanyUser.objects.filter(
                company=self.company,
                role__iexact="doctor",
                delist=False,
            ).count(),
            "administrators": CompanyUser.objects.filter(
                company=self.company,
                role__iexact="administration",
                delist=False,
            ).count(),
            "staff": CompanyUser.objects.filter(
                company=self.company,
                role__iexact="staff",
                delist=False,
            ).count(),
            "doctor_schedules": DoctorSchedule.objects.filter(
                companies=self.company,
                delist=False,
            ).count(),
        }

    def _ensure_departments(self, target_count: int) -> List[Department]:
        existing = list(
            Department.objects.filter(companies=self.company, delist=False).order_by("id")
        )
        index = len(existing)
        while len(existing) < target_count:
            base = DEPARTMENT_NAMES[index % len(DEPARTMENT_NAMES)]
            name = f"{base} {index + 1}" if index >= len(DEPARTMENT_NAMES) else base
            existing.append(
                Department.objects.create(
                    companies=self.company,
                    name=name[:100],
                    is_approve=True,
                    created_by=self.created_by,
                )
            )
            self.created_counts["departments"] += 1
            index += 1
        return existing

    def _ensure_doctor_types(self, target_count: int) -> List[DoctorType]:
        existing = list(
            DoctorType.objects.filter(companies=self.company, delist=False).order_by("id")
        )
        index = len(existing)
        while len(existing) < target_count:
            base = DOCTOR_TYPE_NAMES[index % len(DOCTOR_TYPE_NAMES)]
            name = f"{base} {index + 1}" if index >= len(DOCTOR_TYPE_NAMES) else base
            existing.append(
                DoctorType.objects.create(
                    companies=self.company,
                    name=name[:100],
                    is_approve=True,
                    created_by=self.created_by,
                )
            )
            self.created_counts["doctor_types"] += 1
            index += 1
        return existing

    def _ensure_administration_types(
        self,
        target_count: int,
    ) -> List[AdministrationType]:
        existing = list(
            AdministrationType.objects.filter(
                companies=self.company,
                delist=False,
            ).order_by("id")
        )
        index = len(existing)
        while len(existing) < target_count:
            base = ADMINISTRATION_TYPE_NAMES[index % len(ADMINISTRATION_TYPE_NAMES)]
            name = (
                f"{base} {index + 1}"
                if index >= len(ADMINISTRATION_TYPE_NAMES)
                else base
            )
            existing.append(
                AdministrationType.objects.create(
                    companies=self.company,
                    name=name[:100],
                    is_approve=True,
                    created_by=self.created_by,
                )
            )
            self.created_counts["administration_types"] += 1
            index += 1
        return existing

    def _ensure_staff_departments(self, target_count: int) -> List[StaffDepartment]:
        existing = list(
            StaffDepartment.objects.filter(
                companies=self.company,
                delist=False,
            ).order_by("id")
        )
        sequence = len(existing) + 1
        while len(existing) < target_count:
            base = STAFF_DEPARTMENT_NAMES[(sequence - 1) % len(STAFF_DEPARTMENT_NAMES)]
            name = self._unique_staff_department_name(base, sequence)
            code = self._unique_staff_department_code(sequence)
            existing.append(
                StaffDepartment.objects.create(
                    companies=self.company,
                    name=name[:100],
                    code=code[:20],
                    is_approve=True,
                    created_by=self.created_by,
                )
            )
            self.created_counts["staff_departments"] += 1
            sequence += 1
        return existing

    def _ensure_staff_job_titles(
        self,
        staff_departments: List[StaffDepartment],
        per_department: int,
    ) -> None:
        if per_department <= 0:
            return
        for department in staff_departments:
            existing = list(
                StaffJobTitle.objects.filter(
                    companies=self.company,
                    staff_department=department,
                    delist=False,
                ).order_by("id")
            )
            sequence = len(existing) + 1
            while len(existing) < per_department:
                base = STAFF_JOB_TITLES[(sequence - 1) % len(STAFF_JOB_TITLES)]
                candidate = base
                if StaffJobTitle.objects.filter(
                    companies=self.company,
                    staff_department=department,
                    name__iexact=candidate,
                ).exists():
                    candidate = f"{base} {sequence}"
                existing.append(
                    StaffJobTitle.objects.create(
                        companies=self.company,
                        staff_department=department,
                        name=candidate[:100],
                        is_approve=True,
                        created_by=self.created_by,
                    )
                )
                self.created_counts["staff_job_titles"] += 1
                sequence += 1

    def _ensure_time_slots(self) -> List[TimeSlot]:
        default_windows = [
            (time(9, 0), time(11, 0)),
            (time(11, 0), time(13, 0)),
            (time(14, 0), time(16, 0)),
            (time(16, 0), time(18, 0)),
        ]
        slots: List[TimeSlot] = []
        for start_time, end_time in default_windows:
            slot = TimeSlot.objects.filter(
                companies=self.company,
                start_time=start_time,
                end_time=end_time,
            ).first()
            if slot is None:
                slot = TimeSlot.objects.create(
                    companies=self.company,
                    start_time=start_time,
                    end_time=end_time,
                )
                self.created_counts["time_slots"] += 1
            slots.append(slot)
        return slots

    def _ensure_doctors(
        self,
        target_count: int,
        *,
        departments: List[Department],
        doctor_types: List[DoctorType],
    ) -> None:
        existing_count = CompanyUser.objects.filter(
            company=self.company,
            role__iexact="doctor",
            delist=False,
        ).count()
        to_create = max(0, target_count - existing_count)
        for _ in range(to_create):
            full_name = self._trim(self.faker.name(), 50)
            email = self._build_unique_email("doctor")
            mobile = self._build_unique_mobile()
            is_approve = random.random() < 0.8
            department = random.choice(departments) if departments else None
            doctor_type = random.choice(doctor_types) if doctor_types else None
            CompanyUser.objects.create(
                company=self.company,
                name=full_name,
                username=email,
                email=email,
                mobile=mobile,
                whatsapp_number=mobile,
                role="doctor",
                department=department,
                doctor_type=doctor_type,
                association_type=random.choice(ASSOCIATION_TYPES),
                medical_council_registration=self._build_medical_registration(),
                is_approve=is_approve,
                can_access=True,
                is_active=is_approve,
                is_staff=True,
                is_assistant=True,
                created_by=self.created_by,
            )
            self._ensure_auth_user(email, self.default_password, activate=is_approve)
            self.created_counts["doctors"] += 1

    def _ensure_administrators(
        self,
        target_count: int,
        *,
        administration_types: List[AdministrationType],
    ) -> None:
        existing_count = CompanyUser.objects.filter(
            company=self.company,
            role__iexact="administration",
            delist=False,
        ).count()
        to_create = max(0, target_count - existing_count)
        for _ in range(to_create):
            full_name = self._trim(self.faker.name(), 50)
            email = self._build_unique_email("admin")
            mobile = self._build_unique_mobile()
            is_approve = random.random() < 0.8
            administration_type = (
                random.choice(administration_types) if administration_types else None
            )
            CompanyUser.objects.create(
                company=self.company,
                name=full_name,
                username=email,
                email=email,
                mobile=mobile,
                whatsapp_number=mobile,
                role="administration",
                administration_type=administration_type,
                job_title=random.choice(ADMIN_JOB_TITLES),
                is_approve=is_approve,
                can_access=True,
                is_active=is_approve,
                is_staff=True,
                created_by=self.created_by,
            )
            self._ensure_auth_user(email, self.default_password, activate=is_approve)
            self.created_counts["administrators"] += 1

    def _ensure_staff(
        self,
        target_count: int,
        *,
        staff_departments: List[StaffDepartment],
    ) -> None:
        job_title_qs = StaffJobTitle.objects.filter(
            companies=self.company,
            delist=False,
        )
        job_titles = list(job_title_qs.select_related("staff_department"))
        existing_count = CompanyUser.objects.filter(
            company=self.company,
            role__iexact="staff",
            delist=False,
        ).count()
        to_create = max(0, target_count - existing_count)
        for _ in range(to_create):
            full_name = self._trim(self.faker.name(), 50)
            email = self._build_unique_email("staff")
            mobile = self._build_unique_mobile()
            is_approve = random.random() < 0.75
            can_access = random.random() < 0.6
            department = random.choice(staff_departments) if staff_departments else None
            department_titles = (
                [item for item in job_titles if item.staff_department_id == department.id]
                if department
                else []
            )
            staff_job_title = (
                random.choice(department_titles)
                if department_titles
                else (random.choice(job_titles) if job_titles else None)
            )
            if department is None and staff_job_title is not None:
                department = staff_job_title.staff_department
            CompanyUser.objects.create(
                company=self.company,
                name=full_name,
                username=email,
                email=email,
                mobile=mobile,
                whatsapp_number=mobile,
                role="staff",
                staff_department=department,
                staff_job_title=staff_job_title,
                job_title=(staff_job_title.name if staff_job_title else ""),
                is_approve=is_approve,
                can_access=can_access,
                is_active=bool(can_access and is_approve),
                is_staff=True,
                created_by=self.created_by,
            )
            if can_access:
                self._ensure_auth_user(
                    email,
                    self.default_password,
                    activate=bool(can_access and is_approve),
                )
            self.created_counts["staff"] += 1

    def _ensure_doctor_schedules(self) -> None:
        slots = list(TimeSlot.objects.filter(companies=self.company).order_by("id"))
        if not slots:
            slots = self._ensure_time_slots()
        doctors = list(
            CompanyUser.objects.filter(
                company=self.company,
                role__iexact="doctor",
                delist=False,
            )
        )
        for doctor in doctors:
            if DoctorSchedule.objects.filter(companies=self.company, doctor=doctor).exists():
                continue
            day_one, day_two = random.sample(SCHEDULE_DAYS, 2)
            slot_ids = [slots[0].id]
            if len(slots) > 1:
                slot_ids.append(slots[1].id)
            DoctorSchedule.objects.create(
                companies=self.company,
                doctor=doctor,
                available_day_slots={
                    day_one: [slot_ids[0]],
                    day_two: [slot_ids[-1]],
                },
                association_type=doctor.association_type or random.choice(ASSOCIATION_TYPES),
                is_available=bool(doctor.is_approve),
                created_by=self.created_by,
            )
            self.created_counts["doctor_schedules"] += 1

    def _unique_staff_department_name(self, base: str, sequence: int) -> str:
        suffix = sequence
        while True:
            candidate = f"{base} C{self.company.id}-{suffix}"
            if not StaffDepartment.objects.filter(name__iexact=candidate).exists():
                return candidate
            suffix += 1

    def _unique_staff_department_code(self, sequence: int) -> str:
        suffix = sequence
        while True:
            candidate = f"SD{self.company.id:03d}{suffix:04d}"
            if not StaffDepartment.objects.filter(code=candidate).exists():
                return candidate
            suffix += 1

    def _build_unique_email(self, prefix: str) -> str:
        User = get_user_model()
        for _ in range(100):
            token = self.faker.bothify(text="????##").lower()
            email = f"{prefix}.{self.company.id}.{token}@example.com"
            if CompanyUser.objects.filter(email__iexact=email).exists():
                continue
            if User.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).exists():
                continue
            return email
        raise ValueError("Unable to generate a unique email for faker data.")

    def _build_unique_mobile(self) -> str:
        for _ in range(200):
            suffix = random.randint(1000000, 9999999)
            mobile = f"9{self.company.id % 100:02d}{suffix}"
            if not CompanyUser.objects.filter(company=self.company, mobile=mobile).exists():
                return mobile
        raise ValueError("Unable to generate a unique mobile for faker data.")

    def _build_medical_registration(self) -> str:
        token = self.faker.bothify(text="??######").upper()
        return f"MCI-{self.company.id}-{token}"[:120]

    def _ensure_auth_user(self, email: str, password: str, *, activate: bool) -> None:
        User = get_user_model()
        user = User.objects.filter(
            Q(username__iexact=email) | Q(email__iexact=email)
        ).first()
        if user is None:
            User.objects.create_user(
                username=email,
                email=email,
                password=password,
                is_active=activate,
            )
            return
        if activate and not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])

    @staticmethod
    def _trim(value: str, limit: int) -> str:
        return (value or "").strip()[:limit]


def seed_hospital_sidebar_faker_data(
    company: Companies,
    *,
    created_by: str = "faker",
    default_password: str = "abc123",
    seed: int | None = None,
    config: Dict[str, Any] | None = None,
    mode: str = "target",
) -> Dict[str, Any]:
    generator = HospitalSidebarFakerGenerator(
        company=company,
        created_by=created_by,
        default_password=default_password,
        seed=seed,
    )
    return generator.run(config=config, mode=mode)
