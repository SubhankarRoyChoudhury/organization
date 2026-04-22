from django.contrib.auth import get_user_model, logout as django_logout
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from accounts.serializers import LoginSerializer
from company_account.models import (
    AppAccessControl,
    Application,
    Companies,
    CompanyInfo,
    CompanyUser,
)


def _get_token_from_request(request):
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()

    request_data = getattr(request, "data", None)
    if hasattr(request_data, "get"):
        token = request_data.get("access_token")
        if token:
            return token

    return request.query_params.get("access_token")


def _get_authenticated_user(request):
    if request.user and request.user.is_authenticated:
        return request.user

    token = _get_token_from_request(request)
    if not token:
        return None

    try:
        payload = AccessToken(token)
    except (InvalidToken, TokenError):
        return None

    user_id = payload.get("user_id")
    if not user_id:
        return None

    return get_user_model().objects.filter(id=user_id).first()


def _get_requested_company_id(request):
    request_data = getattr(request, "data", None)
    data_company_id = None
    if hasattr(request_data, "get"):
        data_company_id = request_data.get("company_id") or request_data.get("organization_id")

    return (
        request.query_params.get("company_id")
        or request.query_params.get("organization_id")
        or data_company_id
    )


def _serialize_company(company):
    return {
        "id": company.id,
        "company_id": company.id,
        "organization_id": company.organization_id,
        "company_name": company.company_name,
        "organization_name": company.company_name,
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
    }


def _serialize_company_info(company):
    company_info = CompanyInfo.objects.filter(company_id=company.id).first()
    return {
        "id": getattr(company_info, "id", None),
        "company_id": company.id,
        "organization_id": company.organization_id,
        "organization_name": getattr(company_info, "company_name", None)
        or company.company_name,
        "company_name": getattr(company_info, "company_name", None)
        or company.company_name,
        "organization_logo_id": getattr(company_info, "company_logo_id", None),
        "company_logo_id": getattr(company_info, "company_logo_id", None),
        "country": getattr(company_info, "country", "") or "",
        "head_office_state": getattr(company_info, "head_office_state", "") or "",
        "currency_code": getattr(company_info, "currency_code", "USD") or "USD",
        "date_format": getattr(company_info, "date_format", "MMM DD, YYYY")
        or "MMM DD, YYYY",
        "language": getattr(company_info, "language", "en-US") or "en-US",
        "address": getattr(company_info, "address", "") or "",
        "city": getattr(company_info, "city", "") or "",
        "pin": getattr(company_info, "pin", "") or "",
        "admin_name": getattr(company_info, "admin_name", None) or company.admin_name,
        "mobile_no": getattr(company_info, "mobile_no", None) or company.mobile,
        "email": getattr(company_info, "email", None) or company.email,
        "company_thumbnail_image_url": None,
        "organization_thumbnail_image_url": None,
        "image_details": [],
    }


def _build_app_permissions(company_id, company_user_id):
    if not company_id or not company_user_id:
        return []

    applications = list(
        Application.objects.values("id", "name", "url", "color", "icon").order_by("id")
    )
    acl_rows = AppAccessControl.objects.filter(
        company_id=company_id,
        user_id=company_user_id,
    ).values(
        "application_id",
        "can_access",
        "can_add",
        "can_edit",
        "can_delete",
        "can_print",
    )
    acl_map = {row["application_id"]: row for row in acl_rows}

    return [
        {
            "app_id": app["id"],
            "name": app.get("name"),
            "url": app.get("url"),
            "color": app.get("color"),
            "icon": app.get("icon"),
            "can_access": bool(acl_map.get(app["id"], {}).get("can_access")),
            "can_add": bool(acl_map.get(app["id"], {}).get("can_add")),
            "can_edit": bool(acl_map.get(app["id"], {}).get("can_edit")),
            "can_delete": bool(acl_map.get(app["id"], {}).get("can_delete")),
            "can_print": bool(acl_map.get(app["id"], {}).get("can_print")),
        }
        for app in applications
    ]


def _get_company_users_for_username(username):
    return CompanyUser.objects.select_related(
        "company",
        "department",
        "doctor_type",
        "administration_type",
        "staff_department",
        "staff_job_title",
    ).filter(username=username)


def _serialize_company_user(company_user):
    return {
        "id": company_user.id,
        "name": company_user.name or "",
        "full_name": company_user.name or "",
        "fatherOrHusband": company_user.fatherOrHusband,
        "aliasName": company_user.aliasName,
        "username": company_user.username,
        "email": company_user.email,
        "mobile": company_user.mobile,
        "phone": company_user.mobile,
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
        "about": company_user.about,
        "address": company_user.address,
        "company_id": company_user.company_id,
        "organization_id": company_user.organization_id or company_user.company.organization_id,
        "user_type": "company_admin"
        if company_user.is_admin or company_user.is_owner
        else (company_user.role or "user"),
        "app_wise_home_pages": company_user.app_wise_home_pages or [],
        "image_url": company_user.image_url or "",
        "profile_image": company_user.image_url or "",
        "department": company_user.department_id,
        "department_name": getattr(company_user.department, "name", "") if company_user.department_id else "",
        "doctor_type": company_user.doctor_type_id,
        "doctor_type_name": getattr(company_user.doctor_type, "name", "") if company_user.doctor_type_id else "",
        "administration_type": company_user.administration_type_id,
        "administration_type_name": getattr(company_user.administration_type, "name", "") if company_user.administration_type_id else "",
        "staff_department": company_user.staff_department_id,
        "staff_department_name": getattr(company_user.staff_department, "name", "") if company_user.staff_department_id else "",
        "staff_job_title": company_user.staff_job_title_id,
        "staff_job_title_name": getattr(company_user.staff_job_title, "name", "") if company_user.staff_job_title_id else "",
    }


def _build_current_user_payload(request, user):
    requested_company_id = _get_requested_company_id(request)
    company_users = _get_company_users_for_username(user.username)
    if requested_company_id:
        company_users = company_users.filter(
            Q(company_id=requested_company_id) | Q(organization_id=requested_company_id)
        )

    active_company_user = company_users.first()
    if active_company_user is None:
        if user.is_superuser:
            return {
                "response": True,
                "msg": "You are authenticated",
                "is_superuser": True,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "name": user.username,
                    "full_name": user.username,
                    "email": user.email,
                    "user_type": "super_admin",
                },
                "companies": [],
                "companyInfo": {},
                "company_details": None,
                "app_permissions": [],
                "role": "super_admin",
                "full_name": user.username,
                "user_type": "super_admin",
            }
        return None

    distinct_companies = []
    seen_company_ids = set()
    for row in _get_company_users_for_username(user.username):
        if row.company_id in seen_company_ids:
            continue
        seen_company_ids.add(row.company_id)
        distinct_companies.append(_serialize_company(row.company))

    serialized_user = _serialize_company_user(active_company_user)
    serialized_company = _serialize_company(active_company_user.company)
    serialized_company_info = _serialize_company_info(active_company_user.company)
    app_permissions = _build_app_permissions(
        active_company_user.company_id,
        active_company_user.id,
    )

    return {
        "response": True,
        "msg": "You are authenticated",
        "is_superuser": bool(user.is_superuser or active_company_user.is_superuser),
        "user": serialized_user,
        "permissions": [],
        "applications": [],
        "config": None,
        "company_details": serialized_company,
        "companyInfo": serialized_company_info,
        "company_id": active_company_user.company_id,
        "organization_id": active_company_user.organization_id
        or active_company_user.company.organization_id,
        "organization_name": active_company_user.company.company_name,
        "companies": distinct_companies,
        "role": serialized_user["role"],
        "user_type": serialized_user["user_type"],
        "full_name": serialized_user["full_name"],
        "profile_image": serialized_user["profile_image"],
        "image_url": serialized_user["image_url"],
        "department_name": serialized_user["department_name"],
        "doctor_type_name": serialized_user["doctor_type_name"],
        "administration_type_name": serialized_user["administration_type_name"],
        "staff_department_name": serialized_user["staff_department_name"],
        "staff_job_title_name": serialized_user["staff_job_title_name"],
        "app_permissions": app_permissions,
    }


def _require_authenticated_user(request):
    user = _get_authenticated_user(request)
    if user is None:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return user


@api_view(["POST"])
@permission_classes([AllowAny])
def legacy_token_login(request):
    login_identifier = request.data.get("username") or request.data.get("login")
    password = request.data.get("password")
    serializer = LoginSerializer(
        data={"login": login_identifier, "password": password}
    )
    try:
        serializer.is_valid(raise_exception=True)
    except ValidationError:
        return Response(
            {"error_description": "Invalid credentials."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = serializer.validated_data["user"]
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "is_superuser": bool(user.is_superuser),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def legacy_logout(request):
    user = _get_authenticated_user(request)
    if request.user and request.user.is_authenticated:
        django_logout(request)
    return Response(
        {
            "detail": "Logged out successfully",
            "had_authenticated_user": bool(user),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def legacy_user_info(request):
    user = _require_authenticated_user(request)
    if isinstance(user, Response):
        return user

    payload = _build_current_user_payload(request, user)
    if payload is None:
        requested_username = request.data.get("username") or user.username
        return Response(
            {"detail": f"Hospital user details not found for {requested_username}"},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def legacy_doctor_companies(request, username):
    company_users = _get_company_users_for_username(username)
    seen_company_ids = set()
    companies = []
    for company_user in company_users:
        if company_user.company_id in seen_company_ids:
            continue
        seen_company_ids.add(company_user.company_id)
        companies.append(_serialize_company(company_user.company))
    return Response(companies, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def legacy_company_user_details_by_username(request, username):
    details = [_serialize_company_user(item) for item in _get_company_users_for_username(username)]
    if not details:
        return Response({"error": "Username not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response({"username": username, "details": details}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def legacy_get_current_user(request):
    user = _require_authenticated_user(request)
    if isinstance(user, Response):
        return user

    payload = _build_current_user_payload(request, user)
    if payload is None:
        return Response(
            {"response": False, "msg": "User not found for company"},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(payload, status=status.HTTP_200_OK)


def _resolve_current_company_user(request):
    user = _get_authenticated_user(request)
    if user is None:
        return None

    requested_company_id = _get_requested_company_id(request)
    company_users = _get_company_users_for_username(user.username)
    if requested_company_id:
        company_users = company_users.filter(
            Q(company_id=requested_company_id) | Q(organization_id=requested_company_id)
        )
    return company_users.first()


@api_view(["GET"])
@permission_classes([AllowAny])
def legacy_get_all_active_company_users(request):
    current_company_user = _resolve_current_company_user(request)
    if current_company_user is None:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    users = CompanyUser.objects.select_related(
        "department",
        "doctor_type",
        "administration_type",
        "staff_department",
        "staff_job_title",
    ).filter(
        company_id=current_company_user.company_id,
        is_active=True,
        delist=False,
    ).order_by("name")

    return Response(
        {"response": [_serialize_company_user(item) for item in users]},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def legacy_get_app_access_matrix(request, access_for, id):
    current_company_user = _resolve_current_company_user(request)
    if current_company_user is None:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    applications = list(
        Application.objects.values("id", "name", "url", "color", "icon").order_by("id")
    )
    filters = {"company_id": current_company_user.company_id}
    if access_for == "user":
        filters["user_id"] = id
    else:
        filters["group_id"] = id

    acl_rows = AppAccessControl.objects.filter(**filters).values(
        "application_id",
        "can_access",
        "can_add",
        "can_edit",
        "can_delete",
        "can_print",
    )
    acl_map = {row["application_id"]: row for row in acl_rows}

    response_rows = []
    for app in applications:
        row = acl_map.get(app["id"], {})
        response_rows.append(
            {
                "app_id": app["id"],
                "name": app.get("name"),
                "url": app.get("url"),
                "color": app.get("color"),
                "icon": app.get("icon"),
                "can_access": bool(row.get("can_access")),
                "can_add": bool(row.get("can_add")),
                "can_edit": bool(row.get("can_edit")),
                "can_delete": bool(row.get("can_delete")),
                "can_print": bool(row.get("can_print")),
            }
        )

    return Response({"response": response_rows}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def legacy_update_app_access_control(request):
    current_company_user = _resolve_current_company_user(request)
    if current_company_user is None:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    payload = request.data or {}
    access_for = payload.get("access_for")
    target_id = payload.get("id") or payload.get("user_id") or payload.get("group_id")
    permissions = payload.get("permissions", [])

    if access_for not in ("user", "group"):
        return Response(
            {"error": "access_for must be user or group"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not target_id:
        return Response({"error": "id is required"}, status=status.HTTP_400_BAD_REQUEST)

    for permission in permissions:
        app_id = permission.get("app_id") or permission.get("application_id")
        if not app_id:
            continue

        filters = {
            "company_id": current_company_user.company_id,
            "application_id": app_id,
            "user_id": target_id if access_for == "user" else None,
            "group_id": target_id if access_for == "group" else None,
        }
        defaults = {
            "can_access": bool(permission.get("can_access")),
            "can_add": bool(permission.get("can_add")),
            "can_edit": bool(permission.get("can_edit")),
            "can_delete": bool(permission.get("can_delete")),
            "can_print": bool(permission.get("can_print")),
        }
        AppAccessControl.objects.update_or_create(defaults=defaults, **filters)

    return Response({"response": True}, status=status.HTTP_200_OK)
