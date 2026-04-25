from django.urls import path

from . import location_views
from . import views

urlpatterns = [
    path("location/", views.LocationAPI.as_view(), name="location"),
    path("sub_location/", views.SubLocationAPI.as_view(), name="sub-location"),
    path("compartment/", views.CompartmentAPI.as_view(), name="compartment"),
    path(
        "getLocationListMinimalDetails/",
        views.getLocationListMinimalDetails,
        name="get-location-list-minimal-details",
    ),
    path(
        "getAllDesginationRtIds/<location_id>/",
        views.getAllDesginationRtIds,
        name="get-all-designation-rate-ids",
    ),
    path(
        "getDesignationRates/",
        views.getDesignationRates,
        name="get-designation-rates",
    ),
    path(
        "getLocationDesignationDetails/<int:id>/",
        views.getLocationDesignationDetails,
        name="get-location-designation-details",
    ),
    path(
        "addNewLocationDesignation/",
        views.addNewLocationDesignation,
        name="add-new-location-designation",
    ),
    # path(
    #     "updateLocationDesignation/",
    #     views.updateLocationDesignation,
    #     name="update-location-designation",
    # ),
    path("getAllCountries/", location_views.getAllCountries, name="get-all-countries"),
    path("getAllStates/<country_code>/", location_views.getAllStates, name="get-all-states"),
    path("uploadImageFromAnyWhere/", location_views.uploadImageFromAnyWhere, name="upload-image-from-anywhere"),
    path("getAttachmentsWithIDs/", views.getAttachmentsWithIDs, name="get-attachments-with-ids"),
]
