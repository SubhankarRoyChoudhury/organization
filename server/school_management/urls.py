from django.urls import path

from . import views


urlpatterns = [
    path(
        "category-dashboard-summary/",
        views.category_dashboard_summary,
        name="school-category-dashboard-summary",
    ),
    path("academic-year-list/", views.academic_year_list,
         name="school-academic-year-list"),
    path(
        "academic-year-list/<int:academic_year_id>/",
        views.academic_year_list_detail,
        name="school-academic-year-list-detail",
    ),
    path("class-list/", views.class_list, name="school-class-list"),
    path("class-list/<int:class_id>/", views.class_list_detail,
         name="school-class-list-detail"),
    path(
        "class-fee-structure-list/",
        views.class_fee_structure_list,
        name="school-class-fee-structure-list",
    ),
    path(
        "class-fee-structure-list/<int:fee_id>/",
        views.class_fee_structure_list_detail,
        name="school-class-fee-structure-list-detail",
    ),
    path(
        "student-fees-collection-list/",
        views.student_fees_collection_list,
        name="school-student-fees-collection-list",
    ),
    path(
        "student-fees-collection-list/<int:collection_id>/",
        views.student_fees_collection_list_detail,
        name="school-student-fees-collection-list-detail",
    ),
    path("section-list/", views.section_list, name="school-section-list"),
    path("section-list/<int:section_id>/", views.section_list_detail,
         name="school-section-list-detail"),
    path("subject-list/", views.subject_list, name="school-subject-list"),
    path("subject-list/<int:subject_id>/", views.subject_list_detail,
         name="school-subject-list-detail"),
    path("exam-type-list/", views.exam_type_list, name="school-exam-type-list"),
    path(
        "exam-type-list/<int:exam_type_id>/",
        views.exam_type_list_detail,
        name="school-exam-type-list-detail",
    ),
    path("exam-schedule-list/", views.exam_schedule_list,
         name="school-exam-schedule-list"),
    path(
        "exam-schedule-list/<int:exam_schedule_id>/",
        views.exam_schedule_list_detail,
        name="school-exam-schedule-list-detail",
    ),
    path("teacher-list/", views.teacher_list, name="school-teacher-list"),
    path("teacher-list/<int:teacher_id>/", views.teacher_list_detail,
         name="school-teacher-list-detail"),
    path("non-teaching-staff-list/", views.non_teaching_staff_list,
         name="school-non-teaching-staff-list"),
    path(
        "non-teaching-staff-list/<int:staff_id>/",
        views.non_teaching_staff_list_detail,
        name="school-non-teaching-staff-list-detail",
    ),
    path("student-list/", views.student_list, name="school-student-list"),
    path("student-list/<int:student_id>/", views.student_list_detail,
         name="school-student-list-detail"),
    path(
        "student-academic-record-list/",
        views.student_academic_record_list,
        name="school-student-academic-record-list",
    ),
    path(
        "student-academic-record-list/<int:record_id>/",
        views.student_academic_record_list_detail,
        name="school-student-academic-record-list-detail",
    ),
    path(
        "student-exam-marks-list/",
        views.student_exam_marks_list,
        name="school-student-exam-marks-list",
    ),
    path(
        "student-exam-marks-list/<int:mark_id>/",
        views.student_exam_marks_list_detail,
        name="school-student-exam-marks-list-detail",
    ),
    path(
        "school_test/",
        views.schoolTestData,
        name="school_test",
    ),
]
