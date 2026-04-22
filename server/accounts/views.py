from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.cache import cache
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import base64
import json
import random

from .models import Organization, OrganizationInfo, OrganizationUser
from .serializers import (
    LoginSerializer,
    OrganizationInfoSerializer,
    OrganizationProvisionSerializer,
    OrganizationSerializer,
    OrganizationUserListSerializer,
    OrganizationUserUpdateSerializer,
    RegisterSerializer,

)


def _is_level1(value):
    normalized = str(value or "").strip().lower()
    return normalized in {"lvl1", "level1"}


def _get_legacy_company_user(request, requested_identifier=None, identifier=None):
    if not request.user or not request.user.is_authenticated:
        return None

    try:
        from company_account.models import CompanyUser
    except Exception:
        return None

    identifiers = []
    for value in [identifier, getattr(request.user, "username", None), getattr(request.user, "email", None)]:
        normalized = str(value or "").strip()
        if normalized and normalized.lower() not in {item.lower() for item in identifiers}:
            identifiers.append(normalized)

    if not identifiers:
        return None

    identity_filter = Q()
    for value in identifiers:
        identity_filter |= Q(username__iexact=value) | Q(email__iexact=value)

    queryset = CompanyUser.objects.select_related(
        "company").filter(identity_filter)
    if requested_identifier:
        queryset = queryset.filter(
            Q(company_id=requested_identifier) | Q(
                organization_id=requested_identifier)
        )
    return queryset.order_by("id").first()


def _find_company_user_for_login(user, requested_identifier=None):
    if user is None:
        return None

    try:
        from company_account.models import CompanyUser
    except Exception:
        return None

    identifiers = []
    for value in [getattr(user, "username", None), getattr(user, "email", None)]:
        normalized = str(value or "").strip()
        if normalized and normalized.lower() not in {item.lower() for item in identifiers}:
            identifiers.append(normalized)

    if not identifiers:
        return None

    identity_filter = Q()
    for value in identifiers:
        identity_filter |= Q(username__iexact=value) | Q(email__iexact=value)

    queryset = CompanyUser.objects.select_related(
        "company").filter(identity_filter)
    if requested_identifier:
        queryset = queryset.filter(
            Q(company_id=requested_identifier) | Q(
                organization_id=requested_identifier)
        )
    return queryset.order_by("id").first()


def _extract_bearer_token(request):
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


def _record_login_activity(user, access_token):
    if not access_token:
        return

    try:
        from accounts.models import LoginActivity
    except Exception:
        LoginActivity = None

    try:
        from company_account.models import ActivityLog
    except Exception:
        ActivityLog = None

    company_user = _find_company_user_for_login(user)
    if company_user and ActivityLog is not None:
        organization = None
        org_id = company_user.organization_id or getattr(
            company_user.company, "organization_id", None
        )
        if org_id:
            try:
                org_id = int(org_id)
            except (TypeError, ValueError):
                org_id = None
        if org_id:
            try:
                from accounts.models import Organization
                organization = Organization.objects.filter(id=org_id).first()
            except Exception:
                organization = None

        ActivityLog.objects.create(
            company_user=company_user,
            organization=organization,
            token=access_token,
            active_from=timezone.now(),
        )

    if LoginActivity is not None:
        LoginActivity.objects.create(
            user=user,
            access_token=access_token,
            active_from=timezone.now(),
        )


def _record_logout_activity(token, user=None):
    if not token:
        return

    try:
        from company_account.models import ActivityLog
    except Exception:
        ActivityLog = None

    try:
        from accounts.models import LoginActivity
    except Exception:
        LoginActivity = None

    now = timezone.now()
    activity = None
    if ActivityLog is not None:
        activity = (
            ActivityLog.objects.filter(token=token, active_to__isnull=True)
            .order_by("-active_from")
            .first()
        )

    if (
        activity is None
        and ActivityLog is not None
        and user is not None
        and getattr(user, "is_authenticated", False)
    ):
        company_user = _find_company_user_for_login(user)
        if company_user:
            activity = (
                ActivityLog.objects.filter(
                    company_user=company_user, active_to__isnull=True
                )
                .order_by("-active_from")
                .first()
            )

    if activity:
        activity.active_to = now
        activity.save(update_fields=["active_to"])

    if LoginActivity is not None:
        login_activity = (
            LoginActivity.objects.filter(
                access_token=token, active_to__isnull=True)
            .order_by("-active_from")
            .first()
        )
        if login_activity:
            login_activity.active_to = now
            login_activity.save(update_fields=["active_to"])


def build_auth_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone_number": user.phone_number,
            "is_superuser": user.is_superuser,
        },
        "tokens": {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        },
    }


EMAIL_VERIFICATION_OTP_TTL_SECONDS = 10 * 60


def _email_otp_cache_key(email):
    return f"organization-email-otp:{str(email or '').strip().lower()}"


def _send_organization_user_credentials_email(data):
    email = str(data.get("email") or "").strip().lower()
    if not email:
        return

    organization_id = data.get("company_id") or data.get("organization_id")
    organization_name = ""
    if organization_id:
        organization = Organization.objects.filter(id=organization_id).only("name").first()
        if organization:
            organization_name = organization.name

    username = str(data.get("username") or "").strip()
    password = str(data.get("password") or "").strip() or "abc123"
    recipient_name = str(data.get("name") or username or "User").strip()
    level = str(data.get("level") or "").strip() or "-"
    role = str(data.get("role") or "").strip() or "-"

    from shared.views import sendGenericMailV2

    subject = "Organization User Login Details"
    message = f"""
        <p>Hello {recipient_name},</p>
        <p>Your organization user account has been created successfully.</p>
        <div style="margin:24px 0;padding:20px;border-radius:12px;background:#f4f8fc;border:1px solid #dbe7f3;">
            <p style="margin:0 0 10px 0;"><strong>Organization name:</strong> {organization_name or "-"}</p>
            <p style="margin:0 0 10px 0;"><strong>Username:</strong> {username}</p>
            <p style="margin:0 0 10px 0;"><strong>Password:</strong> {password}</p>
            <p style="margin:0 0 10px 0;"><strong>Level:</strong> {level}</p>
            <p style="margin:0;"><strong>Role:</strong> {role}</p>
        </div>
        <p><strong>Note:</strong> Kindly change your password after your first login.</p>
    """
    sendGenericMailV2(email, subject, message)


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response_data = build_auth_response(user)

        if serializer.validated_data.get("is_verified"):
            try:
                _send_organization_user_credentials_email(serializer.validated_data)
            except Exception as exc:
                response_data["email_warning"] = (
                    "User created, but onboarding email could not be sent: "
                    f"{exc}"
                )

        return Response(response_data, status=status.HTTP_201_CREATED)


class OrganizationEmailOtpAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = str(request.data.get("email") or "").strip().lower()
        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = f"{random.randint(0, 999999):06d}"
        cache.set(
            _email_otp_cache_key(email),
            {
                "otp": otp,
                "verified": False,
                "created_at": timezone.now().isoformat(),
            },
            timeout=EMAIL_VERIFICATION_OTP_TTL_SECONDS,
        )

        try:
            from shared.views import send_otp

            send_otp(email, otp, email)
        except Exception as exc:
            cache.delete(_email_otp_cache_key(email))
            return Response(
                {"detail": f"Unable to send OTP email: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "detail": "OTP sent to email.",
                "email": email,
                "ttl_seconds": EMAIL_VERIFICATION_OTP_TTL_SECONDS,
            },
            status=status.HTTP_200_OK,
        )


class OrganizationEmailOtpVerifyAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = str(request.data.get("email") or "").strip().lower()
        otp = str(request.data.get("otp") or "").strip()

        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not otp:
            return Response(
                {"detail": "OTP is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cached_record = cache.get(_email_otp_cache_key(email))
        if not cached_record:
            return Response(
                {"detail": "OTP expired or not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(cached_record.get("otp") or "") != otp:
            return Response(
                {"detail": "Invalid OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache.set(
            _email_otp_cache_key(email),
            {
                **cached_record,
                "verified": True,
                "verified_at": timezone.now().isoformat(),
            },
            timeout=EMAIL_VERIFICATION_OTP_TTL_SECONDS,
        )

        return Response(
            {"detail": "Email verified successfully.", "email": email},
            status=status.HTTP_200_OK,
        )


class OrganizationInviteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied("Authentication is required.")
        if not request.user.is_superuser:
            raise PermissionDenied(
                "Only super admins can send organization invitations."
            )

        email = str(request.data.get("email") or "").strip().lower()
        invite_url = str(request.data.get("invite_url") or "").strip()

        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"detail": "Enter a valid email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not invite_url:
            return Response(
                {"detail": "Invite URL is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from shared.views import sendGenericMailV2

            subject = "Create Your Organization"
            message = f"""
                <p>Hello,</p>
                <p>You have been invited to create a new organization account.</p>
                <p>Please use the link below to continue:</p>
                <p style="margin:24px 0;">
                    <a href="{invite_url}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1e5bd8;color:#ffffff;text-decoration:none;font-weight:600;">
                        Create organization
                    </a>
                </p>
                <p>If the button does not work, copy and paste this URL into your browser:</p>
                <p style="word-break:break-all;color:#1e5bd8;">{invite_url}</p>
            """
            sendGenericMailV2(email, subject, message)
        except Exception as exc:
            return Response(
                {"detail": f"Unable to send invitation email: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": f"Invitation sent to {email}."},
            status=status.HTTP_200_OK,
        )


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        payload = build_auth_response(user)
        access_token = payload.get("tokens", {}).get("access")
        _record_login_activity(user, access_token)
        return Response(payload, status=status.HTTP_200_OK)


class LogoutAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = _extract_bearer_token(
            request) or request.data.get("access_token")
        if not token:
            return Response(
                {"detail": "Access token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _record_logout_activity(token, request.user)
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


def _serialize_organization(organization):
    if organization is None:
        return None

    organization_name = organization.name or ""

    return {
        "id": organization.id,
        "name": organization_name,
        "organization_name": organization_name,
        "admin_user_name": organization.admin_user_name,
        "email": organization.email,
        "phone_number": organization.phone_number,
        "address": organization.address,
        "city": organization.city,
        "state": organization.state,
        "country": organization.country,
        "postal_code": organization.postal_code,
        "is_active": organization.is_active,
        "is_approve": organization.is_approve,
        "is_approved": organization.is_approve,
        "delist": organization.delist,
        "created_at": organization.created_at,
        "updated_at": organization.updated_at,
    }


def _serialize_organization_info(organization):
    if organization is None:
        return None

    organization_info = OrganizationInfo.objects.filter(
        organization=organization).first()
    organization_name = organization.name or ""
    thumbnail_image_url = None
    image_details = []
    attachment_details = []
    background_image_url = None

    logo_attachment_id = (
        organization_info.organization_logo_id
        if organization_info and organization_info.organization_logo_id
        else None
    )
    stored_attachment_ids = (
        list(organization_info.attachment_ids or [])
        if organization_info
        else []
    )
    background_attachment_id = (
        organization_info.background_attachment_id
        if organization_info
        else None
    )

    ordered_attachment_ids = []
    for attachment_id in [logo_attachment_id, *stored_attachment_ids]:
        if attachment_id and attachment_id not in ordered_attachment_ids:
            ordered_attachment_ids.append(attachment_id)

    if background_attachment_id and background_attachment_id not in ordered_attachment_ids:
        ordered_attachment_ids.append(background_attachment_id)

    if ordered_attachment_ids:
        try:
            from shared.models import Attachment

            attachment_map = {
                attachment.id: attachment
                for attachment in Attachment.objects.filter(id__in=ordered_attachment_ids)
            }

            for attachment_id in ordered_attachment_ids:
                attachment = attachment_map.get(attachment_id)
                if not attachment:
                    continue

                attachment_url = str(attachment.url or "")
                organization_folder = str(
                    getattr(getattr(attachment, "company", None), "name", "")
                    or organization_name
                    or ""
                ).strip()
                attachment_path = settings.MEDIA_ROOT / attachment_url
                resolved_attachment_url = attachment_url

                if not attachment_path.exists() and attachment_url and "/" not in attachment_url and organization_folder:
                    scoped_path = settings.MEDIA_ROOT / organization_folder / attachment_url
                    if scoped_path.exists():
                        attachment_path = scoped_path
                        resolved_attachment_url = f"{organization_folder}/{attachment_url}"

                base_64_image = ""
                if attachment_path.exists():
                    with open(attachment_path, "rb") as file_handle:
                        encoded = base64.b64encode(
                            file_handle.read()).decode("utf-8")
                    base_64_image = (
                        f"data:{attachment.type or 'application/octet-stream'};base64,{encoded}"
                    )

                is_image = str(attachment.type or "").lower().startswith("image/")
                attachment_payload = {
                    "id": attachment.id,
                    "attachment_id": attachment.id,
                    "url": resolved_attachment_url,
                    "type": attachment.type,
                    "base_64_image": base_64_image,
                    "is_image": is_image,
                    "is_logo": attachment.id == logo_attachment_id,
                    "is_background": attachment.id == background_attachment_id,
                }

                attachment_details.append(attachment_payload)

                if attachment.id == logo_attachment_id:
                    thumbnail_image_url = base_64_image or resolved_attachment_url
                    image_details = [attachment_payload]

                if attachment.id == background_attachment_id and is_image:
                    background_image_url = base_64_image or resolved_attachment_url
        except Exception:
            thumbnail_image_url = None
            image_details = []
            attachment_details = []
            background_image_url = None

    return {
        "organization_id": organization.id,
        "id": organization.id,
        "company_id": organization.id,
        "organization_logo_id": organization_info.organization_logo_id if organization_info else None,
        "company_logo_id": organization_info.organization_logo_id if organization_info else None,
        "attachment_ids": stored_attachment_ids,
        "background_attachment_id": background_attachment_id,
        "organization_name": organization_info.organization_name if organization_info and organization_info.organization_name else organization_name,
        "email": organization_info.email if organization_info and organization_info.email is not None else organization.email,
        "admin_name": organization_info.admin_name if organization_info and organization_info.admin_name is not None else organization.admin_user_name,
        "mobile_no": organization_info.mobile_no if organization_info and organization_info.mobile_no is not None else organization.phone_number,
        "country": organization_info.country if organization_info and organization_info.country is not None else organization.country,
        "head_office": organization_info.head_office if organization_info else "",
        "head_office_state": organization_info.head_office_state if organization_info and organization_info.head_office_state is not None else organization.state,
        "currency_code": organization_info.currency_code if organization_info else "USD",
        "date_format": organization_info.date_format if organization_info else "MMM DD, YYYY",
        "language": organization_info.language if organization_info else "en-US",
        "head_office_gstin": organization_info.head_office_gstin if organization_info else "",
        "address": organization_info.address if organization_info and organization_info.address is not None else organization.address,
        "city": organization_info.city if organization_info and organization_info.city is not None else organization.city,
        "pin": organization_info.pin if organization_info else "",
        "comments": organization_info.comments if organization_info else "",
        "branch_offices": organization_info.branch_offices if organization_info else [],
        "mobile_for_crm": organization_info.mobile_for_crm if organization_info else "",
        "whatsapp_for_crm": organization_info.whatsapp_for_crm if organization_info else "",
        "company_thumbnail_image_url": thumbnail_image_url,
        "organization_thumbnail_image_url": thumbnail_image_url,
        "background_image_url": background_image_url,
        "gmail_for_crm": organization_info.gmail_for_crm if organization_info else "",
        "crm_gmail_password": organization_info.crm_gmail_password if organization_info else "",
        "image_details": image_details,
        "attachment_details": attachment_details,
    }


class OrganizationInfoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _normalize_attachment_ids(self, raw_value):
        if raw_value in (None, "", []):
            return []

        if isinstance(raw_value, list):
            values = raw_value
        elif isinstance(raw_value, str):
            raw_value = raw_value.strip()
            if not raw_value:
                return []
            try:
                parsed = json.loads(raw_value)
                values = parsed if isinstance(parsed, list) else [parsed]
            except json.JSONDecodeError:
                values = [item.strip() for item in raw_value.split(",")]
        else:
            values = [raw_value]

        normalized = []
        for value in values:
            try:
                parsed = int(value)
            except (TypeError, ValueError):
                continue
            if parsed not in normalized:
                normalized.append(parsed)
        return normalized

    def _requested_identifier(self, request):
        return (
            request.query_params.get("organization_id")
            or request.query_params.get("company_id")
            or request.data.get("organization_id")
            or request.data.get("company_id")
        )

    def _should_use_legacy_company_flow(self, request):
        if request.user.is_superuser:
            return False

        requested_identifier = self._requested_identifier(request)
        if OrganizationUser.objects.filter(user=request.user).exists():
            return False

        return _get_legacy_company_user(request, requested_identifier) is not None

    def _resolve_organization(self, request):
        requested_identifier = self._requested_identifier(request)
        if not requested_identifier:
            return None

        organization = Organization.objects.filter(
            id=requested_identifier).first()
        if organization is not None:
            return organization

        legacy_company_user = _get_legacy_company_user(
            request, requested_identifier)
        if legacy_company_user and legacy_company_user.company.organization_id:
            return Organization.objects.filter(
                id=legacy_company_user.company.organization_id
            ).first()

        try:
            from company_account.models import Companies
        except Exception:
            return None

        company = Companies.objects.filter(
            Q(id=requested_identifier) | Q(
                organization_id=requested_identifier)
        ).first()
        if company and company.organization_id:
            return Organization.objects.filter(id=company.organization_id).first()

        return None

    def _can_access(self, request, organization):
        if request.user.is_superuser:
            return True
        if OrganizationUser.objects.filter(
            user=request.user,
            company=organization,
        ).exists():
            return True

        legacy_company_user = _get_legacy_company_user(
            request, organization.id)
        if legacy_company_user and legacy_company_user.is_active:
            return True

        return False

    def get(self, request):
        if self._should_use_legacy_company_flow(request):
            from company_account.api_views import (
                _resolve_legacy_company,
                _serialize_company_info,
            )
            from company_account.models import CompanyInfo, CompanyUser

            company = _resolve_legacy_company(request)
            if company is None:
                return Response(
                    {"detail": "organization_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            company_user = CompanyUser.objects.filter(
                username=request.user.username,
                company=company,
                is_active=True,
            ).first()
            if not request.user.is_superuser and company_user is None:
                raise PermissionDenied(
                    "You do not have access to this organization.")

            company_info = CompanyInfo.objects.filter(company=company).first()
            payload = _serialize_company_info(company, company_info)
            return Response(
                {
                    "response": {
                        "organization_info": payload,
                        "company_info": payload,
                        "organizationInfo": payload,
                        "companyInfo": payload,
                        "company_thumbnail_image_url": None,
                        "organization_thumbnail_image_url": None,
                        "owners": [],
                        "statutory_registers": [],
                        "statutory_custom_fields": [],
                        "statutory_custom_values": [],
                        "image_details": [],
                    }
                },
                status=status.HTTP_200_OK,
            )

        organization = self._resolve_organization(request)
        if organization is None:
            return Response(
                {"detail": "organization_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not self._can_access(request, organization):
            raise PermissionDenied(
                "You do not have access to this organization.")

        payload = _serialize_organization_info(organization)
        return Response(
            {
                "response": {
                    "organization_info": payload,
                    "company_info": payload,
                    "organizationInfo": payload,
                    "companyInfo": payload,
                    "company_thumbnail_image_url": payload.get("company_thumbnail_image_url"),
                    "organization_thumbnail_image_url": payload.get("organization_thumbnail_image_url"),
                    "owners": [],
                    "statutory_registers": [],
                    "statutory_custom_fields": [],
                    "statutory_custom_values": [],
                    "image_details": payload.get("image_details", []),
                    "attachment_details": payload.get("attachment_details", []),
                    "background_image_url": payload.get("background_image_url"),
                }
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        return self.get(request)

    def put(self, request):
        return self._update(request)

    def patch(self, request):
        return self._update(request)

    def _update(self, request):
        if self._should_use_legacy_company_flow(request):
            from company_account.api_views import (
                _resolve_legacy_company,
                _serialize_company_info,
            )
            from company_account.models import CompanyInfo, CompanyUser

            company = _resolve_legacy_company(request)
            if company is None:
                return Response(
                    {"detail": "organization_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            company_user = CompanyUser.objects.filter(
                username=request.user.username,
                company=company,
                is_active=True,
            ).first()
            if not request.user.is_superuser and company_user is None:
                raise PermissionDenied(
                    "You do not have access to this organization.")

            company_info, _created = CompanyInfo.objects.get_or_create(
                company=company)
            incoming = request.data.copy()
            if hasattr(incoming, "dict"):
                incoming = incoming.dict()

            if "organization_name" in incoming and "company_name" not in incoming:
                incoming["company_name"] = incoming.get("organization_name")
            if "organization_logo_id" in incoming and "company_logo_id" not in incoming:
                incoming["company_logo_id"] = incoming.get(
                    "organization_logo_id")
            if "organization_id" not in incoming and company.organization_id:
                incoming["organization_id"] = company.organization_id

            field_map = {
                "company_name": "company_name",
                "admin_name": "admin_name",
                "email": "email",
                "mobile_no": "mobile_no",
                "address": "address",
                "city": "city",
                "pin": "pin",
                "country": "country",
                "head_office_state": "head_office_state",
                "currency_code": "currency_code",
                "date_format": "date_format",
                "language": "language",
                "company_logo_id": "company_logo_id",
                "organization_id": "organization_id",
            }
            for incoming_key, model_field in field_map.items():
                if incoming_key in incoming:
                    setattr(company_info, model_field,
                            incoming.get(incoming_key))

            company_info.save()

            if "company_name" in incoming:
                company.company_name = incoming.get(
                    "company_name") or company.company_name
            if "admin_name" in incoming:
                company.admin_name = incoming.get(
                    "admin_name") or company.admin_name
            if "email" in incoming:
                company.email = incoming.get("email") or company.email
            if "address" in incoming:
                company.address = incoming.get("address") or company.address
            if "pin" in incoming:
                company.pin = incoming.get("pin") or company.pin
            if "mobile_no" in incoming:
                company.mobile = incoming.get("mobile_no") or company.mobile
            company.save()

            payload = _serialize_company_info(company, company_info)
            return Response(
                {
                    "response": {
                        "organization_info": payload,
                        "company_info": payload,
                        "organizationInfo": payload,
                        "companyInfo": payload,
                        "company_thumbnail_image_url": None,
                        "organization_thumbnail_image_url": None,
                        "owners": [],
                        "statutory_registers": [],
                        "statutory_custom_fields": [],
                        "statutory_custom_values": [],
                        "image_details": [],
                    }
                },
                status=status.HTTP_200_OK,
            )

        organization = self._resolve_organization(request)
        if organization is None:
            return Response(
                {"detail": "organization_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not self._can_access(request, organization):
            raise PermissionDenied(
                "You do not have access to this organization.")

        organization_info, _created = OrganizationInfo.objects.get_or_create(
            organization=organization
        )
        incoming = request.data.copy()
        if hasattr(incoming, "dict"):
            incoming = incoming.dict()

        if "company_name" in incoming and "organization_name" not in incoming:
            incoming["organization_name"] = incoming.get("company_name")
        if "company_logo_id" in incoming and "organization_logo_id" not in incoming:
            incoming["organization_logo_id"] = incoming.get("company_logo_id")

        if "attachment_ids" in incoming:
            incoming["attachment_ids"] = self._normalize_attachment_ids(
                incoming.get("attachment_ids")
            )

        if "background_attachment_id" in incoming:
            background_value = incoming.get("background_attachment_id")
            if background_value in ("", None):
                incoming["background_attachment_id"] = None
            else:
                try:
                    incoming["background_attachment_id"] = int(background_value)
                except (TypeError, ValueError):
                    incoming["background_attachment_id"] = None

        if incoming.get("background_attachment_id"):
            attachment_ids = incoming.get("attachment_ids")
            if attachment_ids is None:
                attachment_ids = list(organization_info.attachment_ids or [])
            if incoming["background_attachment_id"] not in attachment_ids:
                attachment_ids.append(incoming["background_attachment_id"])
            incoming["attachment_ids"] = attachment_ids

        if "attachment_ids" in incoming and "background_attachment_id" not in incoming:
            existing_background_id = organization_info.background_attachment_id
            if existing_background_id and existing_background_id not in incoming["attachment_ids"]:
                incoming["background_attachment_id"] = None

        serializer = OrganizationInfoSerializer(
            organization_info,
            data=incoming,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        payload = _serialize_organization_info(organization)
        return Response(
            {
                "response": {
                    "organization_info": payload,
                    "company_info": payload,
                    "organizationInfo": payload,
                    "companyInfo": payload,
                    "company_thumbnail_image_url": payload.get("company_thumbnail_image_url"),
                    "organization_thumbnail_image_url": payload.get("organization_thumbnail_image_url"),
                    "owners": [],
                    "statutory_registers": [],
                    "statutory_custom_fields": [],
                    "statutory_custom_values": [],
                    "image_details": payload.get("image_details", []),
                    "attachment_details": payload.get("attachment_details", []),
                    "background_image_url": payload.get("background_image_url"),
                }
            },
            status=status.HTTP_200_OK,
        )


def _serialize_organization_user(organization_user):
    if organization_user is None:
        return None

    organization_id = organization_user.company_id
    image_url = organization_user.image_url or ""

    if not image_url and organization_user.attachment_id:
        try:
            from shared.models import Attachment

            attachment = Attachment.objects.filter(
                id=organization_user.attachment_id).first()
            if attachment:
                attachment_path = settings.MEDIA_ROOT / str(attachment.url)
                base_64_image = ""
                if attachment_path.exists():
                    with open(attachment_path, "rb") as file_handle:
                        encoded = base64.b64encode(
                            file_handle.read()).decode("utf-8")
                    base_64_image = (
                        f"data:{attachment.type or 'application/octet-stream'};base64,{encoded}"
                    )
                image_url = base_64_image or attachment.url
        except Exception:
            image_url = organization_user.image_url or ""

    return {
        "id": organization_user.id,
        "name": organization_user.name,
        "fatherOrHusband": organization_user.fatherOrHusband,
        "aliasName": organization_user.aliasName,
        "username": organization_user.username,
        "email": organization_user.email,
        "mobile": organization_user.mobile,
        "attachment_id": organization_user.attachment_id,
        "registrationDate": organization_user.registrationDate,
        "is_superuser": organization_user.is_superuser,
        "is_active": organization_user.is_active,
        "is_staff": organization_user.is_staff,
        "is_owner": organization_user.is_owner,
        "is_assistant": organization_user.is_assistant,
        "is_admin": organization_user.is_admin,
        "is_manager": organization_user.is_manager,
        "role": organization_user.role,
        "medical_council_registration": organization_user.medical_council_registration,
        "about": organization_user.about,
        "address": organization_user.address,
        "excellency_point": organization_user.excellency_point,
        "organization_id": organization_id,
        "company_id": organization_id,
        "app_wise_home_pages": organization_user.app_wise_home_pages,
        "is_googleuser": organization_user.is_googleuser,
        "disclaimer": organization_user.disclaimer,
        "image_url": image_url,
        "user_type": "organization_user",
        "roles": [organization_user.role] if organization_user.role else [],
    }


class CurrentUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_superuser:
            return Response(
                {
                    "response": True,
                    "msg": "You are authenticated",
                    "is_superuser": True,
                    "user": {
                        "id": request.user.id,
                        "username": request.user.username,
                        "email": request.user.email,
                        "phone_number": request.user.phone_number,
                        "is_superuser": True,
                        "role": "superuser",
                        "user_type": "superuser",
                        "roles": ["superuser"],
                    },
                    "permissions": [],
                    "applications": [],
                    "config": None,
                    "organization_id": None,
                    "organization_name": "",
                    "organization_details": None,
                    "company_details": None,
                    "organizationInfo": None,
                    "companyInfo": None,
                    "companies": [],
                },
                status=status.HTTP_200_OK,
            )

        requested_organization_id = (
            request.query_params.get("organization_id")
            or request.query_params.get("company_id")
        )

        organization_user_queryset = OrganizationUser.objects.select_related(
            "user", "company"
        ).filter(user=request.user)

        if requested_organization_id:
            organization_user_queryset = organization_user_queryset.filter(
                company_id=requested_organization_id
            )

        organization_user = organization_user_queryset.first()
        if organization_user is None:
            legacy_company_user = _get_legacy_company_user(
                request,
                requested_organization_id,
            )
            if legacy_company_user is None:
                return Response(
                    {
                        "response": False,
                        "msg": "Organization user not found",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            try:
                from company_account.api_views import (
                    _serialize_company,
                    _serialize_company_info,
                    _serialize_company_user,
                )
                from company_account.models import CompanyInfo
            except Exception:
                return Response(
                    {
                        "response": False,
                        "msg": "Organization user not found",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            company = legacy_company_user.company
            company_info = CompanyInfo.objects.filter(
                company_id=company.id).first()
            serialized_company = _serialize_company(company)
            serialized_company_info = _serialize_company_info(
                company, company_info)

            return Response(
                {
                    "response": True,
                    "msg": "You are authenticated",
                    "is_superuser": False,
                    "user": _serialize_company_user(legacy_company_user),
                    "permissions": [],
                    "applications": [],
                    "config": None,
                    "organization_id": company.organization_id,
                    "organization_name": company.company_name,
                    "organization_details": serialized_company,
                    "company_details": serialized_company,
                    "organizationInfo": serialized_company_info,
                    "companyInfo": serialized_company_info,
                    "companies": [serialized_company],
                },
                status=status.HTTP_200_OK,
            )

        if not organization_user.is_active:
            return Response(
                {
                    "response": False,
                    "msg": "You are not active",
                },
                status=status.HTTP_200_OK,
            )

        organization = organization_user.company
        organization_details = _serialize_organization(organization)
        organization_info = _serialize_organization_info(organization)
        user_payload = _serialize_organization_user(organization_user)

        return Response(
            {
                "response": True,
                "msg": "You are authenticated",
                "is_superuser": False,
                "user": user_payload,
                "permissions": [],
                "applications": [],
                "config": None,
                "organization_id": organization.id,
                "organization_name": organization_details["organization_name"],
                "organization_details": organization_details,
                "company_details": organization_details,
                "organizationInfo": organization_info,
                "companyInfo": organization_info,
                "companies": [
                    {
                        **organization_details,
                        "company_id": organization.id,
                    }
                ],
            },
            status=status.HTTP_200_OK,
        )


class SchoolLoginRouteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        login_username = (
            request.query_params.get("username")
            or getattr(request.user, "username", "")
            or ""
        ).strip()
        login_email = (getattr(request.user, "email", "") or "").strip()

        org_filter = Q(user=request.user)
        if login_username:
            org_filter |= (
                Q(user__username__iexact=login_username)
                | Q(username__iexact=login_username)
                | Q(email__iexact=login_username)
            )
        if login_email:
            org_filter |= Q(user__email__iexact=login_email) | Q(
                email__iexact=login_email)

        has_organization_user = OrganizationUser.objects.filter(
            org_filter,
            delist=False,
        ).exists()

        company_user_role = ""
        company_main_group = ""
        company_sub_group = ""
        try:
            from company_account.models import CompanyUser, Companies

            identity_filter = Q()
            if login_username:
                identity_filter |= Q(username__iexact=login_username) | Q(email__iexact=login_username)
            if login_email:
                identity_filter |= Q(email__iexact=login_email)

            company_user = (
                CompanyUser.objects.filter(identity_filter, delist=False).order_by("id").first()
                if identity_filter
                else None
            )
            company_user_role = (getattr(company_user, "role", "") or "").strip().lower()
            company = None
            if company_user and getattr(company_user, "company_id", None):
                company = Companies.objects.filter(id=company_user.company_id).only(
                    "id",
                    "main_group",
                    "sub_group",
                ).first()
            company_main_group = (
                getattr(company, "main_group", "") or ""
            ).strip().lower()
            company_sub_group = (
                getattr(company, "sub_group", "") or ""
            ).strip().lower()
        except Exception:
            company_user_role = ""
            company_main_group = ""
            company_sub_group = ""

        post_login_route = None
        matched_model = None
        if company_main_group == "swasthya" and company_sub_group == "clinic":
            post_login_route = "/clinic-management/"
            matched_model = "CompanyUser"
        elif company_main_group == "swasthya" and company_sub_group == "hospital":
            post_login_route = "/hospital-management/administration_dashboard/"
            matched_model = "CompanyUser"
        elif company_user_role == "teacher":
            post_login_route = "/school-management/dashboard/"
            matched_model = "CompanyUser"
        elif company_user_role == "student":
            post_login_route = "/school-management"
            matched_model = "CompanyUser"
        elif company_user_role == "admin":
            post_login_route = "/school-management/teachers/"
            matched_model = "CompanyUser"
        elif has_organization_user:
            post_login_route = "/school-management/teachers/"
            matched_model = "OrganizationUser"

        return Response(
            {
                "username": login_username,
                "has_organization_user": has_organization_user,
                "has_teacher": company_user_role == "teacher",
                "has_student": company_user_role == "student",
                "company_user_role": company_user_role,
                "company_main_group": company_main_group,
                "company_sub_group": company_sub_group,
                "matched_model": matched_model,
                "post_login_route": post_login_route,
            },
            status=status.HTTP_200_OK,
        )


class OrganizationUserListAPIView(generics.ListAPIView):
    serializer_class = OrganizationUserListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = OrganizationUser.objects.select_related(
            "user").all().order_by("-created_at")

        username = (self.request.query_params.get("username") or "").strip()
        organization_id = (
            self.request.query_params.get("organization_id")
            or self.request.query_params.get("company_id")
        )
        role = (self.request.query_params.get("role") or "").strip().lower()
        delist = self.request.query_params.get("delist")

        if username:
            queryset = queryset.filter(
                Q(user__username__iexact=username)
                | Q(user__email__iexact=username)
                | Q(username__iexact=username)
                | Q(email__iexact=username)
            )
        if organization_id:
            queryset = queryset.filter(company_id=organization_id)
        if role:
            queryset = queryset.filter(role__iexact=role)
        if delist is not None:
            normalized_delist = str(delist).strip().lower()
            if normalized_delist in {"true", "1", "yes"}:
                queryset = queryset.filter(delist=True)
            elif normalized_delist in {"false", "0", "no"}:
                queryset = queryset.filter(delist=False)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        username = (self.request.query_params.get("username") or "").strip()
        organization_id = (
            self.request.query_params.get("organization_id")
            or self.request.query_params.get("company_id")
        )

        if username and not queryset.exists():
            legacy_company_user = _get_legacy_company_user(
                request,
                requested_identifier=organization_id,
                identifier=username,
            )
            if legacy_company_user is not None:
                from company_account.api_views import _serialize_company_user

                return Response(
                    [_serialize_company_user(legacy_company_user)],
                    status=status.HTTP_200_OK,
                )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OrganizationUserDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        normalized_lookup = (username or "").strip()
        request_matches_lookup = (
            request.user.username == normalized_lookup
            or request.user.email == normalized_lookup
        )
        if not request.user.is_superuser and not request_matches_lookup:
            raise PermissionDenied(
                "You can only access your own organization user details.")

        organization_user = OrganizationUser.objects.select_related("user").filter(
            Q(user__username__iexact=normalized_lookup)
            | Q(user__email__iexact=normalized_lookup)
            | Q(username__iexact=normalized_lookup)
            | Q(email__iexact=normalized_lookup)
        ).first()
        if organization_user is None:
            legacy_company_user = _get_legacy_company_user(
                request,
                identifier=normalized_lookup,
            )
            if legacy_company_user is not None:
                from company_account.api_views import _serialize_company_user

                return Response(
                    _serialize_company_user(legacy_company_user),
                    status=status.HTTP_200_OK,
                )
            return Response({"detail": "Organization user not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrganizationUserListSerializer(organization_user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, username):
        normalized_lookup = (username or "").strip()
        organization_user = OrganizationUser.objects.select_related(
            "user", "company"
        ).filter(
            Q(user__username__iexact=normalized_lookup)
            | Q(user__email__iexact=normalized_lookup)
            | Q(username__iexact=normalized_lookup)
            | Q(email__iexact=normalized_lookup)
        ).first()

        if organization_user is None:
            return Response(
                {"detail": "Organization user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not request.user.is_superuser:
            requester = OrganizationUser.objects.select_related("company").filter(
                user=request.user
            ).first()
            if not requester:
                raise PermissionDenied(
                    "You are not allowed to update organization users.")
            if requester.company_id != organization_user.company_id:
                raise PermissionDenied(
                    "You can only update users in your organization.")
            if not _is_level1(requester.level):
                raise PermissionDenied(
                    "Only level 1 organization users can update users.")

        serializer = OrganizationUserUpdateSerializer(
            organization_user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            OrganizationUserListSerializer(organization_user).data,
            status=status.HTTP_200_OK,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def updateOrganizationUserProfile(request):
    organization_user = OrganizationUser.objects.select_related("user").filter(
        user=request.user
    ).first()
    if organization_user is None:
        username = getattr(request.user, "username", "") or ""
        email = getattr(request.user, "email", "") or ""
        organization_user = OrganizationUser.objects.select_related("user").filter(
            Q(username__iexact=username)
            | Q(email__iexact=username)
            | Q(email__iexact=email)
        ).first()

    if organization_user is None:
        return Response({"detail": "Organization user not found."}, status=status.HTTP_404_NOT_FOUND)

    update_data = {
        "name": (request.data.get("name") or "").strip(),
        "mobile": (request.data.get("mobile") or "").strip(),
        "about": (request.data.get("about") or "").strip(),
        "address": (request.data.get("address") or "").strip(),
    }

    OrganizationUser.objects.filter(
        id=organization_user.id).update(**update_data)
    return Response({"msg": "Profile updated"}, status=status.HTTP_200_OK)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def changeOrganizationUserImage(request):
    organization_user = OrganizationUser.objects.select_related("user").filter(
        user=request.user
    ).first()
    if organization_user is None:
        username = getattr(request.user, "username", "") or ""
        email = getattr(request.user, "email", "") or ""
        organization_user = OrganizationUser.objects.select_related("user").filter(
            Q(username__iexact=username)
            | Q(email__iexact=username)
            | Q(email__iexact=email)
        ).first()

    if organization_user is None:
        return Response({"detail": "Organization user not found."}, status=status.HTTP_404_NOT_FOUND)

    OrganizationUser.objects.filter(id=organization_user.id).update(
        attachment_id=request.data.get("image_id")
    )
    return Response({"response": "User Image Updated"}, status=status.HTTP_200_OK)


class OrganizationListCreateAPIView(generics.ListCreateAPIView):
    queryset = Organization.objects.all().order_by("-created_at")
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def _generate_unique_admin_username(self, base_username):
        normalized = (
            base_username or "organization-admin").strip() or "organization-admin"
        candidate = normalized
        suffix = 2
        while Organization.objects.filter(admin_user_name=candidate).exists():
            candidate = f"{normalized}-{suffix}"
            suffix += 1
        return candidate

    def _normalize_create_payload(self, request):
        incoming = request.data.copy()
        if hasattr(incoming, "dict"):
            incoming = incoming.dict()

        if "organization_name" in incoming and "name" not in incoming:
            incoming["name"] = incoming.get("organization_name")
        return incoming

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied(
                "Authentication is required to create an organization.")

        normalized_payload = self._normalize_create_payload(request)
        User = get_user_model()
        requested_username = (normalized_payload.get("username") or "").strip()
        requested_email = (normalized_payload.get("email") or "").strip()
        requested_phone = (normalized_payload.get(
            "phone_number") or "").strip()

        if requested_username and User.objects.filter(username__iexact=requested_username).exists():
            return Response({"detail": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if requested_email and User.objects.filter(email__iexact=requested_email).exists():
            return Response({"detail": "Email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if requested_phone and User.objects.filter(phone_number=requested_phone).exists():
            return Response({"detail": "Phone number already exists."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=normalized_payload)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        phone_number = (data.get("phone_number") or "").strip()
        address = (data.get("address") or "").strip()
        city = (data.get("city") or "").strip()
        state_name = (data.get("state") or "").strip()
        country = (data.get("country") or "").strip()
        postal_code = (data.get("postal_code") or "").strip()
        username = request.user.username
        requested_admin_user = (data.get("admin_user_name") or "").strip()
        admin_user_name = (
            requested_admin_user
            if requested_admin_user
            else self._generate_unique_admin_username(username)
        )

        def _default_active_dates(current_time):
            month_start = current_time.replace(
                day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month_start = (
                month_start + timedelta(days=32)).replace(day=1)
            third_month_start = (next_month_start +
                                 timedelta(days=32)).replace(day=1)
            fourth_month_start = (third_month_start +
                                  timedelta(days=32)).replace(day=1)
            third_month_end = fourth_month_start - timedelta(days=1)
            return (
                month_start,
                third_month_end.replace(
                    hour=23, minute=59, second=59, microsecond=999999),
            )

        now = timezone.now()
        active_from, active_upto = _default_active_dates(now)

        try:
            organization = Organization.objects.create(
                name=name,
                admin_user_name=admin_user_name,
                email=email,
                phone_number=phone_number,
                address=address,
                city=city,
                state=state_name,
                country=country,
                postal_code=postal_code,
                is_active=True,
                is_approve=True,
                is_approved=True,
                active_from=active_from,
                active_upto=active_upto,
                created_by=username,
                updated_by=username,
            )
        except IntegrityError as exc:
            return Response(
                {"detail": f"Unable to create organization: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        organization_info, _created = OrganizationInfo.objects.get_or_create(
            organization=organization,
            defaults={
                "organization_name": name,
                "admin_name": request.user.get_full_name().strip() or username,
                "email": email,
                "mobile_no": phone_number,
                "address": address,
                "city": city,
                "pin": postal_code,
                "country": country,
                "head_office_state": state_name,
            },
        )

        return Response(
            {
                "detail": "Organization created successfully.",
                "organization": _serialize_organization(organization),
                "organization_user": None,
                "organization_info": _serialize_organization_info(organization),
            },
            status=status.HTTP_201_CREATED,
        )


class OrganizationProvisionAPIView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = OrganizationProvisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        cached_record = cache.get(_email_otp_cache_key(data["email"]))
        if not cached_record or not cached_record.get("verified"):
            return Response(
                {"detail": "Email must be verified before creating organization."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        actor_username = (
            getattr(request.user, "username", "").strip()
            if getattr(request.user, "is_authenticated", False)
            else "public"
        )

        def _default_active_dates(current_time):
            month_start = current_time.replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            next_month_start = (month_start + timedelta(days=32)).replace(day=1)
            third_month_start = (next_month_start + timedelta(days=32)).replace(day=1)
            fourth_month_start = (third_month_start + timedelta(days=32)).replace(day=1)
            third_month_end = fourth_month_start - timedelta(days=1)
            return (
                month_start,
                third_month_end.replace(
                    hour=23, minute=59, second=59, microsecond=999999
                ),
            )

        now = timezone.now()
        active_from, active_upto = _default_active_dates(now)

        organization = Organization.objects.create(
            name=data["name"],
            admin_user_name=data["username"],
            email=data["email"],
            phone_number=data["phone_number"],
            address=data.get("address", ""),
            city=data.get("city", ""),
            state=data.get("state", ""),
            country=data.get("country", ""),
            postal_code=data.get("postal_code", ""),
            is_active=True,
            is_approve=True,
            is_approved=True,
            active_from=active_from,
            active_upto=active_upto,
            created_by=actor_username,
            updated_by=actor_username,
        )

        register_serializer = RegisterSerializer(
            data={
                "username": data["username"],
                "email": data["email"],
                "phone_number": data["phone_number"],
                "password": data["password"],
                "name": data["admin_name"],
                "mobile": data["phone_number"],
                "address": data.get("address", ""),
                "city": data.get("city", ""),
                "state": data.get("state", ""),
                "country": data.get("country", ""),
                "postal_code": data.get("postal_code", ""),
                "role": "admin",
                "organization_id": organization.id,
                "created_by": actor_username,
                "updated_by": actor_username,
                "is_active": True,
                "is_approve": True,
                "is_admin": True,
                "can_access": True,
                "category": "all",
                "level": "Level1",
            }
        )
        register_serializer.is_valid(raise_exception=True)
        admin_user = register_serializer.save()
        organization_user = OrganizationUser.objects.select_related("user").get(
            user=admin_user
        )

        organization_info, _created = OrganizationInfo.objects.get_or_create(
            organization=organization,
            defaults={
                "organization_name": data["name"],
                "admin_name": data["admin_name"],
                "email": data["email"],
                "mobile_no": data["phone_number"],
                "address": data.get("address", ""),
                "city": data.get("city", ""),
                "pin": data.get("postal_code", ""),
                "country": data.get("country", ""),
                "head_office_state": data.get("state", ""),
            },
        )
        email_warning = None
        try:
            from shared.views import sendGenericMailV2

            onboarding_subject = "Organization Login Details"
            onboarding_message = f"""
                <p>Hello {data["admin_name"]},</p>
                <p>Your organization has been created successfully. Below are your login details:</p>
                <div style="margin:24px 0;padding:20px;border-radius:12px;background:#f4f8fc;border:1px solid #dbe7f3;">
                    <p style="margin:0 0 10px 0;"><strong>Organization name:</strong> {data["name"]}</p>
                    <p style="margin:0 0 10px 0;"><strong>Username:</strong> {data["username"]}</p>
                    <p style="margin:0;"><strong>Password:</strong> {data["password"]}</p>
                </div>
                <p><strong>Note:</strong> Kindly change your password after your first login.</p>
                <p>You can now sign in using the credentials above.</p>
            """
            sendGenericMailV2(
                data["email"],
                onboarding_subject,
                onboarding_message,
            )
        except Exception as exc:
            email_warning = f"Organization created, but onboarding email could not be sent: {exc}"

        cache.delete(_email_otp_cache_key(data["email"]))

        return Response(
            {
                "detail": "Organization and admin user created successfully.",
                "organization": _serialize_organization(organization),
                "organization_user": OrganizationUserListSerializer(
                    organization_user
                ).data,
                "organization_info": _serialize_organization_info(organization),
                "organization_id": organization.id,
                "organization_info_id": organization_info.organization_id,
                **({"email_warning": email_warning} if email_warning else {}),
            },
            status=status.HTTP_201_CREATED,
        )


class OrganizationDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied("Authentication is required.")
        if not request.user.is_superuser:
            raise PermissionDenied(
                "Only super admins can update organizations.")
        return super().update(request, *args, **kwargs)
