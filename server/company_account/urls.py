from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    

    # ------------------- New Update Api Start --------------------------
    path('createNewUser/', views.createNewUser,name='/api/account/createNewUser'),
    path('createNewUserFromGoogle/', views.createNewUserFromGoogle,name='/api/account/createNewUserFromGoogle'),
    
    # ------------------- New Update Api End ----------------------------

    path('login/', views.companyLogin, name='/api/account/companyLogin'),



    path('sendResetPasswordMail/',
         views.sendResetPasswordMail, name='/api/account/sendResetPasswordMail'),

#     path('sendResetPasswordMailv3/',
#          views.sendResetPasswordMailv3, name='/api/account/sendResetPasswordMailv3'),
    path('checkResetPasswordToken/',
         views.checkResetPasswordToken, name='/api/account/checkResetPasswordToken'),

    path('send_otp_to_mail/',
         views.send_otp_to_mail, name='/api/account/send_otp_to_mail'),


    path('companyLogout/', views.companyLogout,
         name='/api/account/companyLogout'),
    path('companyRegistrationForm/', views.companyRegistrationForm,
         name='/api/account/companyRegistrationForm'),

    path('userRegistration/', views.userRegistration,
         name='/api/account/userRegistration'),
    path('resetPassword/<int:id>', views.resetPassword,
         name='/api/account/resetPassword'),
     path('changePassword/<str:username>', views.changePassword,
         name='/api/account/changePassword'),

    path('image_upload/', views.uploadImage, name='/api/account/uploadImage'),
    path('save_image_url/<int:username>',
         views.saveImageUrl, name='/api/account/saveImageUrl'),
    path('google_username_match/<str:username>',
         views.google_username_match, name='/api/account/google_username_match'),


    # routing From Angular
    path('login_new', views.login, name='/api/account/login'),
    path('logout', views.logout, name='/api/account/logout'),
    
    path('signup', views.signup, name='/api/account/signup'),
    path('getActiveCompanyUsers/', views.getActiveCompanyUsers,
         name='/api/account/getActiveCompanyUsers'),
    path('getInActiveCompanyUsers/', views.getInActiveCompanyUsers,
         name='/api/account/getInActiveCompanyUsers'),
    path('changeActivityCompanyUsers/', views.changeActivityCompanyUsers,
         name='/api/account/changeActivityCompanyUsers'),

    path('changeUserRightOfCompanyUsers/', views.changeUserRightOfCompanyUsers,
         name='/api/account/changeUserRightOfCompanyUsers'),

    path('updateCompanyInfo/', views.updateCompanyInfo,
         name='/api/account/updateCompanyInfo'),

    path('changeUserImage/', views.changeUserImage,
         name='/api/account/changeUserImage'),

    path('updatePassword/', views.updatePassword,
         name='/api/account/updatePassword'),
    path('updateAdminPassword/', views.updateAdminPassword,
         name='/api/account/updateAdminPassword'),
    path('updateCompanyUserProfile/', views.updateCompanyUserProfile,
         name='/api/account/updateCompanyUserProfile'),
    
    path('getCompanyDetails/<company_id>/',
         views.getCompanyDetails, name='/api/account/getCompanyDetails'),
     path('getCompanyDetailsbyusername/<username>/',
         views.getCompanyDetailsbyusername, name='/api/account/getCompanyDetailsbyusername'),

     path('getCompanyUserDetailsbyusername/<username>/',
         views.getCompanyUserDetailsbyusername, name='/api/account/getCompanyUserDetailsbyusername'),
     
    path('getCurrentUser/', views.getCurrentUser,
         name='/api/account/getCurrentUser'),
    path('getCompanyInfo/', views.getCompanyInfo,
         name='/api/account/getCompanyInfo'),
    path('getOwners/', views.getOwners,
         name='/api/account/getOwners'),
    path('addOwner/', views.addOwner,
         name='/api/account/addOwner'),
    path('updateOwner/', views.updateOwner,
         name='/api/account/updateOwner'),
    path('getStatutoryRegisters/', views.getStatutoryRegisters,
         name='/api/account/getStatutoryRegisters'),
    path('addStatutoryRegister/', views.addStatutoryRegister,
         name='/api/account/addStatutoryRegister'),
    path('updateStatutoryRegister/', views.updateStatutoryRegister,
         name='/api/account/updateStatutoryRegister'),
    path('getStatutoryCustomFields/', views.getStatutoryCustomFields,
         name='/api/account/getStatutoryCustomFields'),
    path('addStatutoryCustomField/', views.addStatutoryCustomField,
         name='/api/account/addStatutoryCustomField'),
    path('updateStatutoryCustomField/', views.updateStatutoryCustomField,
         name='/api/account/updateStatutoryCustomField'),
    path('deleteStatutoryCustomField/', views.deleteStatutoryCustomField,
         name='/api/account/deleteStatutoryCustomField'),
    path('getAllCompanies/', views.getAllCompanies,
         name='/api/account/getAllCompanies'),
    path('sendRegistrationInvite/', views.sendRegistrationInvite,
         name='/api/account/sendRegistrationInvite'),
    path('approveCompany/', views.approveCompany,
         name='/api/account/approveCompany'),
    path('delistCompany/', views.delistCompany,
         name='/api/account/delistCompany'),
    path('getAllCurrentCompanies/', views.getAllCurrentCompanies,
         name='/api/account/getAllCurrentCompanies'),

    path('companyActivation/', views.companyActivation,
         name='/api/account/companyActivation'),
     path('autoCompanyApproval/', views.autoCompanyApproval,
         name='/api/account/autoCompanyApproval'),


    path('emailVerify/', views.emailVerify, name='/api/account/emailVerify'),
    path('check_mail_with_username/', views.check_mail_with_username,
         name='/api/account/check_mail_with_username'),
    path('resetForgotPassword/', views.resetForgotPassword,
         name='/api/account/resetForgotPassword'),
    path('updateCompanyActivationStatus/', views.updateCompanyActivationStatus,  # type: ignore
         name='/api/account/updateCompanyActivationStatus'),
    path('updateUserConfig/', views.updateUserConfig,
         name='/api/account/updateUserConfig'),
    path('updateTableConfig/', views.updateTableConfig,
         name='/api/account/updateTableConfig'),
    path('getTableConfig/', views.getTableConfig,
         name='/api/account/getTableConfig'),

    path('media/<str:file>/', views.secure, name='/api/account/secure'),
    path('getThumbnailImageURL/<str:file>/',
         views.getThumbnailImageURL, name='/api/account/getThumbnailImageURL'),
    path('getOriginalFile/<int:file_id>/',
         views.getOriginalFile, name='/api/account/getOriginalFile'),

    path('get_git_branch/', views.getGitBranch,
         name='/api/account/getGitBranch'),
    path('getAllLocations/', views.getAllLocations,
         name='/api/account/getAllLocations'),
    path('getAllApps/', views.getAllApps, name='/api/account/getAllApps'),
    path('getAppAccessMatrix/<access_for>/<id>/', views.getAppAccessMatrix,
         name='/api/account/getAppAccessMatrix'),
    path('updateAppAccessControl/', views.updateAppAccessControl,
         name='/api/account/updateAppAccessControl'),
    path('updateGroupUsers/', views.updateGroupUsers,
         name='/api/account/updateGroupUsers'),
    path('getUserPermissions/<int:user_id>',
         views.getUserPermissions, name='/api/account/getUserPermissions'),
    path('updateUserRightPermissions', views.updateUserRightPermissions,
         name='/api/account/updateUserRightPermissions'),
    path('saveWebURLsIntoDB', views.saveWebURLsIntoDB,
         name='/api/account/saveWebURLsIntoDB'),
    path('getWebUrls/<access_for>/<id>/<with_group>/',
         views.getWebUrls, name='/api/account/getWebUrls'),
    path('getWebUrlsForTest/',
         views.getWebUrlsForTest, name='/api/account/getWebUrlsForTest'),
    path('updateAccessControl/', views.updateAccessControl,
         name='/api/account/updateAccessControl'),
             path('giveDefaultPermission/', views.giveDefaultPermission,
         name='/api/account/giveDefaultPermission'),

         
    path('getAccessPermissionDetails/', views.getAccessPermissionDetails,
         name='/api/account/getAccessPermissionDetails'),
    path('resetUserPassword/', views.resetUserPassword,
         name='/api/account/resetUserPassword'),

    path('getAllActiveCompanyUser/', views.getAllActiveCompanyUser,
         name='/api/account/getAllActiveCompanyUser'),

    path('getAllActiveCompanyUserWithPermissionDetails/', views.getAllActiveCompanyUserWithPermissionDetails,
         name='/api/account/getAllActiveCompanyUserWithPermissionDetails'),

    path('createOrUpdateUserGroup/', views.createOrUpdateUserGroup,
         name='/api/account/createOrUpdateUserGroup'),

    path('giveDefaultAccess/', views.giveDefaultAccess,
         name='/api/account/giveDefaultAccess'),

        path('isInAdminGroup/<id>/<user_id>/', views.isInAdminGroup,
         name='/api/asset_api/isInAdminGroup'),
                path('isGoogleUser/<email>/', views.isGoogleUser,
         name='/api/asset_api/isGoogleUser'),
        
    path('getAllAccessControlledGroups/', views.getAllAccessControlledGroups,
         name='/api/account/getAllAccessControlledGroups'),

    path('getAccessDetails/<access_for>/<id>/', views.getAccessDetails,
         name='/api/account/getAccessDetails'),

    path('getGroupDetails/<id>/', views.getGroupDetails,
         name='/api/asset_api/getGroupDetails'),

    path('getUsersImage/', views.getUsersImage,
         name='/api/account/getUsersImage'),

    path('check_subscription/', views.check_subscription,
         name='/api/account/check_subscription'),

    path('getUrlConfigDetails', views.getUrlConfigDetails,
         name='/api/account/getUrlConfigDetails'),

    path('get_customized_home_page/', views.get_customized_home_page,
         name='/api/account/get_customized_home_page'),

    path('getCompanyDeactivationAlert/<time_offset_minute>/', views.getCompanyDeactivationAlert,
         name='/api/account/getCompanyDeactivationAlert'),

    path('companiesUsageDetails/', views.CompaniesUsageDetails.as_view(),
         name='/api/account/CompaniesUsageDetails'),

     path('getCompanyUsageDetails/<id>/', views.getCompanyUsageDetails, name='getCompanyUsageDetails'),

     path('auth/google/', views.google_login, name='google-login'),
     path('checkEmailAlreadyExist', views.checkEmailAlreadyExist, name='checkEmailAlreadyExist'),

     path('send_team_invitaion', views.send_team_invitaion, name='send_team_invitaion'),
     path('update_invited_user', views.update_invited_user, name='update_invited_user'),
     path('updatedSubIdInUserData', views.updatedSubIdInUserData, name='updatedSubIdInUserData'),
     
      path('deletecompanies/<int:id>/', views.delete_company_and_user, name='company-delete'),

         path(
      'companiesmemusage/<int:id>/db-usage/',
      views.CompanyDbUsageAPIView.as_view(),
      name='company-db-usage'
    ),
path('update-disclaimer/', views.UpdateDisclaimerView.as_view(), name='update-disclaimer'),
path('analytics/', views.activity_summary, name='activity_json'),
path('admin_check/', views.admin_check, name='admin_check'),
path('company_total_usage/<int:id>/', views.company_total_usage, name='company_total_usage'),
path('organization_total_usage/<int:id>/', views.organization_total_usage, name='organization_total_usage'),
path("get_companies/", views.get_companies, name="get_companies"),



]
