from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from company_account.models import Companies, CompanyUser

from .models import DoctorSchedule, TimeSlot


class DoctorWithScheduleCreateViewTests(APITestCase):
    def setUp(self):
        self.company = Companies.objects.create(
            company_name="Test Hospital",
            admin_name="Admin",
            email="admin@testhospital.com",
        )
        self.time_slot = TimeSlot.objects.create(
            companies=self.company,
            start_time="09:00:00",
            end_time="10:00:00",
        )
        self.url = (
            f"{reverse('create-doctor-with-schedule')}?company_id={self.company.id}"
        )

    @patch("hospital_management.views.send_account_credentials_email", return_value=True)
    def test_create_doctor_with_schedule_creates_auth_user_with_phone(self, _mock_email):
        payload = {
            "full_name": "Dr Test",
            "email": "doctor@testhospital.com",
            "phone": "9000000001",
            "password": "StrongPass123",
            "medical_council_registration": "MCI-12345",
            "available_day_slots": {"Monday": [self.time_slot.id]},
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        auth_user = User.objects.get(username="doctor@testhospital.com")
        self.assertEqual(auth_user.email, "doctor@testhospital.com")
        self.assertEqual(auth_user.phone_number, "9000000001")

        company_user = CompanyUser.objects.get(
            company=self.company,
            email="doctor@testhospital.com",
        )
        self.assertEqual(company_user.mobile, "9000000001")
        self.assertTrue(
            DoctorSchedule.objects.filter(
                companies=self.company,
                doctor=company_user,
            ).exists()
        )

    def test_create_doctor_with_schedule_requires_phone(self):
        payload = {
            "full_name": "Dr No Phone",
            "email": "nophone@testhospital.com",
            "password": "StrongPass123",
            "medical_council_registration": "MCI-99999",
            "available_day_slots": {"Monday": [self.time_slot.id]},
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {"phone": "Phone is required to create a doctor user."},
        )
        self.assertFalse(User.objects.filter(username="nophone@testhospital.com").exists())
        self.assertFalse(
            CompanyUser.objects.filter(
                company=self.company,
                email="nophone@testhospital.com",
            ).exists()
        )


class AdministrationCreateViewTests(APITestCase):
    def setUp(self):
        self.company = Companies.objects.create(
            company_name="Admin Hospital",
            admin_name="Admin",
            email="admin@adminhospital.com",
        )
        self.url = (
            f"{reverse('create-administration')}?company_id={self.company.id}"
        )

    @patch("hospital_management.views.sendGenericMailV2", return_value=True)
    def test_create_administration_creates_auth_user_with_phone(self, _mock_mail):
        payload = {
            "full_name": "Admin User",
            "email": "admin.user@adminhospital.com",
            "phone": "9000000099",
            "password": "StrongPass123",
            "role": "administration",
            "job_title": "OT Nurse",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        auth_user = User.objects.get(username="admin.user@adminhospital.com")
        self.assertEqual(auth_user.phone_number, "9000000099")

        company_user = CompanyUser.objects.get(
            company=self.company,
            email="admin.user@adminhospital.com",
        )
        self.assertEqual(company_user.mobile, "9000000099")
        self.assertEqual(company_user.role, "administration")
