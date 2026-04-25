from __future__ import annotations

from rest_framework.permissions import BasePermission

from company_account.authz import extract_company_ids, get_user_company_ids


class IsAuthenticatedCompanyMember(BasePermission):
    """
    DRF permission enforcing:
      1) User must be authenticated
      2) If a company_id is provided anywhere on the request, it must belong to the user
    """

    message = "You do not belong to this company."

    def has_permission(self, request, view) -> bool:
        """
        Allow OAuth-authenticated users whose supplied company identifiers
        (including CRM company PKs) belong to them.
        """
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        requested_companies = extract_company_ids(request, view=view)

        # If no company context was provided, authentication alone is sufficient.
        if not requested_companies:
            return True

        allowed_companies = get_user_company_ids(user)

        # Some CRM endpoints pass the CRM company primary key in `company`.
        # Map those to their owning `Companies.company_id` so legitimate users
        # are not blocked by the extra identifier.
        translated_companies = set()
        for cid in requested_companies:
            if cid in allowed_companies:
                translated_companies.add(cid)
                continue

            crm_company_id = None
            try:
                from customer_management.models import CrmCompany  # local import to avoid circulars

                crm_company_id = (
                    CrmCompany.objects.filter(pk=cid).values_list("company_id", flat=True).first()
                )
            except Exception:
                crm_company_id = None

            if crm_company_id is not None:
                translated_companies.add(crm_company_id)
            else:
                translated_companies.add(cid)

        if translated_companies.issubset(allowed_companies):
            setattr(request, "company_id", next(iter(translated_companies)))
            return True

        return False
