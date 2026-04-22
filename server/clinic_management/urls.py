from django.urls import path

from . import views


urlpatterns = [
    path("dashboard/", views.ClinicDashboardView.as_view(), name="clinic-dashboard"),
    path("patients/", views.PatientListCreateView.as_view(), name="clinic-patient-list-create"),
    path("patients/<int:pk>/", views.PatientDetailView.as_view(), name="clinic-patient-detail"),
    path("doctors/", views.DoctorListView.as_view(), name="clinic-doctor-list"),
    path("doctors/<int:pk>/", views.DoctorDetailView.as_view(), name="clinic-doctor-detail"),
    path("appointments/", views.AppointmentListCreateView.as_view(), name="clinic-appointment-list-create"),
    path("appointments/<int:pk>/", views.AppointmentDetailView.as_view(), name="clinic-appointment-detail"),
    path("prescriptions/", views.PrescriptionListCreateView.as_view(), name="clinic-prescription-list-create"),
    path("prescriptions/<int:pk>/", views.PrescriptionDetailView.as_view(), name="clinic-prescription-detail"),
    path("billings/", views.BillingListCreateView.as_view(), name="clinic-billing-list-create"),
    path("billings/<int:pk>/", views.BillingDetailView.as_view(), name="clinic-billing-detail"),
]
