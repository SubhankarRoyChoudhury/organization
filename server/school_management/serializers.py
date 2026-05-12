from rest_framework import serializers
from company_account.models import CompanyUser

from .models import (
    AcademicYear,
    ClassFeeStructure,
    ClassList,
    ExamType,
    ExamSchedule,
    SectionList,
    SubjectList,
    StudentAcademicRecord,
    StudentFeesCollection,
    StudentsMark,
    StudentList,
    TeacherList,
)


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = [
            "id",
            "company_id",
            "year_name",
            "start_date",
            "end_date",
            "is_active",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields


class AcademicYearCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    year_name = serializers.CharField(
        max_length=20, required=True, allow_blank=False)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, default=False)
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "year_name" not in incoming and "yearName" in incoming:
            incoming["year_name"] = incoming.get("yearName")
        if "start_date" not in incoming and "startDate" in incoming:
            incoming["start_date"] = incoming.get("startDate")
        if "end_date" not in incoming and "endDate" in incoming:
            incoming["end_date"] = incoming.get("endDate")
        if "is_active" not in incoming and "isActive" in incoming:
            incoming["is_active"] = incoming.get("isActive")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        return super().to_internal_value(incoming)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date is not None and end_date is not None and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be greater than or equal to start date."}
            )
        return attrs


class ExamTypeSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(
        source="academic_year.year_name",
        read_only=True,
    )
    exam_type_display = serializers.CharField(
        source="get_exam_type_display",
        read_only=True,
    )

    class Meta:
        model = ExamType
        fields = [
            "id",
            "company_id",
            "academic_year_id",
            "academic_year_name",
            "exam_name",
            "exam_type",
            "exam_type_display",
            "total_marks",
            "start_date",
            "end_date",
            "is_active",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields


class ExamTypeCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    academic_year_id = serializers.IntegerField(required=True)
    exam_name = serializers.CharField(
        max_length=100, required=True, allow_blank=False)
    exam_type = serializers.ChoiceField(
        choices=ExamType._meta.get_field("exam_type").choices,
        required=True,
    )
    total_marks = serializers.IntegerField(required=False, default=20)
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)
    is_active = serializers.BooleanField(required=False, default=False)
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "academic_year_id" not in incoming and "academicYearId" in incoming:
            incoming["academic_year_id"] = incoming.get("academicYearId")
        if "academic_year_id" not in incoming and "academicYear" in incoming:
            incoming["academic_year_id"] = incoming.get("academicYear")
        if "exam_name" not in incoming and "examName" in incoming:
            incoming["exam_name"] = incoming.get("examName")
        if "exam_type" not in incoming and "examType" in incoming:
            incoming["exam_type"] = incoming.get("examType")
        if "total_marks" not in incoming and "totalMarks" in incoming:
            incoming["total_marks"] = incoming.get("totalMarks")
        if "start_date" not in incoming and "startDate" in incoming:
            incoming["start_date"] = incoming.get("startDate")
        if "end_date" not in incoming and "endDate" in incoming:
            incoming["end_date"] = incoming.get("endDate")
        if "is_active" not in incoming and "isActive" in incoming:
            incoming["is_active"] = incoming.get("isActive")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        return super().to_internal_value(incoming)

    def validate(self, attrs):
        if attrs["end_date"] < attrs["start_date"]:
            raise serializers.ValidationError(
                {"end_date": "End date must be greater than or equal to start date."}
            )
        return attrs


class ExamScheduleSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source="exam.exam_name", read_only=True)
    academic_year_name = serializers.SerializerMethodField()
    class_name = serializers.CharField(
        source="class_details.class_name", read_only=True)
    section_name = serializers.CharField(
        source="section_details.section", read_only=True, allow_null=True)
    subject_name = serializers.CharField(
        source="subject.subject_name", read_only=True)

    class Meta:
        model = ExamSchedule
        fields = [
            "id",
            "company_id",
            "academic_year_id",
            "academic_year_name",
            "exam_id",
            "exam_name",
            "class_details_id",
            "class_name",
            "section_details_id",
            "section_name",
            "subject_id",
            "subject_name",
            "exam_date",
            "subject_schedules",
            "start_time",
            "end_time",
            "total_marks",
            "passing_marks",
            "exam_room",
            "instructions",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields

    def get_academic_year_name(self, obj):
        academic_year = getattr(obj, "academic_year", None)
        return getattr(academic_year, "year_name", "") if academic_year else ""


class ExamScheduleCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    academic_year_id = serializers.IntegerField(required=False)
    exam_id = serializers.IntegerField(required=True)
    class_details_id = serializers.IntegerField(required=True)
    section_details_id = serializers.IntegerField(
        required=False, allow_null=True)
    subject_id = serializers.IntegerField(required=False)
    exam_date = serializers.DateField(required=False)
    subject_schedules = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
        default=list,
    )
    start_time = serializers.TimeField(required=False, allow_null=True)
    end_time = serializers.TimeField(required=False, allow_null=True)
    total_marks = serializers.IntegerField(required=False)
    passing_marks = serializers.IntegerField(required=False)
    exam_room = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True)
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "exam_id" not in incoming and "examId" in incoming:
            incoming["exam_id"] = incoming.get("examId")
        if "academic_year_id" not in incoming and "academicYearId" in incoming:
            incoming["academic_year_id"] = incoming.get("academicYearId")
        if "academic_year_id" not in incoming and "academic_year" in incoming:
            incoming["academic_year_id"] = incoming.get("academic_year")
        if "academic_year_id" in incoming and incoming.get("academic_year_id") in ("", None):
            incoming["academic_year_id"] = None
        if "class_details_id" not in incoming and "classDetailsId" in incoming:
            incoming["class_details_id"] = incoming.get("classDetailsId")
        if "section_details_id" not in incoming and "sectionDetailsId" in incoming:
            incoming["section_details_id"] = incoming.get("sectionDetailsId")
        if "section_details_id" in incoming and incoming.get("section_details_id") in ("", None):
            incoming["section_details_id"] = None
        if "subject_id" not in incoming and "subjectId" in incoming:
            incoming["subject_id"] = incoming.get("subjectId")
        if "exam_date" not in incoming and "examDate" in incoming:
            incoming["exam_date"] = incoming.get("examDate")
        if "subject_schedules" not in incoming and "subjectSchedules" in incoming:
            incoming["subject_schedules"] = incoming.get("subjectSchedules")
        if "start_time" not in incoming and "startTime" in incoming:
            incoming["start_time"] = incoming.get("startTime")
        if "end_time" not in incoming and "endTime" in incoming:
            incoming["end_time"] = incoming.get("endTime")
        if "start_time" in incoming and incoming.get("start_time") in ("", None):
            incoming["start_time"] = None
        if "end_time" in incoming and incoming.get("end_time") in ("", None):
            incoming["end_time"] = None
        if "total_marks" not in incoming and "totalMarks" in incoming:
            incoming["total_marks"] = incoming.get("totalMarks")
        if "passing_marks" not in incoming and "passingMarks" in incoming:
            incoming["passing_marks"] = incoming.get("passingMarks")
        if "exam_room" not in incoming and "examRoom" in incoming:
            incoming["exam_room"] = incoming.get("examRoom")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        return super().to_internal_value(incoming)

    def validate(self, attrs):
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        if start_time is not None and end_time is not None and end_time <= start_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be greater than start time."}
            )

        subject_schedules = attrs.get("subject_schedules") or []
        if not subject_schedules:
            subject_id = attrs.get("subject_id")
            exam_date = attrs.get("exam_date")
            if subject_id is None or exam_date is None:
                raise serializers.ValidationError(
                    {
                        "subject_schedules": (
                            "Provide at least one subject schedule or the legacy "
                            "subject_id and exam_date fields."
                        )
                    }
                )
            subject_schedules = [
                {
                    "subject_id": subject_id,
                    "subject_name": "",
                    "exam_date": exam_date,
                }
            ]

        normalized_subject_schedules = []
        for index, entry in enumerate(subject_schedules):
            if not isinstance(entry, dict):
                raise serializers.ValidationError(
                    {
                        "subject_schedules": (
                            f"Each subject schedule must be an object. Invalid entry at index {index}."
                        )
                    }
                )

            raw_subject_id = (
                entry.get("subject_id")
                or entry.get("subjectId")
                or entry.get("subject", {}).get("id")
            )
            raw_exam_date = entry.get("exam_date") or entry.get("examDate")
            raw_subject_name = (
                entry.get("subject_name")
                or entry.get("subjectName")
                or entry.get("subject", {}).get("subject_name")
                or ""
            )
            normalized_entry = {
                "subject_id": raw_subject_id,
                "subject_name": str(raw_subject_name).strip(),
                "exam_date": raw_exam_date,
            }

            if normalized_entry["subject_id"] in ("", None):
                raise serializers.ValidationError(
                    {
                        "subject_schedules": (
                            f"Missing subject_id in subject_schedules entry at index {index}."
                        )
                    }
                )
            if normalized_entry["exam_date"] in ("", None):
                raise serializers.ValidationError(
                    {
                        "subject_schedules": (
                            f"Missing exam_date in subject_schedules entry at index {index}."
                        )
                    }
                )

            normalized_subject_schedules.append(normalized_entry)

        attrs["subject_schedules"] = normalized_subject_schedules
        attrs["subject_id"] = normalized_subject_schedules[0]["subject_id"]
        attrs["exam_date"] = normalized_subject_schedules[0]["exam_date"]
        return attrs


class ClassListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassList
        fields = [
            "id",
            "class_name",
            "subject",
            "company_id",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields


class ClassListCreateSerializer(serializers.Serializer):
    class_name = serializers.CharField(
        max_length=50, required=True, allow_blank=False)
    subject = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        default=list,
    )
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "class_name" not in incoming and "className" in incoming:
            incoming["class_name"] = incoming.get("className")
        if "subject" not in incoming and "subjectIds" in incoming:
            incoming["subject"] = incoming.get("subjectIds")
        if "subject" not in incoming and "subject_ids" in incoming:
            incoming["subject"] = incoming.get("subject_ids")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        return super().to_internal_value(incoming)


class ClassFeeStructureSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(
        source="class_details.class_name",
        read_only=True,
    )
    academic_year_name = serializers.CharField(
        source="academic_year.year_name",
        read_only=True,
        allow_null=True,
    )
    # frequency_display = serializers.CharField(
    #     source="get_frequency_display",
    #     read_only=True,
    # )

    class Meta:
        model = ClassFeeStructure
        fields = [
            "id",
            "company_id",
            "class_details_id",
            "class_name",
            "academic_year_id",
            "academic_year_name",
            "admission_fee",
            "tuition_fee",
            "exam_fee",
            "annual_charge",
            "total_fees",
            # "frequency",
            # "frequency_display",
            "is_active",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields


class ClassFeeStructureCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    class_details_id = serializers.IntegerField(required=True)
    academic_year_id = serializers.IntegerField(
        required=False, allow_null=True)
    admission_fee = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=0, default=0
    )
    tuition_fee = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=0, default=0
    )
    exam_fee = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=0, default=0
    )
    annual_charge = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=0, default=0
    )
    total_fees = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=0
    )
    # frequency = serializers.ChoiceField(
    #     choices=ClassFeeStructure._meta.get_field("frequency").choices,
    #     required=False,
    #     default="monthly",
    # )
    is_active = serializers.BooleanField(required=False, default=True)
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "class_details_id" not in incoming and "classDetailsId" in incoming:
            incoming["class_details_id"] = incoming.get("classDetailsId")
        if "class_details_id" not in incoming and "classId" in incoming:
            incoming["class_details_id"] = incoming.get("classId")
        if "academic_year_id" not in incoming and "academicYearId" in incoming:
            incoming["academic_year_id"] = incoming.get("academicYearId")
        if "academic_year_id" in incoming and incoming.get("academic_year_id") in ("", None):
            incoming["academic_year_id"] = None
        if "admission_fee" not in incoming and "admissionFee" in incoming:
            incoming["admission_fee"] = incoming.get("admissionFee")
        if "tuition_fee" not in incoming and "tuitionFee" in incoming:
            incoming["tuition_fee"] = incoming.get("tuitionFee")
        if "exam_fee" not in incoming and "examFee" in incoming:
            incoming["exam_fee"] = incoming.get("examFee")
        if "exam_fee" not in incoming and "caution_money" in incoming:
            incoming["exam_fee"] = incoming.get("caution_money")
        if "exam_fee" not in incoming and "cautionMoney" in incoming:
            incoming["exam_fee"] = incoming.get("cautionMoney")
        if "annual_charge" not in incoming and "annualCharge" in incoming:
            incoming["annual_charge"] = incoming.get("annualCharge")
        if "total_fees" not in incoming and "totalFees" in incoming:
            incoming["total_fees"] = incoming.get("totalFees")
        if "is_active" not in incoming and "isActive" in incoming:
            incoming["is_active"] = incoming.get("isActive")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        return super().to_internal_value(incoming)

    def validate(self, attrs):
        admission_fee = attrs.get("admission_fee", 0)
        tuition_fee = attrs.get("tuition_fee", 0)
        exam_fee = attrs.get("exam_fee", 0)
        annual_charge = attrs.get("annual_charge", 0)
        attrs["total_fees"] = admission_fee + \
            tuition_fee + exam_fee + annual_charge
        return attrs


class SectionListSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(
        source="class_details.class_name", read_only=True)

    class Meta:
        model = SectionList
        fields = [
            "id",
            "company_id",
            "class_details_id",
            "class_name",
            "section",
            "num_of_stud",
        ]
        read_only_fields = fields


class SectionListCreateSerializer(serializers.Serializer):
    class_details_id = serializers.IntegerField(required=True)
    section = serializers.ChoiceField(
        choices=["A", "B", "C", "D"], required=True)
    num_of_stud = serializers.IntegerField(
        required=False, allow_null=True, min_value=1)
    company_id = serializers.IntegerField(required=False)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "class_details_id" not in incoming and "class_details" in incoming:
            incoming["class_details_id"] = incoming.get("class_details")
        if "class_details_id" not in incoming and "classDetailsId" in incoming:
            incoming["class_details_id"] = incoming.get("classDetailsId")
        if "num_of_stud" not in incoming and "numOfStud" in incoming:
            incoming["num_of_stud"] = incoming.get("numOfStud")
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        return super().to_internal_value(incoming)


class SubjectListSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectList
        fields = [
            "id",
            "subject_name",
            "subject_initial",
            "company_id",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields


class SubjectListCreateSerializer(serializers.Serializer):
    subject_name = serializers.CharField(
        max_length=50, required=True, allow_blank=False)
    subject_initial = serializers.CharField(
        max_length=50, required=True, allow_blank=False)
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    company_id = serializers.IntegerField(required=False)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "subject_name" not in incoming and "subjectName" in incoming:
            incoming["subject_name"] = incoming.get("subjectName")
        if "subject_initial" not in incoming and "subjectInitial" in incoming:
            incoming["subject_initial"] = incoming.get("subjectInitial")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        return super().to_internal_value(incoming)


class TeacherListSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherList
        fields = [
            "id",
            "company_id",
            "name",
            "username",
            "mobile",
            "email",
            "dob",
            "is_head_master",
            "qualification",
            "experience",
            "address",
            "state",
            "city",
            "pin",
            "attachment_id",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields


class TeacherListCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    name = serializers.CharField(
        max_length=50, required=True, allow_blank=False)
    username = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    role = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    mobile = serializers.CharField(
        max_length=100, required=True, allow_blank=False)
    email = serializers.EmailField(
        max_length=60, required=False, allow_blank=True)
    is_verified = serializers.BooleanField(required=False, default=False)
    is_head_master = serializers.BooleanField(required=False, default=False)
    password = serializers.CharField(
        max_length=128, required=False, allow_blank=True, write_only=True)
    dob = serializers.DateTimeField(required=False, allow_null=True)
    qualification = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    experience = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    address = serializers.CharField(
        max_length=255, required=False, allow_blank=True)
    country = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    city = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    pin = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    attachment_id = serializers.IntegerField(required=False, allow_null=True)
    main_subject = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        default=list,
    )
    others_subject = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        default=list,
    )
    preferableClass = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        default=list,
    )
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "attachment_id" not in incoming and "attachmentId" in incoming:
            incoming["attachment_id"] = incoming.get("attachmentId")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        if "is_head_master" not in incoming and "isHeadMaster" in incoming:
            incoming["is_head_master"] = incoming.get("isHeadMaster")
        if "main_subject" not in incoming and "mainSubject" in incoming:
            incoming["main_subject"] = incoming.get("mainSubject")
        if "others_subject" not in incoming and "othersSubject" in incoming:
            incoming["others_subject"] = incoming.get("othersSubject")
        if "preferableClass" not in incoming and "preferable_class" in incoming:
            incoming["preferableClass"] = incoming.get("preferable_class")
        if "preferableClass" not in incoming and "preferableclass" in incoming:
            incoming["preferableClass"] = incoming.get("preferableclass")
        if "preferableClass" not in incoming and "preferableClassIds" in incoming:
            incoming["preferableClass"] = incoming.get("preferableClassIds")
        if "password" not in incoming:
            incoming["password"] = "abc123"
        return super().to_internal_value(incoming)


class NonTeachingListCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    name = serializers.CharField(
        max_length=50, required=True, allow_blank=False)
    username = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    role = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    job_title = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    mobile = serializers.CharField(
        max_length=100, required=True, allow_blank=False)
    email = serializers.EmailField(
        max_length=60, required=False, allow_blank=True)
    is_verified = serializers.BooleanField(required=False, default=False)
    is_head_master = serializers.BooleanField(required=False, default=False)
    password = serializers.CharField(
        max_length=128, required=False, allow_blank=True, write_only=True)
    dob = serializers.DateTimeField(required=False, allow_null=True)
    qualification = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    experience = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    address = serializers.CharField(
        max_length=255, required=False, allow_blank=True)
    country = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    city = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    pin = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    attachment_id = serializers.IntegerField(required=False, allow_null=True)
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "attachment_id" not in incoming and "attachmentId" in incoming:
            incoming["attachment_id"] = incoming.get("attachmentId")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        if "is_head_master" not in incoming and "isHeadMaster" in incoming:
            incoming["is_head_master"] = incoming.get("isHeadMaster")
        if "is_verified" not in incoming and "isVerified" in incoming:
            incoming["is_verified"] = incoming.get("isVerified")
        if "job_title" not in incoming and "jobTitle" in incoming:
            incoming["job_title"] = incoming.get("jobTitle")
        if "password" not in incoming:
            incoming["password"] = "abc123"
        return super().to_internal_value(incoming)


class StudentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentList
        fields = [
            "id",
            "company_id",
            "name",
            "username",
            "mobile",
            "email",
            "dob",
            "guardian_name",
            "address",
            "country",
            "state",
            "city",
            "pin",
            "attachment_id",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields


class StudentListCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    name = serializers.CharField(
        max_length=50, required=True, allow_blank=False)
    username = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    role = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    mobile = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(
        max_length=60, required=False, allow_blank=True)
    is_verified = serializers.BooleanField(required=False, default=False)
    password = serializers.CharField(
        max_length=128, required=False, allow_blank=True, write_only=True)
    dob = serializers.DateField(required=False, allow_null=True)
    guardian_name = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    address = serializers.CharField(
        max_length=255, required=False, allow_blank=True)
    country = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    city = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    pin = serializers.CharField(
        max_length=50, required=False, allow_blank=True)
    attachment_id = serializers.IntegerField(required=False, allow_null=True)
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "guardian_name" not in incoming and "guardianName" in incoming:
            incoming["guardian_name"] = incoming.get("guardianName")
        if "attachment_id" not in incoming and "attachmentId" in incoming:
            incoming["attachment_id"] = incoming.get("attachmentId")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        if "is_verified" not in incoming and "isVerified" in incoming:
            incoming["is_verified"] = incoming.get("isVerified")
        if "password" not in incoming:
            incoming["password"] = "abc123"
        return super().to_internal_value(incoming)


class StudentAcademicRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    student_guardian_name = serializers.CharField(
        source="student.guardian_name",
        read_only=True,
    )
    academic_year_name = serializers.CharField(
        source="academic_year.year_name", read_only=True)
    class_name = serializers.CharField(
        source="class_details.class_name", read_only=True)
    section_name = serializers.CharField(
        source="section_details.section", read_only=True)
    student_company_user_id = serializers.SerializerMethodField()

    def get_student_company_user_id(self, obj):
        student = getattr(obj, "student", None)
        if not student:
            return None

        username = (getattr(student, "username", "") or "").strip()
        email = (getattr(student, "email", "") or "").strip().lower()
        mobile = (getattr(student, "mobile", "") or "").strip()

        base_queryset = CompanyUser.objects.filter(
            company_id=obj.company_id,
            delist=False,
            role__iexact="student",
        )

        if username:
            matched = base_queryset.filter(username__iexact=username).first()
            if matched:
                return matched.id
        if email:
            matched = base_queryset.filter(email__iexact=email).first()
            if matched:
                return matched.id
        if mobile:
            matched = base_queryset.filter(mobile=mobile).first()
            if matched:
                return matched.id
        return None

    class Meta:
        model = StudentAcademicRecord
        fields = [
            "id",
            "company_id",
            "student_id",
            "student_company_user_id",
            "student_name",
            "student_guardian_name",
            "academic_year_id",
            "academic_year_name",
            "class_details_id",
            "class_name",
            "section_details_id",
            "section_name",
            "roll_number",
            "admission_date",
            "status",
            "remarks",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields


class StudentAcademicRecordCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    student_id = serializers.IntegerField(required=True)
    academic_year_id = serializers.IntegerField(required=True)
    class_details_id = serializers.IntegerField(required=True)
    section_details_id = serializers.IntegerField(required=True)
    roll_number = serializers.CharField(
        max_length=30, required=False, allow_blank=True)
    admission_date = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=StudentAcademicRecord._meta.get_field("status").choices,
        required=True,
    )
    remarks = serializers.CharField(required=False, allow_blank=True)
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "student_id" not in incoming and "student" in incoming:
            incoming["student_id"] = incoming.get("student")
        if "student_id" not in incoming and "studentId" in incoming:
            incoming["student_id"] = incoming.get("studentId")
        if "academic_year_id" not in incoming and "academic_year" in incoming:
            incoming["academic_year_id"] = incoming.get("academic_year")
        if "academic_year_id" not in incoming and "academicYear" in incoming:
            incoming["academic_year_id"] = incoming.get("academicYear")
        if "academic_year_id" not in incoming and "academicYearId" in incoming:
            incoming["academic_year_id"] = incoming.get("academicYearId")
        if "class_details_id" not in incoming and "class_details" in incoming:
            incoming["class_details_id"] = incoming.get("class_details")
        if "class_details_id" not in incoming and "classDetails" in incoming:
            incoming["class_details_id"] = incoming.get("classDetails")
        if "class_details_id" not in incoming and "classDetailsId" in incoming:
            incoming["class_details_id"] = incoming.get("classDetailsId")
        if "section_details_id" not in incoming and "section_details" in incoming:
            incoming["section_details_id"] = incoming.get("section_details")
        if "section_details_id" not in incoming and "sectionDetails" in incoming:
            incoming["section_details_id"] = incoming.get("sectionDetails")
        if "section_details_id" not in incoming and "sectionDetailsId" in incoming:
            incoming["section_details_id"] = incoming.get("sectionDetailsId")
        if "roll_number" not in incoming and "rollNumber" in incoming:
            incoming["roll_number"] = incoming.get("rollNumber")
        if "admission_date" not in incoming and "admissionDate" in incoming:
            incoming["admission_date"] = incoming.get("admissionDate")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        return super().to_internal_value(incoming)


class StudentFeesCollectionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="student_academic_rcord.student.name",
        read_only=True,
    )
    academic_year_name = serializers.CharField(
        source="academic_year.year_name",
        read_only=True,
    )
    class_name = serializers.CharField(
        source="class_details.class_name",
        read_only=True,
    )
    section_name = serializers.CharField(
        source="student_academic_rcord.section_details.section",
        read_only=True,
        allow_null=True,
    )
    roll_number = serializers.CharField(
        source="student_academic_rcord.roll_number",
        read_only=True,
        allow_null=True,
    )
    installment_name_display = serializers.CharField(
        source="get_installment_name_display",
        read_only=True,
    )
    payment_mode_display = serializers.CharField(
        source="get_payment_mode_display",
        read_only=True,
    )
    status_display = serializers.SerializerMethodField()
    fee_structure_total_fees = serializers.DecimalField(
        source="fee_structure.total_fees",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = StudentFeesCollection
        fields = [
            "id",
            "company_id",
            "student_academic_rcord_id",
            "student_name",
            "academic_year_id",
            "academic_year_name",
            "class_details_id",
            "class_name",
            "section_name",
            "roll_number",
            "fee_structure_id",
            "fee_structure_total_fees",
            "installment_name",
            "installment_name_display",
            "due_date",
            "total_amount",
            "paid_amount",
            "due_amount",
            "payment_date",
            "payment_mode",
            "payment_mode_display",
            "transaction_id",
            "status",
            "status_display",
            "remarks",
            "delist",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields

    def get_status_display(self, obj):
        normalized_status = str(getattr(obj, "status", "")).strip().lower()
        if normalized_status in {"fully_paid", "paid"}:
            return "Fully Paid"
        if normalized_status == "partial":
            return "Partially Paid"
        if normalized_status == "pending":
            return "Pending"
        if normalized_status == "overdue":
            return "Overdue"
        return str(getattr(obj, "get_status_display", lambda: "")() or normalized_status or "-")


class StudentFeesCollectionCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    student_academic_rcord_id = serializers.IntegerField(required=True)
    fee_structure_id = serializers.IntegerField(required=True)
    installment_name = serializers.ChoiceField(
        choices=StudentFeesCollection._meta.get_field("installment_name").choices,
        required=False,
        default="monthly",
    )
    due_date = serializers.DateField(required=False, allow_null=True)
    total_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=0
    )
    paid_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=0, default=0
    )
    payment_date = serializers.DateField(required=False, allow_null=True)
    payment_mode = serializers.ChoiceField(
        choices=StudentFeesCollection._meta.get_field("payment_mode").choices,
        required=False,
        allow_null=True,
    )
    transaction_id = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    remarks = serializers.CharField(required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "student_academic_rcord_id" not in incoming and "studentAcademicRecordId" in incoming:
            incoming["student_academic_rcord_id"] = incoming.get("studentAcademicRecordId")
        if "student_academic_rcord_id" not in incoming and "student_academic_record_id" in incoming:
            incoming["student_academic_rcord_id"] = incoming.get("student_academic_record_id")
        if "student_academic_rcord_id" not in incoming and "student_academic_rcord" in incoming:
            incoming["student_academic_rcord_id"] = incoming.get("student_academic_rcord")
        if "fee_structure_id" not in incoming and "feeStructureId" in incoming:
            incoming["fee_structure_id"] = incoming.get("feeStructureId")
        if "fee_structure_id" not in incoming and "fee_structure" in incoming:
            incoming["fee_structure_id"] = incoming.get("fee_structure")
        if "installment_name" not in incoming and "installmentName" in incoming:
            incoming["installment_name"] = incoming.get("installmentName")
        if "due_date" not in incoming and "dueDate" in incoming:
            incoming["due_date"] = incoming.get("dueDate")
        if "paid_amount" not in incoming and "paidAmount" in incoming:
            incoming["paid_amount"] = incoming.get("paidAmount")
        if "total_amount" not in incoming and "totalAmount" in incoming:
            incoming["total_amount"] = incoming.get("totalAmount")
        if "payment_date" not in incoming and "paymentDate" in incoming:
            incoming["payment_date"] = incoming.get("paymentDate")
        if "payment_mode" not in incoming and "paymentMode" in incoming:
            incoming["payment_mode"] = incoming.get("paymentMode")
        if "payment_mode" in incoming and incoming.get("payment_mode") in ("", None):
            incoming["payment_mode"] = None
        if "transaction_id" not in incoming and "transactionId" in incoming:
            incoming["transaction_id"] = incoming.get("transactionId")
        return super().to_internal_value(incoming)


class StudentsMarkSerializer(serializers.ModelSerializer):
    academic_year_id = serializers.SerializerMethodField()
    academic_year_name = serializers.SerializerMethodField()
    student_name = serializers.CharField(
        source="student_record.student.name", read_only=True)
    class_name = serializers.CharField(
        source="class_details.class_name", read_only=True)
    section_name = serializers.CharField(
        source="section_details.section", read_only=True)
    exam_name = serializers.CharField(
        source="exam_schedule.exam.exam_name", read_only=True)
    subject_name = serializers.CharField(
        source="subject.subject_name", read_only=True)
    student_roll_number = serializers.CharField(
        source="student_record.roll_number", read_only=True)
    subject_marks_items = serializers.SerializerMethodField()
    subject_marks_count = serializers.SerializerMethodField()

    def _extract_entries(self, value):
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            if "subject" in value and "marks_obtained" in value:
                subject_name = str(value.get("subject") or "").strip()
                if subject_name:
                    return [{
                        "subject": subject_name,
                        "marks_obtained": value.get("marks_obtained"),
                        "grade": str(value.get("grade") or "").strip(),
                        "total_marks": value.get("total_marks"),
                    }]
            reserved_keys = {"entries", "subjects", "items", "marks"}
            mapped_entries = [
                {
                    "subject": str(key),
                    "marks_obtained": val.get("marks_obtained") if isinstance(val, dict) else val,
                    "grade": str(val.get("grade") or "").strip() if isinstance(val, dict) else "",
                    "total_marks": val.get("total_marks") if isinstance(val, dict) else None,
                }
                for key, val in value.items()
                if key not in reserved_keys
            ]
            if mapped_entries:
                return mapped_entries
            for key in ("entries", "subjects", "items", "marks"):
                nested = value.get(key)
                if isinstance(nested, list):
                    return nested
        return []

    def get_subject_marks_items(self, obj):
        return self._extract_entries(getattr(obj, "subject_marks", None))

    def get_subject_marks_count(self, obj):
        return len(self.get_subject_marks_items(obj))

    def _resolve_academic_year(self, obj):
        academic_year = getattr(obj, "academic_year", None)
        if academic_year:
            return academic_year

        exam_schedule = getattr(obj, "exam_schedule", None)
        exam = getattr(exam_schedule, "exam", None) if exam_schedule else None
        academic_year = getattr(exam, "academic_year", None)
        if academic_year:
            return academic_year

        student_record = getattr(obj, "student_record", None)
        academic_year = getattr(
            student_record, "academic_year", None) if student_record else None
        if academic_year:
            return academic_year

        return None

    def get_academic_year_id(self, obj):
        academic_year = self._resolve_academic_year(obj)
        return getattr(academic_year, "id", None)

    def get_academic_year_name(self, obj):
        academic_year = self._resolve_academic_year(obj)
        return getattr(academic_year, "year_name", "") or ""

    class Meta:
        model = StudentsMark
        fields = [
            "id",
            "company_id",
            "academic_year_id",
            "academic_year_name",
            "class_details_id",
            "class_name",
            "section_details_id",
            "section_name",
            "student_record_id",
            "student_name",
            "student_roll_number",
            "exam_schedule_id",
            "exam_name",
            "subject_id",
            "subject_name",
            "subject_marks",
            "subject_marks_items",
            "subject_marks_count",
            "max_marks",
            "passing_marks",
            "marks_obtained",
            "practical_marks",
            "internal_marks",
            "grade",
            "is_absent",
            "is_pass",
            "remarks",
            "created_by",
            "created_on",
            "updated_by",
            "updated_on",
        ]
        read_only_fields = fields


class StudentsMarkCreateSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False)
    academic_year_id = serializers.IntegerField(
        required=False, allow_null=True)
    student_record_id = serializers.IntegerField(required=True)
    exam_schedule_id = serializers.IntegerField(required=True)
    subject_id = serializers.IntegerField(required=True)
    max_marks = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False)
    passing_marks = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False)
    marks_obtained = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False)
    practical_marks = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True)
    internal_marks = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True)
    grade = serializers.CharField(
        max_length=10, required=False, allow_blank=True)
    is_absent = serializers.BooleanField(required=False, default=False)
    is_pass = serializers.BooleanField(required=False, default=True)
    remarks = serializers.CharField(required=False, allow_blank=True)
    subject_marks = serializers.JSONField(required=False)
    created_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    updated_by = serializers.CharField(
        max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        incoming = dict(data)
        if "company_id" not in incoming and "companyId" in incoming:
            incoming["company_id"] = incoming.get("companyId")
        if "academic_year_id" not in incoming and "academicYearId" in incoming:
            incoming["academic_year_id"] = incoming.get("academicYearId")
        if "academic_year_id" not in incoming and "academicYear" in incoming:
            incoming["academic_year_id"] = incoming.get("academicYear")
        if "academic_year_id" not in incoming and "academic_year" in incoming:
            incoming["academic_year_id"] = incoming.get("academic_year")
        if "student_record_id" not in incoming and "studentRecordId" in incoming:
            incoming["student_record_id"] = incoming.get("studentRecordId")
        if "exam_schedule_id" not in incoming and "examScheduleId" in incoming:
            incoming["exam_schedule_id"] = incoming.get("examScheduleId")
        if "subject_id" not in incoming and "subjectId" in incoming:
            incoming["subject_id"] = incoming.get("subjectId")
        if "max_marks" not in incoming and "maxMarks" in incoming:
            incoming["max_marks"] = incoming.get("maxMarks")
        if "passing_marks" not in incoming and "passingMarks" in incoming:
            incoming["passing_marks"] = incoming.get("passingMarks")
        if "marks_obtained" not in incoming and "marksObtained" in incoming:
            incoming["marks_obtained"] = incoming.get("marksObtained")
        if "practical_marks" not in incoming and "practicalMarks" in incoming:
            incoming["practical_marks"] = incoming.get("practicalMarks")
        if "internal_marks" not in incoming and "internalMarks" in incoming:
            incoming["internal_marks"] = incoming.get("internalMarks")
        if "is_absent" not in incoming and "isAbsent" in incoming:
            incoming["is_absent"] = incoming.get("isAbsent")
        if "is_pass" not in incoming and "isPass" in incoming:
            incoming["is_pass"] = incoming.get("isPass")
        if "subject_marks" not in incoming and "subjectMarks" in incoming:
            incoming["subject_marks"] = incoming.get("subjectMarks")
        if "created_by" not in incoming and "createdBy" in incoming:
            incoming["created_by"] = incoming.get("createdBy")
        if "updated_by" not in incoming and "updatedBy" in incoming:
            incoming["updated_by"] = incoming.get("updatedBy")
        return super().to_internal_value(incoming)
