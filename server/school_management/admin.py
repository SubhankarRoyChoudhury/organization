from django.contrib import admin
from django.utils.html import format_html, format_html_join

from .models import (
    AcademicYear,
    School,
    ClassFeeStructure,
    ClassList,
    ExamType,
    ExamSchedule,
    SectionList,
    SubjectList,
    TeacherList,
    StudentList,
    StudentAcademicRecord,
    StudentFeesCollection,
    StudentsMark,
)


def _normalize_subject_schedules(value):
    if not isinstance(value, list):
        return []

    normalized = []
    for entry in value:
        if not isinstance(entry, dict):
            continue
        normalized.append(
            {
                "subject_name": str(
                    entry.get("subject_name")
                    or entry.get("subjectName")
                    or entry.get("subject", {}).get("subject_name")
                    or ""
                ).strip(),
                "exam_date": str(
                    entry.get("exam_date")
                    or entry.get("examDate")
                    or ""
                ).strip(),
            }
        )
    return normalized


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "address",
                    "city", "state", "country", "postal_code")
    search_fields = ("name", "company__company_name",  "company__company_id")
    list_filter = ("country", "state")


@admin.register(ClassList)
class ClassListAdmin(admin.ModelAdmin):
    list_display = ("id", "class_name", "company",
                    "delist", "created_by", "created_on")
    search_fields = ("class_name", "company__company_name",
                     "company__company_id")
    list_filter = ("delist", "company")


@admin.register(ClassFeeStructure)
class ClassFeeStructureAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "class_details",
        "academic_year",
        "admission_fee",
        "tuition_fee",
        "exam_fee",
        "annual_charge",
        "total_fees",
        # "frequency",
        "is_active",
        "delist",
        "created_by",
        "created_on",
    )
    search_fields = (
        "class_details__class_name",
        "academic_year__year_name",
        "company__company_name",
        "company__company_id",
        "created_by",
        "updated_by",
    )
    list_filter = (
        "is_active",
        "delist",
        # "frequency",
        "company",
        "academic_year",
        "class_details",
    )


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "year_name",
        "company",
        "start_date",
        "end_date",
        "is_active",
        "delist",
        "created_by",
        "created_on",
    )
    search_fields = (
        "year_name",
        "company__company_name",
        "company__company_id",
    )
    list_filter = ("is_active", "delist", "company")


@admin.register(ExamType)
class ExamTypeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "academic_year",
        "exam_name",
        "exam_type",
        "total_marks",
        "start_date",
        "end_date",
        "is_active",
        "delist",
        "created_by",
        "created_on",
    )
    search_fields = (
        "exam_name",
        "exam_type",
        "company__company_name",
        "company__company_id",
        "academic_year__year_name",
    )
    list_filter = ("is_active", "delist", "company",
                   "academic_year", "exam_type")


@admin.register(ExamSchedule)
class ExamScheduleAdmin(admin.ModelAdmin):
    readonly_fields = ("subject_schedules_table",)
    exclude = ("subject_schedules",)
    list_display = (
        "id",
        "company",
        "exam",
        "class_details",
        "section_details",
        "subject",
        "subject_schedules_summary",
        "exam_date",
        "start_time",
        "end_time",
        "total_marks",
        "passing_marks",
        "delist",
        "created_by",
        "created_on",
    )
    search_fields = (
        "exam__exam_name",
        "class_details__class_name",
        "section_details__section",
        "subject__subject_name",
        "company__company_name",
        "company__company_id",
    )
    list_filter = ("delist", "company", "exam", "class_details",
                   "section_details", "subject")

    def subject_schedules_summary(self, obj):
        subject_schedules = _normalize_subject_schedules(obj.subject_schedules)
        if not subject_schedules:
            return "-"

        subject_names = [
            entry["subject_name"]
            for entry in subject_schedules
            if entry["subject_name"]
        ]
        if not subject_names:
            return "-"
        if len(subject_names) <= 3:
            return ", ".join(subject_names)
        return f"{', '.join(subject_names[:3])} (+{len(subject_names) - 3} more)"

    subject_schedules_summary.short_description = "Subject schedules"

    def subject_schedules_table(self, obj):
        subject_schedules = _normalize_subject_schedules(
            getattr(obj, "subject_schedules", []))
        if not subject_schedules:
            return "-"

        rows = format_html_join(
            "",
            "<tr><td style='padding:6px 10px;border:1px solid #d1d5db;'>{}</td><td style='padding:6px 10px;border:1px solid #d1d5db;'>{}</td><td style='padding:6px 10px;border:1px solid #d1d5db;'>{}</td></tr>",
            (
                (
                    index + 1,
                    entry["subject_name"] or "-",
                    entry["exam_date"] or "-",
                )
                for index, entry in enumerate(subject_schedules)
            ),
        )
        return format_html(
            "<div style='overflow-x:auto; max-width: 100%;'>"
            "<table style='border-collapse:collapse; width:100%; min-width:520px;'>"
            "<thead>"
            "<tr>"
            "<th style='text-align:left;padding:6px 10px;border:1px solid #d1d5db;background:#f8fafc;'>#</th>"
            "<th style='text-align:left;padding:6px 10px;border:1px solid #d1d5db;background:#f8fafc;'>Subject Name</th>"
            "<th style='text-align:left;padding:6px 10px;border:1px solid #d1d5db;background:#f8fafc;'>Exam Date</th>"
            "</tr>"
            "</thead>"
            "<tbody>{}</tbody>"
            "</table>"
            "</div>",
            rows,
        )

    subject_schedules_table.short_description = "Subject schedules"


@admin.register(SectionList)
class SectionListAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "class_details", "section", "num_of_stud")
    search_fields = (
        "section",
        "class_details__class_name",
        "company__company_name",
        "company__company_id",
    )
    list_filter = ("section", "company")


@admin.register(SubjectList)
class SubjectListAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "subject_name",
        "subject_initial",
        "delist",
        "created_by",
        "created_on",
    )
    search_fields = (
        "subject_name",
        "subject_initial",
        "company__company_name",
        "company__company_id",
    )
    list_filter = ("delist", "company")


@admin.register(TeacherList)
class TeacherListAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "name",
        "username",
        "mobile",
        "email",
        "dob",
        "qualification",
        "experience",
        "is_head_master",
        "created_by",
        "created_on",
        "delist",
    )
    search_fields = (
        "name",
        "username",
        "mobile",
        "email",
        "address",
        "state",
        "city",
        "pin",
        "company__company_name",
        "company__company_id",
    )
    list_filter = ("delist", "is_head_master", "company", "state", "city")


@admin.register(StudentList)
class StudentListAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "name",
        "username",
        "mobile",
        "email",
        "dob",
        "guardian_name",
        "state",
        "city",
        "pin",
        "attachment_id",
        "created_by",
        "created_on",
        "delist",
    )
    search_fields = (
        "name",
        "username",
        "mobile",
        "email",
        "guardian_name",
        "address",
        "state",
        "city",
        "pin",
        "company__company_name",
        "company__company_id",
    )
    list_filter = ("delist", "company", "state", "city")


@admin.register(StudentAcademicRecord)
class StudentAcademicRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "student",
        "academic_year",
        "class_details",
        "section_details",
        "roll_number",
        "admission_date",
        "status",
        "delist",
        "created_by",
        "created_on",
    )
    search_fields = (
        "student__name",
        "student__username",
        "academic_year__year_name",
        "class_details__class_name",
        "section_details__section",
        "roll_number",
        "company__company_name",
        "company__company_id",
    )
    list_filter = (
        "status",
        "delist",
        "company",
        "academic_year",
        "class_details",
        "section_details",
    )


@admin.register(StudentsMark)
class StudentsMarkAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "student_record",
        "exam_schedule",
        "subject_marks",
        # "subject",
        # "marks_obtained",
        "grade",
        "is_absent",
        "delist",
        "created_by",
        "created_on",
    )
    search_fields = (
        "student_record__student__name",
        "student_record__student__username",
        "exam_schedule__exam__exam_name",
        "exam_schedule__subject__subject_name",
        "subject__subject_name",
        "company__company_name",
        "company__company_id",
    )
    list_filter = (
        "delist",
        "is_absent",
        "is_pass",
        "company",
        "exam_schedule",
        "subject",
        "class_details",
        "section_details",
    )


@admin.register(StudentFeesCollection)
class StudentFeesCollectionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "student_academic_rcord",
        "academic_year",
        "class_details",
        "fee_structure",
        "installment_name",
        "due_date",
        "total_amount",
        "paid_amount",
        "due_amount",
        "payment_date",
        "payment_mode",
        "status",
        "delist",
        "created_by",
        "created_on",
    )
    search_fields = (
        "student_academic_rcord__student__name",
        "student_academic_rcord__student__username",
        "academic_year__year_name",
        "class_details__class_name",
        "transaction_id",
        "company__company_name",
        "company__company_id",
    )
    list_filter = (
        "installment_name",
        "payment_mode",
        "status",
        "delist",
        "company",
        "academic_year",
        "class_details",
    )
