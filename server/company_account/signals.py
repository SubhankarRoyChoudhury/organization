from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.utils import timezone

from .models import ActivityLog, CompanyUser


def _resolve_organization(company_user):
    if company_user is None:
        return None
    org_id = company_user.organization_id or getattr(
        company_user.company, "organization_id", None
    )
    if not org_id:
        return None
    try:
        org_id = int(org_id)
    except (TypeError, ValueError):
        return None
    try:
        from accounts.models import Organization
    except Exception:
        return None
    return Organization.objects.filter(id=org_id).first()


def get_company_user_id(username):
    company_user = (
        CompanyUser.objects.filter(username=username).values("id").first()
    )
    if company_user:
        return company_user["id"]
    return None


def get_activity_token(request):
    if request is not None:
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            return auth_header.split(" ", 1)[1].strip()

        if getattr(request, "session", None) is not None:
            session_key = request.session.session_key
            if session_key:
                return f"session:{session_key}"

    return f"login:{timezone.now().timestamp()}"


@receiver(user_logged_in)
def handle_login(sender, request, user, **kwargs):
    now = timezone.now()
    active_user = get_user_model().objects.filter(pk=user.pk).first()
    if active_user:
        active_user.last_login = now
        active_user.save(update_fields=["last_login"])

    company_user_id = get_company_user_id(user.username)
    if company_user_id:
        company_user = CompanyUser.objects.filter(id=company_user_id).select_related("company").first()
        ActivityLog.objects.create(
            company_user_id=company_user_id,
            organization=_resolve_organization(company_user),
            token=get_activity_token(request),
            active_from=now,
        )


@receiver(user_logged_out)
def handle_logout(sender, request, user, **kwargs):
    if user is None:
        return

    company_user_id = get_company_user_id(user.username)
    if not company_user_id:
        return

    now = timezone.now()
    token = get_activity_token(request)
    activity = (
        ActivityLog.objects.filter(
            company_user_id=company_user_id,
            token=token,
            active_to__isnull=True,
        )
        .order_by("-active_from")
        .first()
    )
    if activity is None:
        activity = (
            ActivityLog.objects.filter(
                company_user_id=company_user_id,
                active_to__isnull=True,
            )
            .order_by("-active_from")
            .first()
        )

    if activity:
        activity.active_to = now
        activity.save(update_fields=["active_to"])
