from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [

    # ------------------- New Updated Api Start ----------------
     path('location/', views.LocationAPI.as_view(),
         name='/api/shared_api/location/'),

     path('sub_location/', views.SubLocationAPI.as_view(),
         name='/api/shared_api/sub_location/'),

     path('compartment/', views.CompartmentAPI.as_view(),
         name='/api/shared_api/compartment/'),

     path('auto_suggestion/', views.getAutoSuggestionList,
         name='/api/shared_api/getAutoSuggestionList'),


     path('getLocationListMinimalDetails/', views.getLocationListMinimalDetails,
         name='/api/shared_api/getLocationListMinimalDetails'),

     path('getCompartmentsList/<int:sub_location_id>/', views.getCompartmentsList,
         name='/api/shared_api/getCompartmentsList'),

     path('getAllDesginationRtIds/<location_id>/',
         views.getAllDesginationRtIds, name='/api/getAllDesginationRtIds'),

     path('getLocationDesignationRates/<table_identity>/', views.getLocationDesignationRates,
         name='/api/shared_api/getLocationDesignationRates'),
       path(
        "getDesignationRates/",
        views.getDesignationRates,
        name="/api/shared_api/getDesignationRates",
    ),

     path('addNewLocationDesignation/', views.addNewLocationDesignation,
         name='/api/shared_api/addNewLocationDesignation'),
     path('updateLocationDesignation/', views.updateLocationDesignation,
         name='/api/shared_api/updateLocationDesignation'),


     path('getLocationDesignationDetails/<id>/', views.getLocationDesignationDetails,
         name='/api/shared_api/getLocationDesignationDetails'),







     path('sendUsernamePassword/', views.sendUsernamePassword,
         name='/api/shared_api/sendUsernamePassword'),

     path('uploadImageFromAnyWhere/', views.uploadImageFromAnyWhere,
         name='/api/shared_api/uploadImageFromAnyWhere'),

     path('getAllStates/<country_code>/', views.getAllStates,
         name='/api/shared_api/getAllStates'),
         
     # ------------------- New Updated Api End ----------------



    path('getAllCountries/', views.getAllCountries,
         name='/api/getAllCountries'),
    
    path('getStates/<country>/', views.getStates, name='/api/getStates'),
    
    path('sendReports/', views.sendReports, name='/api/shared_api/sendReports'),
    path('removeFileFromMedia/', views.removeFileFromMedia,
         name='/api/shared_api/removeFileFromMedia'),
    path('deleteFileFromMedia/', views.deleteFileFromMedia,
         name='/api/shared_api/deleteFileFromMedia'),

    path('addNewSubscribe/', views.add_new_subscribe,
         name='/api/shared_api/add_new_subscribe'),

    path('getPreviousSubscribe/',
         views.get_previous_subscribe, name='/api/get_previous_subscribe'),

    path('getAttachments/', views.getAttachments, name='/api/shared_api/getAttachments'),
    path('getAttachmentsWithIDs/', views.getAttachmentsWithIDs,
         name='/api/getAttachmentsWithIDs'),
    path('removeAttachment/', views.removeAttachment,
         name='/api/shared_api/removeAttachment'),

    path('saveChartDetailsToDB/', views.saveChartDetailsToDB,
         name='/api/shared_api/saveChartDetailsToDB'),


    path('getChartDetails/<str:chart_identity>/', views.getChartDetails,
         name='/api/getChartDetails'),


    path('deleteGraphConfig/<int:id>/', views.deleteGraphConfig,
         name='/api/shared_api/deleteGraphConfig'),

    path('get_client_ip/', views.get_client_ip, name='/api/get_client_ip'),

    path('create_pdf/', views.create_pdf, name='/api/shared_api/create_pdf'),
    path('generate_pdf/', views.generate_pdf, name='/api/shared_api/generate_pdf'),
    path('generate_invoice_pdf/', views.generate_invoice_pdf, name='/api/shared_api/generate_invoice_pdf'),
    

    path('createCalenderEvent/', views.createCalenderEvent,
         name='/api/shared_api/createCalenderEvent'),

    path('getMediaStorageSize/', views.getMediaStorageSize,
         name='/api/shared_api/getMediaStorageSize'),

    path('clearGarbageAttachments/', views.clearGarbageAttachments,
         name='/api/clearGarbageAttachments'),

    path('clearGarbageAttachmentIDsFromModels/', views.clearGarbageAttachmentIDsFromModels,
         name='/api/clearGarbageAttachmentIDsFromModels'),

    path('manipulate_xl_or_csv_with_pandas/', views.manipulate_xl_or_csv_with_pandas,
         name='/api/shared_api/manipulate_xl_or_csv_with_pandas'),

]
