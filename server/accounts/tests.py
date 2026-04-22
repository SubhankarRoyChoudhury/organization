from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Organization, OrganizationUser, User


class AuthAPITests(APITestCase):
    def test_registration_creates_user_and_organization_user(self):
        organization = Organization.objects.create(name="Acme Corp")
        payload = {
            "username": "john",
            "email": "john@example.com",
            "phone_number": "9000000000",
            "password": "StrongPass123",
            "organization_id": organization.id,
        }
        response = self.client.post(reverse("register"), payload, format="json")

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username="john")
        org_user = OrganizationUser.objects.get(user=user)
        self.assertEqual(org_user.pk, user.pk)
        self.assertEqual(org_user.organization.name, "Acme Corp")

    def test_registration_fails_for_invalid_organization_id(self):
        payload = {
            "username": "invalidorg",
            "email": "invalidorg@example.com",
            "phone_number": "9333333333",
            "password": "StrongPass123",
            "organization_id": 999999,
        }
        response = self.client.post(reverse("register"), payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("organization_id", response.json())

    def test_login_with_username_email_and_phone(self):
        user = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            phone_number="9111111111",
            password="StrongPass123",
        )
        organization = Organization.objects.create(name="Org")
        OrganizationUser.objects.create(
            user=user,
            organization=organization,
            username=user.username,
            email=user.email,
            phone_number=user.phone_number,
        )
        url = reverse("login")

        response_username = self.client.post(
            url, {"login": "alice", "password": "StrongPass123"}, format="json"
        )
        response_email = self.client.post(
            url, {"login": "alice@example.com", "password": "StrongPass123"}, format="json"
        )
        response_phone = self.client.post(
            url, {"login": "9111111111", "password": "StrongPass123"}, format="json"
        )

        self.assertEqual(response_username.status_code, 200)
        self.assertEqual(response_email.status_code, 200)
        self.assertEqual(response_phone.status_code, 200)

    def test_organization_user_list_requires_auth_and_returns_data(self):
        user = User.objects.create_user(
            username="mark",
            email="mark@example.com",
            phone_number="9222222222",
            password="StrongPass123",
        )
        organization = Organization.objects.create(name="Org X")
        OrganizationUser.objects.create(
            user=user,
            organization=organization,
            username=user.username,
            email=user.email,
            phone_number=user.phone_number,
            first_name="Mark",
            address="Street 1",
            city="Pune",
            state="MH",
            country="India",
            postal_code="411001",
        )
        url = reverse("organization-user-list")

        unauthorized = self.client.get(url)
        self.assertEqual(unauthorized.status_code, 401)

        self.client.force_authenticate(user=user)
        authorized = self.client.get(url)
        self.assertEqual(authorized.status_code, 200)
        self.assertGreaterEqual(len(authorized.json()), 1)

    def test_organization_create_and_list_api(self):
        url = reverse("organization-list-create")

        create_payload = {
            "name": "Bright School",
            "email": "contact@brightschool.com",
            "phone_number": "9555555555",
            "address": "Street 10",
            "city": "Pune",
            "state": "Maharashtra",
            "country": "India",
            "postal_code": "411002",
        }
        create_response = self.client.post(url, create_payload, format="json")
        list_response = self.client.get(url)

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.json()), 1)
