# urls.py

from django.urls import path
from hospital_management import views

urlpatterns = [
    # Company Urls
    path('companies/', views.CompanyListCreateView.as_view(), name='company-list-create'),
    path('companies/<int:pk>/', views.CompanyDetailView.as_view(), name='company-detail'),
    path(
        'faker/sidebar-seed/',
        views.HospitalSidebarFakerDataView.as_view(),
        name='hospital-sidebar-faker-seed',
    ),

    # Create Department and List API Url
    path('create_department/', views.DepartmentCreate.as_view(), name='create_department'),
    path('departments_list/', views.ApprovedDepartmentList.as_view(), name='approved-departments'),
    path('departments/<int:pk>/', views.DepartmentDetail.as_view(), name='department-detail'),

    # Create Staff Department and List API Url
    path('create_staff_department/', views.StaffDepartmentCreate.as_view(), name='create_staff_department'),
    path('staff_departments_list/', views.ApprovedStaffDepartmentList.as_view(), name='approved-staff-departments'),
    path('staff_departments/<int:pk>/', views.StaffDepartmentDetail.as_view(), name='staff-department-detail'),

    # Create Staff Job Title and List API Url
    path('create_staff_job_title/', views.StaffJobTitleCreate.as_view(), name='create_staff_job_title'),
    path('staff_job_titles_list/', views.ApprovedStaffJobTitleList.as_view(), name='approved-staff-job-titles'),
    path('staff_job_titles/<int:pk>/', views.StaffJobTitleDetail.as_view(), name='staff-job-title-detail'),
    
    # Create Doctor_Type and List API Url
    path('create_doctor_type/', views.DoctorTypeCreate.as_view(), name='create_doctor_type'),
    path('doctor_type_list/', views.ApprovedDoctorTypetList.as_view(), name='approved-doctortype'),
    path('doctor_type/<int:pk>/', views.DoctorTypeDetail.as_view(), name='doctor_type-detail'),
    
    # Create Administration_Type and List API Url
    path('create_administration_type/', views.AdministrationTypeCreate.as_view(), name='create_administration_type'),
    path('administrator_type_list/', views.ApprovedAdministratorTypetList.as_view(), name='approved-administratortype'),
    path('administrator_type/<int:pk>/', views.AdministrationTypeDetail.as_view(), name='administration_type-detail'),
    
    # Create Doctor, Doctor List and Doctor Approval API Url
    
    # path('create-doctor/', views.DoctorCreateAndGetView.as_view(), name='create-doctor'),
    path('create-doctor-with-schedule/', views.DoctorWithScheduleCreateView.as_view(), name='create-doctor-with-schedule'),   
    path('doctor-list/', views.DoctorList.as_view(), name='doctor-list'),
    path('doctor-list/by-opd/', views.ApprovedDoctorByOpdList.as_view(), name='doctor-list-by-opd'),
    path('doctor/<int:pk>/', views.DoctorDetail.as_view(), name='doctor-detail'),
    path('doctor/<int:doctor_id>/approve/', views.DoctorApprovalView.as_view(), name='doctor-approve'),
    path('opd-ticket-bookings/', views.OPDTicketBookingListCreateView.as_view(), name='opd-ticket-bookings'),
    path('opd-ticket-bookings/<int:pk>/', views.OPDTicketBookingDetailView.as_view(), name='opd-ticket-booking-detail'),
    path('emergency-visits/', views.EmergencyVisitListCreateView.as_view(), name='emergency-visit-list-create'),
    path('emergency-visits/<int:pk>/', views.EmergencyVisitDetailView.as_view(), name='emergency-visit-detail'),
    path('patients/', views.PatientListCreateView.as_view(), name='patient-list-create'),
    path('patients/<int:pk>/', views.PatientDetailView.as_view(), name='patient-detail'),
    path('wards/', views.WardListCreateView.as_view(), name='ward-list-create'),
    path('wards/<int:pk>/', views.WardDetailView.as_view(), name='ward-detail'),
    path('rooms/', views.RoomListCreateView.as_view(), name='room-list-create'),
    path('rooms/<int:pk>/', views.RoomDetailView.as_view(), name='room-detail'),
    path('beds/', views.BedListCreateView.as_view(), name='bed-list-create'),
    path('beds/<int:pk>/', views.BedDetailView.as_view(), name='bed-detail'),
    path('ipd-bookings/', views.IPDBookingListCreateView.as_view(), name='ipd-booking-list-create'),
    path('ipd-bookings/<int:pk>/', views.IPDBookingDetailView.as_view(), name='ipd-booking-detail'),
    path('ipd-billings/', views.IPDBillingListCreateView.as_view(), name='ipd-billing-list-create'),
    path('ipd-billings/<int:pk>/', views.IPDBillingDetailView.as_view(), name='ipd-billing-detail'),
    path('ipd-payments/', views.IPDPaymentListCreateView.as_view(), name='ipd-payment-list-create'),
    path('ipd-payments/<int:pk>/', views.IPDPaymentDetailView.as_view(), name='ipd-payment-detail'),
    path('doctor-fees/', views.DoctorFeesListCreateView.as_view(), name='doctor-fees-list-create'),
    path('doctor-fees/<int:pk>/', views.DoctorFeesDetailView.as_view(), name='doctor-fees-detail'),
    path('rate-charts/', views.RateChartListCreateView.as_view(), name='rate-chart-list-create'),
    path('rate-charts/<int:pk>/', views.RateChartDetailView.as_view(), name='rate-chart-detail'),
    path('insuarance-providers/', views.InsuaranceProviderListCreateView.as_view(), name='insuarance-provider-list-create'),
    path('insuarance-providers/<int:pk>/', views.InsuaranceProviderDetailView.as_view(), name='insuarance-provider-detail'),
    # Create Time- Slot Url
    path('time-slots/', views.TimeSlotListCreateView.as_view(), name='time-slot-list-create'),
    path('duty-roasters/', views.DutyRoasterListCreateView.as_view(), name='duty-roaster-list-create'),
    path('duty-roasters/<int:pk>/', views.DutyRoasterDetailView.as_view(), name='duty-roaster-detail'),
    # get Views for Doctor Schedules  Url
    path('doctor-schedules/', views.DoctorScheduleListView.as_view(), name='doctor-schedule-list'),
    path('doctor-schedules/<int:pk>/', views.DoctorScheduleDetailView.as_view(), name='doctor-schedule-detail'),
    # Create Administration, Administration List and Administration Approval API Url
    path('create-administration/', views.AdministrationCreateAndGetView.as_view(), name='create-administration'),
    path('administration-list/', views.AdministrationList.as_view(), name='administration-list'),
    path('staff-list/', views.StaffList.as_view(), name='staff-list'),
    path('delisted-company-users/', views.DelistedCompanyUserList.as_view(), name='delisted-company-users'),
    path(
        'delisted-company-users/<int:pk>/restore/',
        views.DelistedCompanyUserRestore.as_view(),
        name='delisted-company-users-restore',
    ),
    path('staff/<int:pk>/', views.StaffDetail.as_view(), name='staff-detail'),
    path('staff/<int:staff_id>/approve/', views.StaffApprovalView.as_view(), name='staff-approve'),
    path('staff/<int:staff_id>/ensure-login/', views.StaffEnsureLoginView.as_view(), name='staff-ensure-login'),
    path('administration/<int:pk>/', views.AdministrationDetail.as_view(), name='administration-detail'),
    path('administration/<int:administration_id>/approve/', views.AdministrationApprovalView.as_view(), name='administration-approve'),
]
