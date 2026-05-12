from django.db import models

from django.utils import timezone
from company_account.models import Companies


class School(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="schools",
    )
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=120, blank=True, default="")
    state = models.CharField(max_length=120, blank=True, default="")
    country = models.CharField(max_length=120, blank=True, default="")
    postal_code = models.CharField(max_length=20, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company_id} - {self.name}"


class AcademicYear(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="academic_years"
    )
    year_name = models.CharField(max_length=20)  # Example: 2025-2026
    start_date = models.DateField(null=True, blank=True, default=None)
    end_date = models.DateField(null=True, blank=True, default=None)
    is_active = models.BooleanField(default=False)
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.id}, {self.year_name}'


class SubjectList(models.Model):
    company = models.ForeignKey(Companies, on_delete=models.CASCADE,
                                null=False, blank=False, default=None, related_name='company_school_subject')
    subject_name = models.CharField(max_length=50, null=False, default=None)
    subject_initial = models.CharField(max_length=50, null=False, default=None)
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    updated_on = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.id},{self.subject_name}'


class ClassList(models.Model):
    company = models.ForeignKey(Companies, on_delete=models.CASCADE,
                                null=False, blank=False, default=None, related_name='company_school_class')
    class_name = models.CharField(max_length=50, null=False, default=None)
    subject = models.JSONField(null=True, blank=True, default=list)
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    updated_on = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.id},{self.class_name}'


class ClassFeeStructure(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="class_fee_structures"
    )
    class_details = models.ForeignKey(
        ClassList,
        on_delete=models.CASCADE,
        related_name="class_fee_structures"
    )

    admission_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)
    tuition_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)
    exam_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)
    annual_charge = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)
    total_fees = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)

    # frequency = models.CharField(
    #     max_length=20,
    #     choices=(
    #         ("monthly", "Monthly"),
    #         ("quarterly", "Quarterly"),
    #         ("half_yearly", "Half Yearly"),
    #         ("yearly", "Yearly"),
    #         ("one_time", "One Time"),
    #     ),
    #     default="monthly"
    # )

    academic_year = models.ForeignKey(
        'AcademicYear',
        on_delete=models.CASCADE,
        related_name="class_fee_structures",
        null=True,
        blank=True
    )

    is_active = models.BooleanField(default=True)
    delist = models.BooleanField(default=False)
    delist_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    delist_on = models.DateTimeField(default=timezone.now)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('class_details', 'academic_year')

    def __str__(self):
        return f"{self.id} - {self.class_details.class_name} - {self.total_fees}"


class SectionList(models.Model):
    company = models.ForeignKey(Companies, on_delete=models.CASCADE,
                                null=False, blank=False, default=None, related_name='company_school_section')
    class_details = models.ForeignKey(
        ClassList, on_delete=models.CASCADE, null=True, blank=True, related_name='company_school_section')
    section = models.CharField(max_length=50, null=False, default=None)
    num_of_stud = models.IntegerField(null=True, blank=True)
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    updated_on = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.id},{self.section}'


class TeacherList(models.Model):
    company = models.ForeignKey(Companies, on_delete=models.CASCADE,
                                null=False, blank=False, default=None, related_name='company_school_teacher')
    name = models.CharField(max_length=50, null=False, default=None)
    username = models.CharField(max_length=100, default="", null=True)
    mobile = models.CharField(
        max_length=100, unique=False, null=True, blank=True, default=None)
    email = models.EmailField(
        verbose_name="email", max_length=60, unique=False, null=False, default=None)
    dob = models.DateTimeField(null=True, blank=True)
    qualification = models.CharField(max_length=100, null=True, default='')
    experience = models.CharField(max_length=100, null=True, default='')
    address = models.CharField(max_length=255, null=True, default='')
    state = models.CharField(max_length=50, null=True, default='')
    city = models.CharField(max_length=50, null=True, default='')
    pin = models.CharField(max_length=50, null=True, default='')
    attachment_id = models.IntegerField(null=True, blank=True)
    is_head_master = models.BooleanField(default=False)
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    updated_on = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.id},{self.name}'


class NonTeacherStaffList(models.Model):
    company = models.ForeignKey(Companies, on_delete=models.CASCADE,
                                null=False, blank=False, default=None, related_name='company_school_non_teacher')
    name = models.CharField(max_length=50, null=False, default=None)
    username = models.CharField(max_length=100, default="", null=True)
    mobile = models.CharField(
        max_length=100, unique=False, null=True, blank=True, default=None)
    email = models.EmailField(
        verbose_name="email", max_length=60, unique=False, null=False, default=None)
    dob = models.DateTimeField(null=True, blank=True)
    qualification = models.CharField(max_length=100, null=True, default='')
    experience = models.CharField(max_length=100, null=True, default='')
    address = models.CharField(max_length=255, null=True, default='')
    state = models.CharField(max_length=50, null=True, default='')
    city = models.CharField(max_length=50, null=True, default='')
    pin = models.CharField(max_length=50, null=True, default='')
    attachment_id = models.IntegerField(null=True, blank=True)
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    updated_on = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.id},{self.name}'


class StudentList(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        null=False,
        blank=False,
        default=None,
        related_name='company_school_student'
    )
    name = models.CharField(max_length=50, null=False, default=None)
    username = models.CharField(max_length=100, default="", null=True)
    mobile = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    email = models.EmailField(max_length=60, null=False, default=None)
    dob = models.DateField(null=True, blank=True)
    guardian_name = models.CharField(max_length=100, null=True, default='')
    address = models.CharField(max_length=255, null=True, default='')
    state = models.CharField(max_length=50, null=True, default='')
    city = models.CharField(max_length=50, null=True, default='')
    pin = models.CharField(max_length=50, null=True, default='')
    attachment_id = models.IntegerField(null=True, blank=True)

    delist = models.BooleanField(default=False)
    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.id}, {self.name}'


class StudentAcademicRecord(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="student_academic_records"
    )
    student = models.ForeignKey(
        StudentList,
        on_delete=models.CASCADE,
        related_name="academic_records"
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="student_records"
    )
    class_details = models.ForeignKey(
        ClassList,
        on_delete=models.CASCADE,
        related_name="student_records"
    )
    section_details = models.ForeignKey(
        SectionList,
        on_delete=models.CASCADE,
        related_name="student_records"
    )

    roll_number = models.CharField(max_length=30, null=True, blank=True)
    admission_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=(
            ("active", "Active"),
            ("pending", "Pending"),
            ("promoted", "Promoted"),
            ("detained", "Detained"),
            ("passed_out", "Passed Out"),
            ("left", "Left"),
        ),
        default="active"
    )
    remarks = models.TextField(blank=True, default="")
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('student', 'academic_year')

    def __str__(self):
        return f"{self.student.name} - {self.academic_year.year_name} - {self.class_details.class_name}"


class ExamType(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="exam_masters"
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="exam_masters"
    )
    # Unit Test 1 / Half Yearly / Final Exam
    exam_name = models.CharField(max_length=100)
    exam_type = models.CharField(
        max_length=30,
        choices=(
            ("unit_test", "Unit Test"),
            ("monthly_test", "Monthly Test"),
            ("quarterly", "Quarterly"),
            ("half_yearly", "Half Yearly"),
            ("annual", "Annual"),
            ("practical", "Practical"),
            ("other", "Other"),
        ),
        default="other"
    )
    total_marks = models.IntegerField(default=20)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.exam_name} - {self.academic_year.year_name}"


class ExamSchedule(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="exam_schedules"
    )
    exam = models.ForeignKey(
        ExamType,
        on_delete=models.CASCADE,
        related_name="schedules"
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="exam_schedules",
        null=True,
        blank=True,
    )
    class_details = models.ForeignKey(
        ClassList,
        on_delete=models.CASCADE,
        related_name="exam_schedules"
    )
    section_details = models.ForeignKey(
        SectionList,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="exam_schedules"
    )
    subject = models.ForeignKey(
        SubjectList,
        on_delete=models.CASCADE,
        related_name="exam_schedules"
    )

    exam_date = models.DateField()
    subject_schedules = models.JSONField(default=list, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    total_marks = models.IntegerField(default=100)
    passing_marks = models.DecimalField(
        max_digits=6, decimal_places=2, default=33)
    exam_room = models.CharField(
        max_length=100, null=True, blank=True, default="")
    instructions = models.TextField(blank=True, default="")
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["exam", "class_details", "section_details"],
                name="unique_exam_schedule_per_class_section"
            )
        ]

    def __str__(self):
        academic_year_name = getattr(self.academic_year, "year_name", "") or ""
        if academic_year_name:
            return f"{self.exam.exam_name} - {academic_year_name} - {self.class_details.class_name} - {self.subject.subject_name}"
        return f"{self.exam.exam_name} - {self.class_details.class_name} - {self.subject.subject_name}"


class StudentsMark(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="student_marks"
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="student_marks",
        null=True,
        blank=True,
    )
    class_details = models.ForeignKey(
        ClassList,
        on_delete=models.CASCADE,
        related_name="student_marks"
    )
    section_details = models.ForeignKey(
        SectionList,
        on_delete=models.CASCADE,
        related_name="student_marks"
    )
    student_record = models.ForeignKey(
        StudentAcademicRecord,
        on_delete=models.CASCADE,
        related_name="student_marks"
    )
    exam_schedule = models.ForeignKey(
        ExamSchedule,
        on_delete=models.CASCADE,
        related_name="student_marks"
    )
    subject = models.ForeignKey(
        SubjectList,
        on_delete=models.CASCADE,
        related_name="student_marks"
    )
    subject_marks = models.JSONField(default=dict, blank=True)

    max_marks = models.DecimalField(
        max_digits=6, decimal_places=2, default=100)
    passing_marks = models.DecimalField(
        max_digits=6, decimal_places=2, default=33)
    marks_obtained = models.DecimalField(
        max_digits=6, decimal_places=2, default=0)
    practical_marks = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True)
    internal_marks = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True)

    grade = models.CharField(max_length=10, blank=True, default="")
    is_absent = models.BooleanField(default=False)
    is_pass = models.BooleanField(default=True)
    remarks = models.TextField(blank=True, default="")
    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    created_on = models.DateTimeField(default=timezone.now)
    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None)
    updated_on = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "student_record", "exam_schedule"],
                name="unique_students_mark_per_company_student_record_exam_schedule",
            )
        ]

    def __str__(self):
        return f"{self.id}"


class StudentFeesCollection(models.Model):
    company = models.ForeignKey(
        Companies,
        on_delete=models.CASCADE,
        related_name="student_fee_collections"
    )

    student_academic_rcord = models.ForeignKey(
        StudentAcademicRecord,
        on_delete=models.CASCADE,
        related_name="fee_collections"
    )

    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="fee_collections"
    )

    class_details = models.ForeignKey(
        ClassList,
        on_delete=models.CASCADE,
        related_name="fee_collections"
    )

    fee_structure = models.ForeignKey(
        ClassFeeStructure,
        on_delete=models.CASCADE,
        related_name="student_fee_collections"
    )

    # Installment info
    installment_name = models.CharField(
        max_length=20,
        choices=(
            ("monthly", "Monthly"),
            ("quarterly", "Quarterly"),
            ("half_yearly", "Half Yearly"),
            ("yearly", "Yearly"),
            ("due", "Due"),
            ("one_time", "One Time"),
        ),
        default="monthly"
    )

    due_date = models.DateField(null=True, blank=True)

    # Amount details
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)
    due_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0)

    # Payment info
    payment_date = models.DateField(null=True, blank=True)
    payment_mode = models.CharField(
        max_length=20,
        choices=(
            ("cash", "Cash"),
            ("online", "Online"),
            ("cheque", "Cheque"),
            ("upi", "UPI"),
        ),
        null=True,
        blank=True
    )

    transaction_id = models.CharField(
        max_length=100, null=True, blank=True
    )

    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=(
            ("pending", "Pending"),
            ("partial", "Partially Paid"),
            ("fully_paid", "Fully Paid"),
            ("overdue", "Overdue"),
        ),
        default="pending"
    )

    remarks = models.TextField(blank=True, default="")

    delist = models.BooleanField(default=False)

    created_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    created_on = models.DateTimeField(default=timezone.now)

    updated_by = models.CharField(
        max_length=100, null=True, blank=True, default=None
    )
    updated_on = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        # Auto calculate due amount
        self.due_amount = self.total_amount - self.paid_amount

        # Auto update status
        if self.paid_amount == 0:
            self.status = "pending"
        elif self.paid_amount < self.total_amount:
            self.status = "partial"
        else:
            self.status = "fully_paid"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_academic_rcord.student.name} - {self.installment_name} - {self.status}"
