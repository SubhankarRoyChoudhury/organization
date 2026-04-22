from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from company_account.models import Companies, CompanyUser

from .models import Appointment, Billing, Patient, Prescription
from .serializers import (
    AppointmentSerializer,
    BillingSerializer,
    DoctorManageSerializer,
    DoctorSerializer,
    PatientSerializer,
    PrescriptionSerializer,
    with_doctor_counts,
    with_patient_counts,
)


def require_company(request):
    body_company_ref = None
    if hasattr(request.data, "get"):
        body_company_ref = request.data.get("company_id") or request.data.get("company")
    company_ref = request.query_params.get("company_id") or body_company_ref
    if isinstance(company_ref, dict):
        company_ref = company_ref.get("id")
    if company_ref in (None, "", []):
        raise ValidationError(
            {"company_id": "company_id query param or company field is required."}
        )
    try:
        company_id = int(company_ref)
    except (TypeError, ValueError):
        raise ValidationError({"company_id": "company_id must be an integer."})
    try:
        return Companies.objects.get(id=company_id)
    except Companies.DoesNotExist as exc:
        raise ValidationError({"company_id": "Companies not found."}) from exc


class CompanyScopedAPIView(APIView):
    permission_classes = [AllowAny]
    model = None
    serializer_class = None
    queryset = None
    search_fields = ()

    def get_company(self, request):
        return require_company(request)

    def get_queryset(self, company):
        if self.queryset is None:
            return self.model.objects.filter(company=company, delist=False)
        return self.queryset(company)

    def get_object(self, company, pk):
        return self.get_queryset(company).filter(pk=pk).first()

    def get_serializer_context(self, company):
        return {"company": company}

    def apply_search(self, queryset, search):
        if not search or not self.search_fields:
            return queryset
        query = Q()
        for field in self.search_fields:
            query |= Q(**{f"{field}__icontains": search})
        return queryset.filter(query)


class PatientListCreateView(CompanyScopedAPIView):
    model = Patient
    serializer_class = PatientSerializer
    search_fields = ("full_name", "patient_id", "email", "phone_number")

    def get_queryset(self, company):
        return with_patient_counts(super().get_queryset(company))

    def get(self, request):
        company = self.get_company(request)
        queryset = self.apply_search(
            self.get_queryset(company),
            request.query_params.get("search"),
        ).order_by("full_name", "-id")
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        company = self.get_company(request)
        data = request.data.copy()
        data["company"] = company.id
        # Patient creation is intentionally standalone. Ignore any submitted
        # user_account so this endpoint never provisions or links a CompanyUser
        # during patient onboarding.
        data.pop("user_account", None)
        data.pop("billing_status", None)
        serializer = self.serializer_class(
            data=data,
            context=self.get_serializer_context(company),
        )
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PatientDetailView(CompanyScopedAPIView):
    model = Patient
    serializer_class = PatientSerializer

    def get_queryset(self, company):
        return with_patient_counts(super().get_queryset(company))

    def get(self, request, pk):
        company = self.get_company(request)
        patient = self.get_object(company, pk)
        if not patient:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(patient)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        company = self.get_company(request)
        patient = self.get_object(company, pk)
        if not patient:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
        data = request.data.copy()
        data["company"] = company.id
        data.pop("billing_status", None)
        serializer = self.serializer_class(
            patient,
            data=data,
            partial=True,
            context=self.get_serializer_context(company),
        )
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        company = self.get_company(request)
        patient = self.get_object(company, pk)
        if not patient:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
        patient.delist = True
        patient.delisted_on = timezone.now()
        patient.save(update_fields=["delist", "delisted_on", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class DoctorListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        company = require_company(request)
        search = (request.query_params.get("search") or "").strip()
        queryset = with_doctor_counts(
            CompanyUser.objects.filter(
                company=company,
                role__iexact="doctor",
                delist=False,
            ).select_related("doctor_type", "department")
        ).order_by("name", "id")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(mobile__icontains=search)
                | Q(doctor_type__name__icontains=search)
                | Q(department__name__icontains=search)
            )
        serializer = DoctorSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        company = require_company(request)
        data = request.data.copy()
        data["company"] = company.id
        serializer = DoctorManageSerializer(data=data, context={"company": company})
        if serializer.is_valid():
            doctor = serializer.save(company=company)
            response_serializer = DoctorSerializer(
                with_doctor_counts(
                    CompanyUser.objects.filter(pk=doctor.pk).select_related(
                        "doctor_type", "department"
                    )
                ).first()
            )
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DoctorDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        company = require_company(request)
        doctor = with_doctor_counts(
            CompanyUser.objects.filter(
                company=company,
                role__iexact="doctor",
                delist=False,
                pk=pk,
            ).select_related("doctor_type", "department")
        ).first()
        if not doctor:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DoctorSerializer(doctor)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        company = require_company(request)
        doctor = CompanyUser.objects.filter(
            company=company,
            role__iexact="doctor",
            delist=False,
            pk=pk,
        ).first()
        if not doctor:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)
        data = request.data.copy()
        data["company"] = company.id
        serializer = DoctorManageSerializer(
            doctor,
            data=data,
            partial=True,
            context={"company": company},
        )
        if serializer.is_valid():
            serializer.save()
            response_serializer = DoctorSerializer(
                with_doctor_counts(
                    CompanyUser.objects.filter(pk=doctor.pk).select_related(
                        "doctor_type", "department"
                    )
                ).first()
            )
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        company = require_company(request)
        doctor = CompanyUser.objects.filter(
            company=company,
            role__iexact="doctor",
            delist=False,
            pk=pk,
        ).first()
        if not doctor:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)
        doctor.delist = True
        doctor.delisted_on = timezone.now()
        doctor.save(update_fields=["delist", "delisted_on", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AppointmentListCreateView(CompanyScopedAPIView):
    model = Appointment
    serializer_class = AppointmentSerializer
    search_fields = ("appointment_id", "patient__full_name", "doctor__name", "reason")

    def get_queryset(self, company):
        return (
            super()
            .get_queryset(company)
            .select_related("patient", "doctor", "prescription", "billing")
        )

    def get(self, request):
        company = self.get_company(request)
        queryset = self.apply_search(
            self.get_queryset(company),
            request.query_params.get("search"),
        ).order_by("-scheduled_for", "-id")
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        company = self.get_company(request)
        data = request.data.copy()
        data["company"] = company.id
        serializer = self.serializer_class(
            data=data,
            context=self.get_serializer_context(company),
        )
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AppointmentDetailView(CompanyScopedAPIView):
    model = Appointment
    serializer_class = AppointmentSerializer

    def get_queryset(self, company):
        return (
            super()
            .get_queryset(company)
            .select_related("patient", "doctor", "prescription", "billing")
        )

    def get(self, request, pk):
        company = self.get_company(request)
        appointment = self.get_object(company, pk)
        if not appointment:
            return Response({"detail": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(appointment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        company = self.get_company(request)
        appointment = self.get_object(company, pk)
        if not appointment:
            return Response({"detail": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)
        data = request.data.copy()
        data["company"] = company.id
        serializer = self.serializer_class(
            appointment,
            data=data,
            partial=True,
            context=self.get_serializer_context(company),
        )
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        company = self.get_company(request)
        appointment = self.get_object(company, pk)
        if not appointment:
            return Response({"detail": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)
        appointment.delist = True
        appointment.delisted_on = timezone.now()
        appointment.save(update_fields=["delist", "delisted_on", "updated_on"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PrescriptionListCreateView(CompanyScopedAPIView):
    model = Prescription
    serializer_class = PrescriptionSerializer
    search_fields = (
        "prescription_id",
        "appointment__appointment_id",
        "appointment__patient__full_name",
        "appointment__doctor__name",
    )

    def get_queryset(self, company):
        return (
            super()
            .get_queryset(company)
            .select_related("appointment", "appointment__patient", "appointment__doctor")
        )

    def get(self, request):
        company = self.get_company(request)
        queryset = self.apply_search(
            self.get_queryset(company),
            request.query_params.get("search"),
        ).order_by("-created_on", "-id")
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        company = self.get_company(request)
        data = request.data.copy()
        data["company"] = company.id
        serializer = self.serializer_class(
            data=data,
            context=self.get_serializer_context(company),
        )
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PrescriptionDetailView(CompanyScopedAPIView):
    model = Prescription
    serializer_class = PrescriptionSerializer

    def get_queryset(self, company):
        return (
            super()
            .get_queryset(company)
            .select_related("appointment", "appointment__patient", "appointment__doctor")
        )

    def get(self, request, pk):
        company = self.get_company(request)
        prescription = self.get_object(company, pk)
        if not prescription:
            return Response({"detail": "Prescription not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(prescription)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        company = self.get_company(request)
        prescription = self.get_object(company, pk)
        if not prescription:
            return Response({"detail": "Prescription not found."}, status=status.HTTP_404_NOT_FOUND)
        data = request.data.copy()
        data["company"] = company.id
        serializer = self.serializer_class(
            prescription,
            data=data,
            partial=True,
            context=self.get_serializer_context(company),
        )
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        company = self.get_company(request)
        prescription = self.get_object(company, pk)
        if not prescription:
            return Response({"detail": "Prescription not found."}, status=status.HTTP_404_NOT_FOUND)
        prescription.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BillingListCreateView(CompanyScopedAPIView):
    model = Billing
    serializer_class = BillingSerializer
    search_fields = (
        "billing_id",
        "appointment__appointment_id",
        "appointment__patient__full_name",
    )

    def get_queryset(self, company):
        return (
            super()
            .get_queryset(company)
            .select_related("appointment", "appointment__patient")
        )

    def get(self, request):
        company = self.get_company(request)
        queryset = self.apply_search(
            self.get_queryset(company),
            request.query_params.get("search"),
        ).order_by("-created_on", "-id")
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        company = self.get_company(request)
        data = request.data.copy()
        data["company"] = company.id
        serializer = self.serializer_class(
            data=data,
            context=self.get_serializer_context(company),
        )
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BillingDetailView(CompanyScopedAPIView):
    model = Billing
    serializer_class = BillingSerializer

    def get_queryset(self, company):
        return (
            super()
            .get_queryset(company)
            .select_related("appointment", "appointment__patient")
        )

    def get(self, request, pk):
        company = self.get_company(request)
        billing = self.get_object(company, pk)
        if not billing:
            return Response({"detail": "Billing not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(billing)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        company = self.get_company(request)
        billing = self.get_object(company, pk)
        if not billing:
            return Response({"detail": "Billing not found."}, status=status.HTTP_404_NOT_FOUND)
        data = request.data.copy()
        data["company"] = company.id
        serializer = self.serializer_class(
            billing,
            data=data,
            partial=True,
            context=self.get_serializer_context(company),
        )
        if serializer.is_valid():
            serializer.save(company=company)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        company = self.get_company(request)
        billing = self.get_object(company, pk)
        if not billing:
            return Response({"detail": "Billing not found."}, status=status.HTTP_404_NOT_FOUND)
        billing.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClinicDashboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        company = require_company(request)

        patients_qs = Patient.objects.filter(company=company, delist=False)
        doctors_qs = CompanyUser.objects.filter(
            company=company,
            role__iexact="doctor",
            delist=False,
        )
        appointments_qs = (
            Appointment.objects.filter(company=company, delist=False)
            .select_related("patient", "doctor", "billing", "prescription")
            .order_by("-scheduled_for", "-id")
        )
        billings_qs = Billing.objects.filter(company=company, delist=False)

        today = timezone.localdate()
        latest_appointments = appointments_qs[:5]
        active_doctors = with_doctor_counts(doctors_qs).filter(appointments_count__gt=0).count()
        appointments_today = appointments_qs.filter(scheduled_for__date=today).count()
        pending_billings = billings_qs.filter(status__in=["PENDING", "PARTIAL"]).count()
        billing_total = billings_qs.aggregate(total=Sum("total_amount")).get("total") or 0
        paid_total = billings_qs.aggregate(total=Sum("amount_paid")).get("total") or 0
        appointments_with_outputs = appointments_qs.filter(
            prescription__isnull=False,
            billing__isnull=False,
        ).count()

        overview = {
            "users": CompanyUser.objects.filter(company=company, delist=False).count(),
            "patients": patients_qs.count(),
            "doctors": doctors_qs.count(),
            "appointments_today": appointments_today,
        }
        highlights = {
            "appointments_with_outputs": appointments_with_outputs,
            "total_appointments": appointments_qs.count(),
            "pending_billing_follow_up": pending_billings,
            "active_doctors": active_doctors,
            "total_billed_amount": billing_total,
            "total_paid_amount": paid_total,
        }

        appointment_data = AppointmentSerializer(latest_appointments, many=True).data
        doctor_rows = with_doctor_counts(
            doctors_qs.select_related("doctor_type", "department").order_by("name", "id")
        )[:4]
        doctors_list = [
            {
                "id": doctor.id,
                "doctor_name": doctor.name,
                "subtitle": (
                    getattr(doctor.doctor_type, "name", None)
                    or getattr(doctor.department, "name", None)
                    or doctor.job_title
                    or "General Practice"
                ),
                "status": "Available" if doctor.is_active else "Absent",
            }
            for doctor in doctor_rows
        ]

        booked_appointments = [
            {
                "id": appointment.id,
                "appointment_id": appointment.appointment_id,
                "assigned_doctor": getattr(appointment.doctor, "name", "") or "Unassigned",
                "patient_name": getattr(appointment.patient, "full_name", "") or "-",
                "scheduled_for": appointment.scheduled_for,
                "disease": appointment.reason or "General checkup",
            }
            for appointment in latest_appointments[:4]
        ]

        survey_labels = []
        new_patients_series = []
        old_patients_series = []
        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            survey_labels.append(day.strftime("%d %b"))
            new_patients_series.append(
                patients_qs.filter(created_on__date=day).count()
            )
            old_patients_series.append(
                appointments_qs.filter(scheduled_for__date=day).count()
            )

        metrics = {
            "appointments": float(appointments_qs.count()),
            "operations": float(appointments_with_outputs),
            "new_patients": float(patients_qs.count()),
            "earning": float(paid_total),
        }
        return Response(
            {
                "metrics": metrics,
                "overview": overview,
                "highlights": highlights,
                "latest_appointments": appointment_data,
                "booked_appointments": booked_appointments,
                "doctors_list": doctors_list,
                "reports": {
                    "survey": {
                        "range_label": "Last 7 Days",
                        "labels": survey_labels,
                        "new_patients": new_patients_series,
                        "old_patients": old_patients_series,
                    },
                },
            },
            status=status.HTTP_200_OK,
        )
