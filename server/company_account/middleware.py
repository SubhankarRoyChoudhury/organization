from __future__ import annotations

import logging
from typing import Any

from django.http import JsonResponse
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from oauth2_provider.models import AccessToken

from company_account.authz import extract_company_ids, get_user_company_ids, normalize_company_id


class CompanyAccessMiddleware(MiddlewareMixin):
    """
    Defense-in-depth middleware to block cross-company access when a bearer token is
    presented with a company identifier. This runs before the view so that even
    non-DRF endpoints are protected.
    """

    def process_view(self, request, view_func, view_args, view_kwargs):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return None

        requested_companies = extract_company_ids(request, view_kwargs=view_kwargs)
        if not requested_companies:
            return None

        token_value = auth_header.split(" ", 1)[1].strip()

        try:
            token = (
                AccessToken.objects.select_related("user")
                .get(token=token_value, expires__gt=timezone.now())
            )
        except AccessToken.DoesNotExist:
            return JsonResponse({"detail": "Invalid or expired token."}, status=401)

        # Ensure request.user is populated for downstream consumers
        if not getattr(request, "user", None) or not request.user.is_authenticated:
            request.user = token.user  # type: ignore[attr-defined]

        allowed = get_user_company_ids(token.user)
        if not requested_companies.issubset(allowed):
            logging.getLogger(__name__).warning(
                "CompanyAccessMiddleware blocked request",
                extra={
                    "user": getattr(token.user, "username", None),
                    "requested_companies": list(requested_companies),
                    "allowed_companies": list(allowed),
                },
            )
            return JsonResponse(
                {"detail": "You do not belong to this company."}, status=403
            )

        # Store the normalized company ID on the request for downstream use
        setattr(request, "company_id", next(iter(requested_companies)))
        return None
