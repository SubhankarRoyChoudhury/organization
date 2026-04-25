# from django.utils import timezone
from django.db.models import (
    Case, When, Value, CharField,
    Sum, Min, Max, Count, F, ExpressionWrapper, DurationField, DateTimeField,
    IntegerField,
    OuterRef, Subquery
)
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from collections import defaultdict
from datetime import timedelta
from django.db.models import F, Q, Sum
from typing import List, Dict
from google.auth.transport import requests
from google.oauth2 import id_token
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
# from custom_commands.management.commands.createdefaultpermissiongroups import createDefaultUserGroup
from django.conf import settings
import math
from rest_framework import status
import datetime
from datetime import timedelta, timezone
from django.utils import timezone as dj_timezone
from django.utils.dateparse import parse_datetime, parse_date
from django.db.models import Max
from email.mime.application import MIMEApplication
import json
import time
from django.contrib.auth import get_user_model
from typing import List
from django.shortcuts import get_object_or_404
import uuid
from wsgiref.util import FileWrapper
from django.db import IntegrityError
from rest_framework.response import Response
from rest_framework.decorators import api_view, APIView
from django.shortcuts import redirect, render
from django.http import FileResponse, HttpResponse, HttpResponseNotFound, HttpResponseRedirect, JsonResponse
from django.contrib.auth.models import Group, User, auth
from django.contrib import messages
from django.contrib.auth import authenticate
from django.urls.base import reverse
from django.middleware.csrf import get_token
import string
import random
import requests
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
import filetype
import logging
# from history_management.views import createHistoryForUpdate, getEntityDetails
# from project_management.views import getAllJobLocations
from company_account.serializers import AgreeDisclaimerSerializer, CompaniesSerializer
from shared.views import activate_company, get_company_id, getImageAsBase64, getImageFromFileName, hash_string, reset_link, send_otp, sendGenericMailV2
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import filetype
import os
import logging
from io import BytesIO
from urllib.parse import urlparse
from shared.models import Attachment, Location
from django.db import connection
from django.db.models import Count, Sum, F, ExpressionWrapper, DurationField, Q, Case, When, Value, DateTimeField
# Create your views here.

from .models import ActivityLog, AllWebUrls, AppAccessControl, Application, CompanyUser, Companies, CompanyInfo, Owners, StatutoryRegister, StatutoryRegisterCustomField, StatutoryRegisterCustomValue, TableConfig, UrlBasedAccessControl, UserConfig, UserGroup, UserRight, WebUrl
# from hr_management.models import EmpPersonalDetail
from django.core import serializers
from datetime import date
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from django.core.files.storage import FileSystemStorage, default_storage
from django.db.models import Q, F, Sum, DurationField
from django.db.models.functions import TruncDate, Coalesce, Least
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes

from PIL import Image
import os
from dotenv import load_dotenv
load_dotenv()
try:
    from oauth2_provider.models import AccessToken, RefreshToken
except Exception:
    AccessToken = None
    RefreshToken = None

MEDIA_PATH = getattr(settings, "MEDIA_PATH",
                     getattr(settings, "MEDIA_ROOT", ""))


def purge_expired_tokens() -> None:
    """
    Delete OAuth tokens whose expiry timestamp is in the past. This prevents old
    credentials from remaining usable beyond their lifetime.
    """
    now = dj_timezone.now()
    if AccessToken is None or RefreshToken is None:
        return
    expired_tokens = AccessToken.objects.filter(expires__lt=now)
    if expired_tokens.exists():
        RefreshToken.objects.filter(access_token__in=expired_tokens).delete()
        expired_tokens.delete()


def revoke_request_tokens(request) -> None:
    """
    Remove any OAuth tokens that belong to the authenticated user or that were
    explicitly provided with the current request.
    """
    token_value = None
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header.startswith("Bearer "):
        token_value = auth_header.split()[1].strip()

    if not token_value and hasattr(request, "data"):
        token_value = request.data.get("access_token")
    if not token_value:
        token_value = request.GET.get("access_token")

    if AccessToken is None or RefreshToken is None:
        return
    token_filter = AccessToken.objects.none()
    if token_value:
        token_filter = AccessToken.objects.filter(token=token_value)
        RefreshToken.objects.filter(access_token__in=token_filter).delete()
        token_filter.delete()

    if request.user and request.user.is_authenticated:
        RefreshToken.objects.filter(user=request.user).delete()
        AccessToken.objects.filter(user=request.user).delete()


def isAdmin(user_id: int) -> bool:
    return True if UserGroup.objects.filter(
        Q(name='Admin Group')
        & Q(user_ids__contains=[user_id])
    ).count() > 0 else False


def getAttachmentsByIDList(id_list):
    try:
        attachments = Attachment.objects.filter(
            id__in=id_list
        ).values()
        return attachments
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("Exception Occured as => ", e.args[0])
        return []


def get_request_company_id(request):
    if not request:
        return None
    header_value = (
        request.META.get("HTTP_X_COMPANY_ID")
        or request.META.get("HTTP_COMPANY_ID")
        or request.META.get("HTTP_X_MAIN_COMPANY_ID")
    )
    if header_value:
        return header_value
    for source in (getattr(request, "query_params", None), getattr(request, "GET", None)):
        if source:
            value = source.get("company_id") or source.get(
                "companyId") or source.get("company")
            if value:
                return value
    return None


def getCompanyId(request):
    requested_company_id = get_request_company_id(request)
    if requested_company_id is not None:
        return requested_company_id
    user = request.user.username
    company = CompanyUser.objects.filter(
        username=user).values('company_id').first()
    if company:
        return company['company_id']
    else:
        return None


def getUserDetails(request):
    print("REQ >>>>>>>>", request.user)

    user_details = dict()

    # Determine the username to use based on whether request.user has a valid username
    username = request.user.username if request.user else request.user.username
    requested_company_id = get_request_company_id(request)

    try:
        filters = {"username": username}
        if requested_company_id is not None:
            filters["company_id"] = requested_company_id
        user_details = CompanyUser.objects.filter(**filters).values(
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
            'medical_council_registration',
            'is_superuser',
            'is_admin',
            'is_active',
            'is_staff',
            'is_owner',
            'is_manager',
            'is_assistant',
            'excellency_point'
        ).first()

        # Check if user_details was retrieved and has an attachment ID
        if user_details and user_details.get('attachment_id'):
            user_details['image_url'] = getImageAsBase64(
                request, user_details['attachment_id'])

    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("user_details error => ", e)

    return user_details


def resetPassword(request, id=0):
    print('id ', id)
    if (id != 0):
        new_password = request.GET.get('new_password', None)
        old_password = request.GET.get('old_password', None)
        print('new_password ', new_password)
        print('old_password ', old_password)
        u = User.objects.get(id=id)
        if (u.check_password(old_password)):
            print('New password id ', new_password)
            u.set_password(new_password)
            u.save()
            print('old password is correct & reset with new...')
            msg = {
                'data': 'success',
                'msg': 'Password Reset Successfully'
            }
            return JsonResponse(msg)
        else:
            print('password is not correct')
            msg = {
                'data': 'failed',
                'msg': 'Old Password not correct'
            }
            return JsonResponse(msg)
    return


def changePassword(request, username):
    try:
        print('username ', username)

        password = request.GET.get('password', None)
        print(password)

        if not password:
            # If password is empty, return an error response
            return JsonResponse({
                'data': 'error',
                'msg': 'Password cannot be empty'
            })

        # Attempt to get the user and set the new password
        u = User.objects.get(username=username)
        print('New password is ', password)
        u.set_password(password)
        u.save()
        print('Password reset successfully...')
        CompanyUser.objects.filter(email=username).update(firstLoggedIn=False)
        msg = {
            'data': 'success',
            'msg': 'Password Reset Successfully'
        }
        return JsonResponse(msg)

    except Exception as e:
        return JsonResponse({
            'data': 'error',
            'msg': str(e)
        })


def userLogout(request):
    print('We are in log out')

    auth.logout(request)
    return redirect('/')


def userRegistration(request):
    return


def createUnEmployedUser(request, user):
    # print('company name ', user['company_name'])

    name = request.GET.get('name', None)
    username = request.GET.get('username', None)
    email = request.GET.get('email', None)
    password = request.GET.get('password', 'abc123')
    access_permission = (request.GET.get('access_permission', 'False'))

    is_admin = False
    is_manager = False
    is_assistant = False

    if access_permission == 'admin':
        is_admin = True
    elif access_permission == 'manager':
        is_manager = True
    else:
        is_assistant = True
    try:
        company_user = CompanyUser.objects.create(
            name=name,

            company_id=user['company_id'],
            username=username,
            email=email,

            registrationDate=str(date.today()),
            is_superuser=False,
            is_admin=is_admin,
            is_active=True,

            is_staff=True,
            is_owner=False,
            is_manager=is_manager,
            is_assistant=is_assistant
        )
        print('creating company user ', company_user)
        company_user.save()

        usr = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        usr.save()
        print('user created ', usr)
        return 'success'
    except Exception as err:
        logging.getLogger("error_logger").error(repr(e))
        print('exception is ', err.args[0])
        return err.args[0]


@csrf_protect
def companyRegistrationForm(request):
    # if request.POST.get('ajax_calling_for', None):
    if request.method == 'POST':

        companyName = request.POST.get('company_name', None)
        company_id = request.POST.get('company_id', None)
        admin_name = request.POST.get('company_owner_name', None)
        username = request.POST.get('username', None)
        email = request.POST.get('email', None)

        gtm = request.POST.get('gtm', None)
        hrm = request.POST.get('hrm', None)
        account = request.POST.get('account', None)
        billing = request.POST.get('billing', None)
        asset = request.POST.get('asset', None)

        check_companyID = Companies.objects.filter(
            company_id=company_id).values()
        if (len(check_companyID) > 0):
            msg = {
                'status': 'Company ID exist'
            }
            return JsonResponse(msg)

        company_username = 0
        companyID = 0

        try:
            # aliasName = str(admin_name).split(' ')[0] + " " + str(father_name)

            company_user = CompanyUser.objects.create(
                name=admin_name,
                company_id=company_id,
                username=username,
                email=email,
                registrationDate=str(date.today()),
                is_superuser=False,
                is_admin=True,
                is_active=True,
                is_staff=True,
                is_owner=True,
                is_manager=False,
                is_assistant=False
            )
            print('user saved in campany user table ', company_user.id)
            company_username = company_user.id
            print(email)

            company = Companies.objects.create(

                company_name=companyName,
                company_id=company_id,
                admin_name=admin_name,
                username=username,
                email=email,
                registrationDate=str(date.today()),
                gtm=False if gtm == 'false' else True,
                hrm=False if hrm == 'false' else True,
                account=False if account == 'false' else True,
                billing=False if billing == 'false' else True,
                asset=False if asset == 'false' else True,
                is_approved=False,
            )
            print('user saved in Companies table, ', company.id)
            companyID = company.id
            msg = {
                'status': 'success'
            }
            return JsonResponse(msg)

        except Exception as e:
            print('Some error occured ', e)

            msg = {
                'status': e.args[0]
            }

            if company_username != 0:
                CompanyUser.objects.filter(id=company_username).delete()

            if companyID != 0:
                Companies.objects.filter(id=companyID).delete()

            return JsonResponse(msg, safe=False)

    else:
        print('failed')
        context = dict()
        return render(request, 'account/companyRegistrationForm.html')


@csrf_exempt
def companyLogin(request):
    context = dict()
    if request.method == 'POST':
        username = request.POST.get('username', None)
        password = request.POST.get('password', None)
        print('username ', username)
        print('password ', password)

        print(request.user)
        print(User.objects.filter(username=username).all())
        user = authenticate(username=username, password=password)

        print('User = ', user)

        if User.objects.filter(username=username).all():
            print('User exist')
            context['user'] = True
            user = authenticate(username=username, password=password)

            print('User = ', user)
            print('User = ', user.is_superuser)
            if (user.is_superuser):
                auth.login(request, user)
                context['redirectTo'] = '/owl-erp/home'
                context['password'] = True

            else:
                if user is not None:
                    print("User authenticated in login ", user)
                    # is active
                    is_active = CompanyUser.objects.filter(
                        username=user
                    ).values('is_active')[0]['is_active']
                    if is_active:
                        auth.login(request, user)
                        context['redirectTo'] = '/owl-erp/home'
                        context['password'] = True
                    else:
                        context['is_active'] = False
                else:
                    context['password'] = False

        else:
            print('User doesn\'t exist')
            context['user'] = False

        # context['redirectTo'] = 'login page'
        return JsonResponse(context)

        # user = authenticate(username=email, password=password)
        # print('User = ',user)
        # # group = Group.objects
        # if user is not None:
        #     print("User authenticated in login")
        #     auth.login(request, user)
        # return redirect('/index/')
    else:
        return render(request, 'account/companyLogin.html', {'title': 'Company Login'})


def companyLogout(request):
    print('We are in log out')

    auth.logout(request)
    return redirect('/login')


@csrf_protect
def uploadImage(request):
    print('We are in uploadImage')
    try:
        file = request.FILES['file']
        print(file)
        fs = FileSystemStorage()
        filename = '_'.join((file.name).split(' '))
        filename = fs.save(filename, file)

        uploaded_file_url = fs.url(filename)
        print(uploaded_file_url)
        return JsonResponse({
            'status': 'successful',
            'is_valid': True,
            'name': filename,
            'image_url': uploaded_file_url
        })
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print('exeption ', e)
        pass

    return JsonResponse({'status': 'unsuccessful'})


@csrf_exempt
def saveImageUrl(request, username=0):
    return Response('Function not Defined', status=status.HTTP_400_BAD_REQUEST)
    # image_url = request.POST.get('image_url', None)
    # company_id = getCompanyId(request)

    # print('user id ', username)
    # print('image_url ', image_url)

    # # Getting old entity snapshot
    # before_changed = getEntityDetails(
    #     'account', 'CompanyUser', username)

    # try:
    #     CompanyUser.objects.filter(id=username).update(
    #         image_url=image_url
    #     )

    #     # Getting current entity snapshot
    #     after_changed = getEntityDetails(
    #         'account', 'CompanyUser', username)

    #     # creating History
    #     createHistoryForUpdate(request, 'account', 'CompanyUser',
    #                            username, company_id, before_changed, after_changed, request.data)

    #     return JsonResponse({'status': 'success'})
    # except Exception as e:
    #     logging.getLogger("error_logger").error(repr(e))
    #     print('error ', e)
    #     return JsonResponse({'status': 'failed'})


# Views for Angular


@api_view(['POST', 'GET'])
def login(request):
    print(request.data)
    context = dict()
    print("")

    try:
        purge_expired_tokens()
        username = str(request.data['username']).lower().strip()
        password = request.data['password']

        if User.objects.filter(username=username).all():
            print('User exist')
            context['user'] = True
            user = authenticate(username=username, password=password)

            print('User = ', user)
            # print('User = ', user.is_superuser)

            if user:
                if (user.is_superuser):
                    print('Super User = ', user.is_superuser)
                    auth.login(request, user)
                    context['redirectTo'] = '/owl-erp/home'
                    context['password'] = True
                    context['is_active'] = True

                else:
                    print("User authenticated in login ", user)
                    # is active
                    is_active = CompanyUser.objects.filter(
                        username=user
                    ).values('is_active')[0]['is_active']
                    if is_active:
                        auth.login(request, user)
                        context['redirectTo'] = '/owl-erp/home'
                        context['password'] = True
                        context['is_active'] = True
                    else:
                        context['is_active'] = False
                        context['password'] = True

                token = get_token(request)
                print('Token => ', token)
                context['token'] = token
            else:
                context['password'] = False

        else:
            print('User doesn\'t exist')
            context['user'] = False

        # context['redirectTo'] = 'login page'
        return JsonResponse(context)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response(e.args)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def logout(request):
    purge_expired_tokens()
    revoke_request_tokens(request)
    auth.logout(request)
    return Response({'detail': 'Logged out successfully'})


# @api_view(['POST', 'GET'])
# @permission_classes([IsAuthenticated])
# def createNewUser(request):
#     user_details = getUserDetails(request)
#     form_data = json.loads(request.data['form_data'])
#     name = form_data['name']
#     username = str(form_data['username'] + '.' +
#                    user_details['company__company_id']).lower().strip()
#     email = str(form_data['email']).lower()
#     # password = 'abc123'
#     password = ''.join(random.choices(string.ascii_uppercase +
#                                       string.digits, k=6))

#     access_permission = form_data['access_permission']

#     check_user = CompanyUser.objects.filter(
#         username=username
#     ).values()

#     if (len(check_user)):
#         return Response({'warning': 'Username Already Exist'})

#     is_admin = False
#     is_manager = False
#     is_assistant = False

#     if access_permission == 'admin':
#         is_admin = True
#     elif access_permission == 'manager':
#         is_manager = True
#     else:
#         is_assistant = True
#     try:
#         company_user = CompanyUser.objects.create(
#             name=name,
#             company_id=user_details['company_id'],
#             username=username,
#             email=email,
#             mobile=form_data['number'],
#             excellency_point=form_data['excellency_point'],
#             attachment_id=form_data['attachment_id'],
#             registrationDate=str(date.today()),
#             is_superuser=False,
#             is_admin=is_admin,
#             is_active=True,
#             is_staff=True,
#             is_owner=False,
#             is_manager=is_manager,
#             is_assistant=is_assistant
#         )
#         print('creating company user ', company_user)
#         # company_user.save()

#         usr = User.objects.create_user(
#             username=username,
#             email=email,
#             password=password
#         )
#         usr.save()
#         # print('user created ', usr)
#         test = {
#             'success': 'User Created Successfully',
#             'password': password,
#             'user_id':company_user.id
#         }
#         print("test",test)
#         return Response({
#             'success': 'User Created Successfully',
#             'password': password,
#             'user_id':company_user.id
#         })
#     except Exception as err:
#         logging.getLogger("error_logger").error(repr(err))
#         print('exception is ', err.args[0])
#         return Response(err.args[0], status=500)
#     # return Response()
@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def createNewUser(request):
    print(request.data)
    user_details = getUserDetails(request)
    form_data = json.loads(request.data['form_data'])
    name = form_data['name']
    username = str(form_data['username']).lower().strip()
    email = str(form_data['email']).lower()
    password = ''.join(random.choices(
        string.ascii_uppercase + string.digits, k=6))
    access_permission = form_data['access_permission']
    role_value = form_data.get('role')

    # Check if username already exists in this company
    check_user = CompanyUser.objects.filter(
        username=username,
        company_id=user_details['company_id']
    ).first()
    if check_user:
        return Response({'warning': 'Username Already Exists'}, status=400)

    # Determine permissions
    is_admin = access_permission == 'admin'
    is_manager = access_permission == 'manager'
    is_assistant = not (is_admin or is_manager)

    try:
        # Create CompanyUser instance
        company_user = CompanyUser.objects.create(
            name=name,
            company_id=user_details['company_id'],
            username=username,
            email=email,
            mobile=form_data['number'],
            excellency_point=form_data['excellency_point'],
            attachment_id=form_data['attachment_id'],
            registrationDate=str(date.today()),
            role=role_value,
            is_superuser=False,
            is_admin=is_admin,
            is_active=True,
            is_staff=True,
            is_owner=False,
            is_manager=is_manager,
            is_assistant=is_assistant
        )

        # Create Django User instance only if it does not already exist
        try:
            django_user_exists = (
                User.objects.filter(username=username).exists()
                or User.objects.filter(email=email).exists()
            )
            if not django_user_exists:
                usr = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password
                )
                usr.save()
        except IntegrityError as e:
            # Handle ID conflicts
            if "duplicate key value violates unique constraint" in str(e):
                # Retry with a new user ID (or take additional actions)
                max_id = User.objects.aggregate(
                    max_id=Max('id'))['max_id'] or 0
                new_id = max_id + 1
                usr = User.objects.create(
                    id=new_id,  # Assign a new ID
                    username=username,
                    email=email,
                    password=password
                )
                usr.save()

        return Response({
            'success': 'User Created Successfully',
            'password': password,
            'user_id': company_user.id
        })

    except Exception as err:
        logging.getLogger("error_logger").error(repr(err))
        return Response({'error': str(err)}, status=500)


@api_view(['POST', 'GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def createNewUserFromGoogle(request):
    # user_details = getUserDetails(request)
    print(request.data)
    form_data = json.loads(request.data['form_data'])
    name = form_data['name']
    username = str(form_data['email']).lower()
    email = str(form_data['email']).lower()
    company_id = form_data['company_id']
    password = '########'
    access_permission = form_data['access_permission']

    # Check if username already exists
    check_user = CompanyUser.objects.filter(email=email).first()
    if check_user:
        print({'warning': 'Email Already Exists'})
        # return Response({'warning': 'Email Already Exists'}, status=400)

    # Determine permissions
    is_admin = access_permission == 'admin'
    is_manager = access_permission == 'manager'
    is_assistant = not (is_admin or is_manager)

    try:
        # Create CompanyUser instance
        company_user = CompanyUser.objects.create(
            name=name,
            company_id=company_id,
            username=username,
            email=email,
            mobile=form_data['number'],
            excellency_point=form_data['excellency_point'],
            attachment_id=0,
            registrationDate=str(date.today()),
            is_superuser=False,
            is_admin=is_admin,
            is_active=True,
            is_staff=True,
            is_owner=False,
            is_manager=is_manager,
            is_assistant=is_assistant
        )

        # Create Django User instance
        try:
            usr = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            usr.save()
        except IntegrityError as e:
            # Handle ID conflicts
            if "duplicate key value violates unique constraint" in str(e):
                # Retry with a new user ID (or take additional actions)
                max_id = User.objects.aggregate(
                    max_id=Max('id'))['max_id'] or 0
                new_id = max_id + 1
                usr = User.objects.create(
                    id=new_id,  # Assign a new ID
                    username=username,
                    email=email,
                    password=password
                )
                usr.save()

        return Response({
            'success': 'User Created Successfully',
            # 'password': password,
            'user_id': company_user.id
        })

    except Exception as err:
        print(err.args)
        return Response({'error': str(err)}, status=500)


@api_view(['POST', 'GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def checkEmailAlreadyExist(request):
    print(request.data)  # For debugging, check incoming request structure

    try:
        # Access 'form_data' directly as it seems to be a string
        form_data_str = request.data.get('form_data', [None])
        if form_data_str is None:
            return Response({'error': 'No email provided'}, status=400)

        # Load the email from the incoming data; since you might just be sending an email
        form_data = json.loads(form_data_str)

        # Assume form_data is now a dict containing email
        email = str(form_data.get('email', '')).lower()  # Getting email safely

        # Check if the email exists in the database
        check_user = CompanyUser.objects.filter(
            email=email, username=email).first()

        if check_user:
            print({'warning': 'Email Already Exists'})
            return Response({'warning': 'Email Already Exists'}, )
        else:
            print({'warning': 'Email Available'})
            return Response({'warning': 'Email Available'}, )

    except json.JSONDecodeError:
        return Response({'error': 'Invalid JSON format'}, status=400)
    except Exception as err:
        print(err.args)
        logging.getLogger("error_logger").error(repr(err))
        return Response({'error': str(err)}, status=500)


@api_view(['POST'])
def signup(request):
    print(request.data)
    companyName = request.data['company_name']
    company_id = request.data['company_id']
    admin_name = request.data['admin_name']
    username = request.data['username'].lower().strip() \
        + '.' + request.data['company_id'].lower().strip()
    email = request.data['email']

    gtm = request.data['gtm']
    hrm = request.data['hrm']
    account = request.data['account']
    billing = request.data['billing']
    asset = request.data['asset']

    check_companyID = Companies.objects.filter(
        company_id=company_id).values()
    if (len(check_companyID) > 0):
        msg = {
            'result': 'Company ID exist',
            'status': 111
        }
        return Response(msg)

    company_username = 0
    companyID = 0

    try:
        # aliasName = str(admin_name).split(' ')[0] + " " + str(father_name)

        company_user = CompanyUser.objects.create(
            name=admin_name,
            company_id=company_id,
            username=username,
            email=email,
            registrationDate=str(date.today()),
            is_superuser=False,
            is_admin=True,
            is_active=True,
            is_staff=True,
            is_owner=True,
            is_manager=False,
            is_assistant=False
        )
        print('user saved in campany user table ', company_user.id)
        company_username = company_user.id
        print(email)

        company = Companies.objects.create(

            company_name=companyName,
            company_id=company_id,
            admin_name=admin_name,
            username=username,
            email=email,
            registrationDate=str(date.today()),
            gtm=gtm,
            hrm=hrm,
            account=account,
            billing=billing,
            asset=asset,
            is_approved=False,
        )
        print('user saved in Companies table, ', company.id)
        companyID = company.id
        msg = {
            'result': 'Request sent successfully',
            'status': 200
        }
        return Response(msg)

    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print('Some error occured ', e)

        msg = {
            'result': e.args[0],
            'status': 999
        }

        if company_username != 0:
            CompanyUser.objects.filter(id=company_username).delete()

        if companyID != 0:
            Companies.objects.filter(id=companyID).delete()

        return Response(msg)

    else:
        return Response({'msg': 'Something going wrong', 'status': 999})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def getInActiveCompanyUsers(request):
    user_details = getUserDetails(request)
    print(user_details['company_id'])
    queryset = CompanyUser.objects.filter(
        company_id=user_details['company_id']
    ).exclude(
        Q(is_active=True)
    ).values(
        'id',
        'name',
        'username',
        'image_url',
        'attachment_id',
        'is_admin',
        'is_active',
        'is_staff',
        'is_owner',
        'is_manager',
        'is_assistant',
    ).order_by('name')

    for user in queryset:
        user['base64_image'] = getImageAsBase64(
            request, user['attachment_id'])
    return Response(queryset)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getActiveCompanyUsers(request):
    user_details = getUserDetails(request)
    queryset = CompanyUser.objects.filter(
        company_id=user_details['company_id']
    ).exclude(
        Q(is_active=False)
    ).values(
        'id',
        'name',
        'username',
        'mobile',
        'email',
        'image_url',
        'attachment_id',
        'is_admin',
        'is_active',
        'is_staff',
        'is_owner',
        'is_manager',
        'is_assistant',
    ).order_by('name')

    for user in queryset:
        user['base64_image'] = getImageAsBase64(
            request, user['attachment_id'])

    return Response(queryset)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def changeActivityCompanyUsers(request):
    print(request.data)
    users = json.loads(request.data['users'])
    activate = json.loads(request.data['activate'])
    try:

        selected_users = CompanyUser.objects.filter(
            id__in=users
        ).update(
            is_active=activate
        )
        return Response(selected_users)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print(e.args[0])
        return Response(e.args[0])


# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def changeUserRightOfCompanyUsers(request):
#     company_id = getCompanyId(request)

#     users = json.loads(request.data['users'])
#     for d in users:
#         try:

#             # Getting old entity snapshot
#             before_changed = getEntityDetails(
#                 'account', 'CompanyUser', d['id'])

#             CompanyUser.objects.filter(
#                 id=d['id']
#             ).update(
#                 is_admin=d['is_admin'],
#                 is_manager=d['is_manager'],
#                 is_assistant=d['is_assistant'],
#             )

#             # Getting new entity snapshot
#             after_changed = getEntityDetails(
#                 'account', 'CompanyUser', d['id'])

#             # creating History
#             createHistoryForUpdate(request, 'account', 'CompanyUser',
#                                    d['id'], company_id, before_changed, after_changed, request.data)

#         except Exception as e:
#             print(e.args[0])

#     return Response()


# @api_view(['GET', 'POST'])
# @permission_classes([AllowAny])
# def getCompanyInfo(request):
#     company_id = getCompanyId(request)

#     print(request.data)
#     # print('company_id => ', company_id)

#     context = dict()
#     user = Companies.objects.filter(id=company_id).values().first()
#     # print(user)

#     if user:
#         company_info = CompanyInfo.objects.filter(
#             company_id=company_id).exists()

#         # print('info ', company_info)
#         if not company_info:
#             try:
#                 CompanyInfo.objects.create(
#                     company_id=company_id,
#                     company_name=user['company_name'],
#                     admin_name=user['admin_name'],
#                     email=user['email']
#                 )
#             except Exception as e:
#                 print(e.args[0])
#         # else:
#         company_info = CompanyInfo.objects.filter(
#             company_id=company_id).values().first()
#         # print('company_info ', company_info)

#         if company_info:
#             context['company_info'] = company_info
#             # print(getAttachmentsByIDList([company_info['company_logo_id']]))
#             context['image_details'] = getAttachmentsByIDList(
#                 [company_info['company_logo_id']])

#     return Response({'response': context})

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def getCompanyInfo(request):
    context = dict()

    # Read company_id and file_id from request.POST or request.data
    company_id = request.POST.get('company_id') or request.data.get(
        'company_id') or getCompanyId(request)
    file_id = request.POST.get('file_id') or request.data.get('file_id')

    # Safety check
    if not company_id:
        return Response({'response': {}, 'error': 'Company ID missing'}, status=400)

    # Get the company (user) record
    user = Companies.objects.filter(id=company_id).values().first()
    if not user:
        return Response({'response': {}, 'error': 'Invalid company ID'}, status=400)

    # Check if CompanyInfo already exists
    company_info_exists = CompanyInfo.objects.filter(
        company_id=company_id).exists()

    if not company_info_exists:
        try:
            company_info_data = {
                "company_id": company_id,
                "company_name": user['company_name'],
                "admin_name": user['admin_name'],
                "email": user['email'],
            }

            if file_id:
                company_info_data["company_logo_id"] = file_id

            CompanyInfo.objects.create(**company_info_data)

        except Exception as e:
            print("Error while creating CompanyInfo:", e)
            return Response({'response': {}, 'error': str(e)}, status=500)

    # Fetch final company info
    company_info = CompanyInfo.objects.filter(
        company_id=company_id).values().first()

    if company_info:
        context['company_info'] = company_info

        # Only fetch image details if logo is linked
        logo_id = company_info.get('company_logo_id')
        if logo_id:
            context['image_details'] = getAttachmentsByIDList([logo_id])
            context['company_thumbnail_image_url'] = getImageAsBase64(
                request, logo_id
            )

        def sanitize_statutory_record(record):
            if not record:
                return record
            record.pop('pan', None)
            record.pop('tan', None)
            record.pop('epf_no', None)
            record.pop('esi_no', None)
            return record

        statutory_id = company_info.get('statutory_id')
        if statutory_id:
            statutory_register = StatutoryRegister.objects.filter(
                id=statutory_id
            ).values().first()
            if statutory_register:
                context['statutory_register'] = sanitize_statutory_record(
                    statutory_register
                )

        statutory_registers = list(StatutoryRegister.objects.filter(
            company_id=company_id
        ).values().order_by('id'))
        context['statutory_registers'] = [
            sanitize_statutory_record(record) for record in statutory_registers
        ]

        custom_fields = list(StatutoryRegisterCustomField.objects.filter(
            company_id=company_id
        ).values().order_by('id'))
        context['statutory_custom_fields'] = custom_fields

        custom_values = list(StatutoryRegisterCustomValue.objects.filter(
            company_id=company_id
        ).values('id', 'statutory_register_id', 'custom_field_id', 'value'))
        context['statutory_custom_values'] = custom_values

        owners = list(Owners.objects.filter(
            company_id=company_id
        ).values().order_by('id'))
        context['owners'] = owners

    return Response({'response': context})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getOwners(request):
    company_id = request.query_params.get(
        'company_id') or getCompanyId(request)
    if not company_id:
        return Response({'response': [], 'error': 'Company ID missing'}, status=400)

    owners = list(Owners.objects.filter(
        company_id=company_id
    ).values().order_by('id'))
    return Response({'response': owners}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def addOwner(request):
    company_id = request.data.get('company_id') or getCompanyId(request)
    if not company_id:
        return Response({'response': {}, 'error': 'Company ID missing'}, status=400)

    primary_admin_raw = request.data.get('primary_admin', False)
    primary_admin = (
        str(primary_admin_raw).lower() in ['true', '1', 'yes', 'on']
        if isinstance(primary_admin_raw, str)
        else bool(primary_admin_raw)
    )

    owner_data = {
        'company_id': company_id,
        'Name': request.data.get('Name', '').strip(),
        'Designation': request.data.get('Designation', '').strip(),
        'otherid': request.data.get('otherid', '').strip(),
        'email': request.data.get('email', '').strip(),
        'note': request.data.get('note', '').strip(),
        'primary_admin': primary_admin,
        'Pan': request.data.get('Pan', '').strip(),
        'created_by': request.user.username,
        'created_on': datetime.datetime.now(),
    }

    if not owner_data['Name']:
        return Response({'response': {}, 'error': 'Owner name is required'}, status=400)

    owner = Owners.objects.create(**owner_data)
    return Response({'response': owner.id}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def updateOwner(request):
    owner_id = request.data.get('id')
    company_id = request.data.get('company_id') or getCompanyId(request)
    if not owner_id:
        return Response({'response': {}, 'error': 'Owner ID missing'}, status=400)
    if not company_id:
        return Response({'response': {}, 'error': 'Company ID missing'}, status=400)

    primary_admin_raw = request.data.get('primary_admin', False)
    primary_admin = (
        str(primary_admin_raw).lower() in ['true', '1', 'yes', 'on']
        if isinstance(primary_admin_raw, str)
        else bool(primary_admin_raw)
    )

    update_data = {
        'Name': request.data.get('Name', '').strip(),
        'Designation': request.data.get('Designation', '').strip(),
        'otherid': request.data.get('otherid', '').strip(),
        'email': request.data.get('email', '').strip(),
        'note': request.data.get('note', '').strip(),
        'Pan': request.data.get('Pan', '').strip(),
        'primary_admin': primary_admin,
    }

    updated = Owners.objects.filter(
        id=owner_id, company_id=company_id
    ).update(**update_data)
    if not updated:
        return Response({'response': {}, 'error': 'Owner not found'}, status=404)

    return Response({'response': 'Updated Successfully'}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getStatutoryRegisters(request):
    company_id = request.query_params.get(
        'company_id') or getCompanyId(request)
    if not company_id:
        return Response({'response': [], 'error': 'Company ID missing'}, status=400)

    statutory_registers = list(StatutoryRegister.objects.filter(
        company_id=company_id
    ).values().order_by('id'))
    for record in statutory_registers:
        record.pop('pan', None)
        record.pop('tan', None)
        record.pop('epf_no', None)
        record.pop('esi_no', None)
    return Response({'response': statutory_registers}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def addStatutoryRegister(request):
    company_id = request.data.get('company_id') or getCompanyId(request)
    if not company_id:
        return Response({'response': {}, 'error': 'Company ID missing'}, status=400)

    since_value = request.data.get('since') or None
    since_parsed = None
    if since_value:
        try:
            since_parsed = datetime.datetime.fromisoformat(str(since_value))
        except ValueError:
            since_parsed = None

    renewal_value = request.data.get('renewal_date') or None
    renewal_parsed = None
    if renewal_value:
        try:
            renewal_parsed = datetime.datetime.fromisoformat(
                str(renewal_value))
        except ValueError:
            renewal_parsed = None

    statutory_data = {
        'company_id': company_id,
        'desc': request.data.get('desc', '').strip(),
        'registration_no': request.data.get('registration_no', '').strip(),
        'renewed_type': request.data.get('renewed_type', None),
        'since': since_parsed or dj_timezone.now(),
        'renewal_date': renewal_parsed,
        'note': request.data.get('note', '').strip(),
        'attachment_id': request.data.get('attachment_id', '').strip(),
    }

    statutory_record = StatutoryRegister.objects.create(**statutory_data)

    custom_values = request.data.get('custom_values', [])
    if isinstance(custom_values, list):
        upsert_statutory_custom_values(
            company_id, statutory_record.id, custom_values)
    return Response({'response': statutory_record.id}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def updateStatutoryRegister(request):
    statutory_id = request.data.get('id')
    company_id = request.data.get('company_id') or getCompanyId(request)
    if not statutory_id:
        return Response({'response': {}, 'error': 'Statutory ID missing'}, status=400)
    if not company_id:
        return Response({'response': {}, 'error': 'Company ID missing'}, status=400)

    since_value = request.data.get('since') or None
    since_parsed = None
    if since_value:
        try:
            since_parsed = datetime.datetime.fromisoformat(str(since_value))
        except ValueError:
            since_parsed = None

    renewal_value = request.data.get('renewal_date') or None
    renewal_parsed = None
    if renewal_value:
        try:
            renewal_parsed = datetime.datetime.fromisoformat(
                str(renewal_value))
        except ValueError:
            renewal_parsed = None

    update_data = {
        'desc': request.data.get('desc', '').strip(),
        'registration_no': request.data.get('registration_no', '').strip(),
        'renewed_type': request.data.get('renewed_type', None),
        'note': request.data.get('note', '').strip(),
        'attachment_id': request.data.get('attachment_id', '').strip(),
    }
    if since_parsed:
        update_data['since'] = since_parsed
    if renewal_parsed:
        update_data['renewal_date'] = renewal_parsed

    updated = StatutoryRegister.objects.filter(
        id=statutory_id, company_id=company_id
    ).update(**update_data)
    if not updated:
        return Response({'response': {}, 'error': 'Statutory register not found'}, status=404)

    custom_values = request.data.get('custom_values', [])
    if isinstance(custom_values, list):
        upsert_statutory_custom_values(company_id, statutory_id, custom_values)

    return Response({'response': 'Updated Successfully'}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getStatutoryCustomFields(request):
    company_id = request.query_params.get(
        'company_id') or getCompanyId(request)
    if not company_id:
        return Response({'response': [], 'error': 'Company ID missing'}, status=400)

    custom_fields = list(StatutoryRegisterCustomField.objects.filter(
        company_id=company_id
    ).values().order_by('id'))
    return Response({'response': custom_fields}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def addStatutoryCustomField(request):
    company_id = request.data.get('company_id') or getCompanyId(request)
    if not company_id:
        return Response({'response': {}, 'error': 'Company ID missing'}, status=400)

    name = str(request.data.get('name', '')).strip()
    if not name:
        return Response({'response': {}, 'error': 'Field name is required'}, status=400)

    field_type = str(request.data.get('field_type', 'text')).strip() or 'text'
    field = StatutoryRegisterCustomField.objects.create(
        company_id=company_id,
        name=name,
        field_type=field_type,
        created_by=request.user.username
    )
    return Response({'response': field.id}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def updateStatutoryCustomField(request):
    field_id = request.data.get('id')
    company_id = request.data.get('company_id') or getCompanyId(request)
    if not field_id:
        return Response({'response': {}, 'error': 'Field ID missing'}, status=400)
    if not company_id:
        return Response({'response': {}, 'error': 'Company ID missing'}, status=400)

    name = str(request.data.get('name', '')).strip()
    field_type = str(request.data.get('field_type', 'text')).strip() or 'text'
    if not name:
        return Response({'response': {}, 'error': 'Field name is required'}, status=400)

    updated = StatutoryRegisterCustomField.objects.filter(
        id=field_id, company_id=company_id
    ).update(name=name, field_type=field_type)
    if not updated:
        return Response({'response': {}, 'error': 'Custom field not found'}, status=404)

    return Response({'response': 'Updated Successfully'}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deleteStatutoryCustomField(request):
    field_id = request.data.get('id')
    company_id = request.data.get('company_id') or getCompanyId(request)
    if not field_id:
        return Response({'response': {}, 'error': 'Field ID missing'}, status=400)
    if not company_id:
        return Response({'response': {}, 'error': 'Company ID missing'}, status=400)

    StatutoryRegisterCustomValue.objects.filter(
        company_id=company_id,
        custom_field_id=field_id
    ).delete()
    deleted, _ = StatutoryRegisterCustomField.objects.filter(
        id=field_id, company_id=company_id
    ).delete()
    if not deleted:
        return Response({'response': {}, 'error': 'Custom field not found'}, status=404)

    return Response({'response': 'Deleted Successfully'}, status=200)


def upsert_statutory_custom_values(company_id, statutory_id, custom_values):
    for item in custom_values:
        field_id = item.get('custom_field_id')
        value = item.get('value', '')
        if not field_id:
            continue
        StatutoryRegisterCustomValue.objects.update_or_create(
            company_id=company_id,
            statutory_register_id=statutory_id,
            custom_field_id=field_id,
            defaults={'value': value}
        )


def _is_super_admin_request(request) -> bool:
    if getattr(request.user, "is_superuser", False):
        return True
    username = getattr(request.user, "username", "") or ""
    email = getattr(request.user, "email", "") or ""
    return CompanyUser.objects.filter(
        Q(username=username) | Q(email=username) | Q(email=email),
        is_superuser=True,
    ).exists()


def _resolve_organization_admin_id(request):
    if getattr(request.user, "is_superuser", False):
        requested = (
            request.query_params.get("organization_id")
            or request.data.get("organization_id")
        )
        if requested:
            return str(requested)
        return None

    try:
        from accounts.models import OrganizationUser
    except Exception:
        return None

    organization_user = OrganizationUser.objects.filter(
        user=request.user).first()
    if organization_user is None:
        username = getattr(request.user, "username", "") or ""
        email = getattr(request.user, "email", "") or ""
        organization_user = OrganizationUser.objects.filter(
            Q(username__iexact=username) | Q(
                email__iexact=username) | Q(email__iexact=email)
        ).first()

    if organization_user is None:
        return None

    return str(organization_user.company_id)


def _can_manage_organization_company(request, company) -> bool:
    if company is None:
        return False
    if _is_super_admin_request(request):
        return True
    organization_id = _resolve_organization_admin_id(request)
    if not organization_id:
        return False
    return str(company.organization_id or "") == str(organization_id)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def getAllCompanies(request):
    context = dict()
    if _is_super_admin_request(request):
        companies = list(Companies.objects.values().order_by('company_name'))
        context['companies'] = companies
        return Response(context)
    return Response(
        {"error": "Only super admins can access company lists."},
        status=status.HTTP_403_FORBIDDEN,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def organization_company_summary(request):
    organization_id = _resolve_organization_admin_id(request)
    if not organization_id:
        organization_id = (
            request.query_params.get("organization_id")
            or request.query_params.get("company_id")
            or request.data.get("organization_id")
            or request.data.get("company_id")
        )
    if not organization_id:
        return Response(
            {"error": "Only organization admins can access this summary."},
            status=status.HTTP_403_FORBIDDEN,
        )

    companies_qs = Companies.objects.filter(
        organization_id=str(organization_id))
    context = {
        "organization_id": organization_id,
        "total": companies_qs.count(),
        "approved": companies_qs.filter(is_approved=True).count(),
        "delisted": companies_qs.filter(delist=True).count(),
        "companies": list(
            companies_qs.values(
                "id",
                "company_id",
                "company_name",
                "admin_name",
                "email",
                "is_approved",
                "delist",
                "active_from",
                "active_upto",
                "registrationDate",
            ).order_by("company_name")
        ),
    }
    return Response(context)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def organization_school_list(request):
    organization_id = _resolve_organization_admin_id(request)
    if not organization_id:
        return Response(
            {"error": "Only organization admins can access the school list."},
            status=status.HTTP_403_FORBIDDEN,
        )

    schools_qs = Companies.objects.filter(
        organization_id=str(organization_id),
        main_group__iexact="Vidya",
        sub_group__iexact="School",
    ).order_by("company_name")

    company_rows = list(
        schools_qs.values(
            "id",
            "company_id",
            "organization_id",
            "company_name",
            "location",
            "district",
            "admin_name",
            "username",
            "email",
            "address",
            "pin",
            "is_approved",
            "delist",
            "active_from",
            "active_upto",
            "registrationDate",
            "main_group",
            "sub_group",
            "school_category",
        )
    )
    company_ids = [row["id"] for row in company_rows]
    company_info_map = {
        row["company_id"]: row
        for row in CompanyInfo.objects.filter(company_id__in=company_ids).values(
            "company_id",
            "company_name",
            "admin_name",
            "email",
            "mobile_no",
            "address",
            "city",
            "pin",
            "country",
            "head_office_state",
            "organization_id",
        )
    }

    schools = []
    for company in company_rows:
        info = company_info_map.get(company["id"], {})
        schools.append(
            {
                # unified payload for UI table/edit dialog
                "id": company["id"],
                "company_id": company["company_id"],
                "organization_id": (
                    info.get("organization_id") or company.get("organization_id")
                ),
                "company_name": info.get("company_name") or company.get("company_name"),
                "admin_name": info.get("admin_name") or company.get("admin_name"),
                "username": company.get("username"),
                "email": info.get("email") or company.get("email"),
                "location": company.get("location"),
                "district": company.get("district"),
                "mobile_no": info.get("mobile_no"),
                "address": info.get("address") or company.get("address"),
                "city": info.get("city"),
                "state": info.get("head_office_state"),
                "country": info.get("country"),
                "pin": info.get("pin") or company.get("pin"),
                "is_approved": company.get("is_approved"),
                "delist": company.get("delist"),
                "active_from": company.get("active_from"),
                "active_upto": company.get("active_upto"),
                "registrationDate": company.get("registrationDate"),
                "main_group": company.get("main_group"),
                "sub_group": company.get("sub_group"),
                "school_category": company.get("school_category"),
            }
        )

    context = {
        "organization_id": organization_id,
        "total": len(schools),
        "schools": schools,
    }
    return Response(context)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def organization_hospital_list(request):
    organization_id = _resolve_organization_admin_id(request)
    if not organization_id:
        return Response(
            {"error": "Only organization admins can access the hospital list."},
            status=status.HTTP_403_FORBIDDEN,
        )

    requested_sub_group = str(request.GET.get("sub_group") or "Hospital").strip()
    sub_group_filter = requested_sub_group or "Hospital"

    hospitals_qs = Companies.objects.filter(
        organization_id=str(organization_id),
        main_group__iexact="Swasthya",
        sub_group__iexact=sub_group_filter,
    ).order_by("company_name")
    hospital_ids = list(hospitals_qs.values_list("id", flat=True))
    role_counts = defaultdict(int)
    if hospital_ids:
        for row in (
            CompanyUser.objects.filter(company_id__in=hospital_ids, delist=False)
            .exclude(role__isnull=True)
            .exclude(role__exact="")
            .values("role")
            .annotate(total=Count("id"))
        ):
            normalized_role = str(row.get("role") or "").strip().lower()
            if normalized_role:
                role_counts[normalized_role] = row.get("total") or 0

    company_rows = list(
        hospitals_qs.values(
            "id",
            "company_id",
            "organization_id",
            "company_name",
            "location",
            "district",
            "admin_name",
            "username",
            "email",
            "address",
            "pin",
            "is_approved",
            "delist",
            "active_from",
            "active_upto",
            "registrationDate",
            "main_group",
            "sub_group",
            "school_category",
        )
    )
    company_ids = [row["id"] for row in company_rows]
    company_info_map = {
        row["company_id"]: row
        for row in CompanyInfo.objects.filter(company_id__in=company_ids).values(
            "company_id",
            "company_name",
            "admin_name",
            "email",
            "mobile_no",
            "address",
            "city",
            "pin",
            "country",
            "head_office_state",
            "organization_id",
        )
    }

    hospitals = []
    for company in company_rows:
        info = company_info_map.get(company["id"], {})
        hospitals.append(
            {
                "id": company["id"],
                "company_id": company["company_id"],
                "organization_id": (
                    info.get("organization_id") or company.get("organization_id")
                ),
                "company_name": info.get("company_name") or company.get("company_name"),
                "admin_name": info.get("admin_name") or company.get("admin_name"),
                "username": company.get("username"),
                "email": info.get("email") or company.get("email"),
                "location": company.get("location"),
                "district": company.get("district"),
                "mobile_no": info.get("mobile_no"),
                "address": info.get("address") or company.get("address"),
                "city": info.get("city"),
                "state": info.get("head_office_state"),
                "country": info.get("country"),
                "pin": info.get("pin") or company.get("pin"),
                "is_approved": company.get("is_approved"),
                "delist": company.get("delist"),
                "active_from": company.get("active_from"),
                "active_upto": company.get("active_upto"),
                "registrationDate": company.get("registrationDate"),
                "main_group": company.get("main_group"),
                "sub_group": company.get("sub_group"),
                "school_category": company.get("school_category"),
            }
        )

    context = {
        "organization_id": organization_id,
        "total": len(hospitals),
        "summary": {
            "hospitals": len(hospitals),
            "approved": sum(1 for hospital in hospitals if hospital.get("is_approved")),
            "doctors": role_counts.get("doctor", 0),
            "administration": role_counts.get("administration", 0),
            "staff": role_counts.get("staff", 0),
        },
        "sub_group": sub_group_filter,
        "hospitals": hospitals,
    }
    return Response(context)


def _normalize_invite_url(raw_url: str) -> str:
    if not raw_url:
        return ""
    invite_url = str(raw_url).strip()
    if not invite_url:
        return ""
    if not invite_url.startswith(("http://", "https://")):
        invite_url = f"http://{invite_url}"
    if "/login/regiter-hospital" not in invite_url:
        invite_url = invite_url.rstrip("/") + "/login/regiter-hospital"
    return invite_url


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sendRegistrationInvite(request):
    if not _is_super_admin_request(request):
        return Response(
            {"error": "Only super admins can send registration invites."},
            status=status.HTTP_403_FORBIDDEN,
        )

    email = request.data.get("email")
    invite_url = _normalize_invite_url(request.data.get("invite_url"))

    if not email or not invite_url:
        return Response(
            {"error": "email and invite_url are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    subject = "Complete your hospital registration"
    msg = (
        "<p>You have been invited to register a hospital account.</p>"
        f"<p><a href=\"{invite_url}\">{invite_url}</a></p>"
    )
    sendGenericMailV2(email, subject, msg)
    return Response({"message": "Invitation sent."}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approveCompany(request):
    company_identifier = request.data.get(
        "company_id") or request.data.get("id")
    if not company_identifier:
        return Response(
            {"error": "company_id or id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    company_filter = Q(company_id=company_identifier)
    try:
        company_pk = int(company_identifier)
    except (TypeError, ValueError):
        company_pk = None
    if company_pk is not None:
        company_filter |= Q(id=company_pk)

    company = Companies.objects.filter(company_filter).first()
    if not company:
        return Response(
            {"error": "Company not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not _can_manage_organization_company(request, company):
        return Response(
            {"error": "Only super admins or the owning organization admin can approve companies."},
            status=status.HTTP_403_FORBIDDEN,
        )

    active_from_raw = request.data.get("active_from")
    active_upto_raw = request.data.get("active_upto")
    now = dj_timezone.now()

    if not active_from_raw:
        return Response(
            {"error": "active_from is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    parsed_from = parse_datetime(active_from_raw)
    if parsed_from is None:
        parsed_from_date = parse_date(active_from_raw)
        if parsed_from_date is None:
            return Response(
                {"error": "active_from must be a valid date or datetime."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parsed_from = datetime.datetime.combine(
            parsed_from_date, datetime.time.min
        )
    if parsed_from.tzinfo is None:
        parsed_from = dj_timezone.make_aware(parsed_from)

    parsed_upto = None
    if active_upto_raw not in (None, ""):
        parsed_upto = parse_datetime(active_upto_raw)
        if parsed_upto is None:
            parsed_upto_date = parse_date(active_upto_raw)
            if parsed_upto_date is None:
                return Response(
                    {"error": "active_upto must be a valid date or datetime."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            parsed_upto = datetime.datetime.combine(
                parsed_upto_date, datetime.time.max
            )
        if parsed_upto.tzinfo is None:
            parsed_upto = dj_timezone.make_aware(parsed_upto)

        if parsed_upto < parsed_from:
            return Response(
                {"error": "active_upto must be on or after active_from."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    company.active_from = parsed_from
    company.active_upto = parsed_upto
    company.is_approved = True
    company.delist = False
    company.save(update_fields=["active_from",
                 "active_upto", "is_approved", "delist"])

    return Response(
        {
            "status": 200,
            "company_id": company.id,
            "active_from": company.active_from,
            "active_upto": company.active_upto,
            "is_approved": company.is_approved,
            "delist": company.delist,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delistCompany(request):
    company_identifier = request.data.get(
        "company_id") or request.data.get("id")
    if not company_identifier:
        return Response(
            {"error": "company_id or id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    company_filter = Q(company_id=company_identifier)
    try:
        company_pk = int(company_identifier)
    except (TypeError, ValueError):
        company_pk = None
    if company_pk is not None:
        company_filter |= Q(id=company_pk)

    company = Companies.objects.filter(company_filter).first()
    if not company:
        return Response(
            {"error": "Company not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not _can_manage_organization_company(request, company):
        return Response(
            {"error": "Only super admins or the owning organization admin can delist companies."},
            status=status.HTTP_403_FORBIDDEN,
        )

    company.is_approved = False
    company.delist = True
    company.save(update_fields=["is_approved", "delist"])
    return Response(
        {
            "status": 200,
            "company_id": company.id,
            "is_approved": company.is_approved,
            "delist": company.delist,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def getAllCurrentCompanies(request):
    try:
        companies = list(Companies.objects.all().values())
        return Response({'response': companies}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def updateCompanyInfo(request):
#     company_id = getCompanyId(request)
#     form_data = json.loads(request.data['form_data'])
#     print('form_data -> ', form_data)
#     try:
#         statutory_fields = [
#             'desc',
#             'registration_no',
#             'renewed_type',
#             'since',
#             'renewal_date',
#             'note',
#         ]
#         statutory_payload = {
#             key: form_data.pop(key)
#             for key in statutory_fields
#             if key in form_data
#         }

#         # Getting old entity snapshot
#         before_changed = getEntityDetails(
#             'account', 'CompanyInfo', form_data['id'])

#         company_info = CompanyInfo.objects.filter(
#             id=form_data['id']
#         ).values('id', 'company_id', 'statutory_id').first()

#         if company_info and not form_data.get('company_id'):
#             form_data['company_id'] = company_info['company_id']

#         queryset = CompanyInfo.objects.filter(
#             id=form_data['id']
#         ).update(**form_data)

#         # Getting old entity snapshot
#         after_changed = getEntityDetails(
#             'account', 'CompanyInfo', form_data['id'])

#         # creating History
#         createHistoryForUpdate(request, 'account', 'CompanyInfo',
#                                form_data['id'], company_id, before_changed, after_changed, request.data)

#         if statutory_payload and company_info:
#             statutory_id = company_info.get('statutory_id')
#             if statutory_id:
#                 StatutoryRegister.objects.filter(
#                     id=statutory_id
#                 ).update(**statutory_payload)
#             else:
#                 statutory_payload['company_id'] = company_info['company_id']
#                 statutory_record = StatutoryRegister.objects.create(
#                     **statutory_payload
#                 )
#                 CompanyInfo.objects.filter(
#                     id=form_data['id']
#                 ).update(statutory_id=statutory_record.id)

#         # Create Or Update Head Office Location

#         location_name = str(form_data.get('location') or '').strip() or 'Head Office'
#         existing_location = Location.objects.filter(
#             company_id=form_data.get('company_id')
#         ).order_by('id').first()

#         if existing_location:
#             pin_value = form_data.get('pin')
#             if pin_value in (None, ''):
#                 pin_value = existing_location.pin

#             try:
#                 resolved_pin = int(str(pin_value).strip()) if pin_value not in (None, '') else existing_location.pin
#             except Exception:
#                 resolved_pin = existing_location.pin

#             existing_location.name = location_name or existing_location.name
#             existing_location.state = str(
#                 form_data.get('head_office_state')
#                 or form_data.get('state')
#                 or existing_location.state
#                 or ''
#             ).strip()
#             existing_location.city = str(
#                 form_data.get('city')
#                 or form_data.get('district')
#                 or existing_location.city
#                 or location_name
#             ).strip()
#             existing_location.pin = resolved_pin
#             existing_location.address = str(
#                 form_data.get('address')
#                 or existing_location.address
#                 or ''
#             ).strip()
#             existing_location.note = str(
#                 form_data.get('comments')
#                 or existing_location.note
#                 or ''
#             ).strip()
#             existing_location.country = str(
#                 form_data.get('country')
#                 or existing_location.country
#                 or ''
#             ).strip()
#             existing_location.created_by = getattr(
#                 request.user, 'username', ''
#             ) or existing_location.created_by
#             existing_location.created_on = existing_location.created_on or datetime.datetime.now()
#             existing_location.save()

#         return Response({'response': 'Updated Successfully'}, status=status.HTTP_200_OK)
#     except Exception as e:
#         logging.getLogger("error_logger").error(repr(e))
#         print('Error occured as => \n', e.args)
#         return Response(e, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def changeUserImage(request):
    try:
        queryset = CompanyUser.objects.filter(
            username=request.user.username
        ).update(
            attachment_id=request.data['image_id']
        )
        return Response({'response': 'User Image Updated'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print(e)
        print()
        return Response(e.args)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def updatePassword(request):
    user_details = getUserDetails(request)
    print("user_details >> ", user_details)
    old_password = request.data['old_password']
    new_password = request.data['new_password']
    try:
        u = User.objects.get(username=user_details['username'])
        # u = User.objects.get(username='admin')

        if (u.check_password(old_password)):
            print('New password id ', new_password)
            u.set_password(new_password)
            u.save()
            print('old password is correct & reset with new...')
            return Response({'msg': 'Password Reset Successfully', 'status': 200})
        else:
            print('Password is not correct')
            return Response({'msg': 'Old Password is not correct', 'status': 999})
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response(e.args)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def updateAdminPassword(request):
    old_password = request.data['old_password']
    new_password = request.data['new_password']
    try:
        u = User.objects.get(username=request.user)
        if (u.check_password(old_password)):
            print('New password id ', new_password)
            u.set_password(new_password)
            u.save()
            print('old password is correct & reset with new...')
            return Response({'msg': 'Password Reset Successfully', 'status': 200})
        else:
            print('Password is not correct')
            return Response({'msg': 'Old Password is not correct', 'status': 999})
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response(e.args)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def updateCompanyUserProfile(request):
    user_details = getUserDetails(request)
    if not user_details:
        return Response({'msg': 'User not found'}, status=404)

    update_data = {
        'name': request.data.get('name', '').strip(),
        'mobile': request.data.get('mobile', '').strip(),
        'about': request.data.get('about', '').strip(),
        'address': request.data.get('address', '').strip(),
    }

    CompanyUser.objects.filter(
        id=user_details['id'],
        company_id=user_details['company_id'],
    ).update(**update_data)

    return Response({'msg': 'Profile updated'}, status=200)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def resetForgotPassword(request):
    username = request.data['username']
    password = request.data['password']

    print(username)
    print(password)

    try:
        u = User.objects.get(username=username)
        print(u)
        if (u):
            print('New password id ', password)
            u.set_password(password)
            u.save()
            print('old password is correct & reset with new...')
            return Response({'msg': 'Password Reset Successfully', 'status': 200})
        else:
            print('Password is not correct')
            return Response({'msg': 'Old Password is not correct', 'status': 999})
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("Error occured as ", e.args)
        return Response(e.args, status=500)


# def getGitBranchName():
#     head_name = ''
#     try:
#         repo = Repository('./')
#         # option 1
#         head = repo.head
#         head_name = head.name
#     except:
#         try:
#             head_name = 'Version - ' + os.getenv('API_VERSION')
#         except:
#             head_name = 'Version Undefined'
#     print("Head is " + head_name)

#     if head_name:
#         head_name = head_name.split('/')[-1]

#     return head_name


# git_branch_head_name = getGitBranchName()

def getGitBranchName():
    head_name = ''
    try:
        from pygit2 import Repository
        repo = Repository('./')
        head_name = repo.head.name
    except Exception as e:
        env_version = os.getenv('API_VERSION')
        if env_version:
            head_name = f"Version-{env_version}"
        else:
            head_name = "Version-Undefined"

    print(f"[getGitBranchName] Head is {head_name}")

    if '/' in head_name:
        head_name = head_name.split('/')[-1]

    return head_name


# Store in settings so it’s accessible everywhere
GIT_BRANCH_HEAD_NAME = getGitBranchName()


def getHomePagePermissionFromUserGroup(user_id: int) -> list:

    permissions = UserGroup.objects.filter(
        user_ids__contains=[user_id]
    ).values_list(
        'app_wise_home_pages',
        flat=True
    )

    temp = []
    for urls in permissions:
        temp.extend(urls)
    permissions = temp

    return permissions


def checkPermissionLevel(user_id: int) -> tuple:

    groups = list(
        UserGroup.objects.filter(
            user_ids__contains=[user_id]
        ).values_list(
            'name',
            flat=True
        )
    )

    return 'Admin Group' in groups, 'Manager Group' in groups


def overrideUserPermission(group_perms: list, user_perms: list) -> list:

    for u_perm in user_perms:
        root_url = str(u_perm).strip().strip('/').split('/')[0]

        # getting desired output from tuple
        for index, g_perm in enumerate(group_perms):
            if root_url in g_perm:
                group_perms.pop(index)

    user_perms.extend(group_perms)
    return user_perms


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getCurrentUser(request):
    context = dict()

    updateCompanyActivationStatus(request)

    context['git_branch_head_name'] = getGitBranchName()

    if not request.user.is_superuser:
        user_details = getUserDetails(request)
        if not user_details:
            context['response'] = False
            context['msg'] = 'Company not Found'
            return Response(context)

        if not user_details['is_active']:
            context['response'] = False
            context['msg'] = 'You are not active'
            return Response(context)

        if request.user.is_authenticated:
            context['response'] = True

            # print("User details: ", request.user)
            # print("User details: ", request.user.is_superuser)

            context['is_superuser'] = request.user.is_superuser
            if (request.user.is_superuser):
                context['user'] = request.user.username

            requested_company_id = get_request_company_id(request)
            user_filters = {"username": request.user.username}
            if requested_company_id is not None:
                user_filters["company_id"] = requested_company_id
            user = CompanyUser.objects.filter(
                **user_filters).values(
                    'id',
                    'name',
                    'fatherOrHusband',
                    'aliasName',
                    'username',
                    'email',
                    'mobile',
                    'attachment_id',
                    'registrationDate',
                    'is_superuser',
                    'is_active',
                    'is_staff',
                    'is_owner',
                    'is_assistant',
                    'is_admin',
                    'role',
                    'medical_council_registration',
                    'about',
                    'address',
                    'excellency_point',
                    'company_id',
                    'app_wise_home_pages',
                    'is_googleuser',
                    "disclaimer"
            ).first()

            if user and user['attachment_id']:
                user['image_url'] = getImageAsBase64(
                    request, user['attachment_id'])
                print("user['image_url']?????", user['image_url'])

            if not user:
                context['response'] = False
                context['msg'] = 'User not found for company'
                return Response(context)

            user['is_admin'], user['is_manager'] = checkPermissionLevel(
                user['id'])

            # Get Group permissions
            group_permission = getHomePagePermissionFromUserGroup(user['id'])

            print('group_permission => ', group_permission)
            print("user['app_wise_home_pages'] => ",
                  user['app_wise_home_pages'])

            user['app_wise_home_pages'] = overrideUserPermission(
                group_permission, user['app_wise_home_pages'])

            print("user['app_wise_home_pages'] => ",
                  user['app_wise_home_pages'])

            if user:
                context['user'] = user
                context['permissions'] = []
                print('\n\n\nuser_id => ', user['id'])
                context['permissions'] = UrlBasedAccessControl.objects.filter(
                    Q(user_id=user['id']) |
                    Q(user_group__user_ids__contains=[user['id']])
                ).values()
                context['applications'] = Application.objects.values()

                company_id = user['company_id']
                print('company_id => ', company_id)

                company_details = Companies.objects.filter(
                    id=company_id).values().first()
                context['company_details'] = company_details

                companyInfo = CompanyInfo.objects.filter(
                    company_id=company_id).values().first()

                if companyInfo:
                    if companyInfo['company_logo_id']:
                        companyInfo['company_thumbnail_image_url'] = getImageAsBase64(
                            request, companyInfo['company_logo_id'])
                    context['companyInfo'] = companyInfo
                else:
                    context['companyInfo'] = {
                        'company_id': None,
                        'company_name': None,
                        'country': None,
                        'head_office_state': None,
                        'admin_name': None,
                        'mobile_no': None,
                        'email': None,
                        'head_office_gstin': None,
                        'comments': None,
                        'company_logo': None,
                    }

                token = get_token(request)
                print('Session id =>', request.session.session_key)

                print('Token => ', token)
                context['token'] = token

                # Get user-config
                config = UserConfig.objects.filter(
                    username=request.user.username
                ).values().first()
                context['config'] = config

            context['msg'] = 'You are authenticated'
            return Response(context)
        else:
            context['response'] = False
            context['msg'] = 'You are not authenticated'
            return Response(context)
    else:
        context['response'] = True
        context['is_superuser'] = request.user.is_superuser
        context['applications'] = Application.objects.values()
        context['user'] = request.user.username

        return Response(context)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def emailVerify(request):
    print(request.data)
    print(request.data['company_id'])
    print(request.data['email'])
    try:
        query = Companies.objects.filter(
            company_id=request.data['company_id']
        ).update(
            email=request.data['email']
        )
        print("Query => ", query)
        if query:
            return Response({'msg': query, 'status': 200})
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response(e.args, status=500)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def check_mail_with_username(request):
    print(request.data['username'])
    print(request.data['email'])
    response = ''
    status = 0
    try:
        user = CompanyUser.objects.filter(
            username=request.data['username'].lower(),
            email=request.data['email'].lower()
        ).values()
        if len(user):
            response = 'success'
            status = 200
        else:
            response = 'Username or name not found'
            status = 201
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("Error as => ", e.args[0])
        response = e.args[0]
        status = 400

    return Response(e.args, status=500)


def updateCompanyUserTable(data):
    pass


def parse_date_with_offset(date_str, offset_minutes):
    if '.' in str(date_str):
        date_format = "%Y-%m-%dT%H:%M:%S.%f%z"
    else:
        date_format = "%Y-%m-%dT%H:%M:%S%z"
    # Replace 'Z' with '+0000'
    date_str = date_str.replace('Z', '+0000')

    return (datetime.datetime.strptime(date_str, date_format) + timedelta(minutes=offset_minutes)).strftime('%Y-%m-%d')


def send_activation_msg_to_company_mail(data: dict, timezoneOffset: int = 0):
    email = data['email']
    subject = 'Your company has been activated'
    admin_name = data['admin_name']
    company_name = data.get(
        'company_name', 'your company')  # Added company name
    try:
        active_from = parse_date_with_offset(
            data['active_from'], timezoneOffset)
        active_upto = parse_date_with_offset(
            data['active_upto'], timezoneOffset)
    except ValueError as e:
        print("Error parsing date:", e)

    msg = f'''
        <h3>{admin_name}</h3>
        <h3>Your company has been activated from :<h3>
        <h3>{active_from} to {active_upto}</h3>
    '''
    activate_company(admin_name, company_name, email)

    # sendGenericMailV2(email, subject, msg)


def send_auto_activation_msg_to_company_mail(data: dict, timezoneOffset: int = 0):
    email = data['email']
    subject = 'Your company has been activated'
    admin_name = data['admin_name']
    company_name = data.get(
        'company_name', 'your company')  # Added company name

    msg = f"""
        <h3>Hello {admin_name},</h3>
        <p>Your company, <strong>{company_name}</strong>, has been successfully activated.</p>
    """
    activate_company(admin_name, company_name, email)
    # sendGenericMailV2(email, subject, msg)


# @api_view(['GET', 'POST'])
# @permission_classes([IsAuthenticated])
# def companyActivation(request):
#     print(request.data['newCompanyForm'])
#     data = json.loads(request.data['newCompanyForm'])
#     timezoneOffset = int(request.data['timezoneOffset'])
#     try:
#         query = Companies.objects.filter(
#             company_id=data['company_id']
#         ).update(**data)

#         if query:
#             updateCompanyUserTable(data)
#             send_activation_msg_to_company_mail(data, timezoneOffset)
#             return Response({'status': 200}, status=200)
#     except Exception as e:
#         logging.getLogger("error_logger").error(repr(e))
#         print('Error => ', e)
#         return Response(e.args[0], status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def companyActivation(request):
    print(request.data)
    data = json.loads(request.data['newCompanyForm'])
    timezoneOffset = int(request.data['timezoneOffset'])

    try:
        company_id = data['company_id']

        if company_id:  # If company_id is not empty or None
            # Update the company record if it exists
            query = Companies.objects.filter(
                company_id=company_id).update(**data)
            if query:  # Check if the update affected any rows
                updateCompanyUserTable(data)
                send_activation_msg_to_company_mail(data, timezoneOffset)
                return Response({'status': 200}, status=200)
            else:
                return Response({'status': 404, 'message': 'Company not found.'}, status=404)
        else:  # Handle the case where company_id is empty
            # Here, you could decide to fetch the company based on another criterion or update the first company found
            # This assumes that you need to update all companies with an empty company_id
            companies = Companies.objects.filter(company_id="")

            if companies.exists():  # If there are any companies with an empty company_id
                for company in companies:
                    for attr, value in data.items():
                        setattr(company, attr, value)  # Update each field
                    company.save()  # Save the changes for each company

                updateCompanyUserTable(data)  # Update user details
                send_activation_msg_to_company_mail(data, timezoneOffset)
                return Response({'status': 200, 'message': 'Updated companies with empty company_id.'}, status=200)
            else:
                return Response({'status': 404, 'message': 'No companies found with an empty company_id.'}, status=404)

    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print('Error => ', e)
        return Response({'error': str(e)}, status=500)


@api_view(['GET', 'POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def autoCompanyApproval(request):
    try:
        timezoneOffset = int(request.data.get('timezoneOffset', 0))
        raw_data = request.data.get('data', '{}')
        if isinstance(raw_data, str):
            input_data = json.loads(raw_data)
        else:
            input_data = raw_data  # already a dict if sent properly
        id = input_data.get('id', 0)
        email = input_data.get('email', '')
        username = input_data.get('username', '')
        admin_name = input_data.get('admin_name', '')
        company_name = input_data.get('company_name', '')
        registrationDate = input_data.get('registrationDate', )
        company_id = ""
        active_upto = input_data.get('active_upto', )
        # logo_id_while_create = input_data.get('logo_id_while_create')
        data = {
            "id": id,
            "company_id": company_id,
            "company_name": company_name,
            "active_from": registrationDate,
            "active_upto": active_upto,
            "address": None,
            "admin_name": admin_name,
            "father_name": None,
            "project_mgmt": False,
            "time_schedule": True,
            "hrm": False,
            "billing": False,
            "account": False,
            "statutory": False,
            "asset": True,
            "asset_lite": False,
            "inventry": True,
            "inventory_lite": False,
            "crm": False,
            "hotel": False,
            "production": False,
            "class_planner": False,
            "email": email,
            "is_approved": True,
            "mobile": None,
            "pin": None,
            "registrationDate": registrationDate,
            "username": username,
            # "logo_id_while_create":logo_id_while_create
        }

        print(data)
        if company_id:
            query = Companies.objects.filter(
                company_id=company_id).update(**data)
            if query:
                send_auto_activation_msg_to_company_mail(data)
                send_activation_msg_to_company_mail(data, timezoneOffset)
                return Response({'status': 200}, status=200)
            else:
                return Response({'status': 404, 'message': 'Company not found.'}, status=404)
        else:
            companies = Companies.objects.filter(company_id="")
            if companies.exists():
                for company in companies:
                    for attr, value in data.items():
                        setattr(company, attr, value)  # Update each field
                    company.save()  # Save the changes for each company

                send_auto_activation_msg_to_company_mail(data)
                send_activation_msg_to_company_mail(data, timezoneOffset)
                return Response({'status': 200, 'message': 'Updated companies with empty company_id.'}, status=200)
            else:
                return Response({'status': 404, 'message': 'No companies found with an empty company_id.'}, status=404)

    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print('Error => ', e)
        return Response({'error': str(e)}, status=500)


@permission_classes([IsAuthenticated])
def getCompanyDetails(request, company_id):
    """
    Return company details for the requested company_id. Supports both the
    human-facing company_id field and the primary key for robustness, and
    returns 404 instead of IndexError when not found.
    """
    normalized = str(company_id).strip()

    company = (
        Companies.objects.filter(Q(company_id=normalized) | Q(id=normalized))
        .values()
        .first()
    )

    if not company:
        return JsonResponse({"detail": "Company not found."}, status=404)

    return JsonResponse(company, safe=False)


# Change to GET because we're getting data based on the username
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def getCompanyDetailsbyusername(request, username):
    # Attempt to filter and get the company details
    try:
        queryset = Companies.objects.filter(username=username).values()

        # Check if queryset is empty
        if not queryset:
            queryset = Companies.objects.filter(email=username).values()
            return JsonResponse({'error': 'Company not found'})
        # Return the first element in the queryset
        # `safe=False` allows returning a dict directly
        return JsonResponse(queryset[0], safe=False, status=200)

    except Exception as e:
        # Handle any unexpected errors
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def getCompanyUserDetailsbyusername(request, username):
    # Attempt to filter and get the company details
    try:
        queryset = CompanyUser.objects.filter(username=username).values()

        # Check if queryset is empty
        if not queryset:
            # return 404 if not found
            return JsonResponse({'error': 'Username not found'}, )

        # Return the first element in the queryset
        # Return as JSON response
        return JsonResponse({"username": username, "details": list(queryset)}, status=200)

    except Exception as e:
        # Handle any unexpected errors
        return JsonResponse({'error': str(e)}, status=500)


@permission_classes([IsAuthenticated])
def getAllUser(request):
    user_details = getUserDetails(request)
    company_id = user_details['company_id']
    users = CompanyUser.objects.filter(
        company_id=company_id
    ).values(
        'name',
        'username',
        'image_url',
        'attachment_id',
        'email'
    )
    for user in users:
        if user['attachment_id']:
            user['image_url'] = getImageAsBase64(
                request, user['attachment_id'])
    return Response(users, status=status.HTTP_200_OK)


def updateCompanyActivationStatus(request):
    print("We are in update companies")

    yesterday = datetime.datetime.combine(
        datetime.date.today() - datetime.timedelta(1), datetime.time.max)
    print("yesterday => ", yesterday)

    # today = date.today()
    # print("today => ", today)

    # active_upto = Companies.objects.values('active_upto')
    # print('active_upto => ', list(active_upto))

    Companies.objects.filter(
        active_upto__lte=yesterday
    ).update(
        is_approved=False
    )

    # print('active_upto => ', list(active_upto))
    # .values('active_upto')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def updateUserConfig(request):
    parent = request.data['parent']
    child = request.data['child']
    value = json.loads(request.data['value'])
    print(parent)
    print(child)
    print(value)
    print(type(value))

    jsn = {
        parent: {
            child: value
        }
    }

    config = UserConfig.objects.filter(
        username=request.user.username
    )

    if config:
        user_config = UserConfig.objects.get(username=request.user.username)
        data = user_config.dashboard
        data[parent][child] = value
        user_config.dashboard = data
        user_config.save()

    if not config:
        UserConfig.objects.create(
            username=request.user.username,
            dashboard=jsn
        )

    return Response()


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def updateTableConfig(request):
    table_name = request.data['table_name']
    config = json.loads(request.data['config'])
    print('table_name => ', table_name)

    if table_name == 'undefined':
        return Response({'response': 'table_name not given'}, status=200)

    table_config_update = TableConfig.objects.filter(
        Q(username=request.user.username) &
        Q(table_name=table_name)
    ).update(
        config=config
    )

    if not table_config_update:
        table_config_create = TableConfig.objects.create(
            username=request.user.username,
            table_name=table_name,
            config=config,
        )
        print('table_config_create => ', table_config_create)

    print('table_config_update => ', table_config_update)

    return Response({'response': 'New Configuration Created Successfully'}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def getTableConfig(request):
    table_name = request.data['table_name']
    print('table_name => ', table_name)

    if table_name == 'undefined':
        return Response({'response': 'table_name not given'}, status=200)

    table_config = TableConfig.objects.filter(
        Q(username=request.user.username) &
        Q(table_name=table_name)
    ).values().first()

    if not table_config:
        table_config = TableConfig.objects.filter(
            Q(username='owl_erp') &
            Q(table_name=table_name)
        ).values().first()

    return Response({'response': table_config}, status=200)


def get_file_from_s3(object_key):
    s3_client = boto3.client('s3')
    bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        return response['Body'].read()
    except NoCredentialsError:
        raise Exception("AWS credentials not found")
    except s3_client.exceptions.NoSuchKey:
        raise FileNotFoundError(f"File not found: {object_key}")
    except ClientError as e:
        error_message = e.response.get(
            "Error", {}).get("Message", "Unknown error")
        raise Exception(f"Error fetching file from S3: {error_message}")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def secure(request, file):
    try:
        # Fetch company details
        company_details = CompanyUser.objects.filter(
            username=request.user.username
        ).values('company__company_name').first()

        if not company_details:
            return HttpResponse("Company details not found", status=404)

        # Construct file location
        company_id = company_details['company__company_name']
        file_location = os.path.join(MEDIA_PATH, company_id, file)

        # Fetch file data
        if os.getenv('AWS_S3_INDENTITY'):
            # If using S3
            parsed_url = urlparse(file_location)
            object_key = parsed_url.path.lstrip(
                '/') if parsed_url.netloc else file_location
            file_data = get_file_from_s3(object_key)
        else:
            # If using local storage
            with open(file_location, 'rb') as f:
                file_data = f.read()

        # Determine MIME type
        kind = filetype.guess(file_data)
        mime_type = kind.mime if kind else 'application/octet-stream'

        # Return the file in its original format (including full PDFs)
        response = HttpResponse(file_data, content_type=mime_type)
        response['Content-Disposition'] = f'inline; filename="{file}"'
        return response

    except FileNotFoundError:
        return HttpResponse(f"File not found: {file}", status=404)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return HttpResponse(f"An error occurred: {repr(e)}", status=500)

# @api_view(['POST', 'GET'])
# @permission_classes([IsAuthenticated])
# def secure(request, file):
#     company_id = getCompanyId(request)
#     # context = dict()
#     # file = request.data['file_name']
#     # print("Has to be secured", request.user, file)

#     company_details = CompanyUser.objects.filter(
#         username=request.user.username).values('company__company_id').first()

#     file_location = MEDIA_PATH + \
#         company_details['company__company_id'] + '/' + file

#     # print('file_location => \n', file_location)

#     try:
#         with open(file_location, 'rb') as f:
#             file_data = f.read()

#         # checking file type
#         kind = filetype.guess(file_data)
#         if kind is None:
#             print('Cannot guess file type!')

#         # print('File extension: %s' % kind.mime)
#         # print('File MIME type: %s' % kind.mime)

#         response = HttpResponse(content=file_data)
#         extention = file.split('.')[len(file.split('.')) - 1]

#         # response['Content-Type'] = 'application/octet-stream'
#         # if 'jpg' == extention or 'jpeg' == extention or 'png' == extention or 'tiff' == extention or 'gif' == extention:
#         #     response['Content-Type'] = 'image/png'
#         # if 'pdf' == extention:
#         #     response['Content-Type'] = 'application/pdf'
#         # if 'doc' == extention:
#         #     response['Content-Type'] = 'application/msword'
#         # if 'docx' == extention:
#         #     response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
#         # if 'xlx' == extention:
#         #     response['Content-Type'] = 'application/vnd.ms-excel'
#         # if 'xlsx' == extention:
#         #     response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

#         response['Content-Type'] = kind.mime

#     except Exception as e:
#         logging.getLogger("error_logger").error(repr(e))
#         print("error as ", e.args)
#         # handle file not exist case here
#         response = HttpResponse('<h1>File not exist</h1>')

#     return response


# def get_image_from_s3(object_key):
#     s3_client = boto3.client('s3')
#     bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
#     try:
#         response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
#         file_stream = response['Body'].read()
#         return file_stream  # Return the file content as bytes
#     except NoCredentialsError:
#         raise Exception("AWS credentials not found")
#     except s3_client.exceptions.NoSuchKey:
#         raise FileNotFoundError(f"File not found: {object_key}")
#     except ClientError as e:
#         error_message = e.response.get("Error", {}).get("Message", "Unknown error")
#         raise Exception(f"Error fetching file from S3: {error_message}")

def get_image_from_s3(object_key):
    import traceback

    bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')
    print(f"[DEBUG] Bucket: {bucket_name}, Key: {object_key}")

    s3_client = boto3.client('s3')

    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        print("[DEBUG] S3 GetObject Response:", response)
        file_stream = response['Body'].read()
        return file_stream  # Return the file content as bytes

    except NoCredentialsError:
        print("[ERROR] AWS credentials not found")
        raise Exception("AWS credentials not found")

    except s3_client.exceptions.NoSuchKey:
        print(f"[ERROR] File not found in S3: {object_key}")
        raise FileNotFoundError(f"File not found: {object_key}")

    except ClientError as e:
        error_message = e.response.get(
            "Error", {}).get("Message", "Unknown error")
        print(f"[ERROR] ClientError: {error_message}")
        raise Exception(f"Error fetching file from S3: {error_message}")

    except Exception as e:
        print("[ERROR] Unexpected error:")
        traceback.print_exc()
        raise Exception(f"Unhandled error: {str(e)}")


# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def getThumbnailImageURL(request, file):
#     try:
#         company_details = CompanyUser.objects.filter(
#             username=request.user.username
#         ).values('company__company_name').first()

#         if not company_details:
#             return HttpResponse("Company details not found", status=404)

#         file_location = os.path.join(
#             MEDIA_PATH,
#             company_details['company__company_name'],
#             'thumbnails',
#             file
#         )
#         print(">>>>>>file_location",file_location)

#         if os.getenv('AWS_S3_INDENTITY'):
#             # Extract the object key from the full URL if it's a URL
#             parsed_url = urlparse(file_location)
#             if parsed_url.netloc:  # If it's a URL
#                 object_key = parsed_url.path.lstrip('/')

#                 print("object_key>>>",object_key)

#             else:
#                 object_key = file_location  # Otherwise, it's already a key
#                 print("object_key>>>",object_key)

#             # Fetch the file from S3
#             file_data = get_image_from_s3(object_key)
#         else:
#             # Read the file locally
#             with open(file_location, 'rb') as f:
#                 file_data = f.read()

#         # Check the file type
#         kind = filetype.guess(file_data)
#         mime_type = kind.mime if kind else 'application/octet-stream'

#         # Prepare and return the HTTP response
#         response = HttpResponse(file_data, content_type=mime_type)
#         response['Content-Disposition'] = f'inline; filename="{file}"'
#         return response

#     except FileNotFoundError:
#         print(f"File not found: {file}", status=404)
#         return HttpResponse(f"File not found: {file}", status=404)
#     except Exception as e:
#         print(e)
#         logging.getLogger("error_logger").error(repr(e))
#         return HttpResponse(f"An error occurred: {repr(e)}", status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getThumbnailImageURL(request, file):
    try:
        company_details = CompanyUser.objects.filter(
            username=request.user.username
        ).values('company__company_name').first()
        if not company_details:
            return HttpResponse("Company details not found", status=404)

        # Construct the object key for S3
        object_key = os.path.join(
            company_details['company__company_name'], 'thumbnails', file).replace("\\", "/")

        if os.getenv('AWS_S3_INDENTITY'):
            # Log the object key for debugging
            print("S3 Object Key:", object_key)
            # Fetch the file from S3
            file_data = get_image_from_s3(object_key)
        else:
            # Read the file locally
            file_location = os.path.join(
                MEDIA_PATH, company_details['company__company_name'], 'thumbnails', file)
            with open(file_location, 'rb') as f:
                file_data = f.read()

        # Check the file type
        kind = filetype.guess(file_data)
        mime_type = kind.mime if kind else 'application/octet-stream'

        # Prepare and return the HTTP response
        response = HttpResponse(file_data, content_type=mime_type)
        response['Content-Disposition'] = f'inline; filename="{file}"'
        print(response)
        return response

    except FileNotFoundError:
        print(f"File not found: {file}", status=404)
        return HttpResponse(f"File not found: {file}", status=404)
    except Exception as e:
        print(e)
        logging.getLogger("error_logger").error(repr(e))
        return HttpResponse(f"An error occurred: {repr(e)}", status=500)


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def getOriginalFile(request, file_id=0):
    company_id = getCompanyId(request)

    file = Attachment.objects.filter(
        id=file_id
    ).values('url').first()

    if file:
        file = file['url']

    # print("Has to be secured", request.user, file)

    company_details = CompanyUser.objects.filter(
        username=request.user.username).values('company__company_name').first()

    file_location = MEDIA_PATH + \
        company_details['company__company_name'] + '/' + file

    # file_location = MEDIA_PATH + company_id + '/thumbnails/' + file

    # print('file_location => ', file_location)

    try:
        with open(file_location, 'rb') as f:
            file_data = f.read()

        # checking file type
        kind = filetype.guess(file_data)
        if kind is None:
            print('Cannot guess file type!')

        # print('File extension: %s' % kind.mime)
        # print('File MIME type: %s' % kind.mime)

        response = HttpResponse(content=file_data)
        extention = file.split('.')[len(file.split('.')) - 1]
        response['Content-Type'] = kind.mime

    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("error as ", e.args)
        # handle file not exist case here
        response = HttpResponse('<h1>File not exist</h1>')
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getGitBranch(request):
    head_name = ''
    try:
        repo = Repository('./')
        # option 1
        head = repo.head
        head_name = head.name
    except:
        try:
            head_name = 'Version - ' + os.getenv('API_VERSION')
        except:
            head_name = 'Version Undefined'
    print("Head is " + head_name)

    if head_name:
        head_name = head_name.split('/')[-1]

    # option 2
    # head = repo.lookup_reference('HEAD').resolve()
    # print("Head is " + head.name)

    return Response({'response': head_name}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllApps(request):
    try:
        applications = Application.objects.values().order_by('id')
        return Response({'response': applications}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response(e.args, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAppAccessMatrix(request, access_for, id):
    try:
        company_id = getCompanyId(request)
        applications = list(Application.objects.values(
            'id',
            'name',
            'url',
            'color',
            'icon',
        ).order_by('id'))

        if access_for == 'user':
            try:
                user_pk = int(id)
            except (TypeError, ValueError):
                return Response({'error': 'Invalid user id'}, status=status.HTTP_400_BAD_REQUEST)
            acl_map = {}
            for row in build_app_access_for_user(company_id, user_pk):
                acl_map[row['app_id']] = row
        else:
            acl_rows = AppAccessControl.objects.filter(
                company_id=company_id,
                group_id=id,
            ).values(
                'application_id',
                'can_access',
                'can_add',
                'can_edit',
                'can_delete',
                'can_print',
            )
            acl_map = {row['application_id']: dict(row) for row in acl_rows}

        response = []
        for app in applications:
            row = acl_map.get(app['id'])
            response.append({
                'app_id': app['id'],
                'name': app.get('name'),
                'url': app.get('url'),
                'color': app.get('color'),
                'icon': app.get('icon'),
                'can_access': row.get('can_access') if row else False,
                'can_add': row.get('can_add') if row else False,
                'can_edit': row.get('can_edit') if row else False,
                'can_delete': row.get('can_delete') if row else False,
                'can_print': row.get('can_print') if row else False,
            })

        return Response({'response': response}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response({'msg': str(e.args)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def updateAppAccessControl(request):
    try:
        company_id = getCompanyId(request)

        payload = request.data or {}
        raw = payload.get('permission_json')
        if raw:
            try:
                payload = json.loads(raw)
            except ValueError:
                return Response({'error': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)

        access_for = payload.get('access_for')
        target_id = payload.get('id') or payload.get(
            'user_id') or payload.get('group_id')
        permissions = payload.get('permissions', [])

        if access_for not in ('user', 'group'):
            return Response({'error': 'access_for must be user or group'}, status=status.HTTP_400_BAD_REQUEST)
        if not target_id:
            return Response({'error': 'id is required'}, status=status.HTTP_400_BAD_REQUEST)

        user_id = target_id if access_for == 'user' else None
        group_id = target_id if access_for == 'group' else None

        for perm in permissions:
            app_id = perm.get('application_id') or perm.get(
                'app_id') or perm.get('id')
            if not app_id:
                continue

            can_access = bool(perm.get('can_access'))
            can_add = bool(perm.get('can_add'))
            can_edit = bool(perm.get('can_edit'))
            can_delete = bool(perm.get('can_delete'))
            can_print = bool(perm.get('can_print'))

            all_false = not (
                can_access or can_add or can_edit or can_delete or can_print)
            filters = {
                'company_id': company_id,
                'application_id': app_id,
                'user_id': user_id,
                'group_id': group_id,
            }

            if all_false:
                AppAccessControl.objects.filter(**filters).delete()
                continue

            AppAccessControl.objects.update_or_create(
                defaults={
                    'can_access': can_access,
                    'can_add': can_add,
                    'can_edit': can_edit,
                    'can_delete': can_delete,
                    'can_print': can_print,
                },
                **filters,
            )

        return Response({'response': 'App access permissions updated'}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response({'msg': str(e.args)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def updateGroupUsers(request):
    try:
        company_id = getCompanyId(request)
        payload = request.data or {}
        group_id = payload.get('group_id')
        user_id = payload.get('user_id')
        action = payload.get('action')

        if not group_id or not user_id or action not in ('add', 'remove'):
            return Response({'error': 'group_id, user_id, action required'}, status=400)

        group = UserGroup.objects.filter(
            company_id=company_id, id=group_id).first()
        if not group:
            return Response({'error': 'Group not found'}, status=404)

        user_ids = group.user_ids or []
        user_id = int(user_id)

        if action == 'add':
            if user_id not in user_ids:
                user_ids.append(user_id)
                group.user_ids = user_ids
                group.save()
        else:
            if user_id in user_ids:
                user_ids = [uid for uid in user_ids if uid != user_id]
                group.user_ids = user_ids
                group.save()
            # Remove any URL permissions cloned from this group for the removed user.
            group_weburls = list(
                UrlBasedAccessControl.objects.filter(
                    company_id=company_id,
                    user_group=group,
                ).values_list('weburl', flat=True)
            )
            if group_weburls:
                other_group_ids = list(
                    UserGroup.objects.filter(
                        company_id=company_id,
                        user_ids__overlap=[user_id],
                    )
                    .exclude(id=group.id)
                    .values_list('id', flat=True)
                )
                other_weburls = set()
                if other_group_ids:
                    other_weburls = set(
                        UrlBasedAccessControl.objects.filter(
                            company_id=company_id,
                            user_group_id__in=other_group_ids,
                            weburl__in=group_weburls,
                        ).values_list('weburl', flat=True)
                    )

                weburls_to_remove = [
                    url for url in group_weburls if url not in other_weburls]
                if weburls_to_remove:
                    UrlBasedAccessControl.objects.filter(
                        company_id=company_id,
                        user_id=user_id,
                        weburl__in=weburls_to_remove,
                    ).delete()

        return Response({'response': 'Group users updated', 'user_ids': group.user_ids}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response({'msg': str(e.args)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getUserPermissions(request, user_id):
    print(user_id)
    try:
        permissions = UserRight.objects.filter(
            user_id=user_id
        ).values(
            'app_id',
            'user_id',
            'can_visit',
            'can_edit',
            'can_view_report',
            url=F('app__url')
        )
        return Response({'response': permissions}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response(e.args, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def updateUserRightPermissions(request):

    permission_json = json.loads(request.data['permission_json'])
    try:
        print(permission_json)
        if permission_json['permissions']:
            for perm in permission_json['permissions']:
                UserRight.objects.update_or_create(
                    app_id=perm['app_id'],
                    user_id=perm['user_id'],
                    defaults=perm
                )
        return Response({'response': 'All Rights Updated Successfully'}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response(e.args, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def saveWebURLsIntoDB(request):
    urls = json.loads(request.data['urls'])

    try:
        print("\n\n================")
        for url in urls:
            url = str(url).strip().rstrip('/')
            if url:
                update, created = AllWebUrls.objects.update_or_create(
                    url=url,
                    defaults={
                        'url': url
                    }
                )
                if created:
                    print(f'Newly created {url}')

        return Response({'response': 'All Web Urls Updated Successfully'}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response(e.args, status=500)


def getGroups(lst, index):

    lst = [l[index] for l in lst if len(l) > index]
    lst = list(set(lst))
    lst.sort()
    return lst


def getIndexedDict(keys, index):
    return [{'name': str(key), 'expandable': False, 'level': index, 'url': ''} for key in keys]


def createFlatTree(root, children, lst):
    if len(root) <= 1:
        #         Making expandable true
        if len(root) == 1:
            root[0]['expandable'] = True
        root.extend(children)
        return root
    else:
        for i, child in reversed(list(enumerate(children))):
            parent = None
            # print(child['name'])
            # searching key in the list
            for j, l1 in enumerate(lst):
                if child['name'] in l1:
                    parent = l1[l1.index(child['name'])-1]
                    break
            # Getting parent key for the current child
            if parent:
                # find parent position into root tree
                for pos, d in enumerate(root):
                    if parent in d.values():
                        d['expandable'] = True
                        root.insert(pos+1, child)
                        break

        return root


def getFlatTree(lst: list):
    lst = [st.split('/')[1:] for st in lst]
    # print(lst)
    res = []
    index = 0
    while True:
        keys = getGroups(lst, index)
        # print(keys)
        if not len(keys):
            break
        indexed = getIndexedDict(keys, index)
        res = createFlatTree(res, indexed, lst)
        index = index + 1

    return res


def getPermissionDetails(company_id: int, access_for: str, id: int, with_group: bool) -> tuple:

    print("with_group => ", with_group)
    access_details = []
    try:
        if access_for == 'group':
            accessor_name = getAccessGroupDetails(company_id, id)
            access_groups = [accessor_name]
            access_groups = [accessor_name]
            access_details = UrlBasedAccessControl.objects.filter(
                Q(company_id=company_id) &
                Q(user_group_id=id)
            ).values(
                'company_id',
                'user_id',
                'user_group_id',
                'weburl',
                'access',
                'add',
                'edit',
                'delete',
                'print_download',
                group_name=F('user_group__name'),
                user_name=F('user__name')
            )

        if access_for == 'user':

            #  Get Groups ids for current user
            groups = UserGroup.objects.filter(
                Q(user_ids__overlap=[id])
            ).values()

            group_ids = [group['id'] for group in groups]
            access_groups = [group['name'] for group in groups]
            accessor_name = getAccessUserDetails(company_id, id)

            sql = Q()
            company = Q(company_id=company_id)
            user = Q(user_id=id)
            group = Q(user_group_id__in=group_ids)
            if with_group:
                user |= group

            sql &= company
            sql &= user

            access_details = UrlBasedAccessControl.objects.filter(
                sql
            ).values(
                'company_id',
                'user_id',
                'user_group_id',
                'weburl',
                'access',
                'add',
                'edit',
                'delete',
                'print_download',
                group_name=F('user_group__name'),
                user_name=F('user__name')
            )

        return (list(access_details), access_groups, accessor_name)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("Error as => ", e.args)
        return []


def get_URL(res, i, level):

    if res[i]['level'] != level:
        return get_URL(res, i-1, level)

    if res[i]['level'] == 0:
        return res[i]['name']
    else:
        return get_URL(res, i-1, level-1) + '/' + res[i]['name']


def addURLToAllLevel(res, permissions):
    for i, child in enumerate(res):
        try:
            child['url'] = get_URL(res, i, res[i]['level'])
            child['access_details'] = list(
                filter(lambda x: x['weburl'] == '/' + child['url'], permissions))
            child['has_access'] = child['access_details'][0]['access'] if len(
                child['access_details']) > 0 else False
        except Exception as e:
            print("Exception => ", e)


def getTotalLeafNode(pos, tree) -> int:
    tree_length = len(tree)
    level = tree[pos]['level']
    pos = pos + 1
    count = 0
    try:
        while pos < tree_length and level != tree[pos]['level']:
            if tree[pos]['expandable'] == False:
                count = count + 1
            pos = pos + 1
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
    return count


def getTotalLeafNodeHasAccess(pos, tree) -> int:
    tree_length = len(tree)
    level = tree[pos]['level']
    pos = pos + 1
    count = 0
    try:
        while pos < tree_length and level != tree[pos]['level']:
            if tree[pos]['expandable'] == False and tree[pos]['has_access']:
                count = count + 1
            pos = pos + 1
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
    return count


def countAccessGroupWise(tree: list):
    for i, node in enumerate(tree):
        node['total_child'] = 0
        node['total_access'] = 0
        if node['expandable']:
            node['total_child'] = getTotalLeafNode(i, tree)
            node['total_access'] = getTotalLeafNodeHasAccess(i, tree)


def formatURLNames(tree: list):
    for i, node in enumerate(tree):
        node['name'] = str(node['name']).replace('-', ' ').replace('_', ' ')
        # print(node)


def createLevelBasedList(original_list: list):
    # print(original_list)
    result_list = []

    for item in original_list:
        parts = item.split('/')[1:]

        for i, part in enumerate(parts):
            # Check if there are subsequent levels
            expandable = i < len(parts) - 1
            existing_part = next(
                (x for x in result_list if x['name'] == part and x['level'] == i), None)

            if existing_part is None:
                result_list.append({
                    'name': part,
                    'expandable': expandable,
                    'level': i,
                    'url': ''
                })
            else:
                existing_part['expandable'] = expandable

    # print(result_list)
    return result_list


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getWebUrls(request, access_for: str, id: int, with_group: bool):
    company_id = getCompanyId(request)
    with_group = True if with_group == 'true' else False
    try:
        permissions, access_groups, accessor_name = getPermissionDetails(
            company_id, access_for, id, with_group)

        urls = Application.objects.prefetch_related('web_url')
        print(">>>>>>>>>>>>>>>>>>", urls)
        results = []
        for url in urls:
            urls_list = url.web_url.values_list('url', flat=True)
            # flat_tree = getFlatTree(urls_list)
            flat_tree = createLevelBasedList(urls_list)
            # print('\n\nflat_tree => ', flat_tree)
            addURLToAllLevel(flat_tree, permissions)
            countAccessGroupWise(flat_tree)
            formatURLNames(flat_tree)
            results.append({
                'app_id': url.id,
                'app_name': url.name,
                'flat_tree': flat_tree
            })

        # getting all WebUrls
        all_urls = WebUrl.objects.values_list('url', flat=True)
        print(all_urls)
        return Response({'response': results, 'all_urls': all_urls, 'access_groups': access_groups, 'accessor_name': accessor_name, 'permissions': permissions}, status=200)
    except Exception as e:
        print(e)
        logging.getLogger("error_logger").error(repr(e))
        return Response({'error': e.args}, status=500)


def getChildren(group: list):
    group = sorted(group)
    parent = group[0]
    children = [str(child).removeprefix(parent) for child in group[1:]]
    return [[parent]], children


def breakIntoGroups(groups: list, urls: list):

    if len(urls) == 0:
        return groups
    if len(urls) == 1:
        groups.append(urls)
        return groups

    group = [url for url in urls if str(url).startswith(urls[0])]
    if len(group) == 0:
        groups.append([urls[0]])
        urls.pop(0)
        return breakIntoGroups(groups, urls)

    elif len(group) == 1:
        groups.append(group)
        return breakIntoGroups(groups, urls[1:])

    else:
        parent, children = getChildren(group)
        parent.append(breakIntoGroups([], children))
        groups.append(parent)
        remainder = sorted(list(set(urls)-set(group)))

        if len(remainder) > 0:
            return breakIntoGroups(groups, remainder)
        else:
            return groups


def getInnerList(lst: list):
    if len(lst) == 0:
        return
    if len(lst) == 1:
        return getInnerList(lst[0])
    else:
        return lst


def addLevel(result: list, tree: list, index: int = 0):
    print('\n')
    tree = getInnerList(tree)
    for t in tree:
        if len(t) > 1:
            t = getInnerList(t)
            addLevel(result, t, index=index+1)
        else:
            print(t, " => ", index)


@api_view(['GET'])
@permission_classes([AllowAny])
def getWebUrlsForTest(request):
    company_id = getCompanyId(request)

    # urls_list = ['/a', '/a/b', '/a/b/c', '/a/c']

    # print("\n\n\n")
    # print([list(urls_list)[0]])
    # print(list(urls_list)[1:])
    # urls_list = breakIntoGroups([[list(urls_list)[0]]], list(urls_list)[1:])
    # return Response(urls_list, status=200)

    # with_group = True if with_group == 'true' else False
    try:
        # permissions, access_groups, accessor_name = getPermissionDetails(
        #     company_id, access_for, id, with_group)

        urls = Application.objects.prefetch_related('web_url')
        # print(urls)
        results = []
        for url in urls:
            urls_list = sorted(url.web_url.values_list('url', flat=True))
            if len(urls_list):
                # parent, children = getChildren(list(urls_list))
                # parent.append(breakIntoGroups([], children))
                # parent = addLevel([], parent)
                parent = createLevelBasedList(list(urls_list))
                flat_tree = parent

            else:
                print("Needs to handle")
            # addURLToAllLevel(flat_tree, permissions)
            # countAccessGroupWise(flat_tree)
            # formatURLNames(flat_tree)
            results.append({
                'app_id': url.id,
                'app_name': url.name,
                'flat_tree': flat_tree
            })
            return Response(flat_tree, status=200)
        # getting all WebUrls
        all_urls = WebUrl.objects.values_list('url', flat=True)
        # print(all_urls)
        return Response({'response': results, 'all_urls': all_urls, 'access_groups': access_groups, 'accessor_name': accessor_name, 'permissions': permissions}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response({'error': e.args}, status=500)


@api_view(['POST'])
# @permission_classes([IsAuthenticated])
@permission_classes([AllowAny])
def resetUserPassword(request):
    email = str(request.data.get('email', '')).strip()
    user_id = str(request.data.get('user_id', '')).strip()
    new_password = request.data.get('new_password')

    company_user_found = False
    direct_username_reset = False

    if not user_id or not new_password:
        return Response({'response': 'Username and new password are required', 'status': 204})

    try:
        from accounts.models import OrganizationUser
        email_hashed = request.data.get('email_hashed')
        username_hashed = request.data.get('username_hashed')
        if email_hashed and username_hashed:
            if (username_hashed != hash_string(user_id) or
               email_hashed != hash_string(email)):
                return Response({'response': 'Something going bad', 'status': 204})

            # Checking reset link life
            company_user = CompanyUser.objects.filter(
                Q(username__iexact=user_id)
                & Q(email__iexact=email)
            ).values(
                'password_reset_link_sent_at'
            ).first()
            organization_user = OrganizationUser.objects.filter(
                Q(user__username__iexact=user_id)
                | Q(username__iexact=user_id)
            ).filter(
                Q(user__email__iexact=email)
                | Q(email__iexact=email)
            ).values(
                'password_reset_link_sent_at'
            ).first()
            sent_time = (
                company_user['password_reset_link_sent_at']
                if company_user else
                organization_user['password_reset_link_sent_at']
                if organization_user else
                None
            )
            print('sent_time => ', sent_time)
            if sent_time:
                company_user_found = True
                time_now = datetime.datetime.now(datetime.timezone.utc)
                ten_minute = datetime.timedelta(minutes=30)
                if (time_now - sent_time) > ten_minute:
                    return Response({'response': 'Link Expired', 'status': 204})
            else:
                print("Returning with Error")
                return Response({'response': 'Something going bad', 'status': 204})
        else:
            company_user_found = (
                CompanyUser.objects.filter(
                    Q(username__iexact=user_id)
                ).exists()
                or OrganizationUser.objects.filter(
                    Q(user__username__iexact=user_id)
                    | Q(username__iexact=user_id)
                ).exists()
                or get_user_model().objects.filter(
                    Q(username__iexact=user_id)
                ).exists()
            )
            direct_username_reset = True
            if not company_user_found:
                return Response({'response': 'Username not found', 'status': 204})

    except Exception as e:
        print(e.args)
        logging.getLogger("error_logger").error(repr(e))
        return Response({'response': 'Something going bad', 'status': 204})

    try:
        print('company_user_found => ', company_user_found)
        print('user_id => ', user_id)
        if company_user_found:
            user_info = get_user_model().objects.filter(
                Q(username__iexact=user_id)
            ).first()

            print(user_info)

            if (user_info):
                user_info.set_password(new_password)
                print('user_info=>', user_info)
                user_info.save()

                CompanyUser.objects.filter(
                    Q(username__iexact=user_id)
                ).update(
                    password_reset_link_sent_at=datetime.datetime.now().date() -
                    datetime.timedelta(days=365),
                    firstLoggedIn=False
                )
                OrganizationUser.objects.filter(
                    Q(user__username__iexact=user_id)
                    | Q(username__iexact=user_id)
                ).update(
                    password_reset_link_sent_at=datetime.datetime.now().date() -
                    datetime.timedelta(days=365),
                    firstLoggedIn=False
                )
                if direct_username_reset:
                    return Response({'response': 'Password updated successfully', 'status': 200})
                return Response({'response': 'Password Reset Successfully', 'status': 200})
            else:
                return Response({'response': 'Something going bad', 'status': 204})
        return Response({'response': 'Something going bad', 'status': 204})
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response({'msg': str(e.args), 'status': 204})


def getWebUrlId(url: str):

    return WebUrl.objects.filter(
        url=url
    ).values_list('id', flat=True).first()


def getChildUrls(weburl: str):

    app_name = weburl.strip().strip('/').split('/')[0]

    # app_name = '/' + app_name + '/'

    urls = WebUrl.objects.filter(
        Q(app__url=app_name)
        & Q(url__icontains=weburl)
    ).values_list('url', flat=True)
    print(urls.query)
    return urls


def check_parent_for_brothers_in_law(permission_json: dict) -> str | None:
    expected_parent = '/'.join(permission_json['weburl'].split('/')[:-1])
    try:
        id = UrlBasedAccessControl.objects.filter(
            Q(company_id=permission_json['company_id']) &
            Q(user_id=permission_json['user_id']) &
            Q(user_group_id=permission_json['user_group_id']) &
            Q(weburl=expected_parent)
        ).values_list('id', flat=True)

        # If len of id is 1, that means there are no brothers, So delete it
        if len(id) == 1:
            deleted = UrlBasedAccessControl.objects.filter(
                id=id[0]
            ).delete()
            print('Parent deleted too')
            return expected_parent
    except Exception as e:
        print('Exception as ', e.args)

    return None


def createOrUpdateHomePage(url: str, user_id: int, group_id: int):

    url = '/' + url.lstrip('/')

    app_name = url.strip().strip('/').split('/')[0]

    app_name = '/' + app_name + '/'

    if user_id:
        user_details = CompanyUser.objects.filter(
            id=user_id
        ).values_list(
            'app_wise_home_pages',
            flat=True
        ).first()

        user_details = [item for item in user_details if app_name not in item]

        user_details.append(url)

        CompanyUser.objects.filter(
            id=user_id
        ).update(
            app_wise_home_pages=user_details
        )
    if group_id:
        group_details = UserGroup.objects.filter(
            id=group_id
        ).values_list(
            'app_wise_home_pages',
            flat=True
        ).first()

        group_details = [
            item for item in group_details if app_name not in item]

        group_details.append(url)

        UserGroup.objects.filter(
            id=group_id
        ).update(
            app_wise_home_pages=group_details
        )


def checkHomePageIntoRemovedUrlAccess(removed_url_list: list, user_id: int, group_id: int):
    if user_id:
        home_page_list = CompanyUser.objects.filter(
            id=user_id
        ).values_list(
            'app_wise_home_pages',
            flat=True
        ).first()

        home_page_list = list((set(home_page_list)) - (set(removed_url_list)))
        print("\nTruncated list => ", home_page_list)

        # Update with Truncated list
        CompanyUser.objects.filter(
            id=user_id
        ).update(
            app_wise_home_pages=home_page_list
        )

    if group_id:
        home_page_list = UserGroup.objects.filter(
            id=group_id
        ).values_list(
            'app_wise_home_pages',
            flat=True
        ).first()

        home_page_list = list((set(home_page_list)) - (set(removed_url_list)))
        print("\nTruncated list => ", home_page_list)

        # Update with Truncated list
        UserGroup.objects.filter(
            id=group_id
        ).update(
            app_wise_home_pages=home_page_list
        )


# @api_view(['POST'])
# @permission_classes([AllowAny])
# def giveDefaultPermission(request):
#     """
#     Expects JSON like:
#     {
#       "access_token": "...",
#       "permission_json": {
#          "user_id": 36,
#          "user_group_id": 0,
#          "segmented_url": ["inventory-management","asset-management",...],
#          "access": true,
#          "read": true,
#          "add": false,
#          ...
#          "home_page": false
#        }
#     }
#     """
#     # 1) Load incoming permission_json
#     raw = request.data.get('permission_json')
#     if isinstance(raw, str):
#         try:
#             perm = json.loads(raw)
#         except json.JSONDecodeError as e:
#             print(f"Invalid JSON in permission_json: {e}")
#     elif isinstance(raw, dict):
#         perm = raw
#     else:
#         print("permission_json must be a JSON string or object")

#     # 2) Extract the list of base URLs and pop the one‐off fields
#     bases = perm.pop('segmented_url', [])
#     read_flag = perm.pop('read', None)       # you said you drop this
#     home_page_flag = perm.pop('home_page', False)
#     perm.pop('id',       None)                   # never send id into create()

#     # 3) Normalize numeric zero → None
#     if perm.get('user_id') == 0:
#         perm['user_id'] = None
#     if perm.get('user_group_id') == 0:
#         perm['user_group_id'] = None

#     # 4) Company context
#     company_id = getCompanyId(request)

#     # 5) Build a "template" dict of kwargs (without weburl/id)
#     template = {
#         **perm,
#         'company_id': company_id
#     }

#     # 6) Walk each base URL
#     removed_pages = []
#     for base in bases:
#         # 6a) If home_page flag, create/update homepage for *this* base
#         if home_page_flag:
#             createOrUpdateHomePage(
#                 base,
#                 template.get('user_id'),
#                 template.get('user_group_id')
#             )

#         # 6b) Gather this base + its children
#         # returns a QuerySet of url‐strings
#         children_qs = getChildUrls(base)
#         children = list(children_qs)
#         pages = [base] + children

#         # 6c) Loop each page
#         for page in pages:
#             data_kwargs = template.copy()
#             data_kwargs['weburl'] = page

#             existing_id = UrlBasedAccessControl.objects.filter(
#                 Q(company_id=company_id),
#                 Q(user_id=data_kwargs['user_id']),
#                 Q(user_group_id=data_kwargs['user_group_id']),
#                 Q(weburl=page)
#             ).values_list('id', flat=True).first()

#             # 6c.i) Grant / update access
#             if data_kwargs.get('access'):
#                 if existing_id:
#                     before = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', existing_id)
#                     UrlBasedAccessControl.objects.filter(
#                         id=existing_id).update(**data_kwargs)
#                     after = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', existing_id)
#                     createHistoryForUpdate(
#                         request, 'account', 'UrlBasedAccessControl',
#                         existing_id, company_id, before, after, request.data
#                     )
#                 else:
#                     # No `id` in data_kwargs → safe to create
#                     UrlBasedAccessControl.objects.create(**data_kwargs)

#             # 6c.ii) Revoke / delete access
#             else:
#                 if existing_id:
#                     before = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', existing_id)
#                     UrlBasedAccessControl.objects.filter(
#                         id=existing_id).delete()
#                     after = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', existing_id)
#                     createHistoryForUpdate(
#                         request, 'account', 'UrlBasedAccessControl',
#                         existing_id, company_id, before, after, request.data
#                     )

#                     removed_pages.append(page)
#                     parent = check_parent_for_brothers_in_law(data_kwargs)
#                     if parent:
#                         removed_pages.append(parent)

#     # 7) Clean up home pages for *all* removed pages
#     checkHomePageIntoRemovedUrlAccess(
#         removed_pages,
#         template.get('user_id'),
#         template.get('user_group_id')
#     )

#     return Response({'detail': 'Access permissions updated'}, status=200)


# def apply_default_permissions(payload: dict, company_id: int, actor_context=None):
#     """
#     payload may be either:
#       • { "permission_json": { … } , "company_id": … }    OR
#       • { … }  directly the inner permission_json

#     company_id must be an int.  
#     actor_context is optional (you can pass request or None).
#     """

#     # 1) unwrap if they passed the outer wrapper
#     if "permission_json" in payload:
#         perm = payload["permission_json"]
#     else:
#         perm = payload

#     # 2) If they gave you a JSON‐string, parse it
#     if isinstance(perm, str):
#         perm = json.loads(perm)
#     else:
#         perm = perm.copy()    # so we don’t mutate the caller’s dict

#     # 3) Peel off one‐time fields
#     bases = perm.pop("segmented_url", [])
#     perm.pop("read",       None)
#     home_flag = perm.pop("home_page", False)
#     perm.pop("id",         None)   # never send id into create()

#     # 4) Normalize zeros → None
#     if perm.get("user_id") == 0:
#         perm["user_id"] = None
#     if perm.get("user_group_id") == 0:
#         perm["user_group_id"] = None

#     # 5) Build a template of kwargs
#     template = {**perm, "company_id": company_id}
#     removed = []

#     # 6) Loop each base URL
#     for base in bases:
#         # 6a) optionally set home‐page on the base
#         if home_flag:
#             createOrUpdateHomePage(
#                 base,
#                 template.get("user_id"),
#                 template.get("user_group_id")
#             )

#         # 6b) base + its children
#         children = list(getChildUrls(base))
#         pages = [base] + children

#         # 6c) grant/update or revoke/delete
#         for page in pages:
#             data_kwargs = template.copy()
#             data_kwargs["weburl"] = page

#             existing_id = UrlBasedAccessControl.objects.filter(
#                 Q(company_id=company_id),
#                 Q(user_id=data_kwargs["user_id"]),
#                 Q(user_group_id=data_kwargs["user_group_id"]),
#                 Q(weburl=page)
#             ).values_list("id", flat=True).first()

#             # grant/update
#             if data_kwargs.get("access"):
#                 if existing_id:
#                     before = getEntityDetails(
#                         "account", "UrlBasedAccessControl", existing_id)
#                     UrlBasedAccessControl.objects.filter(
#                         id=existing_id).update(**data_kwargs)
#                     after = getEntityDetails(
#                         "account", "UrlBasedAccessControl", existing_id)
#                     createHistoryForUpdate(
#                         actor_context,
#                         "account", "UrlBasedAccessControl",
#                         existing_id, company_id, before, after, data_kwargs
#                     )
#                 else:
#                     UrlBasedAccessControl.objects.create(**data_kwargs)

#             # revoke/delete
#             else:
#                 if existing_id:
#                     before = getEntityDetails(
#                         "account", "UrlBasedAccessControl", existing_id)
#                     UrlBasedAccessControl.objects.filter(
#                         id=existing_id).delete()
#                     after = getEntityDetails(
#                         "account", "UrlBasedAccessControl", existing_id)
#                     createHistoryForUpdate(
#                         actor_context,
#                         "account", "UrlBasedAccessControl",
#                         existing_id, company_id, before, after, data_kwargs
#                     )
#                     removed.append(page)
#                     parent = check_parent_for_brothers_in_law(data_kwargs)
#                     if parent:
#                         removed.append(parent)

#     # 7) Cleanup any orphaned home‐pages
#     checkHomePageIntoRemovedUrlAccess(
#         removed,
#         template.get("user_id"),
#         template.get("user_group_id")
#     )


# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def updateAccessControl(request):
#     print("Hi There",request,"Hi There")
#     company_id = getCompanyId(request)
#     permission_json = json.loads(request.data['permission_json'])

#     print("Hi There>>>>",permission_json)

#     # Converting url segments to url
#     segmented_url = '/'.join(permission_json['segmented_url'])
#     # poping segmented_url form object
#     try:
#         permission_json.pop('segmented_url')
#         # permission_json.pop('id')
#     except:
#         print('segmented_url not found')
#         return

#     # poping read value form object
#     try:
#         permission_json.pop('read')
#         # permission_json.pop('id')
#     except:
#         print('read not found')
#         return

#     # Setting User id null if value is 0
#     if permission_json['user_id'] == 0:
#         permission_json['user_id'] = None

#     # Setting user_group_id null if value is 0
#     if permission_json['user_group_id'] == 0:
#         permission_json['user_group_id'] = None

#     # poping home_page value form object
#     try:
#         if permission_json['home_page']:
#             createOrUpdateHomePage(
#                 permission_json['weburl'], permission_json['user_id'], permission_json['user_group_id'])

#         # print('home_page => ', permission_json['home_page'])
#         permission_json.pop('home_page')
#     except:
#         # print('home_page not found')
#         return

#     # Setting Company_id
#     permission_json['company_id'] = company_id

#     # permission_json['weburl_id'] = getWebUrlId(segmented_url)
#     try:
#         if permission_json['id'] == 0 or permission_json['id']:
#             permission_json['id'] = None
#     except Exception as e:
#         permission_json['id'] = None

#     try:

#         children = getChildUrls(permission_json['weburl'])

#         # Get Home page
#         access_for = 'user' if permission_json['user_id'] else 'group'
#         user_or_group_id = permission_json['user_id'] if permission_json['user_id'] else permission_json['user_group_id']
#         home_page = getHomePage(
#             access_for, user_or_group_id, permission_json['weburl'])
#         print("Home page => ", home_page)

#         # If no home page exist and children urls has 'dashboard' then make it home page
#         if not home_page:
#             dashboard = [child for child in children if 'dashboard' in child]
#             if len(dashboard):
#                 createOrUpdateHomePage(
#                     dashboard[0], permission_json['user_id'], permission_json['user_group_id'])

#         print("children => ", children)

#         web_url_removed_list = []

#         for child in children:
#             permission_json['weburl'] = child
#             permission_json['id'] = None

#             #

#             id = UrlBasedAccessControl.objects.filter(
#                 Q(company_id=permission_json['company_id']) &
#                 Q(user_id=permission_json['user_id']) &
#                 Q(user_group_id=permission_json['user_group_id']) &
#                 Q(weburl=permission_json['weburl'])
#             ).values_list('id', flat=True).first()

#             # Create or Update permission if there is permission other than "no_permission"
#             if permission_json['access']:
#                 if id:
#                     permission_json['id'] = id

#                     # Getting old entity snapshot
#                     before_changed = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', id)

#                     # Update permission if there is permission other than "no_permission", otherwise delete it
#                     updated = UrlBasedAccessControl.objects.filter(
#                         id=id
#                     ).update(
#                         **permission_json
#                     )

#                     # Getting new entity snapshot
#                     after_changed = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', id)

#                     # creating History
#                     createHistoryForUpdate(request, 'account', 'UrlBasedAccessControl',
#                                            id, company_id, before_changed, after_changed, request.data)

#                     # print('updated')
#                 else:
#                     created = UrlBasedAccessControl.objects.create(
#                         **permission_json
#                     )
#                     # print('created')
#                     # print(permission_json)
#                     """
#                     Check the parents recursively, to check permission exists or not,
#                     If not, then give same access type to predecessor
#                     """
#                     # pending

#             else:
#                 # delete permission if it is created
#                 if id:

#                     # Getting old entity snapshot
#                     before_changed = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', id)

#                     deleted = UrlBasedAccessControl.objects.filter(
#                         id=id
#                     ).delete()

#                     web_url_removed_list.append(child)

#                     # Getting new entity snapshot
#                     after_changed = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', id)

#                     # creating History
#                     createHistoryForUpdate(request, 'account', 'UrlBasedAccessControl',
#                                            id, company_id, before_changed, after_changed, request.data)

#                     # print('deleted')
#                     # Check parent, Is there any brothers exist? if not then delete the parent too
#                     parent_url = check_parent_for_brothers_in_law(
#                         permission_json)
#                     if parent_url:
#                         web_url_removed_list.append(parent_url)

#         # print("web_url_removed_list => ", web_url_removed_list)
#         # Check if the current user having any home page into the web_url_removed_list
#         checkHomePageIntoRemovedUrlAccess(
#             web_url_removed_list, permission_json['user_id'], permission_json['user_group_id'])

#         return Response({'response': 'Access permissions updated'}, status=200)
#     except Exception as e:
#         print(e.args)
#         logging.getLogger("error_logger").error(repr(e))
#         return Response({'mgs': e.args}, status=500)


ACL_FIELDS = {
    'access',
    'add',
    'edit',
    'delete',
    'print_download',
}


# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def updateAccessControl(request):
#     """
#     Expects request.data['permission_json'] as JSON string with keys:
#       user_id, user_group_id, segmented_url (list), access, add, edit, delete,
#       print_download, home_page (bool)
#     """
#     company_id = getCompanyId(request)

#     # 1) Parse JSON
#     raw = request.data.get('permission_json', '{}')
#     try:
#         perm = json.loads(raw)
#     except ValueError:
#         return Response({'error': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)

#     # 2) Flatten segmented_url → weburl
#     seg = perm.pop('segmented_url', None)
#     if not isinstance(seg, (list, tuple)):
#         return Response({'error': 'segmented_url must be a list'},
#                         status=status.HTTP_400_BAD_REQUEST)
#     perm['weburl'] = '/'.join(seg)

#     # 3) Home‐page toggle?
#     if perm.pop('home_page', False):
#         createOrUpdateHomePage(
#             perm['weburl'],
#             perm.get('user_id') or None,
#             perm.get('user_group_id') or None
#         )

#     # 4) Normalize IDs
#     perm['company_id'] = company_id
#     perm['user_id'] = perm.get('user_id') or None
#     perm['user_group_id'] = perm.get('user_group_id') or None

#     # 5) Build a dict of only the real ACL columns
#     acl_defaults = {k: v for k, v in perm.items() if k in ACL_FIELDS}

#     # 6) Get all children of that URL
#     try:
#         children = getChildUrls(perm['weburl'])
#     except Exception as e:
#         logging.error(f"getChildUrls failed: {e}")
#         return Response({'error': 'Could not resolve child URLs'},
#                         status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#     # 7) If group‐only, load its user_ids
#     target_user_ids = []
#     if perm['user_group_id'] and not perm['user_id']:
#         try:
#             grp = UserGroup.objects.get(
#                 pk=perm['user_group_id'],
#                 company_id=company_id
#             )
#         except UserGroup.DoesNotExist:
#             return Response({'error': 'UserGroup not found'},
#                             status=status.HTTP_400_BAD_REQUEST)
#         target_user_ids = grp.user_ids

#     removed = []  # track deletions for possible homepage cleanup

#     # 8) Do it all in one transaction
#     with transaction.atomic():
#         for url in children:
#             # -------- USER-SPECIFIC BRANCH --------
#             if perm['user_id']:
#                 user_filter = {
#                     'company_id':    company_id,
#                     'weburl':        url,
#                     'user_id':       perm['user_id'],
#                     'user_group_id': None,
#                 }

#                 if acl_defaults.get('access'):
#                     # upsert user ACL
#                     obj, created = UrlBasedAccessControl.objects.update_or_create(
#                         defaults=acl_defaults,
#                         **user_filter
#                     )
#                     if not created:
#                         # log update
#                         before = getEntityDetails(
#                             'account', 'UrlBasedAccessControl', obj.id)
#                         after = getEntityDetails(
#                             'account', 'UrlBasedAccessControl', obj.id)
#                         createHistoryForUpdate(
#                             request,
#                             'account',
#                             'UrlBasedAccessControl',
#                             obj.id,
#                             company_id,
#                             before,
#                             after,
#                             request.data
#                         )
#                 else:
#                     # delete user ACL
#                     qs = UrlBasedAccessControl.objects.filter(**user_filter)
#                     pk = qs.values_list('id', flat=True).first()
#                     if pk:
#                         before = getEntityDetails(
#                             'account', 'UrlBasedAccessControl', pk)
#                         qs.delete()
#                         after = getEntityDetails(
#                             'account', 'UrlBasedAccessControl', pk)
#                         createHistoryForUpdate(
#                             request,
#                             'account',
#                             'UrlBasedAccessControl',
#                             pk,
#                             company_id,
#                             before,
#                             after,
#                             request.data
#                         )
#                         removed.append(url)

#                 # skip straight to next URL—never touch group templates
#                 continue

#             # -------- GROUP‐SPECIFIC BRANCH --------
#             # (Here perm['user_id'] is None and perm['user_group_id'] is set)

#             # A) Template row
#             tpl_filter = {
#                 'company_id':    company_id,
#                 'weburl':        url,
#                 'user_id':       None,
#                 'user_group_id': perm['user_group_id'],
#             }

#             if acl_defaults.get('access'):
#                 tpl_obj, tpl_created = UrlBasedAccessControl.objects.update_or_create(
#                     defaults=acl_defaults,
#                     **tpl_filter
#                 )
#                 if not tpl_created:
#                     before = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', tpl_obj.id)
#                     after = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', tpl_obj.id)
#                     createHistoryForUpdate(
#                         request,
#                         'account',
#                         'UrlBasedAccessControl',
#                         tpl_obj.id,
#                         company_id,
#                         before,
#                         after,
#                         request.data
#                     )
#             else:
#                 qs = UrlBasedAccessControl.objects.filter(**tpl_filter)
#                 tpl_id = qs.values_list('id', flat=True).first()
#                 if tpl_id:
#                     before = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', tpl_id)
#                     qs.delete()
#                     after = getEntityDetails(
#                         'account', 'UrlBasedAccessControl', tpl_id)
#                     createHistoryForUpdate(
#                         request,
#                         'account',
#                         'UrlBasedAccessControl',
#                         tpl_id,
#                         company_id,
#                         before,
#                         after,
#                         request.data
#                     )
#                     removed.append(url)

#             # B) Propagate to every user in that group
#             for uid in target_user_ids:
#                 user_filter = {
#                     'company_id':    company_id,
#                     'weburl':        url,
#                     'user_id':       uid,
#                     'user_group_id': None,
#                 }

#                 if acl_defaults.get('access'):
#                     usr_obj, usr_created = UrlBasedAccessControl.objects.update_or_create(
#                         defaults=acl_defaults,
#                         **user_filter
#                     )
#                     if not usr_created:
#                         before = getEntityDetails(
#                             'account', 'UrlBasedAccessControl', usr_obj.id)
#                         after = getEntityDetails(
#                             'account', 'UrlBasedAccessControl', usr_obj.id)
#                         createHistoryForUpdate(
#                             request,
#                             'account',
#                             'UrlBasedAccessControl',
#                             usr_obj.id,
#                             company_id,
#                             before,
#                             after,
#                             request.data
#                         )
#                 else:
#                     uqs = UrlBasedAccessControl.objects.filter(**user_filter)
#                     uid_pk = uqs.values_list('id', flat=True).first()
#                     if uid_pk:
#                         before = getEntityDetails(
#                             'account', 'UrlBasedAccessControl', uid_pk)
#                         uqs.delete()
#                         after = getEntityDetails(
#                             'account', 'UrlBasedAccessControl', uid_pk)
#                         createHistoryForUpdate(
#                             request,
#                             'account',
#                             'UrlBasedAccessControl',
#                             uid_pk,
#                             company_id,
#                             before,
#                             after,
#                             request.data
#                         )
#                         removed.append(url)

#         # 9) Optionally clean up home pages or parents
#         # check_parent_for_brothers_in_law(...)
#         # checkHomePageIntoRemovedUrlAccess(removed, perm['user_id'], perm['user_group_id'])

#     return Response({'response': 'Access permissions updated'},
#                     status=status.HTTP_200_OK)


def getHomePage(access_for: str, user_or_group_id: str, url: str) -> str:

    app_name = url.strip().strip('/').split('/')[0]

    app_name = '/' + app_name + '/'
    print('app_name => ', app_name)

    try:
        accesses = []
        if access_for == 'user':
            accesses = CompanyUser.objects.filter(
                Q(id=user_or_group_id)
            ).values('app_wise_home_pages').first()['app_wise_home_pages']

        if access_for == 'group':
            accesses = UserGroup.objects.filter(
                Q(id=user_or_group_id)
            ).values('app_wise_home_pages').first()['app_wise_home_pages']

        home_page = [url for url in accesses if app_name in url]
        if len(home_page):
            return home_page[0]

    except Exception as e:
        print(e)

    return ''


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def getAccessPermissionDetails(request):
    company_id = getCompanyId(request)
    # weburl_id = getWebUrlId(request.data['url'])
    print(request.data['url'])

    try:
        if (request.data['access_for'] == 'user'):

            # #  Get Groups ids for current user
            # groups = UserGroup.objects.filter(
            #     Q(user_ids__overlap=[request.data['id']])
            # ).values()

            # group_ids = [group['id'] for group in groups]
            url_details = {}

            # url_details = {'id': None, 'company_id': company_id, 'user_id': None, 'user_group_id': None, 'weburl': request.data['url'],
            #                'access': False, 'add': False, 'edit': False, 'delete': False, 'print_download': False}

            user_url_details = UrlBasedAccessControl.objects.filter(
                Q(user__id=request.data['id']) &
                Q(weburl=request.data['url'])
            ).values().first()

            # Setting user permission to url_details
            if user_url_details:
                url_details = user_url_details
        if (request.data['access_for'] == 'group'):
            url_details = UrlBasedAccessControl.objects.filter(
                Q(user_group__id=request.data['id']) &
                Q(weburl=request.data['url'])
            ).values().first()

        home_page = getHomePage(
            request.data['access_for'], request.data['id'], request.data['url'])
        print('home_page => ', home_page)

        return Response({'response': url_details, 'home_page': home_page}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response({'msg': str(e.args)}, status=500)


def getAllCompanyUser(request):
    company_id = getCompanyId(request)
    user_details = getUserDetails(request)
    users = CompanyUser.objects.filter(
        Q(company_id=company_id)
        & Q(is_active=True)
    ).values(
        'id',
        'name',
        'username',
        'image_url',
        'attachment_id',
        'email',
        'mobile',
        'role',
        'job_title',
        'medical_council_registration',
        'job_title',
        'department',
        'doctor_type',
        'staff_department',
        'staff_job_title',
        'administration_type',
        'is_active',
        'is_admin',
        'is_owner',
        'is_superuser',
        department_name=F('department__name'),
        doctor_type_name=F('doctor_type__name'),
        staff_department_name=F('staff_department__name'),
        staff_job_title_name=F('staff_job_title__name'),
        administration_type_name=F('administration_type__name'),
    ).order_by('name')

    for user in users:
        user['base64_image'] = getImageAsBase64(
            request, user['attachment_id'])

    return users


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllActiveCompanyUser(request):
    try:
        company_users = getAllCompanyUser(request)
        return Response({'response': company_users}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response({'msg': str(e.args)}, status=500)


def extract_leaf_urls(url_list: list[str]) -> int:
    parent_urls = set()

    for url in url_list:
        parts = url.strip('/').split('/')
        parent_url = ''
        for part in parts[:-1]:
            parent_url += '/' + part
            parent_urls.add(parent_url)

    leaf_urls = [url for url in url_list if url not in parent_urls]
    return len(leaf_urls)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllActiveCompanyUserWithPermissionDetails(request):
    try:
        company_users = getAllCompanyUser(request)
        user_ids = [usr['id'] for usr in company_users]

        #  Get Groups for the users
        groups = UserGroup.objects.filter(
            Q(user_ids__overlap=user_ids)
        ).values()

        group_ids = [group['id'] for group in groups]

        #  Get user Permission details
        user_permissions = UrlBasedAccessControl.objects.filter(
            Q(user_id__in=user_ids)
            | Q(user_group_id__in=group_ids)
        ).values(
            'id',
            'user_id',
            'weburl',
            user_groups=F('user_group_id__user_ids')
        )

        # print('user_permissions => ', user_permissions)

        for user in company_users:
            user['has_user_permission'] = 0
            user['has_group_permission'] = 0
            urls = [item['weburl']
                    for item in user_permissions if item['user_id'] == user['id']]
            user_filter_count = extract_leaf_urls(urls)
            urls = [item['weburl'] for item in user_permissions if item['user_groups']
                    is not None if user['id'] in item['user_groups']]
            group_filter_count = extract_leaf_urls(urls)

            if user_filter_count:
                user['has_user_permission'] = user_filter_count
            if group_filter_count:
                user['has_group_permission'] = group_filter_count

        return Response({'response': company_users}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        return Response({'msg': str(e.args)}, status=500)


# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def createOrUpdateUserGroup(request):
#     print("????",request.data)
#     # company_id = getCompanyId(request)
#     group_details = json.loads(request.data['group_details'])
#     print("group_details>>>>",group_details)
#     if group_details['id'] == 0:
#         group_details['id'] = None
#     try:
#         response, created = UserGroup.objects.update_or_create(
#             id=group_details['id'],
#             defaults=group_details
#         )

#         print(response, created)
#         group_id = response.id or group_details['id']

#         # now filter by that PK
#         qs = UrlBasedAccessControl.objects.filter(user_group_id=group_id).values()
#         print("UrlBasedAccessControl ???",qs)
#         return Response({'response': created}, status=200)
#     except IntegrityError as e:

#         logging.getLogger("error_logger").error(repr(e))
#         if 'unique constraint' in str(e).lower():
#             # Handle the unique constraint violation here
#             msg = "Duplicate Group Name was violated."
#         else:
#             # Handle other integrity errors
#             msg = f"IntegrityError: {e}"
#         return Response({'err_response': msg}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def createOrUpdateUserGroup(request):
    raw = request.data.get('group_details', '{}')
    try:
        payload = json.loads(raw)
    except ValueError:
        return Response(
            {"error": "Invalid JSON in group_details"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1) normalize PK: 0 → None (so update_or_create will INSERT)
    group_pk = payload.get('id') or None

    # 2) pull out your columns
    name = payload.get('name')
    user_ids = payload.get('user_ids', [])
    app_wise_homepages = payload.get('app_wise_home_pages', [])

    # 3) company instance
    company_id = get_company_id(request)
    try:
        company = Companies.objects.get(pk=company_id)
    except Companies.DoesNotExist:
        return Response(
            {"error": f"Company {company_id} not found"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 4) build defaults dict
    defaults = {
        'company':               company,
        'name':                  name,
        'user_ids':              user_ids,
        'app_wise_home_pages':   app_wise_homepages,
    }

    try:
        with transaction.atomic():
            # 5) Create or update the UserGroup row
            group, created = UserGroup.objects.update_or_create(
                id=group_pk,
                defaults=defaults
            )

            # 6) Now sync the URL‐ACL templates → user‐specific ACLs
            group_acls = UrlBasedAccessControl.objects.filter(
                company_id=company_id,
                user_group=group
            )
            weburls = list(group_acls.values_list('weburl', flat=True))

            # a) delete any stale ACLs for these user_ids
            UrlBasedAccessControl.objects.filter(
                company_id=company_id,
                user_id__in=group.user_ids
            ).exclude(weburl__in=weburls).delete()

            # b) upsert each group-template ACL into a per-user ACL
            for acl in group_acls:
                for uid in group.user_ids:
                    UrlBasedAccessControl.objects.update_or_create(
                        company_id=company_id,
                        user_id=uid,
                        weburl=acl.weburl,
                        defaults={
                            'access':        acl.access,
                            'add':           acl.add,
                            'edit':          acl.edit,
                            'delete':        acl.delete,
                            'print_download': acl.print_download,
                            'user_group':    None,   # now a user‐specific ACL
                        }
                    )

        return Response({
            'response':   created,
            'group_id':  group.id,
        }, status=status.HTTP_200_OK)

    except IntegrityError as e:
        logging.getLogger("error_logger").error(repr(e))
        msg = ("Duplicate Group Name was violated."
               if 'unique constraint' in str(e).lower()
               else f"IntegrityError: {e}")
        return Response({'error': msg},
                        status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def giveDefaultAccess(request):
    try:
        print("Request Data:", request.data)

        formdata = request.data  # directly using JSON payload

        company_id = formdata.get('id')
        if not company_id:
            return Response({'error': 'No company ID provided'}, status=400)

        user_ids = formdata.get('user_ids', [])
        if isinstance(user_ids, int):
            user_ids = [user_ids]

        # Fetch existing user group if it exists
        existing_user_ids = []
        try:
            existing_group = UserGroup.objects.get(
                company_id=company_id, name="Admin Group")
            existing_user_ids = existing_group.user_ids or []
        except UserGroup.DoesNotExist:
            pass

        # Combine existing and new user_ids and remove duplicates
        combined_user_ids = list(
            set(existing_user_ids + user_ids + [company_id]))

        # Create or update the group
        user_group, created = UserGroup.objects.update_or_create(
            company_id=company_id,
            name="Admin Group",
            defaults={
                'user_ids': combined_user_ids,
                'app_wise_home_pages': []
            }
        )

        return Response({'message': 'Access granted', 'created': created}, status=201 if created else 200)

    except KeyError as e:
        print("KeyError:", e)
        return Response({'error': f'Missing key: {str(e)}'}, status=400)
    except Exception as e:
        print("Exception:", e)
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllAccessControlledGroups(request):
    company_id = getCompanyId(request)
    try:
        groups = UserGroup.objects.filter(
            company_id=company_id
        ).values().order_by('name')

        company_users = getAllCompanyUser(request)
        # print(company_users)

        # Adding Username to groups
        for group in groups:
            group['user_details'] = [
                d for d in company_users if d['id'] in group['user_ids']]

        return Response({'response': groups}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("Error as => ", e.args)
        return Response({'msg': str(e.args)}, status=500)


def getAccessGroupDetails(company_id: int, id: int):
    return UserGroup.objects.filter(
        Q(company_id=company_id) &
        Q(id=id)
    ).values_list(
        'name', flat=True
    ).first()


def getAccessUserDetails(company_id: int, id: int):
    return CompanyUser.objects.filter(
        Q(company_id=company_id) &
        Q(id=id)
    ).values_list(
        'name', flat=True
    ).first()


def build_app_access_for_user(company_id: int, user_id: int) -> list:
    applications = list(Application.objects.values(
        'id',
        'name',
        'url',
        'color',
        'icon',
    ).order_by('id'))

    group_ids = list(UserGroup.objects.filter(
        company_id=company_id,
        user_ids__overlap=[user_id]
    ).values_list('id', flat=True))

    group_rows = AppAccessControl.objects.filter(
        company_id=company_id,
        group_id__in=group_ids,
    ).values(
        'application_id',
        'can_access',
        'can_add',
        'can_edit',
        'can_delete',
        'can_print',
    )
    user_rows = AppAccessControl.objects.filter(
        company_id=company_id,
        user_id=user_id,
    ).values(
        'application_id',
        'can_access',
        'can_add',
        'can_edit',
        'can_delete',
        'can_print',
    )
    acl_map = {}
    for row in group_rows:
        acl_map[row['application_id']] = dict(row)
    for row in user_rows:
        if row['application_id'] not in acl_map:
            acl_map[row['application_id']] = dict(row)
        else:
            merged = acl_map[row['application_id']]
            merged['can_access'] = merged.get(
                'can_access') or row.get('can_access')
            merged['can_add'] = merged.get('can_add') or row.get('can_add')
            merged['can_edit'] = merged.get('can_edit') or row.get('can_edit')
            merged['can_delete'] = merged.get(
                'can_delete') or row.get('can_delete')
            merged['can_print'] = merged.get(
                'can_print') or row.get('can_print')
            acl_map[row['application_id']] = merged

    response = []
    for app in applications:
        row = acl_map.get(app['id'])
        response.append({
            'app_id': app['id'],
            'name': app.get('name'),
            'url': app.get('url'),
            'color': app.get('color'),
            'icon': app.get('icon'),
            'can_access': row.get('can_access') if row else False,
            'can_add': row.get('can_add') if row else False,
            'can_edit': row.get('can_edit') if row else False,
            'can_delete': row.get('can_delete') if row else False,
            'can_print': row.get('can_print') if row else False,
        })
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAccessDetails(request, access_for, id):
    company_id = getCompanyId(request)
    context = dict()

    try:
        print(access_for, id)
        if access_for == 'group':
            context['accessor_name'] = getAccessGroupDetails(company_id, id)
            context['access_groups'] = [{
                'name': context['accessor_name'],
                'id': id
            }]

        if access_for == 'user':

            #  Get Groups ids for current user
            groups = UserGroup.objects.filter(
                Q(user_ids__overlap=[id])
            ).values()

            group_ids = [group['id'] for group in groups]

            context['access_groups'] = [
                {'name': group['name'], 'id': group['id']} for group in groups]
            context['accessor_name'] = getAccessUserDetails(company_id, id)

        return Response({'response': context, }, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("Error as => ", e.args)
        return Response({'msg': str(e.args)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getGroupDetails(request, id):
    company_id = getCompanyId(request)
    context = dict()
    try:
        group_details = UserGroup.objects.filter(
            Q(company_id=company_id) &
            Q(id=id)
        ).values().first()

        return Response({'response': group_details}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("Error as => ", e.args)
        return Response({'msg': str(e.args)}, status=500)


def getUserDetailsByID(request, user_ids: list):
    user_details = getUserDetails(request)

    queryset = CompanyUser.objects.filter(
        Q(company_id=user_details['company_id'])
        & Q(id__in=user_ids)
    ).values(
        'id',
        'name',
        'username',
        'image_url',
        'attachment_id',
        'is_admin',
        'is_active',
        'is_staff',
        'is_owner',
        'is_manager',
        'is_assistant',
    ).order_by('name')

    for user in queryset:
        user['base64_image'] = getImageAsBase64(
            request, user['attachment_id'])

    return queryset


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def getUsersImage(request):
    company_id = getCompanyId(request)
    context = dict()
    user_ids = [int(num) for num in str(request.data['user_ids']).split(',')]
    try:
        # Needs to get user image
        user_details = getUserDetailsByID(request, user_ids)

        return Response({'response': user_details}, status=200)
    except Exception as e:
        logging.getLogger("error_logger").error(repr(e))
        print("Error as => ", e.args)
        return Response({'msg': str(e.args)}, status=500)


# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def getAllLocations(request):
#     try:
#         locations = getAllJobLocations(request)

#         return Response({'response': locations}, status=200)
#     except Exception as e:
#         logging.getLogger("error_logger").error(repr(e))
#         print("Error as => ", e.args)
#         return Response({'msg': str(e.args)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_subscription(request):
    date_boundary = datetime.datetime.now(
        datetime.timezone.utc) + datetime.timedelta(15)
    print(date_boundary)

    today = datetime.now(
        datetime.timezone.utc)

    companies = Companies.objects.filter(
        Q(is_approved=True)
        & Q(active_upto__lte=date_boundary)
    ).values()

    msg = f'''
        <h3>Dear {company["admin_name"]}, your subcription will be deactivated on {company["active_upto"]}</h3>
    '''

    for company in companies:
        sendGenericMailV2(company['email'], 'Subscription Deactivation', msg)

    return Response(companies, status=200)


@api_view(['GET'])
@permission_classes([AllowAny])
def getUrlConfigDetails(request):
    controlled_urls = WebUrl.objects.values('url').order_by('url')
    controlled_urls = [url['url'] for url in controlled_urls]

    all_urls = AllWebUrls.objects.values('url').order_by('url')
    all_urls = [url['url'] for url in all_urls]

    extras = sorted(list(set(controlled_urls) - set(all_urls)))

    not_listed = sorted(list(set(all_urls) - set(controlled_urls)))

    return Response({'total_not_listed': len(not_listed), 'not_listed': not_listed, 'total_extras': len(extras), 'extras': extras, 'controlled_urls': controlled_urls, 'all_urls': all_urls}, status=200)


def truncate_email(email):
    if "@" in email:
        parts = email.split("@")
        username = parts[0]
        domain = parts[1]

        if len(username) > 3:
            username = username[:3] + "..." + username[-3:]

        truncated_email = f"{username}@{domain}"
        return truncated_email
    else:
        return email


@api_view(['GET'])
@permission_classes([AllowAny])
def checkResetPasswordToken(request):
    from accounts.models import OrganizationUser

    username = request.GET.get('username')
    token = request.GET.get('token')
    if not username or not token:
        return Response({'response': 'URL not Valid'}, status=200)

    # Checking reset link life
    company_user = CompanyUser.objects.filter(
        Q(username__iexact=username)
        & Q(password_reset_token=token)
    ).values(
        'password_reset_link_sent_at'
    ).first()
    organization_user = OrganizationUser.objects.filter(
        (Q(user__username__iexact=username) | Q(username__iexact=username))
        & Q(password_reset_token=token)
    ).values(
        'password_reset_link_sent_at'
    ).first()
    sent_time = (
        company_user['password_reset_link_sent_at']
        if company_user else
        organization_user['password_reset_link_sent_at']
        if organization_user else
        None
    )
    print(sent_time)
    if sent_time:
        time_now = datetime.datetime.now(datetime.timezone.utc)
        ten_minute = datetime.timedelta(minutes=10)
        if (time_now - sent_time) > ten_minute:
            return Response({'response': 'Link Expired'}, status=200)
        else:
            return Response({'status': 200}, status=200)
    else:
        return Response({'response': 'Link Expired'}, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def sendResetPasswordMail(request):
    user_id: string = request.data['user_id']
    # email: string = request.data['email']
    domain: string = request.data['domain']

    from accounts.models import OrganizationUser

    identifier = str(user_id).strip()
    company_user = None
    organization_user = None
    auth_user = None
    if '@' in identifier:
        company_user = CompanyUser.objects.filter(
            Q(email__iexact=identifier)
        ).values('username', 'email').first()
        organization_user = OrganizationUser.objects.filter(
            Q(user__email__iexact=identifier)
            | Q(email__iexact=identifier)
        ).values('username', 'email', 'user__username', 'user__email').first()
        auth_user = get_user_model().objects.filter(
            Q(email__iexact=identifier)
        ).values('username', 'email').first()
        if not company_user and auth_user:
            company_user = CompanyUser.objects.filter(
                Q(username__iexact=auth_user['username'])
            ).values('username', 'email').first()
        if not organization_user and auth_user:
            organization_user = OrganizationUser.objects.filter(
                Q(user__username__iexact=auth_user['username'])
                | Q(username__iexact=auth_user['username'])
            ).values('username', 'email', 'user__username', 'user__email').first()
        if auth_user:
            if company_user and not company_user.get('email'):
                company_user['email'] = auth_user['email']
            if organization_user:
                if not organization_user.get('email'):
                    organization_user['email'] = organization_user.get('user__email') or auth_user['email']
                if not organization_user.get('username'):
                    organization_user['username'] = organization_user.get('user__username') or auth_user['username']
        if not company_user and not organization_user and auth_user:
            # No legacy company record to track against; email reset requires a profile row.
            return Response({'response': 'Username not found', 'status': 204}, status=200)
    else:
        company_user = CompanyUser.objects.filter(
            Q(username__iexact=identifier)
        ).values('username', 'email').first()
        organization_user = OrganizationUser.objects.filter(
            Q(user__username__iexact=identifier)
            | Q(username__iexact=identifier)
        ).values('username', 'email', 'user__username', 'user__email').first()
        if not company_user and not organization_user:
            auth_user = get_user_model().objects.filter(
                Q(username__iexact=identifier)
            ).values('username', 'email').first()
            if auth_user:
                company_user = CompanyUser.objects.filter(
                    Q(username__iexact=auth_user['username'])
                ).values('username', 'email').first()
                organization_user = OrganizationUser.objects.filter(
                    Q(user__username__iexact=auth_user['username'])
                    | Q(username__iexact=auth_user['username'])
                ).values('username', 'email', 'user__username', 'user__email').first()

    username = (
        company_user['username']
        if company_user else
        organization_user.get('username')
        or organization_user.get('user__username')
        if organization_user else
        identifier
    )
    email = (
        company_user['email']
        if company_user and company_user.get('email') else
        organization_user.get('email')
        or organization_user.get('user__email')
        if organization_user else
        auth_user['email']
        if auth_user else
        None
    )

    print('email => ', email)

    if email:
        username_hashed = hash_string(username)
        email_hashed = hash_string(email)
        token = uuid.uuid4().hex
        reset_url = (
            f"{domain}/login/reset_password?token={token}"
            f"&username={username}&email={email}"
            f"&username_hashed={username_hashed}&email_hashed={email_hashed}"
        )
        print(reset_url)

        msg = (
            "<p style=\"margin:0 0 16px;\">We received a request to reset your password.</p>"
            "<p style=\"margin:0 0 24px;\">If this was you, use the button below to create a new password. "
            "If not, you can ignore this email.</p>"
            f"<p style=\"margin:24px 0;\">"
            f"<a href=\"{reset_url}\" "
            "style=\"display:inline-block;background:#58a596;color:#ffffff;text-decoration:none;font-weight:700;letter-spacing:0.14em;padding:14px 24px;\">"
            "RESET PASSWORD</a></p>"
            "<p style=\"margin:0 0 12px;\">This reset link will expire in 10 minutes.</p>"
            f"<p style=\"margin:0;font-size:12px;color:#5f7691;word-break:break-all;\">{reset_url}</p>"
        )
        send_response = sendGenericMailV2(email, 'Reset Your Password', msg)
        if getattr(send_response, 'status_code', None) != 200 or send_response.data.get('msg') != 'Email sent!':
            return Response(
                {
                    'response': 'Unable to send reset email from this project server.',
                    'status': 500,
                },
                status=200,
            )

        # Tracking Link expire time
        CompanyUser.objects.filter(
            Q(username__iexact=username)
        ).update(
            password_reset_link_sent_at=datetime.datetime.now(
                datetime.timezone.utc),
            password_reset_token=token
        )
        OrganizationUser.objects.filter(
            Q(user__username__iexact=username)
            | Q(username__iexact=username)
        ).update(
            password_reset_link_sent_at=datetime.datetime.now(
                datetime.timezone.utc),
            password_reset_token=token
        )

        return Response({'response': f'Password Reset link sent to {truncate_email(email)}', 'status': 200}, status=200)
    else:
        return Response({'response': 'Username not found', 'status': 204}, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def sendResetPasswordMailv3(request):
    user_id: string = request.data['user_id']
    # email: string = request.data['email']
    domain: string = request.data['domain']

    username = str(user_id).strip()
    email = CompanyUser.objects.filter(
        Q(username=username)
        # & Q(email=email)
    ).values_list('email', flat=True).first()

    print('email => ', email)

    if email:
        username_hashed = hash_string(username)
        email_hashed = hash_string(email)
        token = uuid.uuid4().hex

        msg = f'''
            <h3>{domain}/change_password?token={token}&username={username}&email={email}&username_hashed={username_hashed}&email_hashed={email_hashed}</h3>
        '''

        # sendGenericMailV2(email, 'Password Reset Link', msg)
        reset_link(f"{domain}/change_password?token={token}&username={username}&email={email}&username_hashed={username_hashed}&email_hashed={email_hashed}", email)

        # Tracking Link expire time
        CompanyUser.objects.filter(
            Q(username=username)
            # & Q(email=email)
        ).update(
            password_reset_link_sent_at=datetime.datetime.now(
                datetime.timezone.utc),
            password_reset_token=token
        )

        return Response({'response': f'Password Reset link sent to {truncate_email(email)}', 'status': 200}, status=200)
    else:
        return Response({'response': 'Username not found', 'status': 204}, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp_to_mail(request):
    otp: string = request.data['otp']
    email: string = request.data['email']

    try:
        if (otp and email):

            msg = f'''
                <h3>Your one time password is : {otp}</h3>
            '''

            # sendGenericMailV2(email, 'Email Verification OTP', msg)
            send_otp(email, otp, email)
        else:
            return Response({'response': 'Mail or OTP not found', 'status': 204}, status=200)
    except Exception as e:
        print("error as ", e.args)
        logging.getLogger("error_logger").error(repr(e))
        return Response({'response': str(e.args), 'status': 204}, status=500)

    return Response({'response': 'OTP sent to mail', 'status': 200}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_customized_home_page(request):

    try:
        user_details = CompanyUser.objects.filter(
            username=request.user.username
        ).values(
            'id',
            'company_id',
            'app_wise_home_pages'
        ).first()

        home_pages = []
        if user_details:
            home_pages.extend(user_details['app_wise_home_pages'])
            group_details = UserGroup.objects.filter(
                Q(company_id=user_details['company_id'])
                & Q(user_ids__contains=[user_details['id']])
            ).values(
                'app_wise_home_pages'
            )
            for group in group_details:
                home_pages.extend([page for page in group['app_wise_home_pages'] if str(
                    page).split('/')[1] not in [str(url).split('/')[1] for url in home_pages]])

        return Response({'response': home_pages}, status=200)
    except Exception as e:
        return Response(e.args, status=500)


def convert_to_midnight(date_time: datetime):
    return date_time.replace(hour=0, minute=0, second=0, microsecond=0)


def getDateWithManagedTimezoneOffset(zone_offset: int):
    today_date = convert_to_midnight(datetime.datetime.now(timezone.utc))
    return (today_date + timedelta(minutes=zone_offset))


@api_view(['GET'])
@permission_classes([AllowAny])
def getCompanyDeactivationAlert(request, time_offset_minute: str = ''):
    company_id = getCompanyId(request)
    today = getDateWithManagedTimezoneOffset(
        int(time_offset_minute))
    after_15day = today+timedelta(days=15)
    days_difference = 0
    response = ''
    try:
        queryset = Companies.objects.filter(
            Q(id=company_id)
            & Q(active_upto__range=[today, after_15day])
        ).values(
            'company_name',
            'active_upto',
        ).first()

        if queryset:
            difference = queryset['active_upto'] - today
            days_difference = difference.days
            response = "Your company's subscription with OWL B.O.S. will be deactivated in " + \
                str(days_difference) + " days."
        return Response({'response': response}, status=200)
    except Exception as e:
        print("error as ", e.args[0])
        logging.getLogger("error_logger").error(repr(e))
        return Response({'response': e.args[0]}, status=500)


class CompaniesUsageDetails(APIView):

    def getLastSevenDaysActivity(self, company_id: int, timezoneOffset: int) -> list:
        # Get the current date
        current_date = datetime.datetime.now().date()

        # Combine the current date with midnight time
        midnight_datetime = datetime.datetime.combine(
            current_date, datetime.datetime.max.time())

        # Calculate the datetime for last 7 days
        seven_days_ago = midnight_datetime - timedelta(days=7) + \
            timedelta(minutes=int(timezoneOffset))

        print(seven_days_ago)

        # Aggregate the total active time for each user, segregated by day
        total_active_time_per_company_per_day = ActivityLog.objects.filter(
            Q(company_user__company__id=company_id)
            # Filter for last seven days data)
            & Q(active_from__gte=seven_days_ago)
        ).annotate(
            # Adjust the timezone of active_from with the offset
            active_from_adjusted=F(
                'active_from') - timedelta(minutes=int(timezoneOffset))
        ).annotate(
            # Truncate the date in the adjusted timezone
            activity_date=TruncDate('active_from_adjusted')
        ).values('activity_date').annotate(
            total_active_time=Coalesce(
                Sum(F('active_to') - F('active_from')), timedelta(seconds=0))
        )
        graph_data = []
        for d in total_active_time_per_company_per_day:
            graph_data.append({
                'name': d['activity_date'],
                'value': math.ceil(d['total_active_time'] / timedelta(minutes=1))
            })
        if len(graph_data):
            # Sorting graph_data by name
            graph_data = sorted(
                graph_data, key=lambda x: x['name'], reverse=False)

        return graph_data

    def getFilesSize(self, files: List[str]):
        try:
            return sum(os.path.getsize(f) for f in files if os.path.isfile(f))
        except:
            return 0

    def getFolderSize(self, path: str):
        try:
            files = [path + '/' + f
                     for f in os.listdir(path) if os.path.isfile(path + '/' + f)]
            folders = [path + '/' + f
                       for f in os.listdir(path) if os.path.isdir(path + '/' + f)]

            if len(folders):
                for folder_path in folders:
                    return self.getFilesSize(files) + self.getFolderSize(folder_path)
            else:
                return self.getFilesSize(files)
        except:
            return 0

    permission_classes = [IsAuthenticated]

    def get(self, request):

        timezoneOffset = request.GET.get('timezoneOffset')
        print('timezoneOffset => ', timezoneOffset)

        # Get All Companies
        companies = Companies.objects.values(
            'id', 'company_name', 'company_id').order_by('company_name')

        for company in companies:

            # Getting total memory occupied
            total_file_size = 0
            if company:
                try:
                    folder_location = MEDIA_PATH + \
                        company['company_id']

                    total_file_size = round(
                        (self.getFolderSize(folder_location) / 1000000), 1)
                except Exception as e:
                    print(f"Error {e.args}")
            company['memory_occupied'] = total_file_size

            company['total_active_time_per_company_per_day'] = []
            # Getting Activity Details
            if company:

                # print(total_active_time_per_company_per_day)
                company['total_active_time_per_company_per_day'] = self.getLastSevenDaysActivity(
                    company['id'], timezoneOffset)

        return Response({'response': companies}, status=200)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def google_login(request):
    try:
        body = json.loads(request.body)
        token = body.get("id_token")

        if not token:
            return JsonResponse({"error": "No ID token provided"}, status=400)

        # Verify the token with Google
        user_info = id_token.verify_oauth2_token(
            token, requests.Request(), os.getenv('GoogleClientID'))

        if not user_info:
            return JsonResponse({"error": "Invalid token"}, status=400)

        # Extract user information
        email = user_info.get("email")
        name = user_info.get("name")

        try:
            user = CompanyUser.objects.get(username=email)

            # Update user name if the current name is "invite"
            # if user.name == "invite":
            #     user.name = name or user.name
            #     user.save()
            if user.name.startswith("invite"):
                user.name = name or user.name
                user.save()

            return Response({
                "message": "User found and updated",
                "user_data": user_info
            })

        except CompanyUser.DoesNotExist:
            # If user not found, just return Google user info
            return Response({
                "message": "User not found in system",
                "user_data": user_info
            })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def update_invited_user(request):
    print(request.data)
    if 'form_data' in request.data:
        form_data = json.loads(request.data['form_data'])
    else:
        form_data = request.data

    email = form_data.get('email')
    name = form_data.get('name')

    if not email:
        return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = CompanyUser.objects.get(username=email)

        if user.name == "invite":
            user.name = name or user.name
            user.save()

        user_info = {
            "username": user.username,
            "email": user.email,
            "name": user.name,
        }

        return Response({
            "message": "User found and updated",
            "user_data": user_info
        }, status=status.HTTP_200_OK)

    except CompanyUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


# Change to GET because we're getting data based on the username
@api_view(['GET'])
@permission_classes([AllowAny])
def google_username_match(request, username):
    try:
        # Validate the username
        if not username:
            return JsonResponse({"error": "Username is required"}, status=400)

        # Query the CompanyUser model for a matching username
        company_user = CompanyUser.objects.filter(username=username).first()

        if company_user:
            # Return the data for the matched CompanyUser
            return JsonResponse({
                "userdetails": {
                    "id": company_user.id,
                    "username": company_user.username,
                    "email": company_user.email,
                    "name": company_user.name,
                    "fatherOrHusband": company_user.fatherOrHusband,
                    "aliasName": company_user.aliasName,
                    "mobile": company_user.mobile,
                    "image_url": company_user.image_url,
                    "is_superuser": company_user.is_superuser,
                    "is_admin": company_user.is_admin,
                    "is_active": company_user.is_active,
                    "is_staff": company_user.is_staff,
                    "is_owner": company_user.is_owner,
                    "is_manager": company_user.is_manager,
                    "is_assistant": company_user.is_assistant,
                    "excellency_point": company_user.excellency_point,
                }
            }, status=200)
        else:
            # use status 404 for not found
            return JsonResponse({"error": "Username not found"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# def generate_access_token(user):
#     """
#     Properly generates an OAuth2 access token for a user without requiring a password.
#     """
#     try:
#         # Find the first OAuth application with CLIENT_CREDENTIALS
#         application = Application.objects.filter(client_type=Application.CLIENT_CONFIDENTIAL).first()
#         if not application:
#             raise Exception("OAuth2 Application not found. Please create one in Django Admin.")

#         # Set token expiration time (e.g., 1 hour from now)
#         expires = timezone.now() + datetime.timedelta(seconds=3600)

#         # Generate a secure random token
#         token_str = secrets.token_urlsafe(30)

#         # Ensure this token is valid within Django OAuth2
#         access_token = AccessToken.objects.create(
#             user=user,
#             token=token_str,
#             application=application,
#             expires=expires,
#             scope="read write"
#         )

#         # Generate a refresh token
#         refresh_token = RefreshToken.objects.create(
#             user=user,
#             token=secrets.token_urlsafe(30),
#             application=application,
#             access_token=access_token
#         )

#         return {
#             "access_token": access_token.token,
#             "refresh_token": refresh_token.token,
#             "expires_in": expires.isoformat(),
#             "token_type": "Bearer"
#         }

#     except Exception as e:
#         raise Exception(f"Error generating access token: {str(e)}")


# @api_view(['POST'])
# @authentication_classes([])
# @permission_classes([AllowAny])
# def send_team_invitaion(request):
#     try:
#         body = json.loads(request.body)
#         name = body['name']
#         username = str(body['email']).lower()
#         email = str(body['email']).lower()
#         company_id = body['company_id']
#         password = '########'  # Consider generating a secure random password
#         access_permission = body['access_permission']

#         # Check if a user with this email already exists
#         check_user = CompanyUser.objects.filter(username=email).first()

#         if check_user:
#             print({'warning': 'Email Already Exists'})
#             # Change the username to include the company_id
#             username = f"{email}{company_id}"  # Append the company ID to the username

#             # Append the company_id to the existing user's companies_ids if it's not already there
#             if company_id not in check_user.companies_ids:
#                 check_user.companies_ids.append(company_id)
#                 check_user.save()  # Save the updated user

#             new_user = CompanyUser(
#                 name=name,
#                 company_id=company_id,
#                 username=username,
#                 email=email,
#                 mobile=body.get('number'),  # Using .get() for safety
#                 excellency_point=body.get('excellency_point'),  # Using .get() for safety
#                 attachment_id=0,
#                 companies_ids=[company_id],  # Initialize with the company_id
#                 is_superuser=False,
#                 is_admin=access_permission == 'admin',
#                 is_active=True,
#                 is_staff=True,
#                 is_owner=False,
#                 is_manager=access_permission == 'manager',
#                 is_assistant=not (access_permission == 'admin' or access_permission == 'manager')
#             )
#             new_user.save()
#         else:
#             # If the user does not exist, create a new CompanyUser
#             check_user = CompanyUser(
#                 name=name,
#                 company_id=company_id,
#                 username=username,
#                 email=email,
#                 mobile=body.get('number'),  # Using .get() for safety
#                 excellency_point=body.get('excellency_point'),  # Using .get() for safety
#                 attachment_id=0,
#                 companies_ids=[company_id],  # Initialize with the company_id
#                 is_superuser=False,
#                 is_admin=access_permission == 'admin',
#                 is_active=True,
#                 is_staff=True,
#                 is_owner=False,
#                 is_manager=access_permission == 'manager',
#                 is_assistant=not (access_permission == 'admin' or access_permission == 'manager')
#             )
#             check_user.save()  # Save the new user

#         send_mail(body)  # Send invitation email

#         # Create Django User instance
#         try:
#             usr = User.objects.create_user(
#                 username=username,
#                 email=email,
#                 password=password
#             )
#             usr.save()
#         except IntegrityError as e:
#             # Handle ID conflicts
#             if "duplicate key value violates unique constraint" in str(e):
#                 max_id = User.objects.aggregate(max_id=Max('id'))['max_id'] or 0
#                 new_id = max_id + 1
#                 usr = User.objects.create(
#                     id=new_id,  # Assign a new ID
#                     username=username,
#                     email=email,
#                     password=password
#                 )
#                 usr.save()

#         return Response({
#             'success': 'User Created Successfully',
#             "message": "Invitation Sent !!",
#         })

#     except Exception as e:
#         print(e)
#         return Response({"error": str(e)}, status=500)


# @api_view(['POST'])
# @authentication_classes([])
# @permission_classes([AllowAny])
# def send_team_invitaion(request):
#     try:
#         body = json.loads(request.body)
#         name = body['name']
#         email = str(body['email']).lower()
#         company_id = body['company_id']
#         password = '########'
#         access_permission = body['access_permission']

#         base_username = email
#         check_user = CompanyUser.objects.filter(email=email).first()

#         if check_user:
#             print({'warning': 'Email Already Exists'})

#             if company_id in check_user.companies_ids:
#                 # ✅ Company already exists → just send the mail
#                 send_mail(body)
#                 return Response({"message": "Invitation Sent !!"})

#             # ✅ New company for existing email → update old user
#             check_user.companies_ids.append(company_id)
#             check_user.save()

#             # ✅ Create a new user with email + company_id to distinguish
#             username = f"{email}{company_id}"
#             new_user = CompanyUser(
#                 name=name,
#                 company_id=company_id,
#                 username=username,
#                 email=email,
#                 mobile=body.get('number'),
#                 excellency_point=body.get('excellency_point'),
#                 attachment_id=0,
#                 companies_ids=[company_id],
#                 is_superuser=False,
#                 is_admin=access_permission == 'admin',
#                 is_active=True,
#                 is_staff=True,
#                 is_owner=False,
#                 is_manager=access_permission == 'manager',
#                 is_assistant=not (access_permission == 'admin' or access_permission == 'manager')
#             )
#             new_user.save()
#         else:
#             # ✅ New email altogether
#             username = email
#             new_user = CompanyUser(
#                 name=name,
#                 company_id=company_id,
#                 username=username,
#                 email=email,
#                 mobile=body.get('number'),
#                 excellency_point=body.get('excellency_point'),
#                 attachment_id=0,
#                 companies_ids=[company_id],
#                 is_superuser=False,
#                 is_admin=access_permission == 'admin',
#                 is_active=True,
#                 is_staff=True,
#                 is_owner=False,
#                 is_manager=access_permission == 'manager',
#                 is_assistant=not (access_permission == 'admin' or access_permission == 'manager')
#             )
#             new_user.save()

#         # ✅ Send invitation
#         send_mail(body)
#         if  new_user:
#             createDefaultUserGroup(company_id, "Default_access", [new_user.id])

#         # ✅ Create Django user
#         try:
#             user = User.objects.create_user(
#                 username=username,
#                 email=email,
#                 password=password
#             )

#         except IntegrityError as e:
#             if "duplicate key value violates unique constraint" in str(e):
#                 max_id = User.objects.aggregate(max_id=Max('id'))['max_id'] or 0
#                 User.objects.create(
#                     id=max_id + 1,
#                     username=username,
#                     email=email,
#                     password=password
#                 )

#         return Response({
#             'success': 'User Created Successfully',
#             "message": "Invitation Sent !!",
#         })

#     except Exception as e:
#         print("Exception:", e)
#         return Response({"error": str(e)}, status=500)

class UpdateDisclaimerView(APIView):
    def patch(self, request):
        user_id = request.data.get("user_id")
        company_id = request.data.get("company_id")

        if not user_id or not company_id:
            return Response({"detail": "user_id and company_id are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company_user = CompanyUser.objects.get(
                id=user_id, company_id=company_id)
            company_user.disclaimer = True
            company_user.save()

            serializer = AgreeDisclaimerSerializer(company_user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except CompanyUser.DoesNotExist:
            return Response({"detail": "User with provided user_id and company_id not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def send_team_invitaion(request):
    try:
        body = json.loads(request.body)
        name = body['name']
        email = str(body['email']).lower()  # Single email address
        company_id = body['company_id']
        raw_is_googleuser = body.get('is_googleuser', False)
        if isinstance(raw_is_googleuser, str):
            is_googleuser = raw_is_googleuser.strip().lower() in ("true", "1", "yes")
        else:
            is_googleuser = bool(raw_is_googleuser)
        password = '########' if is_googleuser else 'abc123'
        access_permission = body['access_permission']
        role_value = body.get('role')

        # Check if user already exists for this company
        existing_user = CompanyUser.objects.filter(
            username=email,
            company_id=company_id,
        ).first()

        if existing_user:
            if role_value:
                existing_user.role = role_value
                existing_user.save(update_fields=["role"])
            send_mail(body)
            return Response({"message": "Invitation Sent !!"})

        # Create a new CompanyUser for this company
        username = email  # Use email as username for new users
        new_user = CompanyUser(
            name=name,
            company_id=company_id,
            username=username,
            email=email,
            mobile=body.get('number'),
            excellency_point=body.get('excellency_point'),
            attachment_id=0,
            role=role_value,
            is_superuser=False,
            is_admin=access_permission == 'admin',
            is_active=True,
            is_staff=True,
            is_owner=False,
            is_manager=access_permission == 'manager',
            is_assistant=not (access_permission ==
                              'admin' or access_permission == 'manager'),
            is_googleuser=is_googleuser,
        )
        new_user.save()
        CompanyUser.objects.filter(email=username).update(firstLoggedIn=False)

        # Send invitation
        # send_mail(body)
        send_mail(body)

        # Create Django user only if it does not already exist
        try:
            django_user_exists = (
                User.objects.filter(username=username).exists()
                or User.objects.filter(email=email).exists()
            )
            if not django_user_exists:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password
                )
            # Create default user group
            # createDefaultUserGroup(company_id, "Default_access", [new_user.id])
            clone_group_permissions_to_users("Default_access", [new_user.id])
            # data =     {

            #     "permission_json": {
            #         "user_id": new_user.id,
            #         "user_group_id": 0,
            #         "weburl": "inventory-management,asset-management,time-schedule-management",
            #         "segmented_url": ["inventory-management","asset-management","time-schedule-management"],
            #         "access": True,
            #         "read": True,
            #         "add": True,
            #         "edit": True,
            #         "delete": True,
            #         "print_download": True,
            #         "home_page": False
            #     }
            #     }
            # print("it will hit or not >>>>>>>>>>>>>>>>>>?")
            # # giveDefaultPermission(data)
            # apply_default_permissions(data, company_id, actor_context=request)
        except IntegrityError as e:
            if "duplicate key value violates unique constraint" in str(e):
                max_id = User.objects.aggregate(
                    max_id=Max('id'))['max_id'] or 0
                User.objects.create(
                    id=max_id + 1,
                    username=username,
                    email=email,
                    password=password
                )

        return Response({
            'success': 'User Created Successfully',
            'message': 'Invitation Sent !!',
        })

    except Exception as e:
        print("Exception:", e)
        return Response({"error": str(e)}, status=500)


def clone_group_permissions_to_users(
    group_name: str,
    user_ids: List[int]
) -> Dict[int, List[int]]:
    """
    For the UserGroup matching `group_name`, clone its URL‐based permissions
    onto each user in `user_ids`.  Returns a dict:
      { user_id: [newly_created_uba_id, ...], ... }
    """

    # 1) grab all the target users
    users = CompanyUser.objects.filter(
        id__in=user_ids).select_related('company')
    if not users:
        raise ValueError(f"No users found for IDs: {user_ids!r}")

    # 2) ensure all users are in the SAME company or bail
    companies = {u.company_id for u in users}
    if len(companies) != 1:
        raise ValueError("All users must belong to the same company")
    company_id = companies.pop()

    # 3) look up the UserGroup in that company
    try:
        group = UserGroup.objects.get(name=group_name, company_id=company_id)
    except ObjectDoesNotExist:
        raise ValueError(
            f"No UserGroup named {group_name!r} in company {company_id}")

    # 4) fetch the group's URL-based ACLs
    group_perms = UrlBasedAccessControl.objects.filter(
        company_id=company_id,
        user_group=group
    ).only('weburl', 'access', 'add', 'edit', 'delete', 'print_download')

    if not group_perms:
        return {u.id: [] for u in users}

    # 5) build a set of (user_id, weburl) for existing entries to skip duplicates
    all_weburls = [p.weburl for p in group_perms]
    existing = UrlBasedAccessControl.objects.filter(
        company_id=company_id,
        user_id__in=user_ids,
        weburl__in=all_weburls
    ).values_list('user_id', 'weburl')
    existing_set = set(existing)  # {(user_id, weburl), ...}

    # 6) prepare new UrlBasedAccessControl instances
    to_create = []
    for user in users:
        for p in group_perms:
            key = (user.id, p.weburl)
            if key in existing_set:
                continue
            to_create.append(UrlBasedAccessControl(
                company_id=company_id,
                user_id=user.id,
                user_group=None,
                weburl=p.weburl,
                access=p.access,
                add=p.add,
                edit=p.edit,
                delete=p.delete,
                print_download=p.print_download
            ))

    # 7) bulk create, inside a transaction
    created_map: Dict[int, List[int]] = {u.id: [] for u in users}
    with transaction.atomic():
        objs = UrlBasedAccessControl.objects.bulk_create(to_create)
        # distribute the new IDs back to their users
        for o in objs:
            created_map[o.user_id].append(o.id)

    return created_map


def send_mail(data: dict):
    email = data['email']
    subject = "Your Organization Access Is Ready"
    admin_name = data.get('admin_name') or "Organization Admin"
    team_name = data.get('team_name') or "your organization"
    invite_url = data.get('inv_url') or os.getenv('company_url') or os.getenv('EMAIL_SERVICE_BASE_URL') or ""
    password = data.get('password') or 'abc123'

    msg = f'''
        <p>Hello,</p>
        <p>{admin_name} has created your access for <strong>{team_name}</strong>.</p>
        <p>You can sign in with the details below:</p>
        <div style="margin:20px 0;padding:16px 20px;border-radius:12px;background:#f4f8fc;border:1px solid #dbe7f3;">
            <p style="margin:0 0 8px 0;"><strong>Username:</strong> {email}</p>
            <p style="margin:0;"><strong>Temporary password:</strong> {password}</p>
        </div>
        <p>
            <a href="{invite_url}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1e5bd8;color:#ffffff;text-decoration:none;font-weight:600;">Open Login</a>
        </p>
        <p>Please change your password after your first login.</p>
        <p>If you did not expect this email, you can safely ignore it.</p>
    '''

    sendGenericMailV2(email, subject, msg)


@api_view(['POST'])
@permission_classes([AllowAny])
def getCompanyUsageDetails(request, id):
    try:
        # Fetch company details
        company_details = list(Companies.objects.filter(id=id).values())
        if not company_details:
            return Response({"error": "Company not found"}, status=404)

        company_name = company_details[0]['company_name']

        # Fetch user list
        user_list = list(CompanyUser.objects.filter(company_id=id).values())

        # Initialize storage usage
        usage_mb = 0.0

        if os.getenv('AWS_S3_INDENTITY'):
            # S3 usage calculation
            bucket = os.getenv('AWS_STORAGE_BUCKET_NAME')
            prefix = company_name + '/'

            s3 = boto3.client('s3')
            paginator = s3.get_paginator('list_objects_v2')

            total_size = 0
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                for obj in page.get('Contents', []):
                    total_size += obj['Size']

            usage_mb = round(total_size / (1024 ** 2), 2)
        else:
            folder_location = os.path.join(MEDIA_PATH, company_name)
            usage_mb = round(getFolderSize(folder_location) / 1_000_000, 2)

        # Read optional date filters & timezone offset from request
        start_date = request.data.get('start_date')  # Format: YYYY-MM-DD
        end_date = request.data.get('end_date')      # Format: YYYY-MM-DD
        timezone_offset = int(request.data.get(
            'timezoneOffset', 0))  # Default 0

        # Get activity graph data
        activity_graph = getCompanyActivityGraph(
            company_name, timezone_offset, start_date, end_date
        )
        activity_user_graph = getCompanyActivityGraphUser(company_name, timezone_offset, start_date, end_date
                                                          )
        user_id = CompanyUser.objects.filter(
            username=company_details[0]['username']).values('id', 'subscription_id')

        return Response({
            "company_name": company_name,
            "company_details": company_details,
            "user_list_count": len(user_list),
            "storage_usage_mb": usage_mb,
            "user_activity_graph": activity_user_graph,
            "activity_graph": activity_graph,
            "user_id": user_id[0]['id'],
            "subscription_id": user_id[0]['subscription_id']
        })

    except Exception as e:
        print("Error:", e)
        return Response({"error": str(e)}, status=500)


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


def getCompanyActivityGraph(company_name: str, timezoneOffset: int, start_date: str = None, end_date: str = None) -> list:
    try:
        # Base queryset using the correct foreign key chain
        activity_filter = Q(company_user__company__company_name=company_name)

        # Handle optional date range logic
        if start_date and end_date:
            # Date range filtering
            start_dt = datetime.datetime.strptime(
                start_date, '%Y-%m-%d') + timedelta(minutes=int(timezoneOffset))
            end_dt = datetime.datetime.strptime(
                end_date, '%Y-%m-%d') + timedelta(days=1, minutes=int(timezoneOffset))
            activity_filter &= Q(active_from__gte=start_dt,
                                 active_from__lt=end_dt)
        elif not start_date and not end_date:
            # Default to last 7 days
            current_date = datetime.datetime.now().date()
            midnight_datetime = datetime.datetime.combine(
                current_date, datetime.datetime.max.time())
            seven_days_ago = midnight_datetime - \
                timedelta(days=7) + timedelta(minutes=int(timezoneOffset))
            activity_filter &= Q(active_from__gte=seven_days_ago)

        # Query with adjusted time
        total_active_time_per_company_per_day = ActivityLog.objects.filter(
            activity_filter
        ).annotate(
            active_from_adjusted=F('active_from') -
            timedelta(minutes=int(timezoneOffset))
        ).annotate(
            activity_date=TruncDate('active_from_adjusted')
        ).values('activity_date').annotate(
            total_active_time=Coalesce(
                Sum(F('active_to') - F('active_from')), timedelta(seconds=0))
        )

        # Format graph data
        graph_data = [{
            'name': d['activity_date'],
            'value': math.ceil(d['total_active_time'] / timedelta(minutes=1))
        } for d in total_active_time_per_company_per_day]

        return sorted(graph_data, key=lambda x: x['name'])

    except Exception as e:
        print(f"Error in getCompanyActivityGraph: {e}")
        return []


def getCompanyActivityGraphUser(company_name: str, timezoneOffset: int, start_date: str = None, end_date: str = None) -> list:
    try:
        # Base queryset using the correct foreign key chain
        activity_filter = Q(company_user__company__company_name=company_name)

        # Handle optional date range logic
        if start_date and end_date:
            # Date range filtering
            start_dt = datetime.datetime.strptime(
                start_date, '%Y-%m-%d') + timedelta(minutes=int(timezoneOffset))
            end_dt = datetime.datetime.strptime(
                end_date, '%Y-%m-%d') + timedelta(days=1, minutes=int(timezoneOffset))
            activity_filter &= Q(active_from__gte=start_dt,
                                 active_from__lt=end_dt)
        elif not start_date and not end_date:
            # Default to last 7 days
            current_date = datetime.datetime.now().date()
            midnight_datetime = datetime.datetime.combine(
                current_date, datetime.datetime.max.time())
            seven_days_ago = midnight_datetime - \
                timedelta(days=7) + timedelta(minutes=int(timezoneOffset))
            activity_filter &= Q(active_from__gte=seven_days_ago)

        # Query with adjusted time
        total_active_time_per_user = ActivityLog.objects.filter(
            activity_filter
        ).annotate(
            active_from_adjusted=F('active_from') -
            timedelta(minutes=int(timezoneOffset))
        ).values('company_user__username', 'company_user__name').annotate(
            total_active_time=Coalesce(
                Sum(F('active_to') - F('active_from')), timedelta(seconds=0))
        )

        # Track the number of occurrences of each name
        name_counts = defaultdict(int)
        for d in total_active_time_per_user:
            name_counts[d['company_user__name']] += 1

        # Format graph data
        graph_data = []
        for d in total_active_time_per_user:
            name = d['company_user__name']
            if name_counts[name] > 1:
                # If duplicate name, concatenate with username
                name = f"{name} ({d['company_user__username']})"
            graph_data.append({
                'name': name,
                'value': math.ceil(d['total_active_time'] / timedelta(minutes=1))
            })

        return sorted(graph_data, key=lambda x: x['name'])
    except Exception as e:
        print(f"Error in getCompanyActivityGraph: {e}")
        return []


@api_view(['GET'])
@permission_classes([AllowAny])
def isInAdminGroup(request, id, user_id):
    try:
        # Retrieve all groups for the specified company_id
        groups = UserGroup.objects.filter(company_id=id).values()

        # Iterate over the groups and check for the "Admin Group"
        for group in groups:
            if group['name'] == "Admin Group":
                # Ensure user_id is an integer for comparison
                user_id_int = int(user_id)
                if user_id_int in group['user_ids']:
                    return Response({"message": "User is in Admin Group"}, status=200)

        # If the user_id is not found in the "Admin Group"
        return Response({"message": "User is not in Admin Group"}, status=200)

    except Exception as e:
        print(f"Error in isInAdminGroup: {e}")
        return Response({"error": "An error occurred"}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def isGoogleUser(request, email):
    try:
        user = CompanyUser.objects.filter(email=email).values(
            "is_googleuser", "firstLoggedIn")
        return Response(user)
    except Exception as e:
        return Response("Error", e)


@api_view(['POST'])
@permission_classes([AllowAny])
def updatedSubIdInUserData(request):
    try:
        data = request.data
        print(data)
        # Validate required fields
        if 'id' not in data or 'subscription_id' not in data:  # Use consistent naming
            return Response({"error": "Missing id or subscription_id"}, status=400)

        id = data['id']
        subscription_id = data['subscription_id']  # Updated variable name

        # Check if user exists
        user_exists = CompanyUser.objects.filter(id=id).exists()
        if not user_exists:
            return Response({"error": "User with this ID does not exist"}, status=404)

        # Update the subscription ID for the specified company user
        updated_count = CompanyUser.objects.filter(
            id=id).update(subscription_id=subscription_id)

        # Checking if any rows were updated
        if updated_count == 0:
            return Response({"error": "No records updated"}, status=400)

        return Response({"message": "Subscription ID updated successfully", "id": id, "subscription_id": subscription_id}, status=200)

    except Exception as e:
        print(f"Error in updatedSubIdInUserData: {e}")
        return Response({"error": "An error occurred"}, status=500)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_company_and_user(request, id):
    """
    DELETE /api/companies/{id}/
    """
    try:
        company = Companies.objects.get(id=id)
    except Companies.DoesNotExist:
        return Response({'detail': 'Company not found.'}, status=status.HTTP_404_NOT_FOUND)

    username = company.username
    with transaction.atomic():
        company.delete()
        User.objects.filter(username=username).delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


class CompanyDbUsageAPIView(APIView):
    """
    GET  /api/account/companiesmemusage/<int:id>/db-usage/
    Returns the size in KB of the Companies row in PostgreSQL.
    """
    permission_classes = [permissions.IsAuthenticated]  # adjust to taste

    def get(self, request, id, format=None):
        # 1) make sure the company exists
        try:
            comp = Companies.objects.get(pk=id)
        except Companies.DoesNotExist:
            return Response({"detail": "Company not found."},
                            status=status.HTTP_404_NOT_FOUND)

        # 2) grab the real table name
        table_name = Companies._meta.db_table

        # 3) execute pg_column_size() against that table
        with connection.cursor() as cursor:
            cursor.execute(
                f'''
                SELECT COALESCE(SUM(pg_column_size(t)), 0)
                  FROM "{table_name}" AS t
                 WHERE t.id = %s
                ''',
                [id]
            )
            size_bytes, = cursor.fetchone()

        # 4) convert to KB
        size_kb = size_bytes / 1024.0

        return Response({
            "company_id": id,
            "size_kb": round(size_kb, 2)
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def activity_summary(request):
    """
    Return one record per company_user:
     - first_login  : oldest active_from
     - total_login  : sum of (active_to - active_from) for all sessions
     - user_type    : 'google' or 'non-google'
     - company_user__id, company_user__username
    """
    expires_subquery = None
    if AccessToken is not None:
        expires_subquery = Subquery(
            AccessToken.objects.filter(token=OuterRef('token'))
            .values('expires')[:1],
            output_field=DateTimeField(),
        )

    # Cap sessions at token expiry when available.
    if expires_subquery is not None:
        end_time = Case(
            When(
                active_to__isnull=False,
                then=Least(F('active_to'), Coalesce(
                    expires_subquery, F('active_to'))),
            ),
            When(
                active_to__isnull=True,
                then=Coalesce(expires_subquery, F('active_from')),
            ),
            default=F('active_from'),
            output_field=DateTimeField(),
        )
    else:
        end_time = Coalesce(F('active_to'), F('active_from'))

    session_length = ExpressionWrapper(
        end_time - F('active_from'),
        output_field=DurationField(),
    )

    last_activity_expr = end_time

    qs = (
        ActivityLog.objects
        .select_related('company_user')
        # annotate each row with a user_type
        .annotate(
            user_type=Case(
                When(company_user__is_googleuser=True,  then=Value('google')),
                default=Value('non-google'),
                output_field=CharField(),
            )
        )
        # now group by company_user__id, company_user__username, user_type
        .values(
            'company_user__id',
            'company_user__username',
            'company_user__name',
            'company_user__company__id',
            'company_user__company__company_name',
            'user_type',
        )
        # and annotate aggregates over each group
        .annotate(
            first_login=Min('active_from'),
            total_login=Sum(session_length),
            login_count=Count('id'),
            last_activity=Max(last_activity_expr),
        )
        .order_by('company_user__id')
    )

    activity_rows = list(qs)

    try:
        from accounts.models import LoginActivity
    except Exception:
        LoginActivity = None

    if LoginActivity is not None:
        end_time_accounts = Coalesce(F('active_to'), F('active_from'))
        session_length_accounts = ExpressionWrapper(
            end_time_accounts - F('active_from'),
            output_field=DurationField(),
        )

        accounts_qs = (
            LoginActivity.objects
            .filter(user__organization_user__company__isnull=False)
            .annotate(
                user_type=Value('account'),
                company_user__id=Coalesce(
                    F('user__organization_user__id'),
                    F('user_id'),
                ),
                company_user__username=Coalesce(
                    F('user__organization_user__username'),
                    F('user__username'),
                ),
                company_user__name=Coalesce(
                    F('user__organization_user__name'),
                    F('user__username'),
                ),
                company_user__company__id=Value(
                    None, output_field=IntegerField()),
                company_user__company__company_name=Value(
                    None, output_field=CharField()),
                organization_id=F('user__organization_user__company__id'),
                organization_name=F('user__organization_user__company__name'),
            )
            .values(
                'company_user__id',
                'company_user__username',
                'company_user__name',
                'company_user__company__id',
                'company_user__company__company_name',
                'organization_id',
                'organization_name',
                'user_type',
            )
            .annotate(
                first_login=Min('active_from'),
                total_login=Sum(session_length_accounts),
                login_count=Count('id'),
                last_activity=Max(end_time_accounts),
            )
            .order_by('company_user__id')
        )
        activity_rows.extend(list(accounts_qs))

    # JsonResponse will use str() on datetime & timedelta for us
    return JsonResponse(activity_rows, safe=False, json_dumps_params={'default': str})


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_check(request):
    username = request.data.get('username', '')
    password = request.data.get('password', '')

    user = authenticate(request, username=username, password=password)
    ok = bool(user and user.is_superuser)

    return JsonResponse(ok, safe=False)


def _storage_usage_for_prefix(prefix):
    usage_bytes = 0
    folder = os.path.join(settings.MEDIA_ROOT, prefix)
    if not os.path.isdir(folder):
        return 0
    for root, dirs, files in os.walk(folder):
        for f in files:
            fp = os.path.join(root, f)
            try:
                usage_bytes += os.path.getsize(fp)
            except OSError:
                pass
    return usage_bytes


def get_storage_usage_mb(company_name, fallback_names=None):
    if not company_name:
        company_name = ""
    candidates = [company_name]
    if fallback_names:
        candidates.extend([name for name in fallback_names if name])
    usage_bytes = 0
    for name in candidates:
        prefix = str(name).rstrip("/") + "/"
        usage_bytes = _storage_usage_for_prefix(prefix)
        if usage_bytes > 0:
            break
    return round(usage_bytes / (1024.0 ** 2), 2)


@api_view(['GET'])
@permission_classes([AllowAny])
def company_total_usage(request, id):
    """
    GET /api/company/<id>/total-usage/
    Returns:
      {
        "company_id": 123,
        "storage_usage_mb": 45.21,
        "db_row_size_kb": 12.34,
        "total_usage_mb": 45.22
      }
    """
    # 1) check company exists
    try:
        comp = Companies.objects.get(pk=id)
    except Companies.DoesNotExist:
        return Response(
            {"detail": "Company not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # 2) storage usage
    storage_mb = get_storage_usage_mb(
        comp.company_name,
        fallback_names=[f"company_{comp.id}"],
    )
    print(
        "company_total_usage folders",
        comp.company_name,
        f"company_{comp.id}",
        "->",
        storage_mb,
    )

    # 3) DB row size in bytes → KB
    table = Companies._meta.db_table
    with connection.cursor() as cursor:
        cursor.execute(f'''
            SELECT COALESCE(SUM(pg_column_size(t)), 0)
              FROM "{table}" AS t
             WHERE t.id = %s
        ''', [id])
        size_bytes, = cursor.fetchone()
    db_kb = round(size_bytes / 1024.0, 2)

    # 4) total in MB = storage_mb + (db_kb / 1024)
    total_mb = round(storage_mb + (db_kb / 1024.0), 2)

    # 5) return combined response
    return Response({
        "company_id": id,
        "storage_usage_mb": storage_mb,
        "db_row_size_kb": db_kb,
        "total_usage_mb": total_mb
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def organization_total_usage(request, id):
    """
    GET /api/account/organization_total_usage/<id>/
    Returns organization + its companies storage totals.
    """
    try:
        from accounts.models import Organization
    except Exception:
        return Response(
            {"detail": "Organization model not available."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        organization = Organization.objects.get(pk=id)
    except Organization.DoesNotExist:
        return Response(
            {"detail": "Organization not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    org_storage_mb = get_storage_usage_mb(
        organization.name,
        fallback_names=[f"organization_{organization.id}"],
    )

    org_table = Organization._meta.db_table
    with connection.cursor() as cursor:
        cursor.execute(
            f'''
            SELECT COALESCE(SUM(pg_column_size(t)), 0)
              FROM "{org_table}" AS t
             WHERE t.id = %s
            ''',
            [id],
        )
        org_size_bytes, = cursor.fetchone()
    org_db_kb = round(org_size_bytes / 1024.0, 2)

    companies = Companies.objects.filter(organization_id=str(id))
    company_storage_mb = 0.0
    company_db_kb = 0.0

    company_table = Companies._meta.db_table
    with connection.cursor() as cursor:
        for comp in companies:
            company_storage_mb += get_storage_usage_mb(
                comp.company_name,
                fallback_names=[f"company_{comp.id}"],
            )
            cursor.execute(
                f'''
                SELECT COALESCE(SUM(pg_column_size(t)), 0)
                  FROM "{company_table}" AS t
                 WHERE t.id = %s
                ''',
                [comp.id],
            )
            size_bytes, = cursor.fetchone()
            company_db_kb += round(size_bytes / 1024.0, 2)

    total_storage_mb = round(org_storage_mb + company_storage_mb, 2)
    total_db_kb = round(org_db_kb + company_db_kb, 2)
    total_mb = round(total_storage_mb + (total_db_kb / 1024.0), 2)

    return Response(
        {
            "organization_id": id,
            "organization_name": organization.name,
            "company_count": companies.count(),
            "storage_usage_mb": total_storage_mb,
            "db_row_size_kb": total_db_kb,
            "total_usage_mb": total_mb,
        }
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_companies(request):
    """
    ✅ GET /api/account/companies/
       → Returns all companies
    ✅ GET /api/account/companies/?id=1
       → Returns the company with id=1
    """
    try:
        company_id = request.GET.get("id")

        if company_id:
            company = Companies.objects.filter(id=company_id).first()
            if not company:
                return Response({"error": f"Company with id={company_id} not found"}, status=status.HTTP_404_NOT_FOUND)
            serializer = CompaniesSerializer(company)
            return Response({"response": serializer.data}, status=status.HTTP_200_OK)
        else:
            companies = Companies.objects.all().order_by("-id")
            serializer = CompaniesSerializer(companies, many=True)
            return Response({"response": serializer.data}, status=status.HTTP_200_OK)

    except Exception as e:
        print("Error fetching companies:", e)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
