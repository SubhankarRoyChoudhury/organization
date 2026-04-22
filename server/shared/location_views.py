import base64
import os
import re

import pycountry
from babel import Locale
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import Organization, OrganizationUser
from company_account.models import Companies
from shared.models import Attachment


def get_formated_date_pattern(country_code: str):
    locale_candidates = {
        "US": "en_US",
        "IN": "en_IN",
        "GB": "en_GB",
        "AU": "en_AU",
        "CA": "en_CA",
    }
    locale_code = locale_candidates.get(country_code.upper(), "en_US")
    locale = Locale.parse(locale_code)
    date_pattern = str(locale.date_formats["medium"]).replace("y", "Y")
    return date_pattern, locale.language


@api_view(["GET"])
@permission_classes([AllowAny])
def getAllCountries(request):
    countries = []
    try:
        for country in list(pycountry.countries):
            try:
                country_data = dict(country)
                country_numeric = country_data["numeric"]
                alpha_2 = country_data["alpha_2"]
                currency = pycountry.currencies.get(numeric=country_numeric)
                country_data["currency"] = currency.alpha_3 if currency else "-"
                date_pattern = "MMM DD, YYYY"
                language = "en-US"
                try:
                    date_pattern, language = get_formated_date_pattern(alpha_2)
                except Exception:
                    pass
                country_data["date_format"] = date_pattern
                country_data["language"] = language
                countries.append(country_data)
            except AttributeError:
                continue

        countries = sorted(countries, key=lambda item: item["name"])
        return Response({"response": countries, "status": 200}, status=200)
    except Exception as exc:
        return Response({"response": [], "error": str(exc)}, status=500)


@api_view(["GET"])
@permission_classes([AllowAny])
def getAllStates(request, country_code: str = ""):
    try:
        if not country_code:
            return Response({"response": [], "status": 200}, status=200)

        states = [
            dict(state)
            for state in pycountry.subdivisions
            if state.country_code == country_code.upper()
        ]
        states = sorted(states, key=lambda item: item["name"])

        return Response({"response": states, "status": 200}, status=200)
    except Exception as exc:
        return Response({"response": [], "error": str(exc)}, status=500)


@api_view(["POST"])
@permission_classes([AllowAny])
def uploadImageFromAnyWhere(request):
    uploaded_file = request.FILES.get("file")
    username = request.data.get("username")
    company_id = request.data.get("company_id") or request.data.get("cid")

    if not uploaded_file:
        return Response({"response": {"status": False, "msg": "No file provided."}}, status=400)

    organization = None
    if company_id:
        company = Companies.objects.filter(id=company_id).first()
        if company and company.organization_id:
            organization = Organization.objects.filter(id=company.organization_id).first()
        if organization is None:
            organization = Organization.objects.filter(id=company_id).first()

    if organization is None and username:
        organization_user = (
            OrganizationUser.objects.filter(username=username)
            .select_related("company")
            .first()
        )
        organization = organization_user.company if organization_user else None

    if organization is None:
        return Response(
            {"response": {"status": False, "msg": "Organization not found."}},
            status=400,
        )

    safe_name = re.sub(r"[^\w.\-]", "_", uploaded_file.name or "upload")
    relative_dir = f"organization_{organization.id}"
    relative_path = f"{relative_dir}/{safe_name}"
    os.makedirs(settings.MEDIA_ROOT / relative_dir, exist_ok=True)
    saved_path = default_storage.save(relative_path, uploaded_file)

    attachment = Attachment.objects.create(
        company=organization,
        name=safe_name,
        type=uploaded_file.content_type or "application/octet-stream",
        url=saved_path,
        uploaded_by=username or getattr(request.user, "username", "") or "system",
    )

    base_64_image = ""
    absolute_path = settings.MEDIA_ROOT / saved_path
    if absolute_path.exists():
        with open(absolute_path, "rb") as file_handle:
            encoded = base64.b64encode(file_handle.read()).decode("utf-8")
        mime_type = uploaded_file.content_type or "application/octet-stream"
        base_64_image = f"data:{mime_type};base64,{encoded}"

    return Response(
        {
            "response": {
                "status": True,
                "file": {
                    "id": attachment.id,
                    "attachment_id": attachment.id,
                    "name": attachment.name,
                    "url": attachment.url,
                    "base_64_image": base_64_image,
                },
            }
        },
        status=200,
    )
