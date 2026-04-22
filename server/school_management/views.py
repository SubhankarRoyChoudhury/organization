from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model
from django.core.paginator import EmptyPage, Paginator
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from decimal import Decimal, InvalidOperation
import re

from accounts.models import Organization, OrganizationUser
from company_account.models import Companies, CompanyInfo, CompanyUser
from shared.views import sendGenericMailV2

from .models import (
    AcademicYear,
    ClassFeeStructure,
    ClassList,
    ExamType,
    ExamSchedule,
    NonTeacherStaffList,
    School,
    SectionList,
    SubjectList,
    StudentAcademicRecord,
    StudentFeesCollection,
    StudentList,
    StudentsMark,
    TeacherList,
)
from .serializers import (
    AcademicYearCreateSerializer,
    AcademicYearSerializer,
    ClassFeeStructureCreateSerializer,
    ClassFeeStructureSerializer,
    ClassListCreateSerializer,
    ClassListSerializer,
    ExamTypeCreateSerializer,
    ExamTypeSerializer,
    ExamScheduleCreateSerializer,
    ExamScheduleSerializer,
    NonTeachingListCreateSerializer,
    SectionListCreateSerializer,
    SectionListSerializer,
    SubjectListCreateSerializer,
    SubjectListSerializer,
    StudentAcademicRecordCreateSerializer,
    StudentAcademicRecordSerializer,
    StudentFeesCollectionCreateSerializer,
    StudentFeesCollectionSerializer,
    StudentListCreateSerializer,
    StudentsMarkCreateSerializer,
    StudentsMarkSerializer,
    TeacherListCreateSerializer,
)


class QueryParamTokenAuthentication(JWTAuthentication):
    def get_header(self, request):
        header = super().get_header(request)
        if header is not None:
            return header
        token = request.query_params.get("access_token")
        if token:
            return f"Bearer {token}".encode()
        return None


def _get_logged_in_company_user(request):
    username = getattr(request.user, "username", "")
    if not username:
        return None
    return (
        CompanyUser.objects.select_related("company")
        .filter(username__iexact=username)
        .order_by("id")
        .first()
    )


def _normalize_subject_marks_value(value):
    if isinstance(value, list):
        return list(value)
    if isinstance(value, dict):
        if "subject" in value and "marks_obtained" in value:
            subject_name = str(value.get("subject") or "").strip()
            return [{
                "subject": subject_name,
                "marks_obtained": value.get("marks_obtained"),
                "grade": str(value.get("grade") or "").strip(),
            }]
        if any(
            key not in {"entries", "subjects", "items", "marks"}
            for key in value.keys()
        ):
            return [
                {"subject": str(key), "marks_obtained": val}
                for key, val in value.items()
                if key not in {"entries", "subjects", "items", "marks"}
            ]
        for key in ("entries", "subjects", "items", "marks"):
            nested = value.get(key)
            if isinstance(nested, list):
                return list(nested)
    return []


def _json_safe_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [_json_safe_value(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _json_safe_value(item) for key, item in value.items()}
    return value


def _subject_marks_map(existing_value):
    if isinstance(existing_value, dict):
        if "subject" in existing_value and "marks_obtained" in existing_value:
            subject_name = str(existing_value.get("subject") or "").strip()
            if subject_name:
                return {
                    subject_name: {
                        "marks_obtained": _json_safe_value(
                            existing_value.get("marks_obtained")
                        ),
                        "grade": str(existing_value.get("grade") or "").strip(),
                        **(
                            {"total_marks": _json_safe_value(
                                existing_value.get("total_marks"))}
                            if existing_value.get("total_marks") is not None
                            else {}
                        ),
                    }
                }
        reserved_keys = {"entries", "subjects", "items", "marks"}
        if any(key not in reserved_keys for key in existing_value.keys()):
            return {
                str(key): _json_safe_value(val)
                for key, val in existing_value.items()
                if key not in reserved_keys
            }

    normalized_map = {}
    for entry in _normalize_subject_marks_value(existing_value):
        subject_name = str(
            entry.get("subject")
            or entry.get("subject_name")
            or entry.get("subject_id")
            or ""
        ).strip()
        if not subject_name:
            continue
        normalized_map[subject_name] = _json_safe_value(
            {
                "marks_obtained": entry.get("marks_obtained")
                if "marks_obtained" in entry
                else entry.get("marks"),
                "grade": str(entry.get("grade") or "").strip(),
                **(
                    {"total_marks": entry.get("total_marks")}
                    if entry.get("total_marks") is not None
                    else {}
                ),
            }
        )
    return normalized_map


def _merge_subject_marks_map(
    existing_value,
    subject_name,
    marks_obtained,
    grade="",
    total_marks=None,
):
    subject_name = str(subject_name or "").strip()
    if not subject_name:
        return _subject_marks_map(existing_value)

    next_map = _subject_marks_map(existing_value)
    next_entry = {
        "marks_obtained": marks_obtained,
        "grade": str(grade or "").strip(),
    }
    if total_marks is not None and str(total_marks).strip() != "":
        next_entry["total_marks"] = total_marks
    elif isinstance(next_map.get(subject_name), dict) and next_map[subject_name].get("total_marks") is not None:
        next_entry["total_marks"] = next_map[subject_name].get("total_marks")
    next_map[subject_name] = _json_safe_value(next_entry)
    return next_map


def _get_exam_schedule_subject_ids(exam_schedule_item):
    subject_schedules = getattr(
        exam_schedule_item, "subject_schedules", None) or []
    subject_ids = []

    for entry in subject_schedules:
        if isinstance(entry, dict):
            subject_id = entry.get("subject_id") or entry.get(
                "subjectId") or entry.get("subject", {}).get("id", "")
        else:
            subject_id = getattr(entry, "subject_id", "") or getattr(
                entry, "subjectId", "")
        subject_id = str(subject_id or "").strip()
        if subject_id:
            subject_ids.append(subject_id)

    if subject_ids:
        return subject_ids

    fallback_subject_id = str(
        getattr(exam_schedule_item, "subject_id", "") or "").strip()
    return [fallback_subject_id] if fallback_subject_id else []


def _resolve_organization_dashboard_context(request):
    username = (getattr(request.user, "username", "") or "").strip()
    email = (getattr(request.user, "email", "") or "").strip()

    identity_filter = Q()
    if username:
        identity_filter |= Q(username__iexact=username)
    if email:
        identity_filter |= Q(email__iexact=email)

    organization_user = None
    if username or email:
        organization_user = (
            OrganizationUser.objects.select_related("company")
            .filter(Q(user=request.user) | identity_filter)
            .order_by("id")
            .first()
        )

    company_user = None
    if username or email:
        company_user = (
            CompanyUser.objects.select_related("company")
            .filter(identity_filter)
            .order_by("id")
            .first()
        )

    organization_id = None
    organization_name = ""

    if organization_user and organization_user.company_id:
        organization_id = str(organization_user.company_id)
        organization_name = (organization_user.company.name or "").strip()
    elif company_user and company_user.company:
        organization_id = str(
            company_user.organization_id
            or company_user.company.organization_id
            or company_user.company.id
        )

    if not organization_id:
        return None, None, None

    if not organization_name:
        organization_name = (
            Organization.objects.filter(id=organization_id)
            .values_list("name", flat=True)
            .first()
            or ""
        )

    school_companies = Companies.objects.filter(
        organization_id=str(organization_id),
        main_group__iexact="Vidya",
        sub_group__iexact="School",
        delist=False,
    ).order_by("company_name")

    if not school_companies.exists() and company_user and company_user.company:
        school_companies = Companies.objects.filter(
            id=company_user.company_id,
            main_group__iexact="Vidya",
            sub_group__iexact="School",
            delist=False,
        )

    if not organization_name:
        first_company = school_companies.first()
        organization_name = first_company.company_name if first_company else ""

    return organization_id, organization_name, school_companies


def _resolve_actor_username(request, serializer_data, key):
    value = (serializer_data.get(key) or "").strip()
    if value:
        return value
    return (getattr(request.user, "username", "") or "").strip() or None


def _generate_unique_username(user_model, base_username):
    normalized_base = (base_username or "").strip().lower()
    if not normalized_base:
        normalized_base = "teacher"

    candidate = normalized_base
    suffix = 1
    while user_model.objects.filter(username__iexact=candidate).exists():
        suffix += 1
        candidate = f"{normalized_base}{suffix}"
    return candidate


def _normalize_auth_email(user_model, username, email, exclude_user_id=None):
    normalized_email = (email or "").strip().lower()
    if normalized_email:
        return normalized_email

    slug = re.sub(r"[^a-z0-9]+", ".",
                  (username or "").strip().lower()).strip(".")
    if not slug:
        slug = "student"
    candidate = f"{slug}@placeholder.local"
    suffix = 1
    queryset = user_model.objects.all()
    if exclude_user_id:
        queryset = queryset.exclude(id=exclude_user_id)
    while queryset.filter(email__iexact=candidate).exists():
        suffix += 1
        candidate = f"{slug}{suffix}@placeholder.local"
    return candidate


def _normalize_auth_phone(user_model, username, phone_number, exclude_user_id=None):
    normalized_phone = (phone_number or "").strip()
    if normalized_phone:
        return normalized_phone

    base_digits = "".join(
        str(ord(char) % 10) for char in (username or "").lower() if char.isalnum()
    )
    if not base_digits:
        base_digits = "1234567890"
    candidate = (base_digits + "0" * 10)[:10]
    queryset = user_model.objects.all()
    if exclude_user_id:
        queryset = queryset.exclude(id=exclude_user_id)
    while queryset.filter(phone_number=candidate).exists():
        candidate = str((int(candidate) + 1) % 10_000_000_000).zfill(10)
    return candidate


def _serialize_student_company_user(company_user):
    dob_value = company_user.dob
    if dob_value is None:
        dob_display = None
    elif hasattr(dob_value, "date"):
        dob_display = dob_value.date().isoformat()
    else:
        dob_display = str(dob_value)

    return {
        "id": company_user.id,
        "company_id": company_user.company_id,
        "name": company_user.name,
        "username": company_user.username,
        "mobile": company_user.mobile,
        "email": company_user.email,
        "dob": dob_display,
        "guardian_name": company_user.fatherOrHusband or "",
        "address": company_user.address or "",
        "state": company_user.state or "",
        "city": company_user.city or "",
        "pin": company_user.pin or "",
        "attachment_id": company_user.attachment_id,
        "created_by": company_user.created_by,
        "created_on": company_user.created_on,
        "updated_by": company_user.updated_by,
        "updated_on": company_user.updated_on,
        "job_title": company_user.job_title or "",
        "role": company_user.role or "",
    }


def _attach_student_academic_record(student_payload, record_by_student_key):
    student_key_values = [
        (student_payload.get("username") or "").strip().lower(),
        (student_payload.get("email") or "").strip().lower(),
        (student_payload.get("mobile") or "").strip(),
        str(student_payload.get("id") or "").strip(),
    ]

    matched_record = None
    for key in student_key_values:
        if key and key in record_by_student_key:
            matched_record = record_by_student_key[key]
            break

    student_payload["class_name"] = (
        getattr(getattr(matched_record, "class_details", None), "class_name", "")
        if matched_record
        else ""
    )
    student_payload["section_name"] = (
        getattr(getattr(matched_record, "section_details", None), "section", "")
        if matched_record
        else ""
    )
    return student_payload


def _serialize_teacher_company_user(company_user):
    dob_value = company_user.dob
    if dob_value is None:
        dob_display = None
    elif hasattr(dob_value, "isoformat"):
        dob_display = dob_value.isoformat()
    else:
        dob_display = str(dob_value)

    main_subject = company_user.main_subject or []
    others_subject = company_user.others_subject or []
    preferable_class = company_user.preferableClass or []
    main_subject_names = list(
        SubjectList.objects.filter(
            id__in=main_subject,
            company_id=company_user.company_id,
            delist=False,
        ).values_list("subject_name", flat=True)
    )
    others_subject_names = list(
        SubjectList.objects.filter(
            id__in=others_subject,
            company_id=company_user.company_id,
            delist=False,
        ).values_list("subject_name", flat=True)
    )
    preferable_class_names = list(
        ClassList.objects.filter(
            id__in=preferable_class,
            company_id=company_user.company_id,
            delist=False,
        ).values_list("class_name", flat=True)
    )

    return {
        "id": company_user.id,
        "company_id": company_user.company_id,
        "name": company_user.name,
        "username": company_user.username,
        "mobile": company_user.mobile,
        "email": company_user.email,
        "dob": dob_display,
        "is_head_master": bool(company_user.is_head_master),
        "qualification": company_user.qualification or "",
        "experience": company_user.experience or "",
        "address": company_user.address or "",
        "state": company_user.state or "",
        "city": company_user.city or "",
        "pin": company_user.pin or "",
        "attachment_id": company_user.attachment_id,
        "main_subject": main_subject,
        "others_subject": others_subject,
        "preferableClass": preferable_class,
        "main_subject_names": main_subject_names,
        "others_subject_names": others_subject_names,
        "preferableClass_names": preferable_class_names,
        "created_by": company_user.created_by,
        "created_on": company_user.created_on,
        "updated_by": company_user.updated_by,
        "updated_on": company_user.updated_on,
        "role": company_user.role or "",
    }


def _serialize_non_teaching_company_user(company_user):
    dob_value = company_user.dob
    if dob_value is None:
        dob_display = None
    elif hasattr(dob_value, "isoformat"):
        dob_display = dob_value.isoformat()
    else:
        dob_display = str(dob_value)

    return {
        "id": company_user.id,
        "company_id": company_user.company_id,
        "name": company_user.name,
        "username": company_user.username,
        "mobile": company_user.mobile,
        "email": company_user.email,
        "dob": dob_display,
        "qualification": company_user.qualification or "",
        "experience": company_user.experience or "",
        "address": company_user.address or "",
        "state": company_user.state or "",
        "city": company_user.city or "",
        "pin": company_user.pin or "",
        "attachment_id": company_user.attachment_id,
        "created_by": company_user.created_by,
        "created_on": company_user.created_on,
        "updated_by": company_user.updated_by,
        "updated_on": company_user.updated_on,
        "job_title": company_user.job_title or "",
        "role": company_user.role or "",
    }


def _is_non_teaching_staff_role(role_value):
    normalized_role = (role_value or "").strip().lower()
    return normalized_role in {
        "non-teaching",
        "assistant_head_master",
        "clerk",
        "library_person",
    }


def _normalize_integer_list(values):
    normalized = []
    if not isinstance(values, list):
        return normalized
    for value in values:
        try:
            normalized_value = int(value)
        except (TypeError, ValueError):
            continue
        if normalized_value not in normalized:
            normalized.append(normalized_value)
    return normalized


def _resolve_student_for_academic_record(company_id, selected_student_id, actor_username=None):
    student_item = StudentList.objects.filter(
        id=selected_student_id,
        company_id=company_id,
        delist=False,
    ).first()
    if student_item:
        return student_item

    company_student = CompanyUser.objects.filter(
        id=selected_student_id,
        company_id=company_id,
        delist=False,
        role__iexact="student",
    ).first()
    if not company_student:
        return None

    student_queryset = StudentList.objects.filter(
        company_id=company_id, delist=False)
    username = (company_student.username or "").strip()
    email = (company_student.email or "").strip().lower()
    mobile = (company_student.mobile or "").strip()

    if username:
        matched_by_username = student_queryset.filter(
            username__iexact=username).first()
        if matched_by_username:
            return matched_by_username
    if email:
        matched_by_email = student_queryset.filter(email__iexact=email).first()
        if matched_by_email:
            return matched_by_email
    if mobile:
        matched_by_mobile = student_queryset.filter(mobile=mobile).first()
        if matched_by_mobile:
            return matched_by_mobile

    dob_value = company_student.dob
    if hasattr(dob_value, "date"):
        dob_value = dob_value.date()

    fallback_email = email or f"student{company_student.id}@placeholder.local"
    now = timezone.now()
    return StudentList.objects.create(
        company_id=company_id,
        name=(company_student.name or "").strip() or "Student",
        username=username,
        mobile=mobile or None,
        email=fallback_email,
        dob=dob_value,
        guardian_name=(company_student.fatherOrHusband or "").strip(),
        address=(company_student.address or "").strip(),
        state=(company_student.state or "").strip(),
        city=(company_student.city or "").strip(),
        pin=(company_student.pin or "").strip(),
        attachment_id=company_student.attachment_id,
        created_by=actor_username,
        created_on=now,
        updated_by=actor_username,
        updated_on=now,
    )


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def academic_year_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        academic_year_items = (
            AcademicYear.objects.filter(company_id=company_id, delist=False)
            .order_by("-id")
        )
        serializer = AcademicYearSerializer(academic_year_items, many=True)
        return Response(serializer.data)

    request_serializer = AcademicYearCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    is_active = bool(request_serializer.validated_data.get("is_active", False))
    requested_year_name = (
        request_serializer.validated_data["year_name"] or ""
    ).strip()
    existing_year = AcademicYear.objects.filter(
        company_id=company_id,
        delist=False,
        year_name__iexact=requested_year_name,
    ).first()
    if existing_year:
        return Response(
            {"detail": "Academic Year already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        created_item = AcademicYear.objects.create(
            company_id=company_id,
            year_name=requested_year_name,
            start_date=request_serializer.validated_data["start_date"],
            end_date=request_serializer.validated_data["end_date"],
            is_active=is_active,
            created_by=actor_username,
            created_on=timezone.now(),
            updated_by=actor_username,
            updated_on=timezone.now(),
        )

    response_serializer = AcademicYearSerializer(created_item)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def academic_year_list_detail(request, academic_year_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    academic_year_item = AcademicYear.objects.filter(
        id=academic_year_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not academic_year_item:
        return Response(
            {"detail": "Academic year record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        academic_year_item.delist = True
        academic_year_item.updated_by = (
            (getattr(request.user, "username", "") or "").strip()
            or academic_year_item.updated_by
        )
        academic_year_item.updated_on = timezone.now()
        academic_year_item.save(
            update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = AcademicYearCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    is_active = bool(request_serializer.validated_data.get("is_active", False))
    requested_year_name = (
        request_serializer.validated_data["year_name"] or ""
    ).strip()
    existing_year = AcademicYear.objects.filter(
        company_id=company_user.company_id,
        delist=False,
        year_name__iexact=requested_year_name,
    ).exclude(id=academic_year_item.id).first()
    if existing_year:
        return Response(
            {"detail": "Academic Year already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        academic_year_item.year_name = requested_year_name
        academic_year_item.start_date = request_serializer.validated_data["start_date"]
        academic_year_item.end_date = request_serializer.validated_data["end_date"]
        academic_year_item.is_active = is_active
        academic_year_item.updated_by = actor_username
        academic_year_item.updated_on = timezone.now()
        academic_year_item.save(
            update_fields=[
                "year_name",
                "start_date",
                "end_date",
                "is_active",
                "updated_by",
                "updated_on",
            ]
        )

    response_serializer = AcademicYearSerializer(academic_year_item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def class_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        class_items = (
            ClassList.objects.filter(company_id=company_id, delist=False)
            .order_by("-id")
        )
        serializer = ClassListSerializer(class_items, many=True)
        return Response(serializer.data)

    request_serializer = ClassListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    created_by = _resolve_actor_username(
        request,
        request_serializer.validated_data,
        "created_by",
    )
    created_item = ClassList.objects.create(
        company_id=company_id,
        class_name=request_serializer.validated_data["class_name"].strip(),
        subject=request_serializer.validated_data.get("subject", []),
        created_by=created_by,
        created_on=timezone.now(),
        updated_by=created_by,
        updated_on=timezone.now(),
    )
    response_serializer = ClassListSerializer(created_item)
    return Response(
        response_serializer.data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def class_list_detail(request, class_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    class_item = ClassList.objects.filter(
        id=class_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not class_item:
        return Response(
            {"detail": "Class record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        class_item.delist = True
        class_item.updated_by = (
            (getattr(request.user, "username", "")
             or "").strip() or class_item.updated_by
        )
        class_item.updated_on = timezone.now()
        class_item.save(update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = ClassListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    class_item.class_name = request_serializer.validated_data["class_name"].strip(
    )
    class_item.subject = request_serializer.validated_data.get("subject", [])
    class_item.updated_by = _resolve_actor_username(
        request,
        request_serializer.validated_data,
        "updated_by",
    )
    class_item.updated_on = timezone.now()
    class_item.save(update_fields=["class_name",
                    "subject", "updated_by", "updated_on"])

    response_serializer = ClassListSerializer(class_item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def class_fee_structure_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        fee_items = (
            ClassFeeStructure.objects.select_related(
                "class_details", "academic_year")
            .filter(company_id=company_id, delist=False)
            .order_by("-id")
        )
        serializer = ClassFeeStructureSerializer(fee_items, many=True)
        return Response(serializer.data)

    request_serializer = ClassFeeStructureCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    class_item = ClassList.objects.filter(
        id=request_serializer.validated_data["class_details_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not class_item:
        return Response(
            {"detail": "Selected class is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    academic_year_item = None
    academic_year_id = request_serializer.validated_data.get(
        "academic_year_id")
    if academic_year_id is not None:
        academic_year_item = AcademicYear.objects.filter(
            id=academic_year_id,
            company_id=company_id,
            delist=False,
        ).first()
        if not academic_year_item:
            return Response(
                {"detail": "Selected academic year is not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    try:
        created_item = ClassFeeStructure.objects.create(
            company_id=company_id,
            class_details=class_item,
            academic_year=academic_year_item,
            admission_fee=request_serializer.validated_data.get(
                "admission_fee", Decimal("0")),
            tuition_fee=request_serializer.validated_data.get(
                "tuition_fee", Decimal("0")),
            exam_fee=request_serializer.validated_data.get(
                "exam_fee", Decimal("0")),
            annual_charge=request_serializer.validated_data.get(
                "annual_charge", Decimal("0")),
            total_fees=request_serializer.validated_data.get(
                "total_fees", Decimal("0")),
            # frequency=request_serializer.validated_data.get("frequency", "monthly"),
            is_active=bool(
                request_serializer.validated_data.get("is_active", True)),
            created_by=actor_username,
            created_on=timezone.now(),
            updated_by=actor_username,
            updated_on=timezone.now(),
        )
    except IntegrityError:
        return Response(
            {"detail": "Fee structure already exists for this class and academic year."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response_serializer = ClassFeeStructureSerializer(created_item)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def class_fee_structure_list_detail(request, fee_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    fee_item = ClassFeeStructure.objects.select_related("class_details", "academic_year").filter(
        id=fee_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not fee_item:
        return Response(
            {"detail": "Class fee structure record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        response_serializer = ClassFeeStructureSerializer(fee_item)
        return Response(response_serializer.data)

    if request.method == "DELETE":
        fee_item.delist = True
        fee_item.delist_by = (
            (getattr(request.user, "username", "")
             or "").strip() or fee_item.delist_by
        )
        fee_item.delist_on = timezone.now()
        fee_item.updated_by = (
            (getattr(request.user, "username", "")
             or "").strip() or fee_item.updated_by
        )
        fee_item.updated_on = timezone.now()
        fee_item.save(
            update_fields=["delist", "delist_by",
                           "delist_on", "updated_by", "updated_on"]
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    is_partial = request.method == "PATCH"
    request_serializer = ClassFeeStructureCreateSerializer(
        data=request.data,
        partial=is_partial,
    )
    request_serializer.is_valid(raise_exception=True)

    class_details_id = request_serializer.validated_data.get(
        "class_details_id")
    if class_details_id is not None:
        class_item = ClassList.objects.filter(
            id=class_details_id,
            company_id=company_user.company_id,
            delist=False,
        ).first()
        if not class_item:
            return Response(
                {"detail": "Selected class is not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        fee_item.class_details = class_item

    if "academic_year_id" in request_serializer.validated_data:
        academic_year_id = request_serializer.validated_data.get(
            "academic_year_id")
        if academic_year_id is None:
            fee_item.academic_year = None
        else:
            academic_year_item = AcademicYear.objects.filter(
                id=academic_year_id,
                company_id=company_user.company_id,
                delist=False,
            ).first()
            if not academic_year_item:
                return Response(
                    {"detail": "Selected academic year is not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            fee_item.academic_year = academic_year_item

    admission_fee = request_serializer.validated_data.get(
        "admission_fee", fee_item.admission_fee)
    tuition_fee = request_serializer.validated_data.get(
        "tuition_fee", fee_item.tuition_fee)
    exam_fee = request_serializer.validated_data.get(
        "exam_fee", fee_item.exam_fee)
    annual_charge = request_serializer.validated_data.get(
        "annual_charge", fee_item.annual_charge)

    fee_item.admission_fee = admission_fee
    fee_item.tuition_fee = tuition_fee
    fee_item.exam_fee = exam_fee
    fee_item.annual_charge = annual_charge
    fee_item.total_fees = admission_fee + tuition_fee + exam_fee + annual_charge

    # if "frequency" in request_serializer.validated_data:
    #     fee_item.frequency = request_serializer.validated_data["frequency"]
    if "is_active" in request_serializer.validated_data:
        fee_item.is_active = bool(
            request_serializer.validated_data["is_active"])

    fee_item.updated_by = (
        (getattr(request.user, "username", "")
         or "").strip() or fee_item.updated_by
    )
    fee_item.updated_on = timezone.now()

    try:
        fee_item.save()
    except IntegrityError:
        return Response(
            {"detail": "Fee structure already exists for this class and academic year."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response_serializer = ClassFeeStructureSerializer(fee_item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def student_fees_collection_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        requested_student_record_id = (
            request.query_params.get("student_academic_rcord_id")
            or request.query_params.get("studentAcademicRecordId")
            or request.query_params.get("student_academic_record_id")
        )

        items = (
            StudentFeesCollection.objects.select_related(
                "student_academic_rcord__student",
                "student_academic_rcord__section_details",
                "academic_year",
                "class_details",
                "fee_structure",
            )
        )

        filters = {"company_id": company_id}
        if requested_student_record_id not in (None, ""):
            try:
                filters["student_academic_rcord_id"] = int(str(requested_student_record_id).strip())
            except (TypeError, ValueError):
                return Response(
                    {"detail": "Invalid student academic record id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        items = items.filter(**filters).order_by("-id")
        serializer = StudentFeesCollectionSerializer(items, many=True)
        return Response(serializer.data)

    request_serializer = StudentFeesCollectionCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    student_record = StudentAcademicRecord.objects.select_related(
        "academic_year",
        "class_details",
        "student",
    ).filter(
        id=request_serializer.validated_data["student_academic_rcord_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not student_record:
        return Response(
            {"detail": "Selected student academic record is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    fee_structure = ClassFeeStructure.objects.select_related(
        "academic_year",
        "class_details",
    ).filter(
        id=request_serializer.validated_data["fee_structure_id"],
        company_id=company_id,
        delist=False,
        is_active=True,
    ).first()
    if not fee_structure:
        return Response(
            {"detail": "Selected fee structure is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if (
        fee_structure.academic_year_id != student_record.academic_year_id
        or fee_structure.class_details_id != student_record.class_details_id
    ):
        return Response(
            {"detail": "Selected fee structure does not match the student academic record."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    requested_total_amount = request_serializer.validated_data.get("total_amount")
    total_amount = (
        requested_total_amount
        if requested_total_amount is not None
        else (getattr(fee_structure, "total_fees", None) or Decimal("0"))
    )
    if total_amount <= 0:
        return Response(
            {"detail": "Total amount must be greater than zero."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    paid_amount = request_serializer.validated_data.get("paid_amount") or Decimal("0")
    if paid_amount > total_amount:
        return Response(
            {"detail": "Paid amount cannot exceed total amount."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    actor_username = (getattr(request.user, "username", "") or "").strip() or None
    try:
        created_item = StudentFeesCollection.objects.create(
            company_id=company_id,
            student_academic_rcord=student_record,
            academic_year=student_record.academic_year,
            class_details=student_record.class_details,
            fee_structure=fee_structure,
            installment_name=request_serializer.validated_data.get("installment_name", "monthly"),
            due_date=request_serializer.validated_data.get("due_date"),
            total_amount=total_amount,
            paid_amount=paid_amount,
            payment_date=request_serializer.validated_data.get("payment_date"),
            payment_mode=request_serializer.validated_data.get("payment_mode"),
            transaction_id=(request_serializer.validated_data.get("transaction_id") or "").strip() or None,
            remarks=(request_serializer.validated_data.get("remarks") or "").strip(),
            created_by=actor_username,
            created_on=timezone.now(),
            updated_by=actor_username,
            updated_on=timezone.now(),
        )

        if str(getattr(student_record, "status", "")).strip().lower() == "pending":
            student_record.status = "active"
            student_record.updated_by = actor_username or student_record.updated_by
            student_record.updated_on = timezone.now()
            student_record.save(update_fields=["status", "updated_by", "updated_on"])
    except IntegrityError:
        return Response(
            {"detail": "Student fee collection already exists for the selected installment."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response_serializer = StudentFeesCollectionSerializer(created_item)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def student_fees_collection_list_detail(request, collection_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    item = StudentFeesCollection.objects.select_related(
        "student_academic_rcord__student",
        "student_academic_rcord__section_details",
        "academic_year",
        "class_details",
        "fee_structure",
    ).filter(
        id=collection_id,
        company_id=company_user.company_id,
    ).first()
    if not item:
        return Response(
            {"detail": "Student fee collection record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        serializer = StudentFeesCollectionSerializer(item)
        return Response(serializer.data)

    if request.method == "DELETE":
        item.delist = True
        item.updated_by = (
            (getattr(request.user, "username", "") or "").strip() or item.updated_by
        )
        item.updated_on = timezone.now()
        item.save(update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    is_partial = request.method in {"PATCH", "PUT"}
    request_serializer = StudentFeesCollectionCreateSerializer(
        data=request.data,
        partial=is_partial,
    )
    request_serializer.is_valid(raise_exception=True)

    if "fee_structure_id" in request_serializer.validated_data:
        fee_structure = ClassFeeStructure.objects.filter(
            id=request_serializer.validated_data["fee_structure_id"],
            company_id=company_user.company_id,
            delist=False,
            is_active=True,
        ).first()
        if not fee_structure:
            return Response(
                {"detail": "Selected fee structure is not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if (
            fee_structure.academic_year_id != item.academic_year_id
            or fee_structure.class_details_id != item.class_details_id
        ):
            return Response(
                {"detail": "Selected fee structure does not match the collection record."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        item.fee_structure = fee_structure
        item.total_amount = getattr(fee_structure, "total_fees", None) or item.total_amount

    if "installment_name" in request_serializer.validated_data:
        item.installment_name = request_serializer.validated_data["installment_name"]
    if "due_date" in request_serializer.validated_data:
        item.due_date = request_serializer.validated_data.get("due_date")
    if "paid_amount" in request_serializer.validated_data:
        item.paid_amount = request_serializer.validated_data.get("paid_amount") or Decimal("0")
    if "payment_date" in request_serializer.validated_data:
        item.payment_date = request_serializer.validated_data.get("payment_date")
    if "payment_mode" in request_serializer.validated_data:
        item.payment_mode = request_serializer.validated_data.get("payment_mode")
    if "transaction_id" in request_serializer.validated_data:
        item.transaction_id = (
            (request_serializer.validated_data.get("transaction_id") or "").strip() or None
        )
    if "remarks" in request_serializer.validated_data:
        item.remarks = (request_serializer.validated_data.get("remarks") or "").strip()

    if item.paid_amount > item.total_amount:
        return Response(
            {"detail": "Paid amount cannot exceed total amount."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    item.updated_by = (
        (getattr(request.user, "username", "") or "").strip() or item.updated_by
    )
    item.updated_on = timezone.now()
    try:
        item.save()
    except IntegrityError:
        return Response(
            {"detail": "Student fee collection already exists for the selected installment."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response_serializer = StudentFeesCollectionSerializer(item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def section_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        section_items = (
            SectionList.objects.select_related("class_details")
            .filter(company_id=company_id, class_details__delist=False, delist=False)
            .order_by("-id")
        )
        serializer = SectionListSerializer(section_items, many=True)
        return Response(serializer.data)

    request_serializer = SectionListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    class_details_id = request_serializer.validated_data["class_details_id"]
    class_item = ClassList.objects.filter(
        id=class_details_id,
        company_id=company_id,
        delist=False,
    ).first()
    if not class_item:
        return Response(
            {"detail": "Selected class is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    section_item = SectionList.objects.create(
        company_id=company_id,
        class_details=class_item,
        section=request_serializer.validated_data["section"],
        num_of_stud=request_serializer.validated_data.get("num_of_stud"),
        created_by=actor_username,
        created_on=timezone.now(),
        updated_by=actor_username,
        updated_on=timezone.now(),
    )
    response_serializer = SectionListSerializer(section_item)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def section_list_detail(request, section_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    section_item = SectionList.objects.select_related("class_details").filter(
        id=section_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not section_item:
        return Response(
            {"detail": "Section record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        section_item.delist = True
        section_item.updated_by = (
            (getattr(request.user, "username", "")
             or "").strip() or section_item.updated_by
        )
        section_item.updated_on = timezone.now()
        section_item.save(update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = SectionListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    class_details_id = request_serializer.validated_data["class_details_id"]
    class_item = ClassList.objects.filter(
        id=class_details_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not class_item:
        return Response(
            {"detail": "Selected class is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    section_item.class_details = class_item
    section_item.section = request_serializer.validated_data["section"]
    section_item.num_of_stud = request_serializer.validated_data.get(
        "num_of_stud")
    section_item.updated_by = (
        getattr(request.user, "username", "") or "").strip() or None
    section_item.updated_on = timezone.now()
    section_item.save(
        update_fields=["class_details", "section",
                       "num_of_stud", "updated_by", "updated_on"]
    )

    response_serializer = SectionListSerializer(section_item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def subject_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        subject_items = (
            SubjectList.objects.filter(company_id=company_id, delist=False)
            .order_by("-id")
        )
        serializer = SubjectListSerializer(subject_items, many=True)
        return Response(serializer.data)

    request_serializer = SubjectListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    created_by = _resolve_actor_username(
        request,
        request_serializer.validated_data,
        "created_by",
    )
    created_item = SubjectList.objects.create(
        company_id=company_id,
        subject_name=request_serializer.validated_data["subject_name"].strip(),
        subject_initial=request_serializer.validated_data["subject_initial"].strip(
        ),
        created_by=created_by,
        created_on=timezone.now(),
        updated_by=created_by,
        updated_on=timezone.now(),
    )
    response_serializer = SubjectListSerializer(created_item)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def subject_list_detail(request, subject_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    subject_item = SubjectList.objects.filter(
        id=subject_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not subject_item:
        return Response(
            {"detail": "Subject record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        serializer = SubjectListSerializer(subject_item)
        return Response(serializer.data)

    if request.method == "DELETE":
        subject_item.delist = True
        subject_item.updated_by = (
            (getattr(request.user, "username", "")
             or "").strip() or subject_item.updated_by
        )
        subject_item.updated_on = timezone.now()
        subject_item.save(update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = SubjectListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    subject_item.subject_name = request_serializer.validated_data["subject_name"].strip(
    )
    subject_item.subject_initial = request_serializer.validated_data["subject_initial"].strip(
    )
    subject_item.updated_by = _resolve_actor_username(
        request,
        request_serializer.validated_data,
        "updated_by",
    )
    subject_item.updated_on = timezone.now()
    subject_item.save(
        update_fields=["subject_name", "subject_initial",
                       "updated_by", "updated_on"]
    )

    response_serializer = SubjectListSerializer(subject_item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def exam_type_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        exam_type_items = (
            ExamType.objects.select_related("academic_year")
            .filter(company_id=company_id, delist=False)
            .order_by("-id")
        )
        serializer = ExamTypeSerializer(exam_type_items, many=True)
        return Response(serializer.data)

    request_serializer = ExamTypeCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    academic_year_id = request_serializer.validated_data["academic_year_id"]
    academic_year_item = AcademicYear.objects.filter(
        id=academic_year_id,
        company_id=company_id,
        delist=False,
    ).first()
    if not academic_year_item:
        return Response(
            {"detail": "Selected academic year is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    is_active = bool(request_serializer.validated_data.get("is_active", False))

    with transaction.atomic():
        created_item = ExamType.objects.create(
            company_id=company_id,
            academic_year=academic_year_item,
            exam_name=request_serializer.validated_data["exam_name"].strip(),
            exam_type=request_serializer.validated_data["exam_type"],
            total_marks=request_serializer.validated_data.get(
                "total_marks", 20),
            start_date=request_serializer.validated_data["start_date"],
            end_date=request_serializer.validated_data["end_date"],
            is_active=is_active,
            created_by=actor_username,
            created_on=timezone.now(),
            updated_by=actor_username,
            updated_on=timezone.now(),
        )

    response_serializer = ExamTypeSerializer(created_item)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def exam_type_list_detail(request, exam_type_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    exam_type_item = ExamType.objects.select_related("academic_year").filter(
        id=exam_type_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not exam_type_item:
        return Response(
            {"detail": "Exam type record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        response_serializer = ExamTypeSerializer(exam_type_item)
        return Response(response_serializer.data)

    if request.method == "DELETE":
        exam_type_item.delist = True
        exam_type_item.updated_by = (
            (getattr(request.user, "username", "") or "").strip()
            or exam_type_item.updated_by
        )
        exam_type_item.updated_on = timezone.now()
        exam_type_item.save(
            update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = ExamTypeCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_user.company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    academic_year_id = request_serializer.validated_data["academic_year_id"]
    academic_year_item = AcademicYear.objects.filter(
        id=academic_year_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not academic_year_item:
        return Response(
            {"detail": "Selected academic year is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    is_active = bool(request_serializer.validated_data.get("is_active", False))

    exam_type_item.academic_year = academic_year_item
    exam_type_item.exam_name = request_serializer.validated_data["exam_name"].strip(
    )
    exam_type_item.exam_type = request_serializer.validated_data["exam_type"]
    exam_type_item.total_marks = request_serializer.validated_data.get(
        "total_marks",
        exam_type_item.total_marks,
    )
    exam_type_item.start_date = request_serializer.validated_data["start_date"]
    exam_type_item.end_date = request_serializer.validated_data["end_date"]
    exam_type_item.is_active = is_active
    exam_type_item.updated_by = (
        (getattr(request.user, "username", "")
         or "").strip() or exam_type_item.updated_by
    )
    exam_type_item.updated_on = timezone.now()
    exam_type_item.save(
        update_fields=[
            "academic_year",
            "exam_name",
            "exam_type",
            "total_marks",
            "start_date",
            "end_date",
            "is_active",
            "updated_by",
            "updated_on",
        ]
    )

    response_serializer = ExamTypeSerializer(exam_type_item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


def _extract_exam_schedule_primary_values(validated_data, company_id):
    subject_schedules = list(validated_data.get("subject_schedules") or [])
    if not subject_schedules:
        subject_id = validated_data.get("subject_id")
        exam_date = validated_data.get("exam_date")
        if subject_id is None or exam_date is None:
            return None, None, []
        subject_schedules = [
            {
                "subject_id": subject_id,
                "subject_name": "",
                "exam_date": exam_date,
            }
        ]

    subject_ids = []
    for entry in subject_schedules:
        subject_id = entry.get("subject_id")
        if subject_id is not None:
            subject_ids.append(subject_id)

    subject_map = {
        str(item.id): item
        for item in SubjectList.objects.filter(
            id__in=subject_ids,
            company_id=company_id,
            delist=False,
        )
    }

    resolved_subject_schedules = []
    for entry in subject_schedules:
        subject_id = entry.get("subject_id")
        subject_item = subject_map.get(str(subject_id))
        if not subject_item:
            continue
        resolved_subject_schedules.append(
            {
                "subject_id": subject_item.id,
                "subject_name": subject_item.subject_name,
                "exam_date": entry.get("exam_date"),
            }
        )

    if not resolved_subject_schedules or len(resolved_subject_schedules) != len(subject_schedules):
        return None, None, []

    primary_subject_item = subject_map.get(
        str(validated_data.get("subject_id")))
    if primary_subject_item is None:
        primary_subject_item = SubjectList.objects.filter(
            id=resolved_subject_schedules[0]["subject_id"],
            company_id=company_id,
            delist=False,
        ).first()

    primary_exam_date = validated_data.get("exam_date") or resolved_subject_schedules[0][
        "exam_date"
    ]

    return primary_subject_item, primary_exam_date, resolved_subject_schedules


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def exam_schedule_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        exam_schedule_items = (
            ExamSchedule.objects.select_related(
                "exam",
                "class_details",
                "section_details",
                "subject",
            )
            .filter(company_id=company_id, delist=False)
            .order_by("-id")
        )
        serializer = ExamScheduleSerializer(exam_schedule_items, many=True)
        return Response(serializer.data)

    request_serializer = ExamScheduleCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    exam_item = ExamType.objects.filter(
        id=request_serializer.validated_data["exam_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not exam_item:
        return Response(
            {"detail": "Selected exam type is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    class_item = ClassList.objects.filter(
        id=request_serializer.validated_data["class_details_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not class_item:
        return Response(
            {"detail": "Selected class is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    section_details_id = request_serializer.validated_data.get(
        "section_details_id")
    section_item = None
    if section_details_id is not None:
        section_item = SectionList.objects.filter(
            id=section_details_id,
            company_id=company_id,
            class_details_id=class_item.id,
            delist=False,
        ).first()
        if not section_item:
            return Response(
                {"detail": "Selected section is not found for the chosen class."},
                status=status.HTTP_404_NOT_FOUND,
            )

    subject_item, primary_exam_date, subject_schedules = _extract_exam_schedule_primary_values(
        request_serializer.validated_data,
        company_id,
    )
    if not subject_item or not subject_schedules:
        return Response(
            {"detail": "Selected subject schedule data is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    created_item = ExamSchedule.objects.create(
        company_id=company_id,
        exam=exam_item,
        class_details=class_item,
        section_details=section_item,
        subject=subject_item,
        exam_date=primary_exam_date,
        subject_schedules=subject_schedules,
        start_time=request_serializer.validated_data.get("start_time"),
        end_time=request_serializer.validated_data.get("end_time"),
        total_marks=request_serializer.validated_data.get("total_marks", 100),
        passing_marks=request_serializer.validated_data.get(
            "passing_marks", 33),
        exam_room=(request_serializer.validated_data.get(
            "exam_room") or "").strip(),
        instructions=(request_serializer.validated_data.get(
            "instructions") or "").strip(),
        created_by=actor_username,
        created_on=timezone.now(),
        updated_by=actor_username,
        updated_on=timezone.now(),
    )
    response_serializer = ExamScheduleSerializer(created_item)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def exam_schedule_list_detail(request, exam_schedule_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    exam_schedule_item = ExamSchedule.objects.select_related(
        "exam",
        "class_details",
        "section_details",
        "subject",
    ).filter(
        id=exam_schedule_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not exam_schedule_item:
        return Response(
            {"detail": "Exam schedule record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        exam_schedule_item.delist = True
        exam_schedule_item.updated_by = (
            (getattr(request.user, "username", "") or "").strip()
            or exam_schedule_item.updated_by
        )
        exam_schedule_item.updated_on = timezone.now()
        exam_schedule_item.save(
            update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = ExamScheduleCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_user.company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    exam_item = ExamType.objects.filter(
        id=request_serializer.validated_data["exam_id"],
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not exam_item:
        return Response(
            {"detail": "Selected exam type is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    class_item = ClassList.objects.filter(
        id=request_serializer.validated_data["class_details_id"],
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not class_item:
        return Response(
            {"detail": "Selected class is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    section_details_id = request_serializer.validated_data.get(
        "section_details_id")
    section_item = None
    if section_details_id is not None:
        section_item = SectionList.objects.filter(
            id=section_details_id,
            company_id=company_user.company_id,
            class_details_id=class_item.id,
            delist=False,
        ).first()
        if not section_item:
            return Response(
                {"detail": "Selected section is not found for the chosen class."},
                status=status.HTTP_404_NOT_FOUND,
            )

    subject_item, primary_exam_date, subject_schedules = _extract_exam_schedule_primary_values(
        request_serializer.validated_data,
        company_user.company_id,
    )
    if not subject_item or not subject_schedules:
        return Response(
            {"detail": "Selected subject schedule data is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    exam_schedule_item.exam = exam_item
    exam_schedule_item.class_details = class_item
    exam_schedule_item.section_details = section_item
    exam_schedule_item.subject = subject_item
    exam_schedule_item.exam_date = primary_exam_date
    exam_schedule_item.subject_schedules = subject_schedules
    exam_schedule_item.start_time = request_serializer.validated_data.get(
        "start_time")
    exam_schedule_item.end_time = request_serializer.validated_data.get(
        "end_time")
    exam_schedule_item.total_marks = request_serializer.validated_data.get(
        "total_marks", exam_schedule_item.total_marks)
    exam_schedule_item.passing_marks = request_serializer.validated_data.get(
        "passing_marks", exam_schedule_item.passing_marks)
    exam_schedule_item.exam_room = (
        request_serializer.validated_data.get("exam_room") or "").strip()
    exam_schedule_item.instructions = (
        request_serializer.validated_data.get("instructions") or "").strip()
    exam_schedule_item.updated_by = (
        (getattr(request.user, "username", "")
         or "").strip() or exam_schedule_item.updated_by
    )
    exam_schedule_item.updated_on = timezone.now()
    exam_schedule_item.save(
        update_fields=[
            "exam",
            "class_details",
            "section_details",
            "subject",
            "exam_date",
            "subject_schedules",
            "start_time",
            "end_time",
            "total_marks",
            "passing_marks",
            "exam_room",
            "instructions",
            "updated_by",
            "updated_on",
        ]
    )

    response_serializer = ExamScheduleSerializer(exam_schedule_item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def teacher_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        teacher_items = (
            CompanyUser.objects.filter(
                company_id=company_id,
                delist=False,
                role__iexact="teacher",
            )
            .order_by("-id")
        )
        return Response([
            _serialize_teacher_company_user(item) for item in teacher_items
        ])

    request_serializer = TeacherListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    username = (request_serializer.validated_data.get(
        "username") or "").strip().lower()
    role = (request_serializer.validated_data.get(
        "role") or "teacher").strip() or "teacher"
    mobile = (request_serializer.validated_data.get("mobile") or "").strip()
    email = (request_serializer.validated_data.get(
        "email") or "").strip().lower()
    is_verified = bool(
        request_serializer.validated_data.get("is_verified", False))
    password = (request_serializer.validated_data.get(
        "password") or "abc123").strip() or "abc123"
    main_subject_ids = _normalize_integer_list(
        request_serializer.validated_data.get("main_subject", [])
    )
    others_subject_ids = _normalize_integer_list(
        request_serializer.validated_data.get("others_subject", [])
    )
    preferable_class_ids = _normalize_integer_list(
        request_serializer.validated_data.get("preferableClass", [])
    )

    if not username:
        return Response(
            {"detail": "username is required to create user login."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not mobile:
        return Response(
            {"detail": "mobile is required to create user login."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not is_verified:
        return Response(
            {"detail": "Verify email with OTP before creating teacher."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    UserModel = get_user_model()
    existing_by_email = (
        UserModel.objects.filter(
            email__iexact=email).first() if email else None
    )
    existing_by_mobile = (
        UserModel.objects.filter(
            phone_number=mobile).first() if mobile else None
    )
    existing_by_username = UserModel.objects.filter(
        username__iexact=username).first()

    if existing_by_email and (
        not existing_by_username or existing_by_email.id != existing_by_username.id
    ):
        return Response(
            {"detail": "This email is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if existing_by_mobile and (
        not existing_by_username or existing_by_mobile.id != existing_by_username.id
    ):
        return Response(
            {"detail": "This mobile number is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if CompanyUser.objects.filter(company_id=company_id, username__iexact=username).exists():
        return Response(
            {"detail": "This teacher username already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if CompanyUser.objects.filter(company_id=company_id, email__iexact=email).exists():
        return Response(
            {"detail": "This teacher email already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if mobile and CompanyUser.objects.filter(company_id=company_id, mobile=mobile).exists():
        return Response(
            {"detail": "This teacher mobile already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_subject_ids = set(
        SubjectList.objects.filter(
            company_id=company_id,
            delist=False,
            id__in=list(set(main_subject_ids + others_subject_ids)),
        ).values_list("id", flat=True)
    )
    if any(subject_id not in valid_subject_ids for subject_id in main_subject_ids + others_subject_ids):
        return Response(
            {"detail": "One or more selected subjects are invalid for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_class_ids = set(
        ClassList.objects.filter(
            company_id=company_id,
            delist=False,
            id__in=preferable_class_ids,
        ).values_list("id", flat=True)
    )
    if any(class_id not in valid_class_ids for class_id in preferable_class_ids):
        return Response(
            {"detail": "One or more selected classes are invalid for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            if existing_by_username is None:
                existing_by_username = UserModel.objects.create_user(
                    username=username,
                    email=email,
                    phone_number=mobile,
                    password=password,
                )
            else:
                existing_by_username.email = email
                existing_by_username.phone_number = mobile
                existing_by_username.set_password(password)
                existing_by_username.save(
                    update_fields=["email", "phone_number", "password"])

            created_company_user = CompanyUser.objects.create(
                company_id=company_id,
                name=request_serializer.validated_data["name"].strip(),
                organization_id=company_user.organization_id
                or getattr(company_user.company, "organization_id", None),
                username=username,
                mobile=mobile,
                email=email,
                dob=request_serializer.validated_data.get("dob"),
                qualification=(request_serializer.validated_data.get(
                    "qualification") or "").strip(),
                experience=(request_serializer.validated_data.get(
                    "experience") or "").strip(),
                address=(request_serializer.validated_data.get(
                    "address") or "").strip(),
                state=(request_serializer.validated_data.get(
                    "state") or "").strip(),
                city=(request_serializer.validated_data.get(
                    "city") or "").strip(),
                pin=(request_serializer.validated_data.get("pin") or "").strip(),
                attachment_id=request_serializer.validated_data.get(
                    "attachment_id"),
                main_subject=main_subject_ids,
                others_subject=others_subject_ids,
                preferableClass=preferable_class_ids,
                is_head_master=bool(
                    request_serializer.validated_data.get("is_head_master", False)),
                role=role,
                is_superuser=False,
                is_admin=False,
                can_access=True,
                is_active=True,
                is_staff=False,
                is_owner=False,
                is_manager=False,
                is_assistant=False,
                created_by=(getattr(request.user, "username", "")
                            or "").strip() or None,
                created_on=timezone.now(),
                updated_by=(getattr(request.user, "username", "")
                            or "").strip() or None,
                updated_on=timezone.now(),
            )
    except IntegrityError:
        return Response(
            {"detail": "Unable to create teacher user due to duplicate data."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email_warning = None
    try:
        company = company_user.company
        organization_name = ""
        if getattr(company, "organization_id", None):
            organization = Organization.objects.filter(
                id=company.organization_id
            ).only("name").first()
            if organization:
                organization_name = organization.name

        subject = "Teacher Login Details"
        message = f"""
            <p>Hello {created_company_user.name},</p>
            <p>Your teacher account has been created successfully.</p>
            <div style="margin:24px 0;padding:20px;border-radius:12px;background:#f4f8fc;border:1px solid #dbe7f3;">
                <p style="margin:0 0 10px 0;"><strong>Organization name:</strong> {organization_name or "-"}</p>
                <p style="margin:0 0 10px 0;"><strong>School name:</strong> {getattr(company, "company_name", "") or "-"}</p>
                <p style="margin:0 0 10px 0;"><strong>Role:</strong> {created_company_user.role or "teacher"}</p>
                <p style="margin:0 0 10px 0;"><strong>Username:</strong> {created_company_user.username}</p>
                <p style="margin:0;"><strong>Password:</strong> {password}</p>
            </div>
            <p><strong>Note:</strong> Kindly change your password after your first login.</p>
        """
        sendGenericMailV2(email, subject, message)
    except Exception as exc:
        email_warning = (
            "Teacher created, but credential email could not be sent: "
            f"{exc}"
        )

    response_data = {
        "detail": "Teacher user created successfully.",
        "company_user": {
            "id": created_company_user.id,
            "company_id": created_company_user.company_id,
            "name": created_company_user.name,
            "username": created_company_user.username,
            "mobile": created_company_user.mobile,
            "email": created_company_user.email,
            "role": created_company_user.role,
        },
    }
    if email_warning:
        response_data["email_warning"] = email_warning

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def teacher_list_detail(request, teacher_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    teacher_item = CompanyUser.objects.filter(
        id=teacher_id,
        company_id=company_user.company_id,
        delist=False,
        role__iexact="teacher",
    ).first()
    if not teacher_item:
        return Response(
            {"detail": "Teacher record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        teacher_item.delist = True
        teacher_item.updated_by = (
            (getattr(request.user, "username", "")
             or "").strip() or teacher_item.updated_by
        )
        teacher_item.updated_on = timezone.now()
        teacher_item.save(update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    if (
        (company_user.role or "").strip().lower() == "admin"
        and not bool(company_user.is_head_master)
        and not bool(teacher_item.is_head_master)
    ):
        return Response(
            {"detail": "Admin can edit only head master teacher records."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if bool(company_user.is_head_master):
        if teacher_item.id == company_user.id or (
            (teacher_item.username or "").strip().lower()
            == (company_user.username or "").strip().lower()
        ):
            return Response(
                {"detail": "Head master cannot edit their own record."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (teacher_item.role or "").strip().lower() != "teacher":
            return Response(
                {"detail": "Head master can edit only teacher records."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    request_serializer = TeacherListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    next_username = (request_serializer.validated_data.get(
        "username") or "").strip().lower()
    next_mobile = (request_serializer.validated_data.get(
        "mobile") or "").strip()
    next_email = (request_serializer.validated_data.get(
        "email") or "").strip().lower()
    main_subject_ids = _normalize_integer_list(
        request_serializer.validated_data.get("main_subject", [])
    )
    others_subject_ids = _normalize_integer_list(
        request_serializer.validated_data.get("others_subject", [])
    )
    preferable_class_ids = _normalize_integer_list(
        request_serializer.validated_data.get("preferableClass", [])
    )

    if not next_username:
        return Response(
            {"detail": "username is required to update teacher login."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not next_mobile:
        return Response(
            {"detail": "mobile is required to update teacher login."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    username_exists = CompanyUser.objects.filter(
        company_id=company_user.company_id,
        username__iexact=next_username,
    ).exclude(id=teacher_item.id).exists()
    if username_exists:
        return Response(
            {"detail": "This teacher username already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email_exists = CompanyUser.objects.filter(
        company_id=company_user.company_id,
        email__iexact=next_email,
    ).exclude(id=teacher_item.id).exists()
    if email_exists:
        return Response(
            {"detail": "This teacher email already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    mobile_exists = CompanyUser.objects.filter(
        company_id=company_user.company_id,
        mobile=next_mobile,
    ).exclude(id=teacher_item.id).exists()
    if mobile_exists:
        return Response(
            {"detail": "This teacher mobile already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_subject_ids = set(
        SubjectList.objects.filter(
            company_id=company_user.company_id,
            delist=False,
            id__in=list(set(main_subject_ids + others_subject_ids)),
        ).values_list("id", flat=True)
    )
    if any(subject_id not in valid_subject_ids for subject_id in main_subject_ids + others_subject_ids):
        return Response(
            {"detail": "One or more selected subjects are invalid for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_class_ids = set(
        ClassList.objects.filter(
            company_id=company_user.company_id,
            delist=False,
            id__in=preferable_class_ids,
        ).values_list("id", flat=True)
    )
    if any(class_id not in valid_class_ids for class_id in preferable_class_ids):
        return Response(
            {"detail": "One or more selected classes are invalid for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    UserModel = get_user_model()
    linked_user = UserModel.objects.filter(
        username__iexact=teacher_item.username).first()
    if linked_user is None:
        linked_user = UserModel.objects.filter(
            email__iexact=teacher_item.email).first()

    email_in_use = (
        UserModel.objects.filter(email__iexact=next_email)
        .exclude(id=linked_user.id if linked_user else None)
        .exists()
    )
    if email_in_use:
        return Response(
            {"detail": "This email is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    mobile_in_use = (
        UserModel.objects.filter(phone_number=next_mobile)
        .exclude(id=linked_user.id if linked_user else None)
        .exists()
    )
    if mobile_in_use:
        return Response(
            {"detail": "This mobile number is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None

    try:
        with transaction.atomic():
            if linked_user:
                linked_user.username = next_username
                linked_user.email = next_email
                linked_user.phone_number = next_mobile
                linked_user.save(
                    update_fields=["username", "email", "phone_number"])

            teacher_item.name = request_serializer.validated_data["name"].strip(
            )
            teacher_item.username = next_username
            teacher_item.mobile = next_mobile
            teacher_item.email = next_email
            teacher_item.dob = request_serializer.validated_data.get("dob")
            teacher_item.qualification = (
                request_serializer.validated_data.get("qualification") or ""
            ).strip()
            teacher_item.experience = (
                request_serializer.validated_data.get("experience") or ""
            ).strip()
            teacher_item.address = (
                request_serializer.validated_data.get("address") or ""
            ).strip()
            teacher_item.state = (
                request_serializer.validated_data.get("state") or ""
            ).strip()
            teacher_item.city = (
                request_serializer.validated_data.get("city") or ""
            ).strip()
            teacher_item.pin = (
                request_serializer.validated_data.get("pin") or "").strip()
            teacher_item.attachment_id = request_serializer.validated_data.get(
                "attachment_id")
            teacher_item.main_subject = main_subject_ids
            teacher_item.others_subject = others_subject_ids
            teacher_item.preferableClass = preferable_class_ids
            teacher_item.is_head_master = bool(
                request_serializer.validated_data.get("is_head_master", False)
            )
            teacher_item.role = "teacher"
            teacher_item.updated_by = actor_username
            teacher_item.updated_on = timezone.now()
            teacher_item.save(
                update_fields=[
                    "name",
                    "username",
                    "mobile",
                    "email",
                    "dob",
                    "qualification",
                    "experience",
                    "address",
                    "state",
                    "city",
                    "pin",
                    "attachment_id",
                    "main_subject",
                    "others_subject",
                    "preferableClass",
                    "is_head_master",
                    "role",
                    "updated_by",
                    "updated_on",
                ]
            )
    except IntegrityError:
        return Response(
            {"detail": "Unable to update teacher due to duplicate data."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(_serialize_teacher_company_user(teacher_item), status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def non_teaching_staff_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        staff_items = (
            CompanyUser.objects.filter(
                company_id=company_id,
                delist=False,
            )
            .order_by("-id")
        )
        staff_items = [
            item for item in staff_items if _is_non_teaching_staff_role(item.role)
        ]
        return Response([
            _serialize_non_teaching_company_user(item) for item in staff_items
        ])

    request_serializer = NonTeachingListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    username = (request_serializer.validated_data.get(
        "username") or "").strip().lower()
    mobile = (request_serializer.validated_data.get("mobile") or "").strip()
    email = (request_serializer.validated_data.get(
        "email") or "").strip().lower()
    is_verified = bool(
        request_serializer.validated_data.get("is_verified", False))
    password = (request_serializer.validated_data.get(
        "password") or "abc123").strip() or "abc123"

    if not username:
        return Response(
            {"detail": "username is required to create user login."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not mobile:
        return Response(
            {"detail": "mobile is required to create user login."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not bool(company_user.is_head_master):
        return Response(
            {"detail": "Only a logged-in head master can create non-teaching staff."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not is_verified:
        return Response(
            {"detail": "Verify email with OTP before creating non-teaching staff."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    UserModel = get_user_model()
    existing_by_email = (
        UserModel.objects.filter(
            email__iexact=email).first() if email else None
    )
    existing_by_mobile = (
        UserModel.objects.filter(
            phone_number=mobile).first() if mobile else None
    )
    existing_by_username = UserModel.objects.filter(
        username__iexact=username).first()

    if existing_by_email and (
        not existing_by_username or existing_by_email.id != existing_by_username.id
    ):
        return Response(
            {"detail": "This email is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if existing_by_mobile and (
        not existing_by_username or existing_by_mobile.id != existing_by_username.id
    ):
        return Response(
            {"detail": "This mobile number is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if CompanyUser.objects.filter(company_id=company_id, username__iexact=username).exists():
        return Response(
            {"detail": "This non-teaching username already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if CompanyUser.objects.filter(company_id=company_id, email__iexact=email).exists():
        return Response(
            {"detail": "This non-teaching email already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if mobile and CompanyUser.objects.filter(company_id=company_id, mobile=mobile).exists():
        return Response(
            {"detail": "This non-teaching mobile already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            auth_email = _normalize_auth_email(
                UserModel,
                username=username,
                email=email,
                exclude_user_id=existing_by_username.id if existing_by_username else None,
            )
            auth_phone = _normalize_auth_phone(
                UserModel,
                username=username,
                phone_number=mobile,
                exclude_user_id=existing_by_username.id if existing_by_username else None,
            )
            if existing_by_username is None:
                existing_by_username = UserModel.objects.create_user(
                    username=username,
                    email=auth_email,
                    phone_number=auth_phone,
                    password=password,
                )
            else:
                existing_by_username.email = auth_email
                existing_by_username.phone_number = auth_phone
                existing_by_username.set_password(password)
                existing_by_username.save(
                    update_fields=["email", "phone_number", "password"])

            created_staff_user = CompanyUser.objects.create(
                company_id=company_id,
                name=request_serializer.validated_data["name"].strip(),
                organization_id=company_user.organization_id
                or getattr(company_user.company, "organization_id", None),
                username=username,
                mobile=mobile,
                email=email,
                job_title=(
                    request_serializer.validated_data.get("job_title")
                    or request_serializer.validated_data.get("role")
                    or ""
                ).strip(),
                dob=request_serializer.validated_data.get("dob"),
                qualification=(request_serializer.validated_data.get(
                    "qualification") or "").strip(),
                experience=(request_serializer.validated_data.get(
                    "experience") or "").strip(),
                address=(request_serializer.validated_data.get(
                    "address") or "").strip(),
                state=(request_serializer.validated_data.get(
                    "state") or "").strip(),
                city=(request_serializer.validated_data.get(
                    "city") or "").strip(),
                pin=(request_serializer.validated_data.get("pin") or "").strip(),
                attachment_id=request_serializer.validated_data.get(
                    "attachment_id"),
                role=(
                    request_serializer.validated_data.get("role")
                    or "non-teaching"
                ).strip(),
                is_superuser=False,
                is_admin=False,
                can_access=True,
                is_active=True,
                is_staff=False,
                is_owner=False,
                is_manager=False,
                is_assistant=False,
                created_by=(getattr(request.user, "username", "")
                            or "").strip() or None,
                created_on=timezone.now(),
                updated_by=(getattr(request.user, "username", "")
                            or "").strip() or None,
                updated_on=timezone.now(),
            )
    except IntegrityError:
        return Response(
            {"detail": "Unable to create non-teaching user due to duplicate data."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email_warning = None
    try:
        company = company_user.company
        organization_name = ""
        if getattr(company, "organization_id", None):
            organization = Organization.objects.filter(
                id=company.organization_id
            ).only("name").first()
            if organization:
                organization_name = organization.name

        subject = "Non-Teaching Staff Login Details"
        message = f"""
            <p>Hello {created_staff_user.name},</p>
            <p>Your non-teaching staff account has been created successfully.</p>
            <div style="margin:24px 0;padding:20px;border-radius:12px;background:#f4f8fc;border:1px solid #dbe7f3;">
                <p style="margin:0 0 10px 0;"><strong>Organization name:</strong> {organization_name or "-"}</p>
                <p style="margin:0 0 10px 0;"><strong>School name:</strong> {getattr(company, "company_name", "") or "-"}</p>
                <p style="margin:0 0 10px 0;"><strong>Role:</strong> {created_staff_user.role or "non-teaching"}</p>
                <p style="margin:0 0 10px 0;"><strong>Username:</strong> {created_staff_user.username}</p>
                <p style="margin:0;"><strong>Password:</strong> {password}</p>
            </div>
            <p><strong>Note:</strong> Kindly change your password after your first login.</p>
        """
        sendGenericMailV2(email, subject, message)
    except Exception as exc:
        email_warning = (
            "Non-teaching staff created, but credential email could not be sent: "
            f"{exc}"
        )

    response_data = {
        "detail": "Non-teaching user created successfully.",
        "company_user": {
            "id": created_staff_user.id,
            "company_id": created_staff_user.company_id,
            "name": created_staff_user.name,
            "username": created_staff_user.username,
            "mobile": created_staff_user.mobile,
            "email": created_staff_user.email,
            "role": created_staff_user.role,
        },
    }
    if email_warning:
        response_data["email_warning"] = email_warning

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def non_teaching_staff_list_detail(request, staff_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    staff_item = CompanyUser.objects.filter(
        id=staff_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not staff_item:
        return Response(
            {"detail": "Non-teaching record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    if not _is_non_teaching_staff_role(staff_item.role):
        return Response(
            {"detail": "Non-teaching record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        staff_item.delist = True
        staff_item.updated_by = (
            (getattr(request.user, "username", "")
             or "").strip() or staff_item.updated_by
        )
        staff_item.updated_on = timezone.now()
        staff_item.save(update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = NonTeachingListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    next_username = (request_serializer.validated_data.get(
        "username") or "").strip().lower()
    next_mobile = (request_serializer.validated_data.get(
        "mobile") or "").strip()
    next_email = (request_serializer.validated_data.get(
        "email") or "").strip().lower()

    if not next_username:
        return Response(
            {"detail": "username is required to update non-teaching login."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not next_mobile:
        return Response(
            {"detail": "mobile is required to update non-teaching login."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    username_exists = CompanyUser.objects.filter(
        company_id=company_user.company_id,
        username__iexact=next_username,
    ).exclude(id=staff_item.id).exists()
    if username_exists:
        return Response(
            {"detail": "This non-teaching username already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email_exists = CompanyUser.objects.filter(
        company_id=company_user.company_id,
        email__iexact=next_email,
    ).exclude(id=staff_item.id).exists()
    if email_exists:
        return Response(
            {"detail": "This non-teaching email already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    mobile_exists = CompanyUser.objects.filter(
        company_id=company_user.company_id,
        mobile=next_mobile,
    ).exclude(id=staff_item.id).exists()
    if mobile_exists:
        return Response(
            {"detail": "This non-teaching mobile already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    UserModel = get_user_model()
    linked_user = UserModel.objects.filter(
        username__iexact=staff_item.username).first()
    if linked_user is None:
        linked_user = UserModel.objects.filter(
            email__iexact=staff_item.email).first()

    email_in_use = (
        UserModel.objects.filter(email__iexact=next_email)
        .exclude(id=linked_user.id if linked_user else None)
        .exists()
    )
    if email_in_use:
        return Response(
            {"detail": "This email is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    mobile_in_use = (
        UserModel.objects.filter(phone_number=next_mobile)
        .exclude(id=linked_user.id if linked_user else None)
        .exists()
    )
    if mobile_in_use:
        return Response(
            {"detail": "This mobile number is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None

    try:
        with transaction.atomic():
            if linked_user:
                linked_user.username = next_username
                linked_user.email = next_email
                linked_user.phone_number = next_mobile
                linked_user.save(
                    update_fields=["username", "email", "phone_number"])

            staff_item.name = request_serializer.validated_data["name"].strip()
            staff_item.username = next_username
            staff_item.mobile = next_mobile
            staff_item.email = next_email
            staff_item.job_title = (
                request_serializer.validated_data.get("job_title")
                or request_serializer.validated_data.get("role")
                or staff_item.job_title
                or ""
            ).strip()
            staff_item.dob = request_serializer.validated_data.get("dob")
            staff_item.qualification = (
                request_serializer.validated_data.get("qualification") or ""
            ).strip()
            staff_item.experience = (
                request_serializer.validated_data.get("experience") or ""
            ).strip()
            staff_item.address = (
                request_serializer.validated_data.get("address") or ""
            ).strip()
            staff_item.state = (
                request_serializer.validated_data.get("state") or ""
            ).strip()
            staff_item.city = (
                request_serializer.validated_data.get("city") or ""
            ).strip()
            staff_item.pin = (
                request_serializer.validated_data.get("pin") or "").strip()
            staff_item.attachment_id = request_serializer.validated_data.get(
                "attachment_id")
            staff_item.role = (
                request_serializer.validated_data.get("role")
                or staff_item.role
                or "non-teaching"
            ).strip()
            staff_item.updated_by = actor_username
            staff_item.updated_on = timezone.now()
            staff_item.save(
                update_fields=[
                    "name",
                    "username",
                    "mobile",
                    "email",
                    "job_title",
                    "dob",
                    "qualification",
                    "experience",
                    "address",
                    "state",
                    "city",
                    "pin",
                    "attachment_id",
                    "role",
                    "updated_by",
                    "updated_on",
                ]
            )
    except IntegrityError:
        return Response(
            {"detail": "Unable to update non-teaching due to duplicate data."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(_serialize_non_teaching_company_user(staff_item), status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def student_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        student_items = (
            CompanyUser.objects.filter(
                company_id=company_id,
                delist=False,
                role__iexact="student",
            )
            .order_by("-id")
        )

        search_term = (request.query_params.get("search") or "").strip()
        if search_term:
            student_items = student_items.filter(
                Q(name__icontains=search_term)
                | Q(username__icontains=search_term)
                | Q(email__icontains=search_term)
                | Q(mobile__icontains=search_term)
                | Q(fatherOrHusband__icontains=search_term)
            )

        academic_records = (
            StudentAcademicRecord.objects.select_related(
                "student",
                "class_details",
                "section_details",
            )
            .filter(company_id=company_id, delist=False, student__delist=False)
            .order_by("-id")
        )
        record_by_student_key = {}
        for record in academic_records:
            student_item = getattr(record, "student", None)
            if not student_item:
                continue
            candidate_keys = [
                (getattr(student_item, "username", "") or "").strip().lower(),
                (getattr(student_item, "email", "") or "").strip().lower(),
                (getattr(student_item, "mobile", "") or "").strip(),
                str(getattr(student_item, "id", "") or "").strip(),
            ]
            for key in candidate_keys:
                if key and key not in record_by_student_key:
                    record_by_student_key[key] = record

        page_value = (request.query_params.get("page") or "").strip()
        page_size_value = (request.query_params.get("page_size") or "").strip()
        if page_value or page_size_value:
            try:
                page_number = int(page_value or "1")
            except ValueError:
                page_number = 1

            try:
                page_size = int(page_size_value or "10")
            except ValueError:
                page_size = 10

            page_number = max(page_number, 1)
            page_size = max(1, min(page_size, 100))

            paginator = Paginator(student_items, page_size)
            try:
                page_obj = paginator.page(page_number)
            except EmptyPage:
                page_obj = []

            def build_page_url(target_page):
                query_params = request.query_params.copy()
                query_params["page"] = str(target_page)
                query_params["page_size"] = str(page_size)
                return f"{request.path}?{query_params.urlencode()}"

            next_url = (
                build_page_url(page_obj.next_page_number())
                if getattr(page_obj, "has_next", lambda: False)()
                else None
            )
            previous_url = (
                build_page_url(page_obj.previous_page_number())
                if getattr(page_obj, "has_previous", lambda: False)()
                else None
            )

            return Response(
                {
                    "count": paginator.count,
                    "next": next_url,
                    "previous": previous_url,
                    "results": [
                        _attach_student_academic_record(
                            _serialize_student_company_user(item),
                            record_by_student_key,
                        )
                        for item in list(page_obj)
                    ],
                }
            )

        return Response(
            [
                _attach_student_academic_record(
                    _serialize_student_company_user(item),
                    record_by_student_key,
                )
                for item in student_items
            ]
        )

    request_serializer = StudentListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    username = (request_serializer.validated_data.get(
        "username") or "").strip().lower()
    role = (request_serializer.validated_data.get(
        "role") or "student").strip() or "student"
    mobile = (request_serializer.validated_data.get("mobile") or "").strip()
    email = (request_serializer.validated_data.get(
        "email") or "").strip().lower()
    is_verified = bool(
        request_serializer.validated_data.get("is_verified", False))
    password = (request_serializer.validated_data.get(
        "password") or "abc123").strip() or "abc123"

    if not username:
        return Response(
            {"detail": "username is required to create user login."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if email and not is_verified:
        return Response(
            {"detail": "Verify email with OTP before creating student."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    UserModel = get_user_model()
    existing_by_email = (
        UserModel.objects.filter(
            email__iexact=email).first() if email else None
    )
    existing_by_mobile = (
        UserModel.objects.filter(
            phone_number=mobile).first() if mobile else None
    )
    existing_by_username = UserModel.objects.filter(
        username__iexact=username).first()

    if existing_by_email and (
        not existing_by_username or existing_by_email.id != existing_by_username.id
    ):
        return Response(
            {"detail": "This email is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if existing_by_mobile and (
        not existing_by_username or existing_by_mobile.id != existing_by_username.id
    ):
        return Response(
            {"detail": "This mobile number is already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if CompanyUser.objects.filter(company_id=company_id, username__iexact=username).exists():
        return Response(
            {"detail": "This student username already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if email and CompanyUser.objects.filter(company_id=company_id, email__iexact=email).exists():
        return Response(
            {"detail": "This student email already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if mobile and CompanyUser.objects.filter(company_id=company_id, mobile=mobile).exists():
        return Response(
            {"detail": "This student mobile already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            auth_email = _normalize_auth_email(
                UserModel,
                username=username,
                email=email,
                exclude_user_id=existing_by_username.id if existing_by_username else None,
            )
            auth_phone = _normalize_auth_phone(
                UserModel,
                username=username,
                phone_number=mobile,
                exclude_user_id=existing_by_username.id if existing_by_username else None,
            )
            if existing_by_username is None:
                existing_by_username = UserModel.objects.create_user(
                    username=username,
                    email=auth_email,
                    phone_number=auth_phone,
                    password=password,
                )
            else:
                existing_by_username.email = auth_email
                existing_by_username.phone_number = auth_phone
                existing_by_username.set_password(password)
                existing_by_username.save(
                    update_fields=["email", "phone_number", "password"])

            created_company_user = CompanyUser.objects.create(
                company_id=company_id,
                name=request_serializer.validated_data["name"].strip(),
                organization_id=company_user.organization_id
                or getattr(company_user.company, "organization_id", None),
                username=username,
                mobile=mobile,
                email=email,
                dob=request_serializer.validated_data.get("dob"),
                fatherOrHusband=(
                    request_serializer.validated_data.get(
                        "guardian_name") or ""
                ).strip(),
                address=(request_serializer.validated_data.get(
                    "address") or "").strip(),
                state=(request_serializer.validated_data.get(
                    "state") or "").strip(),
                city=(request_serializer.validated_data.get(
                    "city") or "").strip(),
                pin=(request_serializer.validated_data.get("pin") or "").strip(),
                attachment_id=request_serializer.validated_data.get(
                    "attachment_id"),
                role=role,
                is_superuser=False,
                is_admin=False,
                can_access=True,
                is_active=True,
                is_staff=False,
                is_owner=False,
                is_manager=False,
                is_assistant=False,
                created_by=(getattr(request.user, "username", "")
                            or "").strip() or None,
                created_on=timezone.now(),
                updated_by=(getattr(request.user, "username", "")
                            or "").strip() or None,
                updated_on=timezone.now(),
            )
    except IntegrityError:
        return Response(
            {"detail": "Unable to create student user due to duplicate data."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email_warning = None
    if email:
        try:
            company = company_user.company
            organization_name = ""
            if getattr(company, "organization_id", None):
                organization = Organization.objects.filter(
                    id=company.organization_id
                ).only("name").first()
                if organization:
                    organization_name = organization.name

            subject = "Student Login Details"
            message = f"""
                <p>Hello {created_company_user.name},</p>
                <p>Your student account has been created successfully.</p>
                <div style="margin:24px 0;padding:20px;border-radius:12px;background:#f4f8fc;border:1px solid #dbe7f3;">
                    <p style="margin:0 0 10px 0;"><strong>Organization name:</strong> {organization_name or "-"}</p>
                    <p style="margin:0 0 10px 0;"><strong>School name:</strong> {getattr(company, "company_name", "") or "-"}</p>
                    <p style="margin:0 0 10px 0;"><strong>Role:</strong> {created_company_user.role or "student"}</p>
                    <p style="margin:0 0 10px 0;"><strong>Username:</strong> {created_company_user.username}</p>
                    <p style="margin:0;"><strong>Password:</strong> {password}</p>
                </div>
                <p><strong>Note:</strong> Kindly change your password after your first login.</p>
            """
            sendGenericMailV2(email, subject, message)
        except Exception as exc:
            email_warning = (
                "Student created, but credential email could not be sent: "
                f"{exc}"
            )

    response_data = {
        "detail": "Student user created successfully.",
        "company_user": {
            "id": created_company_user.id,
            "company_id": created_company_user.company_id,
            "name": created_company_user.name,
            "username": created_company_user.username,
            "mobile": created_company_user.mobile,
            "email": created_company_user.email,
            "role": created_company_user.role,
        },
    }
    if email_warning:
        response_data["email_warning"] = email_warning

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def student_list_detail(request, student_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    student_item = CompanyUser.objects.filter(
        id=student_id,
        company_id=company_user.company_id,
        delist=False,
        role__iexact="student",
    ).first()
    if not student_item:
        return Response(
            {"detail": "Student record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        return Response(_serialize_student_company_user(student_item), status=status.HTTP_200_OK)

    if request.method == "DELETE":
        student_item.delist = True
        student_item.updated_by = (
            (getattr(request.user, "username", "")
             or "").strip() or student_item.updated_by
        )
        student_item.updated_on = timezone.now()
        student_item.save(update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = StudentListCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    next_name = request_serializer.validated_data["name"].strip()
    next_username = (request_serializer.validated_data.get(
        "username") or "").strip().lower()
    next_mobile = (
        request_serializer.validated_data.get("mobile") or ""
    ).strip()
    next_email = (
        request_serializer.validated_data.get("email") or ""
    ).strip().lower()

    if not next_username:
        return Response(
            {"detail": "username is required to update student login."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    username_exists = CompanyUser.objects.filter(
        company_id=company_user.company_id,
        username__iexact=next_username,
    ).exclude(id=student_item.id).exists()
    if username_exists:
        return Response(
            {"detail": "This student username already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email_exists = (
        CompanyUser.objects.filter(
            company_id=company_user.company_id,
            email__iexact=next_email,
        ).exclude(id=student_item.id).exists()
        if next_email
        else False
    )
    if email_exists:
        return Response(
            {"detail": "This student email already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    mobile_exists = (
        CompanyUser.objects.filter(
            company_id=company_user.company_id,
            mobile=next_mobile,
        ).exclude(id=student_item.id).exists()
        if next_mobile
        else False
    )
    if mobile_exists:
        return Response(
            {"detail": "This student mobile already exists for your school."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    UserModel = get_user_model()
    linked_user = UserModel.objects.filter(
        username__iexact=student_item.username).first()
    if linked_user is None:
        linked_user = UserModel.objects.filter(
            email__iexact=student_item.email).first()

    if linked_user:
        auth_username_exists = (
            UserModel.objects.filter(username__iexact=next_username)
            .exclude(id=linked_user.id)
            .exists()
        )
        if auth_username_exists:
            return Response(
                {"detail": "This username is already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        auth_email_exists = (
            UserModel.objects.filter(email__iexact=next_email)
            .exclude(id=linked_user.id)
            .exists()
            if next_email
            else False
        )
        if auth_email_exists:
            return Response(
                {"detail": "This email is already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        auth_mobile_exists = (
            UserModel.objects.filter(phone_number=next_mobile)
            .exclude(id=linked_user.id)
            .exists()
            if next_mobile
            else False
        )
        if auth_mobile_exists:
            return Response(
                {"detail": "This mobile number is already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    student_item.name = next_name
    student_item.username = next_username
    student_item.mobile = next_mobile
    student_item.email = next_email
    student_item.dob = request_serializer.validated_data.get("dob")
    student_item.fatherOrHusband = (
        request_serializer.validated_data.get("guardian_name") or ""
    ).strip()
    student_item.address = (
        request_serializer.validated_data.get("address") or "").strip()
    student_item.state = (
        request_serializer.validated_data.get("state") or "").strip()
    student_item.city = (
        request_serializer.validated_data.get("city") or "").strip()
    student_item.pin = (
        request_serializer.validated_data.get("pin") or "").strip()
    student_item.attachment_id = request_serializer.validated_data.get(
        "attachment_id")
    student_item.updated_by = actor_username
    student_item.updated_on = timezone.now()
    student_item.role = "student"
    student_item.save(
        update_fields=[
            "name",
            "username",
            "mobile",
            "email",
            "dob",
            "fatherOrHusband",
            "address",
            "state",
            "city",
            "pin",
            "attachment_id",
            "role",
            "updated_by",
            "updated_on",
        ]
    )

    if linked_user:
        normalized_auth_email = _normalize_auth_email(
            UserModel,
            username=next_username,
            email=next_email,
            exclude_user_id=linked_user.id,
        )
        normalized_auth_phone = _normalize_auth_phone(
            UserModel,
            username=next_username,
            phone_number=next_mobile,
            exclude_user_id=linked_user.id,
        )
        linked_user.username = next_username
        linked_user.email = normalized_auth_email
        linked_user.phone_number = normalized_auth_phone
        linked_user.save(update_fields=["username", "email", "phone_number"])

    return Response(_serialize_student_company_user(student_item), status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def student_academic_record_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        record_items = (
            StudentAcademicRecord.objects.select_related(
                "student",
                "academic_year",
                "class_details",
                "section_details",
            )
            .filter(company_id=company_id, delist=False)
            .order_by("-id")
        )
        serializer = StudentAcademicRecordSerializer(record_items, many=True)
        response_data = list(serializer.data)

        record_ids = [item.id for item in record_items]
        pending_record_ids = set(
            StudentFeesCollection.objects.filter(
                company_id=company_id,
                student_academic_rcord_id__in=record_ids,
                status__in=["pending", "overdue"],
                delist=False,
            ).values_list("student_academic_rcord_id", flat=True)
        )

        for item in response_data:
            if item.get("id") in pending_record_ids:
                item["status"] = "pending"

        return Response(response_data)

    request_serializer = StudentAcademicRecordCreateSerializer(
        data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    student_item = _resolve_student_for_academic_record(
        company_id=company_id,
        selected_student_id=request_serializer.validated_data["student_id"],
        actor_username=actor_username,
    )
    if not student_item:
        return Response(
            {"detail": "Selected student is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    academic_year_item = AcademicYear.objects.filter(
        id=request_serializer.validated_data["academic_year_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not academic_year_item:
        return Response(
            {"detail": "Selected academic year is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    class_item = ClassList.objects.filter(
        id=request_serializer.validated_data["class_details_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not class_item:
        return Response(
            {"detail": "Selected class is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    section_item = SectionList.objects.filter(
        id=request_serializer.validated_data["section_details_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not section_item:
        return Response(
            {"detail": "Selected section is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if section_item.class_details_id != class_item.id:
        return Response(
            {"detail": "Selected section does not belong to selected class."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    existing_record = (
        StudentAcademicRecord.objects.select_related(
            "class_details",
            "section_details",
        )
        .filter(
            company_id=company_id,
            student_id=student_item.id,
            academic_year_id=academic_year_item.id,
            delist=False,
        )
        .first()
    )
    if existing_record:
        existing_class_name = getattr(
            getattr(existing_record, "class_details", None),
            "class_name",
            "",
        )
        existing_section_name = getattr(
            getattr(existing_record, "section_details", None),
            "section",
            "",
        )
        if existing_class_name and existing_section_name:
            detail = (
                "Selected student already has an academic record for this "
                f"academic year in Class {existing_class_name} Section {existing_section_name}."
            )
        elif existing_class_name:
            detail = (
                "Selected student already has an academic record for this "
                f"academic year in Class {existing_class_name}."
            )
        else:
            detail = (
                "Selected student already has an academic record for this academic year."
            )
        return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    try:
        created_item = StudentAcademicRecord.objects.create(
            company_id=company_id,
            student=student_item,
            academic_year=academic_year_item,
            class_details=class_item,
            section_details=section_item,
            roll_number=(request_serializer.validated_data.get(
                "roll_number") or "").strip(),
            admission_date=request_serializer.validated_data.get(
                "admission_date"),
            status=request_serializer.validated_data["status"],
            remarks=request_serializer.validated_data.get("remarks") or "",
            created_by=actor_username,
            created_on=timezone.now(),
            updated_by=actor_username,
            updated_on=timezone.now(),
        )
    except IntegrityError:
        return Response(
            {"detail": "Student already has a record for selected academic year."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response_serializer = StudentAcademicRecordSerializer(created_item)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def student_academic_record_list_detail(request, record_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    record_item = StudentAcademicRecord.objects.filter(
        id=record_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not record_item:
        return Response(
            {"detail": "Student academic record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        record_item.delist = True
        record_item.updated_by = (
            (getattr(request.user, "username", "")
             or "").strip() or record_item.updated_by
        )
        record_item.updated_on = timezone.now()
        record_item.save(update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = StudentAcademicRecordCreateSerializer(
        data=request.data)
    request_serializer.is_valid(raise_exception=True)

    company_id = company_user.company_id
    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    student_item = _resolve_student_for_academic_record(
        company_id=company_id,
        selected_student_id=request_serializer.validated_data["student_id"],
        actor_username=actor_username,
    )
    if not student_item:
        return Response(
            {"detail": "Selected student is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    academic_year_item = AcademicYear.objects.filter(
        id=request_serializer.validated_data["academic_year_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not academic_year_item:
        return Response(
            {"detail": "Selected academic year is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    class_item = ClassList.objects.filter(
        id=request_serializer.validated_data["class_details_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not class_item:
        return Response(
            {"detail": "Selected class is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    section_item = SectionList.objects.filter(
        id=request_serializer.validated_data["section_details_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not section_item:
        return Response(
            {"detail": "Selected section is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if section_item.class_details_id != class_item.id:
        return Response(
            {"detail": "Selected section does not belong to selected class."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    existing_record = (
        StudentAcademicRecord.objects.select_related(
            "class_details",
            "section_details",
        )
        .filter(
            company_id=company_id,
            student_id=student_item.id,
            academic_year_id=academic_year_item.id,
            delist=False,
        )
        .exclude(id=record_item.id)
        .first()
    )
    if existing_record:
        existing_class_name = getattr(
            getattr(existing_record, "class_details", None),
            "class_name",
            "",
        )
        existing_section_name = getattr(
            getattr(existing_record, "section_details", None),
            "section",
            "",
        )
        if existing_class_name and existing_section_name:
            detail = (
                "Selected student already has an academic record for this "
                f"academic year in Class {existing_class_name} Section {existing_section_name}."
            )
        elif existing_class_name:
            detail = (
                "Selected student already has an academic record for this "
                f"academic year in Class {existing_class_name}."
            )
        else:
            detail = (
                "Selected student already has an academic record for this academic year."
            )
        return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    record_item.student = student_item
    record_item.academic_year = academic_year_item
    record_item.class_details = class_item
    record_item.section_details = section_item
    record_item.roll_number = (
        request_serializer.validated_data.get("roll_number") or "").strip()
    record_item.admission_date = request_serializer.validated_data.get(
        "admission_date")
    record_item.status = request_serializer.validated_data["status"]
    record_item.remarks = request_serializer.validated_data.get(
        "remarks") or ""
    record_item.updated_by = actor_username
    record_item.updated_on = timezone.now()

    try:
        record_item.save(
            update_fields=[
                "student",
                "academic_year",
                "class_details",
                "section_details",
                "roll_number",
                "admission_date",
                "status",
                "remarks",
                "updated_by",
                "updated_on",
            ]
        )
    except IntegrityError:
        return Response(
            {"detail": "Student already has a record for selected academic year."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response_serializer = StudentAcademicRecordSerializer(record_item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def student_exam_marks_list(request):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_id = company_user.company_id

    if request.method == "GET":
        mark_items = (
            StudentsMark.objects.select_related(
                "student_record",
                "student_record__student",
                "academic_year",
                "student_record__class_details",
                "student_record__section_details",
                "class_details",
                "section_details",
                "exam_schedule",
                "exam_schedule__exam",
                "exam_schedule__class_details",
                "exam_schedule__section_details",
                "exam_schedule__subject",
                "subject",
            )
            .filter(company_id=company_id, delist=False)
            .order_by("-updated_on", "-id")
        )
        serializer = StudentsMarkSerializer(mark_items, many=True)
        return Response(serializer.data)

    request_serializer = StudentsMarkCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    student_record_item = StudentAcademicRecord.objects.select_related(
        "student",
        "class_details",
        "section_details",
    ).filter(
        id=request_serializer.validated_data["student_record_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not student_record_item:
        return Response(
            {"detail": "Selected student record is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    exam_schedule_item = ExamSchedule.objects.select_related(
        "exam",
        "class_details",
        "section_details",
        "subject",
    ).filter(
        id=request_serializer.validated_data["exam_schedule_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not exam_schedule_item:
        return Response(
            {"detail": "Selected exam schedule is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    requested_academic_year_id = request_serializer.validated_data.get(
        "academic_year_id")
    expected_academic_year_id = getattr(
        exam_schedule_item.exam, "academic_year_id", None)
    resolved_academic_year_id = requested_academic_year_id or expected_academic_year_id
    if not resolved_academic_year_id:
        return Response(
            {"detail": "Academic year is required for the selected exam schedule."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if (
        requested_academic_year_id
        and expected_academic_year_id
        and requested_academic_year_id != expected_academic_year_id
    ):
        return Response(
            {"detail": "Selected academic year does not match the exam schedule."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    academic_year_item = AcademicYear.objects.filter(
        id=resolved_academic_year_id,
        company_id=company_id,
        delist=False,
    ).first()
    if not academic_year_item:
        return Response(
            {"detail": "Selected academic year is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if exam_schedule_item.class_details_id != student_record_item.class_details_id:
        return Response(
            {"detail": "Selected exam schedule does not match the student's class."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if (
        exam_schedule_item.section_details_id is not None
        and exam_schedule_item.section_details_id != student_record_item.section_details_id
    ):
        return Response(
            {"detail": "Selected exam schedule does not match the student's section."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    subject_item = SubjectList.objects.filter(
        id=request_serializer.validated_data["subject_id"],
        company_id=company_id,
        delist=False,
    ).first()
    if not subject_item:
        return Response(
            {"detail": "Selected subject is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    marks_obtained = request_serializer.validated_data.get("marks_obtained", 0)
    submitted_subject_marks = request_serializer.validated_data.get(
        "subject_marks")
    if submitted_subject_marks is not None:
        subject_marks_payload = _json_safe_value(submitted_subject_marks)
    else:
        subject_marks_payload = _merge_subject_marks_map(
            None,
            subject_item.subject_name,
            marks_obtained,
            request_serializer.validated_data.get("grade", ""),
            request_serializer.validated_data.get("max_marks"),
        )

    try:
        with transaction.atomic():
            existing_item = (
                StudentsMark.objects.select_for_update()
                .filter(
                    company_id=company_id,
                    student_record_id=student_record_item.id,
                    exam_schedule_id=exam_schedule_item.id,
                )
                .first()
            )

            if existing_item:
                existing_item.class_details = student_record_item.class_details
                existing_item.section_details = student_record_item.section_details
                existing_item.student_record = student_record_item
                existing_item.exam_schedule = exam_schedule_item
                existing_item.subject = subject_item
                existing_item.academic_year = academic_year_item
                existing_item.subject_marks = (
                    {
                        **_subject_marks_map(existing_item.subject_marks),
                        **_subject_marks_map(subject_marks_payload),
                    }
                    if submitted_subject_marks is not None
                    else _merge_subject_marks_map(
                        existing_item.subject_marks,
                        subject_item.subject_name,
                        marks_obtained,
                        request_serializer.validated_data.get("grade", ""),
                        request_serializer.validated_data.get("max_marks"),
                    )
                )
                existing_item.max_marks = request_serializer.validated_data.get(
                    "max_marks", existing_item.max_marks
                )
                existing_item.passing_marks = request_serializer.validated_data.get(
                    "passing_marks", existing_item.passing_marks
                )
                existing_item.marks_obtained = request_serializer.validated_data.get(
                    "marks_obtained", existing_item.marks_obtained
                )
                existing_item.practical_marks = request_serializer.validated_data.get(
                    "practical_marks", existing_item.practical_marks
                )
                existing_item.internal_marks = request_serializer.validated_data.get(
                    "internal_marks", existing_item.internal_marks
                )
                existing_item.grade = request_serializer.validated_data.get(
                    "grade", existing_item.grade
                )
                existing_item.is_absent = request_serializer.validated_data.get(
                    "is_absent", existing_item.is_absent
                )
                existing_item.is_pass = request_serializer.validated_data.get(
                    "is_pass", existing_item.is_pass
                )
                existing_item.remarks = request_serializer.validated_data.get(
                    "remarks", existing_item.remarks
                )
                existing_item.delist = False
                existing_item.updated_by = actor_username
                existing_item.updated_on = timezone.now()
                existing_item.save(
                    update_fields=[
                        "class_details",
                        "section_details",
                        "student_record",
                        "exam_schedule",
                        "subject",
                        "academic_year",
                        "subject_marks",
                        "max_marks",
                        "passing_marks",
                        "marks_obtained",
                        "practical_marks",
                        "internal_marks",
                        "grade",
                        "is_absent",
                        "is_pass",
                        "remarks",
                        "delist",
                        "updated_by",
                        "updated_on",
                    ]
                )
                response_serializer = StudentsMarkSerializer(existing_item)
                return Response(response_serializer.data, status=status.HTTP_200_OK)

            created_item = StudentsMark.objects.create(
                company_id=company_id,
                academic_year=academic_year_item,
                class_details=student_record_item.class_details,
                section_details=student_record_item.section_details,
                student_record=student_record_item,
                exam_schedule=exam_schedule_item,
                subject=subject_item,
                subject_marks=subject_marks_payload,
                created_by=actor_username,
                created_on=timezone.now(),
                updated_by=actor_username,
                updated_on=timezone.now(),
            )
    except IntegrityError:
        return Response(
            {"detail": "Unable to save student exam marks."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response_serializer = StudentsMarkSerializer(created_item)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def student_exam_marks_list_detail(request, mark_id):
    company_user = _get_logged_in_company_user(request)
    if not company_user or not company_user.company_id:
        return Response(
            {"detail": "Company user not found for logged-in username."},
            status=status.HTTP_404_NOT_FOUND,
        )

    mark_item = StudentsMark.objects.select_related(
        "student_record",
        "student_record__student",
        "student_record__class_details",
        "student_record__section_details",
        "academic_year",
        "class_details",
        "section_details",
        "exam_schedule",
        "exam_schedule__exam",
        "exam_schedule__class_details",
        "exam_schedule__section_details",
        "exam_schedule__subject",
        "subject",
    ).filter(
        id=mark_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not mark_item:
        return Response(
            {"detail": "Student exam marks record not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        mark_item.delist = True
        mark_item.updated_by = (
            (getattr(request.user, "username", "")
             or "").strip() or mark_item.updated_by
        )
        mark_item.updated_on = timezone.now()
        mark_item.save(update_fields=["delist", "updated_by", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_serializer = StudentsMarkCreateSerializer(data=request.data)
    request_serializer.is_valid(raise_exception=True)

    requested_company_id = request_serializer.validated_data.get("company_id")
    if requested_company_id and requested_company_id != company_user.company_id:
        return Response(
            {"detail": "company_id does not match logged-in user company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    student_record_item = StudentAcademicRecord.objects.select_related(
        "student",
        "class_details",
        "section_details",
    ).filter(
        id=request_serializer.validated_data["student_record_id"],
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not student_record_item:
        return Response(
            {"detail": "Selected student record is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    exam_schedule_item = ExamSchedule.objects.select_related(
        "exam",
        "class_details",
        "section_details",
        "subject",
    ).filter(
        id=request_serializer.validated_data["exam_schedule_id"],
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not exam_schedule_item:
        return Response(
            {"detail": "Selected exam schedule is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    requested_academic_year_id = request_serializer.validated_data.get(
        "academic_year_id")
    expected_academic_year_id = getattr(
        exam_schedule_item.exam, "academic_year_id", None)
    resolved_academic_year_id = requested_academic_year_id or expected_academic_year_id
    if not resolved_academic_year_id:
        return Response(
            {"detail": "Academic year is required for the selected exam schedule."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if (
        requested_academic_year_id
        and expected_academic_year_id
        and requested_academic_year_id != expected_academic_year_id
    ):
        return Response(
            {"detail": "Selected academic year does not match the exam schedule."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    academic_year_item = AcademicYear.objects.filter(
        id=resolved_academic_year_id,
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not academic_year_item:
        return Response(
            {"detail": "Selected academic year is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if exam_schedule_item.class_details_id != student_record_item.class_details_id:
        return Response(
            {"detail": "Selected exam schedule does not match the student's class."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if (
        exam_schedule_item.section_details_id is not None
        and exam_schedule_item.section_details_id != student_record_item.section_details_id
    ):
        return Response(
            {"detail": "Selected exam schedule does not match the student's section."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    subject_item = SubjectList.objects.filter(
        id=request_serializer.validated_data["subject_id"],
        company_id=company_user.company_id,
        delist=False,
    ).first()
    if not subject_item:
        return Response(
            {"detail": "Selected subject is not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    actor_username = (getattr(request.user, "username", "")
                      or "").strip() or None
    marks_obtained = request_serializer.validated_data.get("marks_obtained", 0)
    submitted_subject_marks = request_serializer.validated_data.get(
        "subject_marks")
    if submitted_subject_marks is not None:
        subject_marks_payload = _json_safe_value(submitted_subject_marks)
    else:
        subject_marks_payload = _merge_subject_marks_map(
            mark_item.subject_marks,
            subject_item.subject_name,
            marks_obtained,
            request_serializer.validated_data.get("grade", ""),
            request_serializer.validated_data.get("max_marks"),
        )

    mark_item.class_details = student_record_item.class_details
    mark_item.section_details = student_record_item.section_details
    mark_item.student_record = student_record_item
    mark_item.exam_schedule = exam_schedule_item
    mark_item.subject = subject_item
    mark_item.academic_year = academic_year_item
    mark_item.subject_marks = subject_marks_payload
    mark_item.updated_by = actor_username
    mark_item.updated_on = timezone.now()
    mark_item.save(
        update_fields=[
            "class_details",
            "section_details",
            "student_record",
            "exam_schedule",
            "subject",
            "academic_year",
            "subject_marks",
            "updated_by",
            "updated_on",
        ]
    )

    response_serializer = StudentsMarkSerializer(mark_item)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def category_dashboard_summary(request):
    organization_id, organization_name, school_companies = (
        _resolve_organization_dashboard_context(request)
    )

    if not organization_id or school_companies is None:
        return Response(
            {"detail": "Organization context not found for this user."},
            status=status.HTTP_404_NOT_FOUND,
        )

    company_ids = list(school_companies.values_list("id", flat=True))
    school_count = len(company_ids)
    teacher_count = CompanyUser.objects.filter(
        company_id__in=company_ids,
        role__iexact="teacher",
        delist=False,
    ).count()
    student_count = CompanyUser.objects.filter(
        company_id__in=company_ids,
        role__iexact="student",
        delist=False,
    ).count()
    headmaster_count = CompanyUser.objects.filter(
        company_id__in=company_ids,
        role__iexact="teacher",
        is_head_master=True,
        delist=False,
    ).count()
    student_teacher_ratio = (
        round(student_count / teacher_count, 2) if teacher_count else None
    )

    summary_list = [
        {"key": "schools", "label": "Schools", "value": school_count},
        {"key": "teachers", "label": "Teachers", "value": teacher_count},
        {"key": "students", "label": "Students", "value": student_count},
        {"key": "headmasters", "label": "Headmasters", "value": headmaster_count},
        {
            "key": "student_teacher_ratio",
            "label": "Student Teacher Ratio",
            "value": student_teacher_ratio,
        },
    ]

    graph = [
        {"label": "Schools", "value": school_count},
        {"label": "Teachers", "value": teacher_count},
        {"label": "Students", "value": student_count},
        {"label": "Headmasters", "value": headmaster_count},
    ]

    company_rows = list(
        school_companies.values(
            "id",
            "company_id",
            "organization_id",
            "company_name",
            "location",
            "district",
            "admin_name",
            "username",
            "email",
            "address",
            "pin",
            "is_approved",
            "main_group",
            "sub_group",
            "school_category",
            "school_code",
        )
    )
    company_ids = [row["id"] for row in company_rows]
    company_info_map = {
        row["company_id"]: row
        for row in CompanyInfo.objects.filter(company_id__in=company_ids).values(
            "company_id",
            "company_name",
            "admin_name",
            "email",
            "mobile_no",
            "address",
            "city",
            "pin",
            "country",
            "head_office_state",
            "organization_id",
        )
    }

    school_list = []
    for index, company in enumerate(company_rows, start=1):
        info = company_info_map.get(company["id"], {})
        school_list.append(
            {
                "id": company["id"],
                "serial_no": index,
                "company_id": company["company_id"],
                "organization_id": (
                    info.get("organization_id") or company.get(
                        "organization_id")
                ),
                "name": info.get("company_name") or company.get("company_name") or "",
                "company_name": (
                    info.get("company_name") or company.get(
                        "company_name") or ""
                ),
                "school_code": company.get("school_code") or "",
                "school_category": company.get("school_category") or "",
                "location": company.get("location") or "",
                "admin_name": info.get("admin_name") or company.get("admin_name") or "",
                "email": info.get("email") or company.get("email") or "",
                "username": company.get("username") or "",
                "address": info.get("address") or company.get("address") or "",
                "district": company.get("district") or "",
                "city": info.get("city") or "",
                "state": info.get("head_office_state") or "",
                "head_office_state": info.get("head_office_state") or "",
                "pin": info.get("pin") or company.get("pin") or "",
                "country": info.get("country") or "",
                "main_group": company.get("main_group") or "",
                "sub_group": company.get("sub_group") or "",
                "is_approved": bool(company.get("is_approved")),
            }
        )

    return Response(
        {
            "organization_id": organization_id,
            "organization_name": organization_name,
            "summary": {
                "schools": school_count,
                "teachers": teacher_count,
                "students": student_count,
                "headmasters": headmaster_count,
                "student_teacher_ratio": student_teacher_ratio,
            },
            "graph": graph,
            "list": summary_list,
            "schools": school_list,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def schoolTestData(request):
    try:
        a = School.objects.all()
        b = AcademicYear.objects.all()
        c = ClassList.objects.all()
        d = SectionList.objects.all()
        e = SubjectList.objects.all()
        f = TeacherList.objects.all()
        g = NonTeacherStaffList.objects.all()
        h = StudentList.objects.all()
        i = StudentAcademicRecord.objects.all()
        return Response({"a": a,
                         "b": b, "c": c, "d": d, "E": e, "f": f, "g": g, "h": h, "i": i}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(e)
