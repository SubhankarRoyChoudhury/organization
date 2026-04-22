

import re
import traceback
from datetime import datetime
from django.core.files.storage import FileSystemStorage
from botocore.exceptions import NoCredentialsError
from django.core.exceptions import ObjectDoesNotExist
from functools import reduce
from rest_framework import status
from rest_framework.views import APIView
from storages.backends.gcloud import GoogleCloudStorage
from google.cloud import secretmanager, storage
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from botocore.exceptions import ClientError
import boto3
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from io import BytesIO
from babel import Locale
from babel.dates import format_date
import pycountry
import logging
from weasyprint import HTML
from django.db import transaction
from django.http import FileResponse, HttpResponse, HttpResponseNotFound
from django.apps import apps
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Q
from pdf2image import convert_from_path
import filetype
from rest_framework.decorators import api_view
import pandas as pd
from rest_framework.response import Response
import io
import tempfile
import base64
from calendar import Calendar
import calendar
from itertools import chain
from typing import List
import requests
from rest_framework.request import Request
from django.conf import settings
import json
from datetime import date, datetime, timedelta
from accounts.models import Organization, OrganizationUser, UserGroup
from company_account.models import CompanyUser, Companies

# from history_management.views import createHistoryForUpdate, getEntityDetails
from shared.serializers import CompartmentSerializer, LocationSerializer, SubLocationSerializer
from shared.models import Attachment, AutoSuggestionModule, Compartment, Location, LocationDesignationRate, MailFrequency, ChartConfig, SubLocation
from django.shortcuts import render
from django.core.files.storage import FileSystemStorage, default_storage
from PIL import Image
from django.contrib.auth.decorators import login_required
import os
from dotenv import load_dotenv
load_dotenv()
# from account.views import getUserDetails
# from icalendar import Calendar, Event


storage = GoogleCloudStorage()


MEDIA_PATH = f"{str(settings.MEDIA_ROOT).rstrip('/')}/"


# create your views here.
def getCompanyId(request):
    username = (getattr(request.user, "username", "") or "").strip()
    email = (getattr(request.user, "email", "") or "").strip()

    organization_user = OrganizationUser.objects.filter(
        Q(user=request.user)
        | Q(username__iexact=username)
        | Q(email__iexact=username)
        | Q(email__iexact=email)
    ).values("company_id").first()
    if organization_user:
        company = Companies.objects.filter(
            organization_id=str(organization_user["company_id"])
        ).values("id").first()
        if company:
            return company["id"]
        return None

    company_user = CompanyUser.objects.filter(
        Q(username__iexact=username) | Q(email__iexact=email)
    ).values("company_id", "company__organization_id").first()
    if company_user:
        return company_user.get("company_id")

    return None


# ---------------- LOCATION -------------------


class LocationAPI(APIView):
    def get(self, request):
        company_id = getCompanyId(request)
        id = request.GET.get('id', None)
        try:
            if id is not None:
                location = Location.objects.get(id=id)
                try:
                    serializer = LocationSerializer(location)
                except Exception as e:
                    print(e)
                    return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                locations = Location.objects.filter(
                    Q(company_id=company_id)
                )
                try:
                    serializer = LocationSerializer(locations, many=True)
                except Exception as e:
                    print(e)
                    return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'response': serializer.data}, status=200)
        except ObjectDoesNotExist as e:
            print(e)
            return Response(repr(e.args[0]), status=500)
        except Exception as e:
            print(e)
            return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            newLocation = json.loads(request.data['formData_json'])
            serializer = LocationSerializer(data=newLocation)

            if serializer.is_valid():
                serializer.save()
                return Response({'response': 'Location created'}, status=status.HTTP_201_CREATED)

            # Handle validation errors gracefully
            error_message = serializer.errors.get('__all__')
            if error_message:
                return Response(error_message[0], status=status.HTTP_400_BAD_REQUEST)

            # Return field-specific errors directly
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            print(f"Unexpected error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, format=None):
        newLocation = json.loads(request.data['formData_json'])
        id = newLocation['id']
        if not id:
            return Response({"error": "ID is required to update a location"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            existing_location = Location.objects.get(id=id)
        except ObjectDoesNotExist:
            return Response({"error": "Location not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            serializer = LocationSerializer(
                existing_location, data=newLocation, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'response': 'Location updated'}, status=status.HTTP_200_OK)

            error_message = serializer.errors.get('__all__')
            if error_message:
                return Response(error_message[0], status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Unexpected error: {e}")
            return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubLocationAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        id = request.GET.get('id', None)
        company_id = getCompanyId(request)
        try:
            if id is not None:
                sub_location = SubLocation.objects.get(id=id)
                try:
                    serializer = SubLocationSerializer(sub_location)
                except Exception as e:
                    print(e)
                    return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                sub_locations = SubLocation.objects.filter(
                    Q(company_id=company_id)
                )
                try:
                    serializer = SubLocationSerializer(
                        sub_locations, many=True)
                except Exception as e:
                    print(e)
                    return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'response': serializer.data}, status=200)
        except ObjectDoesNotExist as e:
            print(e)
            return Response(repr(e.args[0]), status=500)
        except Exception as e:
            print(e)
            return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            newSubLocation = json.loads(request.data['formData_json'])
            serializer = SubLocationSerializer(data=newSubLocation)

            if serializer.is_valid():
                sub = serializer.save()
                return Response({'response': 'Sub Location created', 'id': sub.id}, status=status.HTTP_201_CREATED)

            # Handle validation errors gracefully
            error_message = serializer.errors.get(
                '__all__')  # Get all errors if present
            print('Error ==>', error_message)
            if error_message:
                return Response(error_message[0], status=status.HTTP_400_BAD_REQUEST)
            else:
                # Provide more specific error message if individual field errors exist
                specific_errors = serializer.errors.as_json()
                return Response(specific_errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            # Catch unexpected errors and provide a generic error message
            print(f"Unexpected error: {e}")
            return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, format=None):
        newSubLocation = json.loads(request.data['formData_json'])
        id = newSubLocation['id']

        if not id:
            return Response({"error": "ID is required to update sub location"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            existing_location = SubLocation.objects.get(id=id)
        except ObjectDoesNotExist:
            return Response({"error": "Sub Location not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            serializer = SubLocationSerializer(
                existing_location, data=newSubLocation, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'response': 'Sub Location updated'}, status=status.HTTP_200_OK)

            error_message = serializer.errors.get('__all__')
            if error_message:
                return Response(error_message[0], status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Unexpected error: {e}")
            return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompartmentAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        id = request.GET.get('id', None)
        try:
            if id is not None:
                compartment = Compartment.objects.get(id=id)
                try:
                    serializer = CompartmentSerializer(compartment)
                except Exception as e:
                    print(e)
                    return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                company_id = getCompanyId(request)
                compartments = Compartment.objects.filter(
                    Q(company_id=company_id)
                )
                try:
                    serializer = CompartmentSerializer(compartments, many=True)
                except Exception as e:
                    print(e)
                    return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'response': serializer.data}, status=200)
        except ObjectDoesNotExist as e:
            print(e)
            return Response(repr(e.args[0]), status=500)
        except Exception as e:
            print(e)
            return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            newCompartment = json.loads(request.data['formData_json'])

            serializer = CompartmentSerializer(data=newCompartment)

            if serializer.is_valid():
                sub = serializer.save()
                return Response({'response': 'Compartment created', 'id': sub.id}, status=status.HTTP_201_CREATED)

            # Handle validation errors gracefully
            error_message = serializer.errors.get(
                '__all__')  # Get all errors if present
            print('Error ==>', error_message)
            if error_message:
                return Response(error_message[0], status=status.HTTP_400_BAD_REQUEST)
            else:
                # Provide more specific error message if individual field errors exist
                specific_errors = serializer.errors.as_json()
                return Response(specific_errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            # Catch unexpected errors and provide a generic error message
            print(f"Unexpected error: {e}")
            return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, format=None):
        newCompartment = json.loads(request.data['formData_json'])
        id = newCompartment['id']

        if not id:
            return Response({"error": "ID is required to update compartment"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            existing_location = Compartment.objects.get(id=id)
        except ObjectDoesNotExist:
            return Response({"error": "Compartment not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            serializer = CompartmentSerializer(
                existing_location, data=newCompartment, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'response': 'Compartment updated'}, status=status.HTTP_200_OK)

            error_message = serializer.errors.get('__all__')
            if error_message:
                return Response(error_message[0], status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Unexpected error: {e}")
            return Response(e.args[0], status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def getAutoSuggestionList(request):
    try:
        search_text = request.GET.get('item', '')

        if search_text:
            # Split the search text into words
            search_words = search_text.split()

            # Build the Q objects for each word and each field
            query_conditions = [
                Q(**{f"{field}__icontains": word})
                for word in search_words
                for field in ['type', 'notes']
            ]

            # Combine the Q objects with OR
            combined_query = reduce(lambda x, y: x | y, query_conditions)

            # Filter the queryset using the combined Q object
            suggestion_list = AutoSuggestionModule.objects.filter(combined_query).values(
                'type',
                'src',
                'notes'
            ).distinct('src', 'notes')

        return Response({'response': suggestion_list}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(repr(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getLocationListMinimalDetails(request):
    company_id = getCompanyId(request)
    try:
        location_list = Location.objects.filter(
            Q(company_id=company_id)
        ).values(
            'id',
            'name',
            'address',
            'city',
            'country',
            'pin',
            'created_by',
            'created_on'
        ).order_by('name')

        return Response({'response': location_list}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(repr(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def getAllDesginationRtIds(request, location_id=''):
    company_id = getCompanyId(request)
    try:
        queryset = LocationDesignationRate.objects.filter(
            company_id=company_id
        ).filter(
            location_id=location_id
        ).values(
            'id',
            'designation',
            'start_date',
            'basic_rate',
            'allowance',
            'incentive',
            'gross_monthly_rate',
            'ot_rate',
            'salary_type'
        ).order_by(
            '-id'
        )

        return Response({'response': queryset}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(repr(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def getAllEmployeeList(request):
    company_id = getCompanyId(request)
    print("Company ID fetched:", company_id)

    try:
        if not company_id:
            return Response({"error": "company_id missing or invalid"}, status=400)

        queryset = LocationDesignationRate.objects.filter(company_id=company_id).values(
            'id', 'name', 'father_name', 'emp_id'
        ).order_by('-id')

        return Response({'response': list(queryset)}, status=200)
    except Exception as e:
        print("error =>", e)
        return Response({'error': str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, ])
def getLocationDesignationRates(request, table_identity=''):
    company_id = getCompanyId(request)
    # location = request.data['location_id']
    try:
        queryset = LocationDesignationRate.objects.filter(
            company_id=company_id
        ).values(
        ).order_by(
            '-start_date'
        )

        # else:
        #     queryset = LocationDesignationRate.objects.filter(
        #         Q(company_id=company_id) &
        #         Q(location_id=location)
        #     ).values(
        #     ).order_by(
        #         '-start_date'
        #     )

        chart_details = None
        if table_identity:
            chart_details = ChartConfig.objects.filter(
                Q(company_id=company_id) &
                Q(username=request.user.username) &
                Q(chart_identity=table_identity)
            ).values()

        return Response({'response': queryset, 'chart_details': chart_details}, status=status.HTTP_200_OK)
    except Exception as e:
        print('Error=>', e.args[0])
        return Response(repr(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getDesignationRates(request):
    """
    Fetch all Location Designation Rates for the logged-in user's company.
    """
    try:
        company_id = getCompanyId(request)

        # ✅ Filter by company
        queryset = (
            LocationDesignationRate.objects.filter(company_id=company_id)
            .select_related("location")  # optional, improves performance
            .order_by("-start_date")
            .values(
                "id",
                "company_id",
                "location_id",
                "designation",
                "designation_code",
                "start_date",
                "basic_rate",
                "allowance",
                "incentive",
                "gross_monthly_rate",
                "ot_rate",
                "salary_type",
                "note",
                "created_by",
                "created_on",
                "updated_by",
                "updated_on",
            )
        )

        return Response({"response": list(queryset)}, status=status.HTTP_200_OK)

    except Exception as e:
        print("Error in getLocationDesignationRates =>", e)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, ])
def getLocationDesignationDetails(request, id: int = 0):
    company_id = getCompanyId(request)
    try:
        queryset = LocationDesignationRate.objects.filter(
            company_id=company_id,
            id=id
        ).values().first()

        return Response({'response': queryset}, status=status.HTTP_200_OK)
    except Exception as e:
        print('Error=>', e.args[0])
        return Response(repr(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, ])
def addNewLocationDesignation(request):
    newLocationDesignation_json = json.loads(
        request.data['newLocationDesignation_json'])
    try:
        newJob = LocationDesignationRate.objects.create(
            **newLocationDesignation_json)
        # newJob.save()
        response = 'Location designation rate added successfully'
        return Response({'response': response, 'status': 200}, status=200)
    except Exception as e:
        response = e.args[0]
        print("Error occured as => \n", e.args)
        return Response(e.args[0], status=500)


# @api_view(['GET', 'POST', 'PUT'])
# @permission_classes([IsAuthenticated, ])
# def updateLocationDesignation(request):
#     company_id = getCompanyId(request)
#     newJobDesignation_json = json.loads(request.data['newJobDesignation_json'])
#     response = 'Error'
#     try:

#         # Getting new entity snapshot
#         before_changed = getEntityDetails(
#             'shared', 'LocationDesignationRate', newJobDesignation_json['id'])

#         if (request.data['purpose'] == 'update'):
#             newJob = LocationDesignationRate.objects.filter(
#                 id=newJobDesignation_json['id']
#             ).update(**newJobDesignation_json)
#             response = 'Location Designation rate updated successfully'

#         # Getting new entity snapshot
#         after_changed = getEntityDetails(
#             'shared', 'LocationDesignationRate', newJobDesignation_json['id'])

#         # creating History
#         createHistoryForUpdate(request, 'shared', 'LocationDesignationRate',
#                                newJobDesignation_json['id'], company_id, before_changed, after_changed, request.data)
#         return Response({'response': response}, status=200)
#     except Exception as e:
#         print("error as => ", e.args)
#         response = e.args[0]
#         return Response({'response': response}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getCompartmentsList(request, sub_location_id=0):
    company_id = getCompanyId(request)
    try:
        compartments = Compartment.objects.filter(
            Q(company_id=company_id) &
            Q(sub_location_id=sub_location_id)
        ).values(
            'id',
            'name'
        ).order_by(
            'name'
        )

        return Response({'response': compartments}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response(e.args[0], status=500)


# ---------------- LOCATION END ----------------


def get_all_app_names():
    app_names = []

    # Get a list of all the apps in the project
    app_list = apps.get_app_configs()

    # Extract the app names
    app_names = [app.name for app in app_list if not 'django' in app.name]

    return app_names


def get_models_from_app_name(app_name: str):
    model_names = []

    # Get a list of all the models in the app
    app_models = apps.get_app_config(app_name).get_models()

    # Extract the model names
    model_names = [model.__name__ for model in app_models]

    return model_names


def getAllModels():
    # Call the function to get the list of model names with app names
    models = []
    app_names = get_all_app_names()

    for app in app_names:
        # Getting models form app
        model_names = get_models_from_app_name(app)

        for model in model_names:
            id_field_name = 'id'
            model_name = app + '_' + model

            # Getting ModelBase from app and model name
            models.append(apps.get_model(app, model))

    return models


def getImageFromFileName(company_id: str, file_name: str) -> str:

    file_location = MEDIA_PATH + company_id + '/' + file_name
    try:
        with open(file_location, 'rb') as f:
            base64_bytes = 'data:image/png;base64,' + \
                base64.b64encode(f.read()).decode('utf-8')
            return base64_bytes
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return None


def getUserDetails(request):
    # print(request.user.username)
    user_details = dict()
    try:
        user_details = OrganizationUser.objects.filter(
            username=request.user.username
        ).values(
            'id',
            'company_id',
            'company__company_id',
            'name',
            'fatherOrHusband',
            'aliasName',
            'username',
            'email',
            'mobile',
            'image_url',
            'attachment_id',
            'registrationDate',
            'is_superuser',
            'is_admin',
            'is_active',
            'is_staff',
            'is_owner',
            'is_manager',
            'is_assistant',
            'excellency_point',
        ).first()
        if user_details['attachment_id']:
            user_details['image_url'] = getImageAsBase64(
                request, user_details['attachment_id'])
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("user_details error => ", e)
    # print(f' User Details => {user_details}')
    return user_details


# def getImageAsBase64(request: Request, entity_id: int):
#     attachment = None
#     if entity_id:
#         attachment = Attachment.objects.filter(
#             Q(id=entity_id) &
#             Q(thumbnail=True)
#         ).values('url').first()

#     if attachment:
#         conpany_id_string = getCompanyIdString(request)
#         file_location = MEDIA_PATH + \
#             conpany_id_string + '/thumbnails/' + attachment['url']
#         print("file_location<<<",file_location)

#         try:
#             with open(file_location, 'rb') as f:
#                 base64_bytes = 'data:image/png;base64,' + \
#                     base64.b64encode(f.read()).decode('utf-8')
#                 return base64_bytes
#         except Exception as e:
#             logging.getLogger("error_logger").error(repr(e))
#             return None

#     return None

# import base64
# import logging
# import boto3
# from django.db.models import Q
# from rest_framework.request import Request
# from urllib.parse import urlparse
# from botocore.exceptions import ClientError

# # Optional: adjust expiry duration
# PRESIGNED_URL_EXPIRY = 3600  # 1 hour

# def getImageAsBase64(request: Request, entity_id: int):
#     attachment = None
#     if entity_id:
#         attachment = Attachment.objects.filter(
#             Q(id=entity_id) & Q(thumbnail=True)
#         ).values('url').first()

#     if attachment:
#         url = attachment['url'].strip()

#         # If it's an S3/external URL
#         if url.startswith('http://') or url.startswith('https://'):
#             print("S3 or external image URL:", url)

#             try:
#                 # Parse bucket and key from the URL
#                 parsed = urlparse(url)
#                 bucket_name = parsed.netloc.split('.')[0]  # 'phenx-owl-erp'
#                 object_key = parsed.path.lstrip('/')       # 'GLitchtech/thumbnails/download.jpeg'

#                 # Create a boto3 client with your AWS credentials
#                 s3_client = boto3.client(
#                     's3',
#                     aws_access_key_id='YOUR_AWS_ACCESS_KEY_ID',
#                     aws_secret_access_key='YOUR_AWS_SECRET_ACCESS_KEY',
#                     region_name='ap-south-1'  # update if different
#                 )

#                 # Generate pre-signed URL
#                 presigned_url = s3_client.generate_presigned_url(
#                     'get_object',
#                     Params={'Bucket': bucket_name, 'Key': object_key},
#                     ExpiresIn=PRESIGNED_URL_EXPIRY
#                 )

#                 print("Generated presigned S3 URL:", presigned_url)
#                 return presigned_url

#             except ClientError as e:
#                 logging.getLogger("error_logger").error(f"S3 error: {str(e)}")
#                 return None

#         try:
#             # Handle local file
#             company_id_string = getCompanyIdString(request)
#             file_location = MEDIA_PATH + company_id_string + '/thumbnails/' + url
#             print("Local image file path:", file_location)

#             with open(file_location, 'rb') as f:
#                 base64_bytes = 'data:image/png;base64,' + \
#                     base64.b64encode(f.read()).decode('utf-8')
#                 return base64_bytes

#         except Exception as e:
#             logging.getLogger("error_logger").error(repr(e))
#             return None

#     return None

def get_file_as_base64_from_s3(object_key):
    s3_client = boto3.client('s3', region_name=os.getenv('AWS_S3_REGION_NAME'))
    bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
    try:
        print(f"Attempting to retrieve object from S3: {object_key}")
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        return 'data:image/png;base64,' + base64.b64encode(response['Body'].read()).decode('utf-8')
    except NoCredentialsError:
        logging.getLogger("error_logger").error("AWS credentials not found")
        raise Exception("AWS credentials not found")
    except s3_client.exceptions.NoSuchKey:
        logging.getLogger("error_logger").error(
            f"File not found in S3: {object_key}")
        raise FileNotFoundError(f"File not found: {object_key}")
    except ClientError as e:
        error_message = e.response.get(
            "Error", {}).get("Message", "Unknown error")
        logging.getLogger("error_logger").error(
            f"Error fetching file from S3: {error_message}")
        raise Exception(f"Error fetching file from S3: {error_message}")


def getImageAsBase64(request: Request, entity_id: int):
    attachment = None
    if entity_id:
        attachment = Attachment.objects.filter(
            Q(id=entity_id) &
            Q(thumbnail=True)
        ).values('url').first()
    if attachment:
        conpany_id_string = getCompanyIdString(request)
        if not conpany_id_string:
            return None
        file_location = os.path.join(
            MEDIA_PATH,
            conpany_id_string,
            'thumbnails',
            attachment['url']
        )
        print(f"File location: {file_location}")
        try:
            if os.getenv('AWS_S3_INDENTITY'):
                # Use S3 to get the file as base64
                object_key = file_location.replace(MEDIA_PATH, '').lstrip('/')
                print(f"Object key for S3: {object_key}")
                return get_file_as_base64_from_s3(object_key)
            else:
                # Use local filesystem to get the file as base64
                with open(file_location, 'rb') as f:
                    base64_bytes = 'data:image/png;base64,' + \
                        base64.b64encode(f.read()).decode('utf-8')
                    return base64_bytes
        except FileNotFoundError:
            logging.getLogger("error_logger").error(
                f"File not found: {file_location}")
            return None
        except Exception as e:
            logging.getLogger("error_logger").error(f"Exception: {str(e)}")
            return None
    return None
# @login_required
# def get_company_id(request):
#     user = request.user.username
#     print(f'User {user}')
#     company = OrganizationUser.objects.filter(username=user).values()[0]
#     if company:
#         return company['company_id']
#     else:
#         return None


def get_company_id(request):
    try:
        if hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
            username = request.user.username
        else:
            # Fallback for unauthenticated requests
            username = request.data.get(
                "username") or request.POST.get("username")

        print(f'get_company_id → username: {username}')
        company_user = CompanyUser.objects.filter(
            username=username).values().first()
        if company_user:
            return company_user['company_id']
        organization_user = OrganizationUser.objects.filter(
            username=username).values().first()
        if organization_user:
            return organization_user['company_id']
        return None
    except Exception as e:
        print("get_company_id error:", e)
        return None


def getCompanyIdString(request):
    user = None
    if hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
        user = request.user.username
    else:
        user = (
            request.data.get("username")
            or request.POST.get("username")
            or None
        )

    if user:
        company = OrganizationUser.objects.filter(
            username=user
        ).values(
            'company__name'
        ).first()
        if company:
            return company['company__name']

    company_id = None
    if hasattr(request, "query_params"):
        company_id = request.query_params.get("company_id")
    if not company_id:
        company_id = (
            request.GET.get("company_id")
            or request.data.get("company_id")
            or request.data.get("cid")
            or request.POST.get("company_id")
            or request.POST.get("cid")
        )

    if company_id:
        try:
            company = Organization.objects.filter(
                id=int(company_id)
            ).values('name').first()
            if company:
                return company['name']
        except (TypeError, ValueError):
            return None

    return None


# def saveToFileModel(request, name, filename, content_type, is_image,cid):
#     company_id = get_company_id(request)

#     final_company_id = company_id if company_id else cid
#     uploaded_by = (
#         request.user.username
#         if request.user and request.user.is_authenticated
#         else request.data.get("username", "unknown")
#     )
#     try:
#         file = Attachment.objects.create(
#             company_id=final_company_id ,
#             name=name,
#             type=content_type,
#             url=filename,
#             thumbnail=is_image,
#             uploaded_by=uploaded_by
#         )
#         return file
#     except Exception as e:
#         print('Error occured as ====\n', e.args)
#         return None

def saveToFileModel(request, name, filename, content_type, is_image, cid):
    company_id = get_company_id(request)
    final_company_id = company_id if company_id else cid
    uploaded_by = request.user.username if request.user.username else request.data.get(
        "username")

    print("request.user.username", request.user.username)
    print("username", request.data.get("username"))

    try:

        print("Final uploaded_by =>", uploaded_by)

        file = Attachment.objects.create(
            company_id=final_company_id,
            name=name,
            type=content_type,
            url=filename,
            thumbnail=is_image,
            uploaded_by=uploaded_by,
        )
        return file
    except Exception as e:
        print('Error occured as ====\n', e)
        return None


def updateRelatedModel(request, app, model, entity_id, attachment_id):
    try:
        model = apps.get_model(app, model)
        print("model => ", model)
        attachments = model.objects.filter(
            id=entity_id
        ).values(
            'attachment_ids'
        )
        print("Previous attached => ", attachments)

        if attachments:
            attachments = attachments[0]['attachment_ids']
            if attachments:
                attachments.append(attachment_id)
            else:
                attachments = [attachment_id]

        print("New attachment list => ", type(attachments), attachments)

        model.objects.filter(
            id=entity_id
        ).update(
            attachment_ids=attachments
        )
    except Exception as e:
        print("Error occured as ", e.args)
    # print(data)


# @api_view(['POST'])
# # @csrf_exempt
# @login_required
# def uploadImageFromAnyWhere(request):
#     company_id = get_company_id(request)
#     context = dict()
#     context['status'] = False

#     company_details = OrganizationUser.objects.filter(
#             username=request.user.username
#         ).values('company__company_id').first()

#     if request.FILES:
#         try:
#             file = request.FILES["file"]
#             print('File => ', file)
#             print('File => ', file.name)
#             if not os.getenv('GAE_APPLICATION', None):

#                 # if not os.path.exists(MEDIA_PATH + company_details['company__company_id']):
#                 #     os.makedirs(
#                 #         MEDIA_PATH + company_details['company__company_id'], exist_ok=True)

#                 directory_path = MEDIA_PATH + \
#                     company_details['company__company_id']
#                 try:
#                     os.makedirs(directory_path, exist_ok=True)
#                     print(
#                         f"Directory '{directory_path}' created successfully.")
#                 except OSError as e:
#                     print(f"Error creating directory '{directory_path}': {e}")

#                 fs = FileSystemStorage(
#                     MEDIA_PATH + company_details['company__company_id'])
#                 filename = '_'.join((file.name).split(' '))
#                 filename = fs.save(filename, file)

#                 uploaded_file_url = fs.url(filename)

#                 print('file => ', file.content_type)
#                 print(filename)
#                 print('uploaded_file_url => ', uploaded_file_url, uploaded_file_url[1:])
#                 context['image_url'] = filename
#                 is_image = False

#                 # Creating and Saving thumbnail image
#                 try:
#                     if not os.path.exists(MEDIA_PATH + company_details['company__company_id'] + '/thumbnails'):
#                         # os.makedirs(
#                         #     MEDIA_PATH + company_details['company__company_id'] + '/thumbnails', exist_ok=True)

#                         directory_path = MEDIA_PATH + \
#                             company_details['company__company_id'] + \
#                             '/thumbnails'
#                         try:
#                             os.makedirs(directory_path, exist_ok=True)
#                             print(
#                                 f"Directory '{directory_path}' created successfully.")
#                         except OSError as e:
#                             print(
#                                 f"Error creating directory '{directory_path}': {e}")

#                     image = Image.open(
#                         MEDIA_PATH + company_details['company__company_id'] + '/' + filename)

#                     image.thumbnail((90, 90))
#                     image.save(MEDIA_PATH + company_details['company__company_id'] +
#                                '/thumbnails/' + filename)
#                     is_image = True
#                 except Exception as e:
#                     print("\n\nnot an image ", e)

#                 # If PDF
#                 if file.content_type == 'application/pdf':
#                     try:
#                         print("File url => ", MEDIA_PATH +
#                               company_details['company__company_id'] + '/' + filename)
#                         # pages = convert_from_path('.' + uploaded_file_url, 10)
#                         pages = convert_from_path(
#                             MEDIA_PATH + company_details['company__company_id'] + '/' + filename, 10)
#                         print('pages => ', pages, len(pages))
#                         if len(pages):
#                             print('filename => ', filename)
#                             # Save pages as pages in the pdf
#                             pages[0].save(MEDIA_PATH + company_details['company__company_id'] + '/thumbnails/' +
#                                           '.'.join(filename.split('.')[0:-1]) + '.jpg', 'JPEG')
#                             is_image = True

#                     except Exception as e:
#                         print(
#                             'Exception occured in application/pdf section as => ', e.args[0])

#                 try:
#                     file_id = (
#                         saveToFileModel(
#                             request,
#                             file.name,
#                             filename,
#                             file.content_type,
#                             is_image
#                             )
#                         )
#                     print('File uploaded => ', file_id)
#                     context['file'] = Attachment.objects.filter(
#                         id=file_id.id
#                     ).values().first()
#                     context['status'] = True
#                     # if file_id:
#                     #     updateRelatedModel(
#                     #         request, app, model, entity_id, file_id.id)
#                 except Exception as e:
#                     print(f"Error as {e.args}")
#                     print("seems it is also not attachment")
#             else:
#                 destination = str(
#                     int(datetime.now().timestamp() * 1000000)
#                 ) + '_' + file.name

#                 storage_client = storage.Client()
#                 strg_bucket = storage_client.bucket(
#                     'media-owl-erp')
#                 blob = strg_bucket.blob(destination)

#                 blob.upload_from_string(
#                     file.file.read(),
#                     content_type=file.content_type)

#                 url = blob.public_url
#                 print("url => ", url)
#                 context['image_url'] = url

#         except Exception as e:
#             print(e)
#             context['msg'] = e.args[0]
#             context['status'] = False
#     return Response({'response': context}, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def uploadImageFromAnyWhere(request):
    company_id = get_company_id(request)
    context = {"status": False}
    username = request.data.get('username')
    cid = request.data.get('cid')

    print("req??", request.data)

    # Retrieve organization/company details
    organization = None
    company = None

    company_user = CompanyUser.objects.filter(
        username=username or request.user.username
    ).select_related("company").first()
    if company_user:
        company = company_user.company
        if company and company.organization_id:
            organization = Organization.objects.filter(
                id=company.organization_id
            ).first()

    if organization is None:
        organization_user = OrganizationUser.objects.filter(
            username=username or request.user.username
        ).select_related("company").first()
        if organization_user:
            organization = organization_user.company

    if organization is None and cid:
        company = Companies.objects.filter(id=cid).first()
        if company and company.organization_id:
            organization = Organization.objects.filter(
                id=company.organization_id).first()
        if organization is None:
            organization = Organization.objects.filter(id=cid).first()

    if organization is None and company is None:
        context['msg'] = "Company details not found."
        return Response({'response': context}, status=400)

    if not company_id and cid:
        try:
            company_id = int(cid)
        except (TypeError, ValueError):
            company_id = cid

    if request.FILES:
        try:
            file = request.FILES.get("file")
            if not file:
                return Response({'response': {"msg": "No file provided."}}, status=400)

            # Sanitize filename
            filename = re.sub(r'[^\w\-_\.]', '_', file.name)
            is_image = file.content_type.startswith('image/')

            # Validate company details
            if company is not None:
                company_name = company.company_name
            elif organization is not None:
                company_name = organization.name
            else:
                company_name = None
            company_name = str(company_name or f"company_{cid or company_id}")
            company_id = company_name
            print("uploadImageFromAnyWhere -> company_folder:", company_name)

            # AWS S3 Upload Logic
            if os.getenv('AWS_S3_INDENTITY'):
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID_S3'),
                    aws_secret_access_key=os.getenv(
                        'AWS_SECRET_ACCESS_KEY_S3'),
                    region_name=os.getenv('AWS_S3_REGION_NAME')
                )
                bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')

                # Capture file content entirely
                file_content = file.read()
                s3_key = f"{company_id}/{filename}"

                # Upload original file to S3
                s3_client.upload_fileobj(
                    BytesIO(file_content),
                    bucket_name,
                    s3_key,
                    ExtraArgs={'ContentType': file.content_type}
                )
                s3_url = f"https://{bucket_name}.s3.{os.getenv('AWS_S3_REGION_NAME')}.amazonaws.com/{s3_key}"
                context['image_url'] = s3_url
                print("imgurl = ", s3_url)
                print("uploaded_s3_key = ", s3_key)

                # Thumbnail generation for images

                try:
                    # Open image from byte content
                    image = Image.open(BytesIO(file_content))
                    # Generate thumbnail
                    image.thumbnail((90, 90))
                    thumbnail_buffer = BytesIO()
                    image_format = image.format or "JPEG"
                    image.save(thumbnail_buffer, format=image_format)
                    thumbnail_buffer.seek(0)

                    # Upload thumbnail to S3
                    thumbnail_key = f"{company_id}/thumbnails/{filename}"
                    s3_client.upload_fileobj(
                        thumbnail_buffer,
                        bucket_name,
                        thumbnail_key,
                        ExtraArgs={
                            'ContentType': f"image/{image_format.lower()}"}
                    )
                    thumbnail_url = f"https://{bucket_name}.s3.{os.getenv('AWS_S3_REGION_NAME')}.amazonaws.com/{thumbnail_key}"
                    context['thumbnail_url'] = thumbnail_url
                    print("thumbnail_url = ", thumbnail_url)

                except Exception as thumbnail_error:
                    print(f"Thumbnail Error from s3: {thumbnail_error}")
                    context['thumbnail_error s3'] = str(thumbnail_error)

                # If PDF
                if file.content_type in ['application/pdf', 'application/x-pdf']:
                    # try:
                    #     pages = convert_from_path(
                    #         company_details['company__company_id'] + '/' + filename, 10)
                    #     print('pages => ', pages, len(pages))
                    #     if len(pages):
                    #         print('filename => ', filename)
                    #         # Save pages as pages in the pdf
                    #         pages[0].save(company_details['company__company_id'] + '/thumbnails/' +
                    #                     '.'.join(filename.split('.')[0:-1]) + '.jpg', 'JPEG')

                    #         is_image = True

                    # except Exception as e:
                    #     print(
                    #         'Exception occured in application/pdf section as => ', e.args[0])
                    try:
                        with tempfile.NamedTemporaryFile(delete=True, suffix=".pdf") as temp_pdf:
                            temp_pdf.write(file_content)
                            temp_pdf.flush()

                            # Convert PDF to image (1st page)
                            pages = convert_from_path(temp_pdf.name, dpi=72)
                            if pages:
                                thumbnail_buffer = BytesIO()
                                pages[0].save(thumbnail_buffer, format="JPEG")
                                thumbnail_buffer.seek(0)

                                # Upload thumbnail to S3
                                thumbnail_key = f"{company_id}/thumbnails/{filename.split('.')[0]}.jpg"
                                s3_client.upload_fileobj(
                                    thumbnail_buffer,
                                    bucket_name,
                                    thumbnail_key,
                                    ExtraArgs={'ContentType': "image/jpeg"}
                                )
                                thumbnail_url = f"https://{bucket_name}.s3.{os.getenv('AWS_S3_REGION_NAME')}.amazonaws.com/{thumbnail_key}"
                                context['thumbnail_url'] = thumbnail_url
                                print("thumbnail_url = ", thumbnail_url)
                    except Exception as pdf_error:
                        print(f"PDF Thumbnail Error: {pdf_error}")
                        context['pdf_thumbnail_error'] = str(pdf_error)

                # saveToFileModel
                try:
                    attachment_org_id = (
                        organization.id if organization is not None else cid
                    )
                    file_id = (
                        saveToFileModel(
                            request,
                            file.name,
                            filename,
                            file.content_type,
                            is_image,
                            attachment_org_id,
                        )
                    )
                    print('File uploaded => ', file_id)
                    if not file_id:
                        context['msg'] = "Failed to save attachment record."
                        context['status'] = False
                        return Response({'response': context}, status=500)
                    context['file'] = Attachment.objects.filter(
                        id=file_id.id
                    ).values().first()
                    context['attachment_id'] = file_id.id
                    context['status'] = True
                except Exception as e:
                    print(f"Error as {e.args}")
                    print("seems it is also not attachment")

            else:
                # Local storage
                if request.FILES:

                    file = request.FILES["file"]
                    print('File => ', file)
                    print('File => ', file.name)
                    if not os.getenv('GAE_APPLICATION', None):

                        # if not os.path.exists(MEDIA_PATH + company_details['company__company_id']):
                        #     os.makedirs(
                        #         MEDIA_PATH + company_details['company__company_id'], exist_ok=True)

                        base_dir = os.path.join(
                            settings.MEDIA_ROOT,
                            company_name
                        )
                        directory_path = base_dir
                        try:
                            if not os.path.isdir(directory_path):
                                os.makedirs(directory_path, exist_ok=True)
                                print(
                                    f"Directory '{directory_path}' created successfully.")
                        except OSError as e:
                            print(
                                f"Error creating directory '{directory_path}': {e}")

                        fs = FileSystemStorage(
                            base_dir)
                        filename = '_'.join((file.name).split(' '))
                        filename = fs.save(filename, file)

                        uploaded_file_url = fs.url(filename)

                        print('file => ', file.content_type)
                        print(filename)
                        print('uploaded_file_url => ',
                              uploaded_file_url, uploaded_file_url[1:])
                        print('uploaded_file_path => ',
                              os.path.join(base_dir, filename))
                        context['image_url'] = filename
                        is_image = False

                        # Creating and Saving thumbnail image
                        try:
                            thumbnails_dir = os.path.join(
                                base_dir, 'thumbnails')
                            if not os.path.isdir(thumbnails_dir):
                                # os.makedirs(
                                #     MEDIA_PATH + company_details['company__company_id'] + '/thumbnails', exist_ok=True)

                                directory_path = thumbnails_dir
                                try:
                                    if not os.path.isdir(directory_path):
                                        os.makedirs(directory_path,
                                                    exist_ok=True)
                                        print(
                                            f"Directory '{directory_path}' created successfully.")
                                except OSError as e:
                                    print(
                                        f"Error creating directory '{directory_path}': {e}")

                            image = Image.open(
                                os.path.join(base_dir, filename))

                            image.thumbnail((90, 90))
                            image.save(os.path.join(thumbnails_dir, filename))
                            is_image = True
                        except Exception as e:
                            print("\n\nnot an image ", e)

                        # If PDF
                        if file.content_type == 'application/pdf':
                            try:
                                print("File url => ", MEDIA_PATH +
                                      company_name + '/' + filename)
                                # pages = convert_from_path('.' + uploaded_file_url, 10)
                                pages = convert_from_path(
                                    os.path.join(base_dir, filename), 10)
                                print('pages => ', pages, len(pages))
                                if len(pages):
                                    print('filename => ', filename)
                                    # Save pages as pages in the pdf
                                    pages[0].save(
                                        os.path.join(
                                            thumbnails_dir,
                                            '.'.join(filename.split(
                                                '.')[0:-1]) + '.jpg'
                                        ),
                                        'JPEG'
                                    )
                                    is_image = True

                            except Exception as e:
                                print(
                                    'Exception occured in application/pdf section as => ', e.args[0])

                        try:
                            attachment_org_id = (
                                organization.id if organization is not None else cid
                            )
                            file_id = (
                                saveToFileModel(
                                    request,
                                    file.name,
                                    filename,
                                    file.content_type,
                                    is_image,
                                    attachment_org_id,
                                )
                            )
                            print('File uploaded => ', file_id)
                            if not file_id:
                                context['msg'] = "Failed to save attachment record."
                                context['status'] = False
                                return Response({'response': context}, status=500)
                            context['file'] = Attachment.objects.filter(
                                id=file_id.id
                            ).values().first()
                            context['attachment_id'] = file_id.id
                            context['status'] = True
                            # if file_id:
                            #     updateRelatedModel(
                            #         request, app, model, entity_id, file_id.id)
                        except Exception as e:
                            print(f"Error as {e.args}")
                            print("seems it is also not attachment")
                    else:
                        destination = str(
                            int(datetime.now().timestamp() * 1000000)
                        ) + '_' + file.name

                        storage_client = storage.Client()
                        strg_bucket = storage_client.bucket(
                            'media-owl-erp')
                        blob = strg_bucket.blob(destination)

                        blob.upload_from_string(
                            file.file.read(),
                            content_type=file.content_type)

                        url = blob.public_url
                        print("url => ", url)
                        context['image_url'] = url

        except Exception as e:
            print("uploadImageFromAnyWhere error:", e)
            traceback.print_exc()
            context['msg'] = str(e) or "Unexpected upload error."
            context['status'] = False
    return Response({'response': context}, status=200)


def get_formated_date_pattern(country_code: str):

    try:
        locale = Locale.parse('en_' + country_code, sep='_')
    except:
        try:
            locale = Locale.parse('und_' + country_code, sep='_')
        except:
            locale = 'en_US'

    d = date(2345, 11, 22)
    # "full", "long", "medium", or "short"
    formated_date = format_date(
        d, format='short', locale=locale)
    formated_date = formated_date.replace('.', '').replace(
        '/', '').replace('-', '').replace(' ', '')
    formated_date = formated_date.replace(
        '45', '2345') if formated_date.find('2345') == -1 else formated_date

    day_pos = str(formated_date.find('22'))
    month_pos = str(formated_date.find('11'))
    year_pos = str(formated_date.find('2345'))

    format_type = day_pos + month_pos + year_pos

    date_format = 'YYYY MMM, DD' if format_type == '640' else 'MMM DD, YYYY' if format_type == '204' else 'DD MMM, YYYY'

    # print(f'{formated_date} =>  {date_format} => {format_type} => {locale}')
    locale = str(locale).replace('_', '-')
    return date_format, locale


@api_view(['GET'])
@permission_classes([AllowAny])
def getAllCountries(request):
    countries = []
    try:
        for country in list(pycountry.countries):
            try:
                country = dict(country)
                country_numeric = country['numeric']
                alpha_2 = country['alpha_2']
                currency = pycountry.currencies.get(
                    numeric=country_numeric)
                country['currency'] = currency.alpha_3 if currency else '-'
                # Find the most common locale for the country
                date_pattern = 'MMM DD, YYYY'
                language = 'en-US'
                try:
                    # date_pattern = get_date_format(str(locale))
                    date_pattern, language = get_formated_date_pattern(alpha_2)
                except Exception as e:
                    print("Error as => ", e.args)
                country['date_format'] = date_pattern
                country['language'] = language
                countries.append(country)
            except AttributeError as e:
                print(
                    f"No currency information available for '{country['name']}' {e.args}.")

        countries = sorted(countries, key=lambda d: d['name'])

        return Response({'response': countries, 'status': 200}, status=200)
    except Exception as e:
        return Response(e.args, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def getAllStates(request, country_code: str = ''):
    states = []
    try:
        if not country_code:
            return Response({'response': [], 'status': 200}, status=200)

        states = [
            dict(state)
            for state in pycountry.subdivisions
            if state.country_code == country_code.upper()
        ]

        states = sorted(states, key=lambda d: d['name'])

        return Response({'response': states, 'status': 200}, status=200)
    except Exception as e:
        print(e.args)
        return Response(e.args, status=500)


@api_view(['GET', 'POST'])
@login_required
def getStates(request, country=''):
    print(country)
    try:
        # querySet = State.objects.annotate(
        #     states_name=Concat(
        #         'state_name', Cast('state_no', output_field=CharField())
        #     )
        # ).filter(
        #     Q(country__country_name=country)
        # ).order_by('state_name')
        states_name = State.objects.raw(
            '''
                SELECT
                    states.id, CONCAT(state_name, ' (', state_no, ')') as states_name
                FROM
                    public.shared_state states
                JOIN
                    public.shared_country country
                ON
                    states.country_id=country.id
                WHERE
                    country.country_name= '{}'
                ORDER BY state_name
            '''.format(country)
        )

        state_names = []
        for state in states_name:
            # dictn = {
            #     'state_name': state.states_name
            # }
            state_names.append(state.states_name)
        print(state_names)
        return Response({'response': state_names, 'status': 200}, status=200)
    except Exception as e:
        print("GetState Error : ", e.args[0])
        return Response(e.args, status=500)


@api_view(['POST'])
@login_required
def sendReports(request):
    print(request.data)

    # Replace sender@example.com with your "From" address.
    # This address must be verified with Amazon SES.
    SENDER = os.getenv('SENDER')

    # Replace recipient@example.com with a "To" address. If your account
    # is still in the sandbox, this address must be verified.
    # RECIPIENT = "saurabh.sarkar@phenx.io"
    RECIPIENT = request.data['email']
    # RECIPIENT = "temp.rahul01@gmail.com"

    # Specify a configuration set. If you do not want to use a configuration
    # set, comment the following variable, and the
    # ConfigurationSetName=CONFIGURATION_SET argument below.
    # CONFIGURATION_SET = "ConfigSet"

    # If necessary, replace us-west-2 with the AWS Region you're using for Amazon SES.
    AWS_REGION = os.getenv('AWS_REGION')

    # The subject line for the email.
    SUBJECT = "Weekly Report"

    # The full path to the file that will be attached to the email.
    ATTACHMENT = "/home/rahul/Downloads/test.pdf"

    # The email body for recipients with non-HTML email clients.
    BODY_TEXT = "Hello,\r\nPlease see the attached file."

    # The HTML body of the email.
    BODY_HTML = """\
        <html>
        <head></head>
        <body>
        <h1>Hello There!</h1>
        <p>Your Weekly Report...</p>
        <link>https://www.phenx.io</link>
        </body>
        </html>
    """

    # The character encoding for the email.
    CHARSET = "utf-8"

    # Create a new SES resource and specify a region.
    # client = boto3.client('ses', region_name=AWS_REGION)
    client = boto3.client('ses', aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                          aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'), region_name=AWS_REGION)

    # Create a multipart/mixed parent container.
    msg = MIMEMultipart('mixed')
    # Add subject, from and to lines.
    msg['Subject'] = SUBJECT
    msg['From'] = SENDER
    msg['To'] = RECIPIENT

    # Create a multipart/alternative child container.
    msg_body = MIMEMultipart('alternative')

    # Encode the text and HTML content and set the character encoding. This step is
    # necessary if you're sending a message with characters outside the ASCII range.
    textpart = MIMEText(BODY_TEXT.encode(CHARSET), 'plain', CHARSET)
    htmlpart = MIMEText(BODY_HTML.encode(CHARSET), 'html', CHARSET)

    # Add the text and HTML parts to the child container.
    msg_body.attach(textpart)
    msg_body.attach(htmlpart)
    att = MIMEApplication(open(ATTACHMENT, 'rb').read())
    att.add_header('Content-Disposition', 'attachment',
                   filename=os.path.basename(ATTACHMENT))

    msg.attach(msg_body)
    msg.attach(att)
    try:
        response = client.send_raw_email(
            Source=SENDER,
            Destinations=[
                RECIPIENT
            ],
            RawMessage={
                'Data': msg.as_string()
            }
        )
    except ClientError as e:
        print(e.response['Error']['Message'])
        return Response({'msg': e.response['Error']['Message'], 'status': 200}, status=200)
    else:
        print("Email sent! Message ID:"),
        print(response['MessageId'])
        return Response({'msg': "Email sent!", 'status': 200}, status=200)


def removeFileFromMedia(request, filename):

    company_details = OrganizationUser.objects.filter(
        username=request.user.username).values('company__company_id').first()

    folder_name = company_details['company__company_id']

    try:
        if os.path.exists(MEDIA_PATH + folder_name + '/' + filename):
            os.remove(
                MEDIA_PATH + folder_name + '/' + filename)
            print(f'{filename} deleted')
        if os.path.exists(MEDIA_PATH + folder_name + '/thumbnails/' + filename):
            os.remove(
                MEDIA_PATH + folder_name + '/thumbnails/' + filename)
            print(f'{filename} deleted')
        return True
    except Exception as e:
        print(e)
        return False


@api_view(['POST'])
def deleteFileFromMedia(request):
    print(request.file_name)


@api_view(['POST'])
def sendUsernamePassword(request):
    user_details = getUserDetails(request)
    print(request.data)
    email = request.data['email']
    subject = "Username or password"
    body = f"""
        Hello There!
        <h3>Your username is :\t"""+str(request.data['username'] + '.' +
                                        user_details['company__company_id']).lower().strip()+"""</h3>
        <h3>And password is :\t"""+request.data['password']+"""</h3>
        <h3>Please reset your password immediately</h3>
    """
    sendGenericMailV2(email, subject, body)
    return Response({'msg': "Email sent!", 'status': 200}, status=200)


@api_view(['POST'])
@login_required
def add_new_subscribe(request):
    print(request.data)
    newFrequency_json = json.loads(request.data['newFrequency_json'])
    try:
        newFrequency = MailFrequency.objects.create(**newFrequency_json)
        response = 'Frequency added successfully'
        return Response({
            'id': newFrequency.id,
            'response': response,
            'status': 200
        }, status=200)
    except Exception as e:
        response = e.args[0]
        print(response)
        return Response(e.args, status=500)


@api_view(['POST'])
@login_required
def get_previous_subscribe(request):
    company_id = get_company_id(request)
    print(request.data)
    table_name = request.data['table_name']
    table_id = request.data['table_id']
    try:
        querySet = MailFrequency.objects.filter(
            Q(company_id=company_id) &
            Q(table_name=table_name) &
            Q(table_id=table_id)
        ).values()
        return Response(querySet, status=200)
    except Exception as e:
        response = e.args[0]
        print(response)
        return Response(e.args, status=500)


def get_admin_manager_mail(company_id):
    try:
        mail_ids = list(OrganizationUser.objects.filter(
            Q(company_id=company_id) &
            Q(is_admin=True) |
            Q(is_manager=True)
        ).values_list('email', flat=True))
    except Exception as e:
        response = e.args
        print(response)
    return mail_ids


def send_asset_inspection_mail(mail_ids, asset):
    print()
    print(mail_ids)
    asset_type = asset[0]['asset_type']
    asset_name = asset[0]['asset_name']
    asset_token = asset[0]['asset_token']

    # print(datetime.now())
    # print(type(mail_ids))

    # Replace sender@example.com with your "From" address.
    # This address must be verified with Amazon SES.
    SENDER = os.getenv('SENDER')

    # Replace recipient@example.com with a "To" address. If your account
    # is still in the sandbox, this address must be verified.

    for mail_id in mail_ids:
        RECIPIENT = mail_id

        # Specify a configuration set. If you do not want to use a configuration
        # set, comment the following variable, and the
        # ConfigurationSetName=CONFIGURATION_SET argument below.
        # CONFIGURATION_SET = "ConfigSet"

        # If necessary, replace us-west-2 with the AWS Region you're using for Amazon SES.
        AWS_REGION = os.getenv('AWS_REGION')

        # The subject line for the email.
        SUBJECT = "Asset Inspection "

        # The full path to the file that will be attached to the email.
        # ATTACHMENT = ""

        # The email body for recipients with non-HTML email clients.
        BODY_TEXT = "Tomorrow is inspection date of  "+asset_type+" : " + \
            asset_name+". Token No. : " + asset_token + "Please inspect."

        # The HTML body of the email.
        BODY_HTML = """\
            <html>
            <head></head>
            <body>
            <h1>Hello There!</h1>
            <p>Tomorrow is inspection date of  """+asset_type+""" : """+asset_name+""".</p>
            <p>Token No. : """ + asset_token + """</p>
            <p>Please inspect tomorrow.</p>
            <link>https://www.phenx.io</link>
            </body>
            </html>
        """

        # The character encoding for the email.
        CHARSET = "utf-8"

        # Create a new SES resource and specify a region.
        # client = boto3.client('ses', region_name=AWS_REGION)
        client = boto3.client('ses', aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                              aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'), region_name=AWS_REGION)

        # Create a multipart/mixed parent container.
        msg = MIMEMultipart('mixed')
        # Add subject, from and to lines.
        msg['Subject'] = SUBJECT
        msg['From'] = SENDER

        # print('msg => ', msg)
        # msg['To'] = RECIPIENT

        # Create a multipart/alternative child container.
        msg_body = MIMEMultipart('alternative')

        # Encode the text and HTML content and set the character encoding. This step is
        # necessary if you're sending a message with characters outside the ASCII range.
        textpart = MIMEText(BODY_TEXT.encode(CHARSET), 'plain', CHARSET)
        htmlpart = MIMEText(BODY_HTML.encode(CHARSET), 'html', CHARSET)

        # Add the text and HTML parts to the child container.
        msg_body.attach(textpart)
        msg_body.attach(htmlpart)
        # att = MIMEApplication(open(ATTACHMENT, 'rb').read())
        # att.add_header('Content-Disposition', 'attachment',
        #                filename=os.path.basename(ATTACHMENT))

        msg.attach(msg_body)
        # msg.attach(att)

        # print(msg)
        try:
            response = client.send_raw_email(
                Source=SENDER,
                Destinations=[
                    RECIPIENT
                ],
                RawMessage={
                    'Data': msg.as_string()
                }
            )
        except ClientError as e:
            print(e.response['Error']['Message'])
            # return Response({'msg': e.response['Error']['Message'], 'status': 0})
        else:
            print("Email sent! Message ID:"),
            print(response['MessageId'])
    return Response({'msg': "Email sent", 'status': 200}, status=200)


def update_next_mail_date(company_id, table_name, table_id):
    try:
        dataset = list(MailFrequency.objects.filter(
            Q(company_id=company_id) &
            Q(table_name=table_name) &
            Q(table_id=table_id)
        ).values('scheduled_dates', 'repeat_counter'))

        # print(dataset[0]['scheduled_dates'])
        repeat_counter = dataset[0]['repeat_counter'] - 1

        if (repeat_counter > 0):
            next_mail_date = (
                dataset[0]['scheduled_dates'][-repeat_counter]) - timedelta(days=1)
            print(next_mail_date)
            # print()
            try:
                queryset = MailFrequency.objects.filter(
                    Q(company_id=company_id) &
                    Q(table_name=table_name) &
                    Q(table_id=table_id)
                ).update(
                    next_mail_date=next_mail_date,
                    repeat_counter=repeat_counter
                )
                response = queryset
            except Exception as e:
                response = e.args
                print(response)
    except Exception as e:
        response = e.args
        print(response)


def getFile(file):
    file_location = MEDIA_PATH + file

    try:
        with open(file_location, 'rb') as f:
            file_data = f.read()

        return file_data
        response = HttpResponse(content=file_data)
        extention = file.split('.')[len(file.split('.')) - 1]

        response['Content-Type'] = 'application/octet-stream'
        if 'jpg' == extention or 'jpeg' == extention or 'png' == extention or 'tiff' == extention or 'gif' == extention:
            response['Content-Type'] = 'image/png'
        if 'pdf' == extention:
            response['Content-Type'] = 'application/pdf'

        # response['Content-Disposition'] = 'attachment; filename="%s"' % file

    except Exception as e:
        print("error as ", e.args)
        # handle file not exist case here
        response = HttpResponse('<h1>File not exist</h1>')

    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def getAttachments(request):

    app_name = request.data['app_name']
    model_name = request.data['model_name']
    entity_id = request.data['entity_id']

    model = apps.get_model(app_name, model_name)
    attachment_ids = model.objects.filter(
        id=entity_id
    ).values('attachment_ids')

    attachment_id_list = []

    if attachment_ids:
        attachment_id_list = attachment_ids[0]['attachment_ids']

    print(attachment_id_list)

    response = []

    for file_id in attachment_id_list:
        file = Attachment.objects.filter(
            id=file_id
        ).values()
        if (file):
            response.append(file[0])

    return Response({'response': response}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def getAttachmentsWithIDs(request):

    attachment_ids = json.loads(request.data['attachment_ids'])

    attachments = Attachment.objects.filter(
        id__in=attachment_ids
    ).values().order_by('-id')

    for att in attachments:
        base_64_image = ""
        attachment_path = settings.MEDIA_ROOT / str(att.get("url") or "")
        if attachment_path.exists():
            try:
                with open(attachment_path, "rb") as file_handle:
                    encoded = base64.b64encode(
                        file_handle.read()).decode("utf-8")
                mime_type = att.get("type") or "application/octet-stream"
                base_64_image = f"data:{mime_type};base64,{encoded}"
            except Exception as exc:
                logging.getLogger("error_logger").error(
                    "getAttachmentsWithIDs base64 error for %s: %s",
                    att.get("id"),
                    exc,
                )
        att['base_64_image'] = base_64_image

    return Response({'response': attachments}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def removeAttachment(request):

    app_name = request.data['app_name']
    model_name = request.data['model_name']
    entity_id = request.data['entity_id']
    attachment_id = int(request.data['attachment_id'])
    # attachment_url = request.data['attachment_url']

    print('app_name => ', app_name)
    print('model_name => ', model_name)
    print('entity_id => ', entity_id)
    print('attachment_id => ', attachment_id)
    # print('attachment_url => ', attachment_url)

    try:
        if entity_id:
            try:
                model = apps.get_model(app_name, model_name)
                attachment_ids = model.objects.filter(
                    id=entity_id
                ).values('attachment_ids')

                print('Model => ', model)
                print('attachment_ids => ', attachment_ids)
                print('attachment_ids => ', len(attachment_ids))

                attachment_id_list = []

                if attachment_ids:
                    attachment_id_list = attachment_ids[0]['attachment_ids']
                    print('attachment_ids[0] => ', attachment_id_list, type(
                        attachment_id_list), type(attachment_id_list[0]), type(attachment_id))

                attachment_id_list.remove(attachment_id)

                # update related model
                model = apps.get_model(app_name, model_name)
                update = model.objects.filter(
                    id=entity_id
                ).update(
                    attachment_ids=attachment_id_list
                )
            except Exception as e:
                print("Seems entity id is not provided => ", e.args)
        # Remove attachment from model
        attach_details = Attachment.objects.filter(
            id=attachment_id
        ).values(
            'url'
        ).first()

        attach = Attachment.objects.filter(
            id=attachment_id
        ).delete()

        # Removing the attachment file from media
        if (removeFileFromMedia(request, attach_details['url'])):
            print("Removed from media")
        else:
            print("can't removed from media")

        return Response({'response': True}, status=200)
    except Exception as e:
        transaction.set_rollback(True)
        print("Error occured as ", e.args)
        # return Response({'response': False}, status=500)
        return Response(e.args, status=500)


def getAttachmentsByIDList(id_list):
    try:
        attachments = Attachment.objects.filter(
            id__in=id_list
        ).values()
        return attachments
    except Exception as e:
        print("Exception Occured as => ", e.args[0])
        return []


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def saveChartDetailsToDB(request):
    company_id = get_company_id(request)
    print(json.loads(request.data['config']))

    config = json.loads(request.data['config'])
    try:
        default_values = {
            'company_id': company_id,
            'username': request.user.username,
            'chart_identity': config['chart_identity'],
            'graph_type': config['graph_type'],
            'x_axis': config['x_axis'],
            'y_axis': config['y_axis'],
            'value': config['value'],
            'group_by': config['group_by'],
        }

        obj, created = ChartConfig.objects.update_or_create(
            company_id=company_id,
            username=request.user.username,
            chart_identity=config['chart_identity'],
            graph_type=config['graph_type'],
            defaults=config
        )
        print('obj, created => ', obj, created, obj.id)
        if created:
            return Response({'response': 'New Chart config created', 'chart_id': obj.id}, status=200)
        else:
            return Response({'response': 'Chart config updated'}, status=200)
    except Exception as e:
        print('Error occured in as ', e.args)
        return Response(e.args, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getChartDetails(request, chart_identity=''):
    company_id = get_company_id(request)
    username = request.user.username

    try:
        chart_details = ChartConfig.objects.filter(
            Q(company_id=company_id) &
            Q(username=username) &
            Q(chart_identity=chart_identity)
        ).values()
        return Response({'response': chart_details}, status=200)
    except Exception as e:
        print('Error occured in as ', e.args)
        return Response(e.args, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deleteGraphConfig(request, id=0):

    try:
        obj = ChartConfig.objects.filter(
            Q(id=id)
        ).delete()
        if obj:
            return Response({'response': 'Chart Config Deleted Successfully'}, status=200)
        else:
            return Response({'response': obj}, status=500)
    except Exception as e:
        print('Error occured in as ', e.args)
        return Response(e.args, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_client_ip(request):
    print("request => ", request)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    print("request from => ", ip)
    print("request META => ", request.META)
    return Response({'response': ip}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_pdf(request):
    # print(request.data)
    title = '_'.join(str(request.data['name']).split(' '))
    orientation = request.data['orientation']
    printContents = request.data['data']
    try:
        email = None
        email = request.data['email']
    except:
        pass
    try:
        subject = None
        subject = request.data['subject']
    except:
        pass

    html_data = '''
        <!DOCTYPE html>
        <html>
            <head>
            <title>
            ''' + title + '''
            </title>
            <style>
                @page {
                    size: ''' + orientation + ''';
                    @bottom-right {
                        content: "Page " counter(page) " of " counter(pages);
                    }
                }
            </style>
            </head>
            <body>

                <div>
                ''' + printContents + '''
                </div>

            </body>
        </html>
    '''

    try:
        html = HTML(string=html_data)
        html.write_pdf(f'/tmp/{title}.pdf')

        img = open(f'/tmp/{title}.pdf', 'rb')

        if email:
            sendGenericMailV2(
                email, subject, 'Please Check Attachment', f'/tmp/{title}.pdf')

        response = FileResponse(img)

        return response
    except Exception as e:
        print(f"Error occured as {e.args}")

    return Response({'response': 'result'}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_pdf(request):
    title = '_'.join(str(request.data['name']).split(' '))
    orientation = request.data['orientation']
    template_data = json.loads(request.data['template_data'])
    period = request.data['period']

    try:
        if template_data['min_date']:
            min_date = datetime.fromisoformat(
                template_data['min_date'].rstrip('Z'))
            max_date = datetime.fromisoformat(
                template_data['max_date'].rstrip('Z'))
            formatted_min_date = min_date.strftime('%d %b, %Y')
            formatted_max_date = max_date.strftime('%d %b, %Y')
        else:
            formatted_min_date = ''
            formatted_max_date = ''

    except KeyError:
        formatted_min_date = ''
        formatted_max_date = ''

    printContents = request.data['data']
    try:
        email = None
        email = request.data['email']
    except:
        pass
    try:
        subject = None
        subject = request.data['subject']
    except:
        pass

    html_data = '''
        <!DOCTYPE html>
        <html>
            <head>
            <title>
            ''' + title + '''
            </title>
            <div id="header" >
            <img src=" '''+template_data['img_url']+'''" alt="Company Logo" style="height:50px; width:50px; margin-right:5px"">
            <div class="company-details">
            <h1 style="margin: 0; font-size: 12px;">'''+template_data['company_name']+'''</h1>
            <p style="margin:  0; font-size: 10px;">
            GSTIN: '''+template_data['gstin']+'''  <br/>
            STATE:'''+template_data['state']+'''<br/>
            '''+template_data['city'] + ", " + template_data['address'] + ", "+template_data['state'] + " - " + template_data['pin']+'''
            
                    </p>
                </div>
            </div>
            <div id="period" >

    <div class="company-details">
        <h1 style="margin: 0; font-size: 8px;"> ''' + period + '''</h1>
    
    </div>
</div>
<style>
#header {
    width:450px;
    position: running(header);
    display: flex;
    align-items: center;
    gap: 10px;
}

#period {
    position: running(period);
    display: flex;
    align-items: center;
    gap: 10px;
}

@page {
                    size: ''' + orientation + ''';

@top-left {
                content: element(header);
            }       
@top-right {
                content: element(period);
            }            
@bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-family: Arial, sans-serif;
            font-size: 10px;
            color: gray;
            }
    
@bottom-center {
        content: "powered by owlbos";
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: gray;
        white-space: pre-line;
        margin-bottom: 20px;
    }
}
            </style>
            </head>
            <body>
                <div>
                ''' + printContents + '''
                </div>

            </body>
        </html>
    '''
    try:
        html = HTML(string=html_data)
        html.write_pdf(f'/tmp/{title}.pdf')
        img = open(f'/tmp/{title}.pdf', 'rb')

        if email:
            sendGenericMailV2(
                email, subject, 'Please Check Attachment', f'/tmp/{title}.pdf')

        response = FileResponse(img)

        return response
    except Exception as e:
        print(f"Error occured as {e.args}")

    return Response({'response': 'result'}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_invoice_pdf(request):
    title = '_'.join(str(request.data['name']).split(' '))
    orientation = request.data['orientation']
    template_data = json.loads(request.data['template_data'])
    # details = request.data['period']
    total_amount = request.data['total_amount']
    invoice_date = request.data['invoice_date']
    invoice_no = request.data['invoice_no']
    order_no = request.data['order_no']
    order_date = request.data['order_date']
    try:
        if template_data['min_date']:
            min_date = datetime.fromisoformat(
                template_data['min_date'].rstrip('Z'))
            max_date = datetime.fromisoformat(
                template_data['max_date'].rstrip('Z'))
            formatted_min_date = min_date.strftime('%d %b, %Y')
            formatted_max_date = max_date.strftime('%d %b, %Y')
        else:
            formatted_min_date = ''
            formatted_max_date = ''

    except KeyError:
        formatted_min_date = ''
        formatted_max_date = ''

    printContents = request.data['data']
    try:
        email = None
        email = request.data['email']
    except:
        pass
    try:
        subject = None
        subject = request.data['subject']
    except:
        pass

    html_data = '''
        <!DOCTYPE html>
        <html>
            <head>
            <title>
            ''' + title + '''
            </title>
             
                    <div style="gap:20px">
                        
                        <div id="header" >
                            <img src=" '''+template_data['img_url']+'''" alt="Company Logo" style="height:50px; width:50px; margin-right:5px"">
                            <div class="company-details">
                            <h1 style="margin: 0; font-size: 12px;">'''+template_data['company_name']+'''</h1>
                            <p style="margin:  0; font-size: 10px;">
                            GSTIN: '''+template_data['gstin']+'''  <br/>
                            STATE:'''+template_data['state']+'''<br/>
                            '''+template_data['city'] + ", " + template_data['address'] + ", "+template_data['state'] + " - " + template_data['pin']+'''
                            
                                    </p>
                                </div>
                            </div>

                        
                        
                    </div>

            <style>
            
           
            #header {
                width:450px;
                position: running(header);
                display: flex;
                align-items: center;
                gap: 10px;
                
            }
 
            @page {
             
                                size: ''' + orientation + ''';
                                

                @contentDiv{
                    margin-top:80px;
                    z-index:9999999999;
                    position: absolute !important;
                    top:300px !important;
                }

                @top-left {
                                content: element(header);
                                height: calc(300px - 500px) !important;
                            }       
                        
                @bottom-right {
                            content: "Page " counter(page) " of " counter(pages);
                            font-family: Arial, sans-serif;
                            font-size: 10px;
                            color: gray;
                            }
                    
                @bottom-center {
                        content: "'''+template_data['company_name']+'''" "\A" 
                                "'''+template_data['city'] + ", " + template_data['address'] + ", "+template_data['state'] + " - " + template_data['pin']+'''" "\A"
                                "Phone: '''+template_data['mobile_number']+'''";
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        color: gray;
                        white-space: pre-line;
                        margin-bottom: 20px;
                        margin-top: 10px;
                    }
            }

            </style>
            </head>
            <body style="position:relative !important;" >
                <div id="contentDiv">
                ''' + printContents + '''
                </div>
            </body>
        </html>
    '''
    try:
        html = HTML(string=html_data)
        html.write_pdf(f'/tmp/{title}.pdf')
        img = open(f'/tmp/{title}.pdf', 'rb')

        if email:
            sendGenericMailV2(
                email, subject, 'Please Check Attachment', f'/tmp/{title}.pdf')

        response = FileResponse(img)

        return response
    except Exception as e:
        print(f"Error occured as {e.args}")

    return Response({'response': 'result'}, status=200)


def create_ics_content(summary: str, description: str, location: str, dates: List[datetime]):
    content = """
            BEGIN:VCALENDAR
            VERSION:2.0
            CALSCALE:GREGORIAN
            METHOD:PUBLISH
            X-WR-CALNAME:Calendar
            X-WR-TIMEZONE:Asia/Calcutta
            """

    for _date in dates:
        day: datetime = _date
        content = content + "\n" + \
            f"""
            BEGIN:VEVENT
            SUMMARY:{summary}
            DESCRIPTION:{description}
            LOCATION:{location}
            DTSTART:{day.strftime('%Y%m%dT%H%M%S')}
            DTEND:{(day + timedelta(minutes=5)).strftime('%Y%m%dT%H%M%S')}
            END:VEVENT
            """

    content = content + '\n' + \
        """
        END:VCALENDAR
        """

    # Removing leading escape sequence and all blank spaces
    return content.strip('\n ').replace('\t', '').replace(' ', '')


def getMonthWiseDate(last_date: datetime, interval: int):
    # try:
    if (last_date.month + interval) > 12:
        last_date = last_date.replace(year=last_date.year + 1)
        month = (last_date.month + interval) % 12 if (last_date.month +
                                                      interval) % 12 > 0 else 12
        try:
            last_date = last_date.replace(
                month=month)
            return last_date
        except:
            last_date = last_date.replace(day=calendar.monthrange(last_date.year, month)[1]).replace(
                month=month)
            return last_date

    else:
        month = (last_date.month + interval) % 12 if (last_date.month +
                                                      interval) % 12 > 0 else 12
        try:
            last_date = last_date.replace(
                month=month)
            return last_date
        except:
            last_date = last_date.replace(day=calendar.monthrange(last_date.year, month)[1]).replace(
                month=month)
            return last_date


def gen_schedule(start_date: datetime, interval: str, frequency: int, no_of_repeatation: int):
    # print(start_date)
    dates = []

    if interval == 'Day':
        last_date = start_date
        for i in range(no_of_repeatation):
            dates.append(last_date)
            last_date = last_date + timedelta(days=frequency)

    if interval == 'Week':
        last_date = start_date
        for i in range(no_of_repeatation):
            dates.append(last_date)
            last_date = last_date + (timedelta(weeks=frequency))

    if interval == 'Month':
        last_date = start_date
        for i in range(no_of_repeatation):
            dates.append(last_date)
            last_date = getMonthWiseDate(last_date, frequency)

    if interval == 'Quarter':
        last_date = start_date
        for i in range(no_of_repeatation):
            dates.append(last_date)

            last_date = getMonthWiseDate(last_date, frequency*3)

    if interval == 'Year':
        last_date = start_date
        for i in range(no_of_repeatation):
            dates.append(last_date)
            last_date = last_date.replace(last_date.year + frequency)

    return dates


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def createCalenderEvent(request):

    summary = request.data['summary']
    description = request.data['description']
    location = ''
    start_date = datetime.fromisoformat(
        str(request.data['start_date']).replace('Z', '+00:00'))
    frequency = int(request.data['frequency'])
    interval = str(request.data['interval'])
    no_of_repeatation = int(request.data['no_of_repeatation'])
    assignees = json.loads(request.data['assignees'])

    dates = gen_schedule(start_date, interval, frequency, no_of_repeatation)

    content = create_ics_content(
        summary, description, location, dates)

    with open('temp/event.ics', 'w') as f:
        f.write(content)

    for recipient in assignees:
        sendGenericMailV2(recipient, summary, description, 'temp/event.ics')

    return Response('ok', status=200)


def getFilesSize(files: List[str]):
    try:
        return sum(os.path.getsize(f) for f in files if os.path.isfile(f))
    except:
        return 0


def getFolderSize(path: str):
    try:
        files = [path + '/' + f
                 for f in os.listdir(path) if os.path.isfile(path + '/' + f)]
        folders = [path + '/' + f
                   for f in os.listdir(path) if os.path.isdir(path + '/' + f)]

        if len(folders):
            for folder_path in folders:
                return getFilesSize(files) + getFolderSize(folder_path)
        else:
            return getFilesSize(files)
    except:
        return 0


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMediaStorageSize(request):
    total_file_size = 0
    try:
        company_details = OrganizationUser.objects.filter(
            username=request.user.username).values('company__company_id').first()
        if company_details:
            folder_location = MEDIA_PATH + \
                company_details['company__company_id']

            total_file_size = round(
                (getFolderSize(folder_location) / 1000000), 1)
    except Exception as e:
        print(f"Error {e.args}")

    return Response({'response': total_file_size}, status=200)


def removeGarbageAttachments(request: Request, garbage_ids: List[int]):
    company_id = get_company_id(request)
    file_list = Attachment.objects.filter(
        Q(company_id=company_id)
        & Q(id__in=garbage_ids)
    ).values_list('url', flat=True)

    # print(file_list)
    for file in file_list:
        removeFileFromMedia(request, file)

    file_list = Attachment.objects.filter(
        Q(company_id=company_id)
        & Q(id__in=garbage_ids)
    ).delete()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clearGarbageAttachments(request):
    """
    If the attachment present in Attachment table
    but there is no the linked table, then this
    function will clear those attachments

    Args:
        request (_type_): _description_

    Returns:
        _type_: _description_
    """
    company_id = get_company_id(request)
    all_attachment_ids = []

    for model in getAllModels():
        try:
            attachment_ids = model.objects.filter(
                company_id=company_id
            ).values_list('attachment_ids', flat=True)
            all_attachment_ids.extend(list(chain(*attachment_ids)))
        except:
            pass
    # print(all_attachment_ids)
    print("In Use => ", len(all_attachment_ids))

    attachments = Attachment.objects.filter(
        company_id=company_id
    ).values_list('id', flat=True)

    print("Total => ", len(attachments))

    garbage = list(set(attachments) - set(all_attachment_ids))
    print('garbage => ', len(garbage))

    removeGarbageAttachments(request, garbage)

    return Response({'response': 'ok'}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clearGarbageAttachmentIDsFromModels(request):
    """
    If the attachment not present in Attachment table
    but there exist attachment id to any model, then this
    function will clear those ids from models

    Args:
        request (_type_): _description_

    Returns:
        _type_: _description_
    """

    company_id = get_company_id(request)
    attachments = Attachment.objects.filter(
        company_id=company_id
    ).values_list('id', flat=True)

    for model in getAllModels():
        try:
            attachment_objects = model.objects.filter(
                company_id=company_id
            ).exclude(
                attachment_ids__isnull=True
            ).exclude(
                attachment_ids=[]
            ).values('id', 'attachment_ids')
            # print(attachment_objects)
            if len(attachment_objects):
                for attach in attachment_objects:
                    attachment_ids = [
                        att for att in attach['attachment_ids'] if att in attachments]
                    # Update model
                    model.objects.filter(
                        id=attach['id']
                    ).update(
                        attachment_ids=attachment_ids
                    )
                    print(attach['id'], attachment_ids)
        except:
            pass

    return Response()


def mailFormat() -> str:
    return ''


def sendGenericMailV2(email: str, subject: str, message: str, attachment_path: str = ''):
    sender = os.getenv('SENDER')
    aws_region = os.getenv('AWS_REGION')
    recipient = email
    attachment = attachment_path

    template_path = os.path.realpath(
        os.path.join(os.path.dirname(__file__), '..', '..',
                     'email-templates', 'mail-format.html')
    )

    if os.path.exists(template_path):
        with open(template_path, 'r', encoding='utf-8') as template_file:
            html = template_file.read()
    else:
        html = """
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>{subject}</title></head>
        <body style="font-family:Arial,sans-serif;color:#1f2937;">
            <h1>{subject}</h1>
            <div>{message}</div>
        </body>
        </html>
        """

    body_html = (
        html
        .replace('{subject}', subject)
        .replace('{message}', message)
    )
    body_text = (
        f"{subject}\n\n"
        "This message contains HTML content. Please open it in an HTML-capable email client."
    )

    client = boto3.client(
        'ses',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=aws_region,
    )

    msg = MIMEMultipart('mixed')
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = recipient

    msg_body = MIMEMultipart('alternative')
    msg_body.attach(MIMEText(body_text, 'plain', 'utf-8'))
    msg_body.attach(MIMEText(body_html, 'html', 'utf-8'))
    msg.attach(msg_body)

    if attachment:
        with open(attachment, 'rb') as attachment_file:
            att = MIMEApplication(attachment_file.read())
        att.add_header(
            'Content-Disposition',
            'attachment',
            filename=os.path.basename(attachment),
        )
        msg.attach(att)

    try:
        response = client.send_raw_email(
            Source=sender,
            Destinations=[recipient],
            RawMessage={'Data': msg.as_string()},
        )
    except ClientError as e:
        print(e.response['Error']['Message'])
        return Response({'msg': e.response['Error']['Message'], 'status': 200}, status=200)
    else:
        print("Email sent! Message ID:")
        print(response['MessageId'])
        return Response({'msg': "Email sent!", 'status': 200}, status=200)


def getAIResponse(data: str) -> str:
    url = "https://owl-llm.phenx.net/chat/completions"
    headers = {
        'Content-Type': 'application/json'
    }
    data = {
        "model": "gpt-3.5-turbo",
        "messages": [
            {
                "role": "user",
                "content": data
            }
        ]
    }

    http_response = requests.post(url, headers=headers, data=json.dumps(data))

    # Check if the request was successful (status code 200)
    if http_response.status_code == 200:
        print("Request successful")
        # print("Response content:", http_response.text)
        return (json.loads(http_response.text))['choices'][0]['message']['content']
    else:
        print(f"Request failed with status code {http_response.status_code}")
        return "502"


def hash_string(input_string):
    import hashlib
    sha512_hash = hashlib.sha512()
    sha512_hash.update(input_string.encode())
    hashed_string = sha512_hash.hexdigest()
    return hashed_string


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manipulate_xl_or_csv_with_pandas(request):
    if request.FILES:
        # print(request.FILES)
        try:
            uploaded_file = request.FILES["file"]

            df = dict()

            if isinstance(uploaded_file, InMemoryUploadedFile) or isinstance(uploaded_file, TemporaryUploadedFile):
                # Check if the file is in Excel format
                if uploaded_file.name.endswith('.xlsx'):
                    # Read Excel file into a Pandas DataFrame
                    df = pd.read_excel(BytesIO(uploaded_file.read()))

                # Check if the file is in CSV format
                elif uploaded_file.name.endswith('.csv'):
                    # Read CSV file into a Pandas DataFrame
                    df = pd.read_csv(BytesIO(uploaded_file.read()))

                else:
                    raise (
                        "Unsupported file format. Please upload an Excel (.xlsx) or CSV (.csv) file.")
            else:
                raise ("Invalid file type. Please upload a file.")

            df = df.where(pd.notna(df), None)
            # Convert all numbers to strings
            values: list = []
            keys = df.keys()
            values.append(keys)
            values.extend(df.values.tolist())
            return Response({'response': values}, status=200)
        except Exception as e:
            print(e.args)
            return Response(e.args[0], status=500)

    return Response()


def convertToExcel(df: pd.DataFrame):

    # Create a temporary file to store the Excel data
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        # Save DataFrame to the temporary Excel file
        df.to_excel(temp_file.name, index=False, engine='openpyxl')
        # Save DataFrame to the temporary CSV file
        # df.to_csv(temp_file, index=False)

        # Rewind the file pointer to the beginning
        temp_file.seek(0)

        # Read the contents of the file into memory
        csv_data = temp_file.read()

        # Create a FileResponse and attach the CSV data
        response = FileResponse(io.BytesIO(
            csv_data), as_attachment=True, filename='data.xlsx')

        # Return the FileResponse
        return response


# baseurl = "http://host.docker.internal"
baseurl = os.getenv("EMAIL_SERVICE_BASE_URL", "https://owlbos.com")


def send_otp(username, otp, email):
    subject = "Email Verification OTP"
    message = f"""
        <p>Hello {username or 'User'},</p>
        <p>Use the following one-time password to verify your email address:</p>
        <div style="margin:24px 0;padding:16px 20px;border-radius:12px;background:#f4f8fc;border:1px solid #dbe7f3;font-size:28px;font-weight:700;letter-spacing:0.32em;color:#1e5bd8;text-align:center;">
            {otp}
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request this verification, you can ignore this email.</p>
    """

    return sendGenericMailV2(email, subject, message)


def register_company(name, company_name, email, passowrd):
    url = f"{baseurl}/email/api/company_registration"
    payload = {
        "name": name,
        "companyName": company_name,
        "email": email,
        "password": passowrd,
    }

    try:
        response = requests.post(url, json=payload)
        print("Company Registration Response:",
              response.status_code, response.json())
    except Exception as e:
        print("An error occurred during company registration:", str(e))


def new_company_registration(company_email, company_name, email):
    url = f"{baseurl}/email/api/new_company_registration"
    payload = {
        "companyEmail": company_email,
        "companyName": company_name,
        "email": email,
    }

    try:
        response = requests.post(url, json=payload)
        print("New Company Registration Response:",
              response.status_code, response.json())
    except Exception as e:
        print("An error occurred during new company registration:", str(e))


def activate_company(name, company_name, email):
    url = f"{baseurl}/email/api/activation"
    payload = {
        "name": name,
        "company_name": company_name,
        "email": email,
    }

    try:
        response = requests.post(url, json=payload)
        print("Activation Response:", response.status_code, response.json())
    except Exception as e:
        print("An error occurred during company activation:", str(e))


def reset_link(resetLink, email):
    url = f"{baseurl}/email/api/reset_link"

    payload = {
        "resetLink": resetLink,

        "email": email,
    }

    try:
        response = requests.post(url, json=payload)
        print("Activation Response:", response.status_code, response.json())
    except Exception as e:
        print("An error occurred during reset_link:", str(e))


def send_subscription_email(name, email, planName, dashboardurl):
    url = f"{baseurl}/email/api/subscription"
    payload = {
        "name": name,
        "email": email,
        "planName": planName,
        "dashboardurl": dashboardurl
    }

    try:
        response = requests.post(url, json=payload)
        print("Subscription Response:", response.status_code, response.json())
    except Exception as e:
        print("An error occurred during send_subscription_email:", str(e))


def send_plan_upgrade_email(name, email, CompanyName, newPlanName):
    url = f"{baseurl}/email/api/plan_upgrade"
    payload = {
        "name": name,
        "email": email,
        "CompanyName": CompanyName,
        "newPlanName": newPlanName
    }

    try:
        response = requests.post(url, json=payload)
        print("Plan Upgrade Response:", response.status_code, response.json())
    except Exception as e:
        print("An error occurred during send_plan_upgrade_email:", str(e))


def send_plan_downgrade_email(name, email, CompanyName, newPlanName):
    url = f"{baseurl}/email/api/plan_downgrade"
    payload = {
        "name": name,
        "email": email,
        "CompanyName": CompanyName,
        "newPlanName": newPlanName
    }

    try:
        response = requests.post(url, json=payload)
        print("Plan Downgrade Response:", response.status_code, response.json())
    except Exception as e:
        print("An error occurred during send_plan_downgrade_email:", str(e))
