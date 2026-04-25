from datetime import datetime, timedelta
import base64

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db import transaction
from django.db.models import Q
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response

from accounts.models import Organization, OrganizationUser
from account_management.default_seed import seed_company_chart_of_accounts
from company_account.models import Companies, CompanyInfo, CompanyUser
from school_management.models import School
from shared.models import Location
from shared.views import sendGenericMailV2


def _request_user_can_create_company(request):
    user = request.user
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    username = getattr(user, "username", "")
    if not username:
        return False

    has_company_admin_rights = (
        CompanyUser.objects.filter(
            username=username,
            is_active=True,
        )
        .filter(Q(is_admin=True) | Q(is_owner=True))
        .exists()
    )

    # Permit any active OrganizationUser of this auth user to create a company
    # (matches the new school->company creation flow in the frontend).
    has_org_membership = OrganizationUser.objects.filter(
        user=user,
    ).exists()

    return has_company_admin_rights or has_org_membership


def _generate_company_code(company_name):
    base_code = slugify(company_name).replace("-", "") or "company"
    candidate = base_code
    suffix = 1

    while Companies.objects.filter(company_id__iexact=candidate).exists():
        suffix += 1
        candidate = f"{base_code}{suffix}"

    return candidate


def _parse_iso_date(value, field_name):
    parsed = str(value or "").strip()
    if not parsed:
        return None, None
    try:
        return datetime.strptime(parsed, "%Y-%m-%d").date(), None
    except ValueError:
        return None, Response(
            {"detail": f"{field_name} must be in YYYY-MM-DD format."},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _upsert_company_location(company, incoming, request, location_name=None, create_if_missing=False):
    existing_location = Location.objects.filter(company=company).order_by("id").first()

    resolved_name = str(
        location_name
        or incoming.get("location")
        or getattr(existing_location, "name", "")
        or company.location
        or ""
    ).strip()
    if not resolved_name:
        return None

    def _pick(*values):
        for value in values:
            if value is None:
                continue
            value_str = str(value).strip()
            if value_str:
                return value_str
        return ""

    pin_value = incoming.get("pin")
    if pin_value in (None, "") and existing_location is not None:
        pin_value = existing_location.pin
    if pin_value in (None, "") and not create_if_missing:
        return None

    try:
        resolved_pin = int(str(pin_value).strip())
    except Exception:
        if existing_location is None or create_if_missing:
            return None
        resolved_pin = existing_location.pin

    location_fields = {
        "state": _pick(
            incoming.get("head_office_state"),
            incoming.get("state"),
            getattr(existing_location, "state", ""),
        ),
        "city": _pick(
            incoming.get("city"),
            incoming.get("district"),
            getattr(existing_location, "city", ""),
            resolved_name,
        ),
        "pin": resolved_pin,
        "address": _pick(
            incoming.get("address"),
            getattr(existing_location, "address", ""),
        ),
        "note": _pick(
            incoming.get("comments"),
            getattr(existing_location, "note", ""),
        ),
        "country": _pick(
            incoming.get("country"),
            getattr(existing_location, "country", ""),
        ),
        "created_by": getattr(request.user, "username", "")
        or getattr(existing_location, "created_by", "")
        or "",
        "created_on": getattr(existing_location, "created_on", None) or datetime.now(),
    }

    if existing_location is None and not create_if_missing:
        return None
    if existing_location is None:
        if not all(location_fields[key] for key in ("address", "country", "state", "city")):
            return None
        return Location.objects.create(
            company=company,
            name=resolved_name,
            **location_fields,
        )

    existing_location.state = location_fields["state"] or existing_location.state
    existing_location.city = location_fields["city"] or existing_location.city
    existing_location.pin = resolved_pin if resolved_pin is not None else existing_location.pin
    existing_location.address = location_fields["address"] or existing_location.address
    existing_location.note = location_fields["note"]
    existing_location.country = location_fields["country"] or existing_location.country
    existing_location.created_by = location_fields["created_by"] or existing_location.created_by
    existing_location.created_on = location_fields["created_on"] or existing_location.created_on
    if resolved_name and existing_location.name != resolved_name:
        existing_location.name = resolved_name
    existing_location.save()
    return existing_location


def _serialize_company_user(company_user):
    organization_id = company_user.organization_id or company_user.company.organization_id
    image_url = company_user.image_url or ""

    if not image_url and company_user.attachment_id:
        try:
            from shared.models import Attachment

            attachment = Attachment.objects.filter(
                id=company_user.attachment_id).first()
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
            image_url = company_user.image_url or ""

    return {
        "id": company_user.id,
        "name": company_user.name,
        "fatherOrHusband": company_user.fatherOrHusband,
        "aliasName": company_user.aliasName,
        "username": company_user.username,
        "email": company_user.email,
        "mobile": company_user.mobile,
        "attachment_id": company_user.attachment_id,
        "registrationDate": company_user.registrationDate,
        "is_superuser": company_user.is_superuser,
        "is_active": company_user.is_active,
        "is_staff": company_user.is_staff,
        "is_owner": company_user.is_owner,
        "is_assistant": company_user.is_assistant,
        "is_admin": company_user.is_admin,
        "is_manager": company_user.is_manager,
        "role": company_user.role,
        "medical_council_registration": company_user.medical_council_registration,
        "about": company_user.about,
        "address": company_user.address,
        "excellency_point": company_user.excellency_point,
        "company_id": company_user.company_id,
        "organization_id": organization_id,
        "organization": organization_id,
        "phone_number": company_user.mobile or "",
        "user_type": "company_user",
        "roles": [company_user.role] if company_user.role else [],
        "app_wise_home_pages": company_user.app_wise_home_pages or [],
        "is_googleuser": company_user.is_googleuser,
        "disclaimer": company_user.disclaimer,
        "image_url": image_url,
    }


def _serialize_company(company):
    organization_id = company.organization_id
    return {
        "id": company.id,
        "company_name": company.company_name,
        "organization_name": company.company_name,
        "company_id": company.id,
        "organization_id": organization_id,
        "company_code": company.company_id,
        "username": company.username,
        "address": company.address,
        "pin": company.pin,
        "admin_name": company.admin_name,
        "mobile": company.mobile,
        "email": company.email,
        "is_approved": company.is_approved,
        "active_from": company.active_from,
        "active_upto": company.active_upto,
        "is_new": company.is_new,
        "delist": company.delist,
        "main_group": company.main_group,
        "sub_group": company.sub_group,
        "school_category": company.school_category,
        "location": company.location,
        "district": company.district,
        "school_code": company.school_code,
        "start_date": company.start_date,
        # Backward compatible aliases for existing frontend clients.
        # "main_category": company.group,
        # "sub_category": company.sub_group,
    }


def _serialize_company_info(company, company_info):
    organization_id = (
        (company_info.organization_id if company_info else None)
        or company.organization_id
    )
    return {
        "id": company_info.id if company_info else None,
        "company_id": company.id,
        "organization_id": organization_id,
        "organization_name": (
            company_info.company_name if company_info else company.company_name
        ),
        "company_name": (
            company_info.company_name if company_info else company.company_name
        ),
        "organization_logo_id": (
            company_info.company_logo_id if company_info else None
        ),
        "company_logo_id": company_info.company_logo_id if company_info else None,
        "country": company_info.country if company_info else "",
        "head_office_state": company_info.head_office_state if company_info else "",
        "currency_code": company_info.currency_code if company_info else "USD",
        "date_format": company_info.date_format if company_info else "MMM DD, YYYY",
        "language": company_info.language if company_info else "en-US",
        "address": company_info.address if company_info else "",
        "city": company_info.city if company_info else "",
        "pin": company_info.pin if company_info else "",
        "admin_name": company_info.admin_name if company_info else company.admin_name,
        "username": company.username,
        "mobile_no": company_info.mobile_no if company_info else company.mobile,
        "email": company_info.email if company_info else company.email,
        "location": company.location,
        "district": company.district,
        "school_code": company.school_code,
        "start_date": company.start_date,
    }


def _serialize_organization_user_full(organization_user):
    if organization_user is None:
        return None

    payload = {}
    for field in organization_user._meta.concrete_fields:
        if field.is_relation:
            payload[field.attname] = getattr(organization_user, field.attname)
        else:
            payload[field.name] = getattr(organization_user, field.name)

    payload["organization_id"] = organization_user.company_id
    payload["company"] = {
        "id": organization_user.company.id,
        "name": organization_user.company.name,
        "email": organization_user.company.email,
        "phone_number": organization_user.company.phone_number,
    } if organization_user.company_id else None
    return payload


def _default_financial_year_range():
    today = timezone.localdate()
    if today.month >= 4:
        start = today.replace(month=4, day=1)
        end = start.replace(year=start.year + 1) - timedelta(days=1)
    else:
        start = today.replace(year=today.year - 1, month=4, day=1)
        end = today.replace(month=3, day=31)
    return start, end


def _parse_report_range(request):
    min_date = (request.query_params.get("min_date") or "").strip()
    max_date = (request.query_params.get("max_date") or "").strip()
    default_start, default_end = _default_financial_year_range()

    try:
        start = timezone.datetime.strptime(
            min_date, "%Y-%m-%d").date() if min_date else default_start
        end = timezone.datetime.strptime(
            max_date, "%Y-%m-%d").date() if max_date else default_end
    except ValueError:
        return None, None, Response(
            {"detail": "Dates must be in YYYY-MM-DD format."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if start > end:
        return None, None, Response(
            {"detail": "min_date cannot be after max_date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return start, end, None


def _resolve_legacy_company(request):
    requested_identifier = (
        request.query_params.get("company_id")
        or request.data.get("company_id")
        or request.query_params.get("organization_id")
        or request.data.get("organization_id")
    )

    company = None
    if requested_identifier:
        company = Companies.objects.filter(
            Q(id=requested_identifier)
            | Q(company_id=requested_identifier)
            | Q(organization_id=requested_identifier)
        ).first()

    if company is None and request.user and request.user.is_authenticated:
        company_user = (
            CompanyUser.objects.select_related("company")
            .filter(username=request.user.username)
            .order_by("id")
            .first()
        )
        if company_user:
            company = company_user.company

    return company


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def legacy_current_user(request):
    user = request.user
    if not user or not user.is_authenticated:
        return Response(
            {"response": False, "msg": "You are not authenticated"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    requested_identifier = (
        request.query_params.get("organization_id")
        or request.query_params.get("company_id")
    )
    company_user_queryset = CompanyUser.objects.select_related("company").filter(
        username=user.username
    )
    if requested_identifier:
        company_user_queryset = company_user_queryset.filter(
            Q(company_id=requested_identifier) | Q(
                organization_id=requested_identifier)
        )

    company_user = company_user_queryset.first()
    if company_user is None:
        return Response(
            {"response": False, "msg": "User not found for company"},
            status=status.HTTP_404_NOT_FOUND,
        )

    company = company_user.company
    company_info = CompanyInfo.objects.filter(company_id=company.id).first()

    return Response(
        {
            "response": True,
            "msg": "You are authenticated",
            "is_superuser": bool(user.is_superuser),
            "user": _serialize_company_user(company_user),
            "permissions": [],
            "applications": [],
            "config": None,
            "company_details": _serialize_company(company),
            "companyInfo": _serialize_company_info(company, company_info),
            "organization_id": company.organization_id,
            "organization_name": company.company_name,
            "companies": [_serialize_company(company)],
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def companies_profit_loss_summary(request):
    if not request.user.is_superuser:
        return Response(
            {"detail": "Only super admins can access company profit and loss reports."},
            status=status.HTTP_403_FORBIDDEN,
        )

    start_date, end_date, error_response = _parse_report_range(request)
    if error_response is not None:
        return error_response

    from account_management.views import _calculate_profit_loss_buckets

    organization_names = {
        str(item["id"]): item["name"]
        for item in Organization.objects.values("id", "name")
    }

    rows = []
    for company in Companies.objects.all().order_by("company_name"):
        buckets = _calculate_profit_loss_buckets(
            company.id,
            start_date,
            end_date,
        )
        income = float(buckets.get("net_income") or 0)
        taxes = float(buckets.get("taxes") or 0)
        expenses = float(buckets.get("expenses") or 0)
        net_profit_loss = round(income + taxes + expenses, 2)

        rows.append(
            {
                "company_id": company.id,
                "company_code": company.company_id,
                "company_name": company.company_name,
                "organization_id": company.organization_id,
                "organization_name": organization_names.get(str(company.organization_id or ""), ""),
                "admin_name": company.admin_name,
                "email": company.email,
                "income": round(income, 2),
                "taxes": round(taxes, 2),
                "expenses": round(expenses, 2),
                "net_profit_loss": net_profit_loss,
                "status": "profit" if net_profit_loss >= 0 else "loss",
            }
        )

    totals = {
        "income": round(sum(row["income"] for row in rows), 2),
        "taxes": round(sum(row["taxes"] for row in rows), 2),
        "expenses": round(sum(row["expenses"] for row in rows), 2),
        "net_profit_loss": round(sum(row["net_profit_loss"] for row in rows), 2),
    }

    return Response(
        {
            "range": {
                "min_date": start_date.isoformat(),
                "max_date": end_date.isoformat(),
            },
            "rows": rows,
            "totals": totals,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def legacy_company_info(request):
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
    organization_user_exists = OrganizationUser.objects.filter(
        user=request.user,
        company_id=company.organization_id,
        is_active=True,
    ).exists()
    if not request.user.is_superuser and company_user is None and not organization_user_exists:
        return Response(
            {"detail": "You do not have access to this organization."},
            status=status.HTTP_403_FORBIDDEN,
        )

    company_info = CompanyInfo.objects.filter(company=company).first()
    payload = _serialize_company_info(company, company_info)

    return Response(
        {
            "response": {
                "organization_info": payload,
                "company_info": payload,
                "organizationInfo": payload,
                "companyInfo": payload,
                "company": _serialize_company(company),
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


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def legacy_update_company_info(request):
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
    organization_user_exists = OrganizationUser.objects.filter(
        user=request.user,
        company_id=company.organization_id,
        is_active=True,
    ).exists()
    if not request.user.is_superuser and company_user is None and not organization_user_exists:
        return Response(
            {"detail": "You do not have access to this organization."},
            status=status.HTTP_403_FORBIDDEN,
        )

    company_info, _created = CompanyInfo.objects.get_or_create(company=company)
    incoming = request.data.copy()
    if hasattr(incoming, "dict"):
        incoming = incoming.dict()

    if "organization_name" in incoming and "company_name" not in incoming:
        incoming["company_name"] = incoming.get("organization_name")
    if "organization_logo_id" in incoming and "company_logo_id" not in incoming:
        incoming["company_logo_id"] = incoming.get("organization_logo_id")
    if "organization_id" not in incoming and company.organization_id:
        incoming["organization_id"] = company.organization_id

    def _normalize_optional(value):
        if value is None:
            return None
        if isinstance(value, str):
            value = value.strip()
            return value if value else None
        return value

    def _has_non_empty(key):
        return _normalize_optional(incoming.get(key)) is not None

    company_user_row = (
        CompanyUser.objects.select_related("company")
        .filter(company=company)
        .filter(Q(is_owner=True) | Q(is_admin=True))
        .order_by("-is_owner", "-is_admin", "id")
        .first()
    )
    if company_user_row is None:
        company_user_row = (
            CompanyUser.objects.select_related("company")
            .filter(company=company)
            .order_by("id")
            .first()
        )

    UserModel = get_user_model()
    linked_auth_user = None
    auth_lookup_values = [
        (company_user_row.username if company_user_row else None),
        company.username,
        request.user.username if request.user and request.user.is_authenticated else None,
        company.email,
    ]
    for candidate in auth_lookup_values:
        candidate_value = str(candidate or "").strip()
        if not candidate_value:
            continue
        linked_auth_user = UserModel.objects.filter(
            Q(username__iexact=candidate_value) | Q(email__iexact=candidate_value)
        ).first()
        if linked_auth_user is not None:
            break

    next_username = _normalize_optional(incoming.get("username")) if _has_non_empty("username") else None
    next_email = _normalize_optional(incoming.get("email")) if _has_non_empty("email") else None
    if isinstance(next_email, str):
        next_email = next_email.lower()
    next_mobile = _normalize_optional(incoming.get("mobile_no")) if _has_non_empty("mobile_no") else None
    next_password = _normalize_optional(incoming.get("password")) if _has_non_empty("password") else None

    if next_username:
        company_user_username_qs = CompanyUser.objects.filter(username__iexact=next_username).exclude(
            company=company
        )
        if company_user_row is not None:
            company_user_username_qs = company_user_username_qs.exclude(id=company_user_row.id)
        if company_user_username_qs.exists():
            return Response(
                {"detail": "This username is already used by another company user."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        auth_username_qs = UserModel.objects.filter(username__iexact=next_username)
        if linked_auth_user is not None:
            auth_username_qs = auth_username_qs.exclude(id=linked_auth_user.id)
        if auth_username_qs.exists():
            return Response(
                {"detail": "This username is already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if next_email:
        company_user_email_qs = CompanyUser.objects.filter(email__iexact=next_email).exclude(
            company=company
        )
        if company_user_row is not None:
            company_user_email_qs = company_user_email_qs.exclude(id=company_user_row.id)
        if company_user_email_qs.exists():
            return Response(
                {"detail": "This email is already used by another company user."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        auth_email_qs = UserModel.objects.filter(email__iexact=next_email)
        if linked_auth_user is not None:
            auth_email_qs = auth_email_qs.exclude(id=linked_auth_user.id)
        if auth_email_qs.exists():
            return Response(
                {"detail": "This email is already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if next_mobile:
        company_user_mobile_qs = CompanyUser.objects.filter(mobile=next_mobile).exclude(company=company)
        if company_user_row is not None:
            company_user_mobile_qs = company_user_mobile_qs.exclude(id=company_user_row.id)
        if company_user_mobile_qs.exists():
            return Response(
                {"detail": "This mobile number is already used by another company user."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        auth_mobile_qs = UserModel.objects.filter(phone_number=next_mobile)
        if linked_auth_user is not None:
            auth_mobile_qs = auth_mobile_qs.exclude(id=linked_auth_user.id)
        if auth_mobile_qs.exists():
            return Response(
                {"detail": "This mobile number is already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

    parsed_start_date = None
    if "start_date" in incoming:
        parsed_start_date, error_response = _parse_iso_date(
            incoming.get("start_date"),
            "start_date",
        )
        if error_response is not None:
            return error_response

    with transaction.atomic():
        for incoming_key, model_field in field_map.items():
            if _has_non_empty(incoming_key):
                value = _normalize_optional(incoming.get(incoming_key))
                if incoming_key == "email" and isinstance(value, str):
                    value = value.lower()
                setattr(company_info, model_field, value)
        company_info.save()

        if _has_non_empty("company_name"):
            company.company_name = _normalize_optional(incoming.get("company_name")) or company.company_name
        if _has_non_empty("admin_name"):
            company.admin_name = _normalize_optional(incoming.get("admin_name")) or company.admin_name
        if _has_non_empty("email"):
            email_value = _normalize_optional(incoming.get("email"))
            company.email = email_value.lower() if isinstance(email_value, str) else email_value
        if _has_non_empty("address"):
            company.address = _normalize_optional(incoming.get("address")) or company.address
        if _has_non_empty("pin"):
            company.pin = _normalize_optional(incoming.get("pin")) or company.pin
        if _has_non_empty("mobile_no"):
            company.mobile = _normalize_optional(incoming.get("mobile_no")) or company.mobile
        if _has_non_empty("main_group"):
            company.main_group = _normalize_optional(incoming.get("main_group")) or company.main_group
        if _has_non_empty("sub_group"):
            company.sub_group = _normalize_optional(incoming.get("sub_group")) or company.sub_group
        if _has_non_empty("school_category"):
            company.school_category = _normalize_optional(incoming.get("school_category")) or company.school_category
        if _has_non_empty("username"):
            company.username = _normalize_optional(incoming.get("username")) or company.username
        if _has_non_empty("location"):
            company.location = _normalize_optional(incoming.get("location")) or company.location
        if _has_non_empty("district"):
            company.district = _normalize_optional(incoming.get("district")) or company.district
        if _has_non_empty("school_code"):
            company.school_code = _normalize_optional(incoming.get("school_code")) or company.school_code
        if parsed_start_date is not None:
            company.start_date = parsed_start_date
        company.save()

        if company_user_row is not None:
            if _has_non_empty("organization_id"):
                company_user_row.organization_id = _normalize_optional(incoming.get("organization_id"))
            if _has_non_empty("admin_name"):
                company_user_row.name = _normalize_optional(incoming.get("admin_name")) or company_user_row.name
            if _has_non_empty("username"):
                company_user_row.username = _normalize_optional(incoming.get("username")) or company_user_row.username
            if _has_non_empty("email"):
                company_user_email = _normalize_optional(incoming.get("email"))
                company_user_row.email = company_user_email.lower() if isinstance(company_user_email, str) else company_user_email
            if _has_non_empty("mobile_no"):
                company_user_row.mobile = _normalize_optional(incoming.get("mobile_no")) or company_user_row.mobile
            if _has_non_empty("address"):
                company_user_row.address = _normalize_optional(incoming.get("address")) or company_user_row.address
            if _has_non_empty("city"):
                company_user_row.city = _normalize_optional(incoming.get("city")) or company_user_row.city
            if _has_non_empty("head_office_state"):
                company_user_row.state = _normalize_optional(incoming.get("head_office_state")) or company_user_row.state
            if _has_non_empty("pin"):
                company_user_row.pin = _normalize_optional(incoming.get("pin")) or company_user_row.pin
            company_user_row.updated_by = getattr(request.user, "username", "") or company_user_row.updated_by
            company_user_row.updated_on = timezone.now()
            company_user_row.save()

        if linked_auth_user is not None:
            user_update_fields = []
            if _has_non_empty("username"):
                linked_auth_user.username = _normalize_optional(incoming.get("username")) or linked_auth_user.username
                user_update_fields.append("username")
            if _has_non_empty("email"):
                user_email = _normalize_optional(incoming.get("email"))
                linked_auth_user.email = user_email.lower() if isinstance(user_email, str) else user_email
                user_update_fields.append("email")
            if _has_non_empty("mobile_no"):
                linked_auth_user.phone_number = _normalize_optional(incoming.get("mobile_no"))
                user_update_fields.append("phone_number")
            if _has_non_empty("admin_name"):
                linked_auth_user.first_name = _normalize_optional(incoming.get("admin_name")) or linked_auth_user.first_name
                user_update_fields.append("first_name")
            if next_password:
                linked_auth_user.set_password(next_password)
                user_update_fields.append("password")
            if user_update_fields:
                linked_auth_user.save(update_fields=user_update_fields)

        _upsert_company_location(company, incoming, request, create_if_missing=True)

        resolved_sub_group = (
            _normalize_optional(incoming.get("sub_group"))
            or company.sub_group
            or ""
        ).lower()
        school_row = School.objects.filter(company=company).order_by("id").first()
        if school_row is not None or resolved_sub_group == "school":
            if school_row is None:
                school_row = School.objects.create(
                    company=company,
                    name=company.company_name,
                    address=company.address or "",
                    city=(
                        _normalize_optional(incoming.get("city"))
                        or company.district
                        or company.location
                        or ""
                    ),
                    state=(
                        _normalize_optional(incoming.get("head_office_state"))
                        or ""
                    ),
                    country=_normalize_optional(incoming.get("country")) or "",
                    postal_code=company.pin or "",
                )

            if _has_non_empty("company_name"):
                school_row.name = _normalize_optional(incoming.get("company_name")) or school_row.name
            if _has_non_empty("address"):
                school_row.address = _normalize_optional(incoming.get("address")) or school_row.address
            if _has_non_empty("city"):
                school_row.city = _normalize_optional(incoming.get("city")) or school_row.city
            if _has_non_empty("head_office_state"):
                school_row.state = _normalize_optional(incoming.get("head_office_state")) or school_row.state
            if _has_non_empty("country"):
                school_row.country = _normalize_optional(incoming.get("country")) or school_row.country
            if _has_non_empty("pin"):
                school_row.postal_code = _normalize_optional(incoming.get("pin")) or school_row.postal_code
            school_row.save()

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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def legacy_company_user_by_username(request, username):
    company_user = (
        CompanyUser.objects.select_related("company")
        .filter(username=username)
        .order_by("id")
        .first()
    )
    if company_user is None:
        return Response(
            {"error": "Username not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "username": username,
            "details": [_serialize_company_user(company_user)],
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def legacy_company_by_username(request, username):
    company = (
        Companies.objects.filter(Q(username=username) | Q(email=username))
        .order_by("id")
        .first()
    )
    if company is None:
        return Response(
            {"error": "Company not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(_serialize_company(company), status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_company_account(request):
    if not _request_user_can_create_company(request):
        return Response(
            {"detail": "You do not have permission to create companies."},
            status=status.HTTP_403_FORBIDDEN,
        )

    payload = request.data or {}
    company_name = str(payload.get("company_name", "")).strip()
    admin_name = str(payload.get("admin_name", "")).strip()
    username = str(payload.get("username", "")).strip().lower()
    email = str(payload.get("email", "")).strip().lower()
    phone_number = str(payload.get("phone_number", "")).strip()
    password = str(payload.get("password", "")).strip()
    address = str(payload.get("address", "")).strip()
    city = str(payload.get("city", "")).strip()
    state_name = str(payload.get("state", "")).strip()
    country = str(payload.get("country", "")).strip()
    pin = str(payload.get("pin", "")).strip()
    main_group = str(payload.get(
        "main_group", payload.get("main_category", ""))).strip()
    sub_group = str(payload.get(
        "sub_group", payload.get("sub_category", ""))).strip()
    school_category = str(payload.get("school_category", "")).strip()
    location = str(payload.get("location", "")).strip()
    district = str(payload.get("district", "")).strip()
    school_code = str(payload.get("school_code", "")).strip()
    start_date, date_error = _parse_iso_date(
        payload.get("start_date"), "start_date")
    if date_error is not None:
        return date_error
    organization_id = payload.get("organization_id")

    required_fields = {
        "organization_id": organization_id,
        "company_name": company_name,
        "admin_name": admin_name,
        "username": username,
        "password": password,
        "main_group": main_group,
        "sub_group": sub_group,
    }
    if sub_group.lower() == "school":
        required_fields["school_category"] = school_category
    missing = [field for field, value in required_fields.items() if not value]
    if missing:
        return Response(
            {"detail": f"Missing required fields: {', '.join(missing)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    organization = Organization.objects.filter(id=organization_id).first()
    if organization is None:
        return Response(
            {"detail": "Selected organization not found."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if Companies.objects.filter(company_name__iexact=company_name).exists():
        return Response(
            {"detail": "A company with this name already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    UserModel = get_user_model()
    if UserModel.objects.filter(username__iexact=username).exists():
        return Response(
            {"detail": "This username is already taken."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if email and UserModel.objects.filter(email__iexact=email).exists():
        return Response(
            {"detail": "This email address is already in use."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if phone_number and UserModel.objects.filter(phone_number=phone_number).exists():
        return Response(
            {"detail": "This phone number is already in use."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if CompanyUser.objects.filter(username__iexact=username).exists():
        return Response(
            {"detail": "This company username is already taken."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    company_code = _generate_company_code(company_name)

    try:
        with transaction.atomic():
            auth_user = UserModel.objects.create_user(
                username=username,
                email=email or None,
                phone_number=phone_number or None,
                password=password,
            )
            auth_user.first_name = admin_name
            auth_user.is_staff = True
            auth_user.save(update_fields=["first_name", "is_staff"])

            company = Companies.objects.create(
                company_name=company_name,
                company_id=company_code,
                organization_id=str(organization.id),
                admin_name=admin_name,
                username=username,
                email=email,
                mobile=phone_number,
                address=address or None,
                pin=pin or None,
                main_group=main_group or None,
                sub_group=sub_group or None,
                school_category=school_category or None,
                location=location or None,
                district=district or None,
                school_code=school_code or None,
                start_date=start_date,
                is_approved=True,
                is_new=False,
                account=bool(payload.get("account", True)),
                billing=bool(payload.get("billing", True)),
                hrm=bool(payload.get("hrm", False)),
                asset=bool(payload.get("asset", False)),
            )

            company_user = CompanyUser.objects.create(
                company=company,
                organization_id=str(organization.id),
                name=admin_name,
                username=username,
                email=email,
                mobile=phone_number,
                address=address or None,
                role="admin",
                is_superuser=False,
                is_admin=True,
                can_access=True,
                is_active=True,
                is_staff=True,
                is_owner=True,
                is_manager=False,
                is_assistant=False,
                firstLoggedIn=False,
            )

            CompanyInfo.objects.update_or_create(
                company=company,
                defaults={
                    "organization_id": str(organization.id),
                    "company_name": company_name,
                    "admin_name": admin_name,
                    "email": email,
                    "mobile_no": phone_number,
                    "address": address,
                    "city": city,
                    "pin": pin,
                    "country": country,
                    "head_office_state": state_name,
                },
            )

            _upsert_company_location(
                company,
                {
                    "location": location,
                    "address": address,
                    "country": country,
                    "state": state_name,
                    "city": city or district or location,
                    "pin": pin,
                    "comments": "",
                },
                request,
                location_name=location,
                create_if_missing=True,
            )

            account_seed_summary = seed_company_chart_of_accounts(
                company_id=company.id,
                username=company_user.username,
            )
    except IntegrityError as exc:
        message = str(exc)
        detail = "Unable to create company because a related record already exists."
        return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    email_warning = None
    try:
        subject = "School Created Successfully"
        message = f"""
            <p>Hello {admin_name},</p>
            <p>Your school has been created successfully.</p>
            <div style="margin:24px 0;padding:20px;border-radius:12px;background:#f4f8fc;border:1px solid #dbe7f3;">
                <p style="margin:0 0 10px 0;"><strong>School name:</strong> {company.company_name}</p>
                <p style="margin:0 0 10px 0;"><strong>Username:</strong> {auth_user.username}</p>
                <p style="margin:0;"><strong>Password:</strong> {password}</p>
            </div>
            <p><strong>Note:</strong> Kindly change your password after your first login.</p>
        """
        sendGenericMailV2(email, subject, message)
    except Exception as exc:
        email_warning = (
            "School created, but onboarding email could not be sent: "
            f"{exc}"
        )

    response_data = {
            "detail": "Company created successfully.",
            "company": {
                "id": company.id,
                "company_name": company.company_name,
                "company_id": company.company_id,
                "organization_id": company.organization_id,
            },
            "user": {
                "id": auth_user.id,
                "username": auth_user.username,
                "email": auth_user.email,
            },
            "company_user": {
                "id": company_user.id,
                "username": company_user.username,
                "organization_id": company_user.organization_id,
            },
            "accounts": account_seed_summary,
        }
    if email_warning:
        response_data["email_warning"] = email_warning

    return Response(response_data, status=status.HTTP_201_CREATED)


class QueryParamTokenAuthentication(JWTAuthentication):
    def get_header(self, request):
        header = super().get_header(request)
        if header is not None:
            return header
        token = request.query_params.get("access_token")
        if token:
            return f"Bearer {token}".encode()
        return None


def _resolve_company_for_request(request):
    username = (getattr(request.user, "username", None) or "").strip()
    email = (getattr(request.user, "email", None) or "").strip()
    if not username and not email:
        return None

    identity_filter = Q()
    if username:
        identity_filter |= Q(username__iexact=username)
    if email:
        identity_filter |= Q(email__iexact=email)

    company_user = CompanyUser.objects.select_related(
        "company").filter(identity_filter).first()
    if company_user and company_user.company:
        return company_user.company

    organization_user = (
        OrganizationUser.objects.select_related("company")
        .filter(
            Q(user=request.user)
            | Q(username__iexact=username)
            | Q(email__iexact=username)
            | Q(email__iexact=email)
        )
        .first()
    )
    if organization_user and organization_user.company:
        return Companies.objects.filter(
            Q(organization_id=organization_user.company.id)
            | Q(id=organization_user.company.id)
        ).first()

    fallback_organization_user = (
        OrganizationUser.objects.select_related("company")
        .filter(user=request.user)
        .first()
    )
    if fallback_organization_user and fallback_organization_user.company:
        return Companies.objects.filter(
            organization_id=fallback_organization_user.company.id
        ).first()

    return None


@api_view(["GET"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def current_school_info(request):
    username = (getattr(request.user, "username", None) or "").strip()
    email = (getattr(request.user, "email", None) or "").strip()
    if not username and not email:
        return Response({"detail": "User not identified."}, status=status.HTTP_400_BAD_REQUEST)

    identity_filter = Q()
    if username:
        identity_filter |= Q(username__iexact=username)
    if email:
        identity_filter |= Q(email__iexact=email)

    company_user = CompanyUser.objects.select_related(
        "company").filter(identity_filter).first()
    organization_user = (
        OrganizationUser.objects.select_related("company")
        .filter(
            Q(user=request.user)
            | Q(username__iexact=username)
            | Q(email__iexact=username)
            | Q(email__iexact=email)
        )
        .first()
    )
    company = None

    if company_user and company_user.company:
        company = company_user.company

    if company is None:
        if organization_user and organization_user.company:
            company = Companies.objects.filter(
                Q(organization_id=organization_user.company.id)
                | Q(id=organization_user.company.id)
            ).first()

    if company is None and organization_user is None:
        organization_user = (
            OrganizationUser.objects.select_related(
                "company").filter(user=request.user).first()
        )
        if organization_user and organization_user.company:
            company = Companies.objects.filter(
                organization_id=organization_user.company.id
            ).first()

    if company is None and organization_user is None:
        return Response({"detail": "Company user not found."}, status=status.HTTP_404_NOT_FOUND)

    organization_user_admin = bool(
        username
        and OrganizationUser.objects.filter(username__iexact=username).exists()
    )

    school = School.objects.filter(
        company=company).first() if company else None

    if company:
        company_payload = {
            "id": company.id,
            "name": company.company_name,
            "school_code": company.school_code,
            "location_name": company.location,

        }
    elif organization_user and organization_user.company:
        organization = organization_user.company
        company_payload = {
            "id": organization.id,
            "name": organization.name or "",
        }
    else:
        company_payload = None

    payload = {
        "username": username or email,
        "company": company_payload,
        "role": company_user.role if company_user else None,
        "is_head_master": company_user.is_head_master if company_user else None,
        "name": company_user.name if company_user else None,
        "organization_user_admin": organization_user_admin,
        "organization_user": _serialize_organization_user_full(organization_user),
        "school": {
            "id": school.id if school else None,
            "name": school.name if school else None,
            "address": school.address if school else "",
            "city": school.city if school else "",
            "state": school.state if school else "",
            "country": school.country if school else "",
            "postal_code": school.postal_code if school else "",
        } if school else None,
    }
    return Response(payload)


@api_view(["GET"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def company_teacher_count(request):
    company = _resolve_company_for_request(request)
    if company is None:
        return Response({"detail": "Company user not found."}, status=status.HTTP_404_NOT_FOUND)

    count = CompanyUser.objects.filter(
        company=company,
        role__iexact="teacher",
        delist=False,
    ).count()

    return Response(
        {
            "company_id": company.id,
            "role": "teacher",
            "count": count,
        }
    )


@api_view(["GET"])
@authentication_classes([QueryParamTokenAuthentication])
@permission_classes([IsAuthenticated])
def company_student_count(request):
    company = _resolve_company_for_request(request)
    if company is None:
        return Response({"detail": "Company user not found."}, status=status.HTTP_404_NOT_FOUND)

    count = CompanyUser.objects.filter(
        company=company,
        role__iexact="student",
        delist=False,
    ).count()

    return Response(
        {
            "company_id": company.id,
            "role": "student",
            "count": count,
        }
    )
