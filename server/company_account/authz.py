from __future__ import annotations

from typing import Any, Optional, Set, List

from django.contrib.auth.models import AnonymousUser
from django.db.models import Q

from company_account.models import CompanyUser


def normalize_company_id(raw: Any) -> Optional[Any]:
    """
    Normalize company identifiers so we can safely compare values that might
    arrive as strings, integers, or UUID-like strings.
    """
    if raw is None:
        return None
    # Trim whitespace from string-ish inputs
    if isinstance(raw, str):
        raw = raw.strip()
    # Try to coerce numeric IDs to int; fall back to the cleaned string
    try:
        return int(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return str(raw)


def get_user_company_ids(user: Any) -> Set[Any]:
    """
    Return the set of company IDs a user belongs to, combining:
      • the FK `company_id` on each CompanyUser row
    """
    if not user or isinstance(user, AnonymousUser):
        return set()

    username = getattr(user, "username", None)
    email = getattr(user, "email", None)

    company_users = (
        CompanyUser.objects.filter(
            Q(username=username) | Q(email=username) | Q(email=email)
        )
        .select_related("company")
        .only("company_id", "company__company_id")
    )

    allowed: Set[Any] = set()
    for company_user in company_users:
        # Add the primary company for the row
        normalized_primary = normalize_company_id(company_user.company_id)
        if normalized_primary is not None:
            allowed.add(normalized_primary)

        # Also include the human-facing company identifier stored on Companies.company_id
        # so requests that pass that value are accepted.
        business_id = normalize_company_id(
            getattr(company_user.company, "company_id", None)
        )
        if business_id is not None:
            allowed.add(business_id)

    return allowed


def extract_company_ids(request, view=None, view_kwargs=None) -> Set[Any]:
    """
    Collect every company identifier supplied on the request, including
    variants like `main_company` / `main_company_id`, so we can enforce
    that all provided IDs belong to the authenticated user.
    """
    candidates: List[Any] = []

    def _push(value: Any) -> None:
        norm = normalize_company_id(value)
        if norm is not None:
            candidates.append(norm)

    # URL kwargs (works for DRF APIView and function-based views)
    for kwargs in (view_kwargs, getattr(view, "kwargs", None)):
        if kwargs:
            for key in ("company_id", "main_company", "main_company_id"):
                if key in kwargs:
                    _push(kwargs.get(key))

    # Headers
    header_keys = (
        "HTTP_X_COMPANY_ID",
        "HTTP_COMPANY_ID",
        "HTTP_X_TENANT",
        "HTTP_X_MAIN_COMPANY_ID",
    )
    for header in header_keys:
        value = request.META.get(header)
        if value:
            _push(value)

    # Query parameters
    query_sources = [
        getattr(request, "query_params", None),
        getattr(request, "GET", None),
    ]
    query_keys = (
        "company_id",
        "companyId",
        "company",
        "main_company",
        "main_company_id",
        "mainCompany",
    )
    for source in query_sources:
        if source:
            for key in query_keys:
                value = source.get(key)
                if value:
                    _push(value)

    # Body payload (only works for DRF Request objects where `.data` is populated)
    if hasattr(request, "data"):
        for key in query_keys:
            value = request.data.get(key)  # type: ignore[attr-defined]
            if value:
                _push(value)

    return set(candidates)
