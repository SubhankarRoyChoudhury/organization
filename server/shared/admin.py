from shared.models import AutoSuggestionModule,  LocationDesignationRate, MailFrequency, Attachment, ChartConfig, ErrorMessageList, Location, SubLocation
from django.contrib import admin

# Register your models here.
admin.site.register(MailFrequency)
admin.site.register(ChartConfig)

class LocationAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'company',
        'name',
        'address',
        'city',
        'state',
        'country',
        'pin',
        'note',
        'lat',
        'lng',
        'created_by',
        'created_on'
    ]


admin.site.register(Location, LocationAdmin)


class SubLocationAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'company',
        'location',
        'name',
        'note',
        'created_by',
        'created_on',
        'delist'
    ]


admin.site.register(SubLocation, SubLocationAdmin)





class LocationDesignationRateAdmin(admin.ModelAdmin):
    list_display = [
        'id',  
        'company_id', 
        'location', 
        'designation', 
        'designation_code',
        'start_date', 
        'basic_rate', 
        'allowance',
        'incentive', 
        'gross_monthly_rate', 
        'ot_rate', 
        'note',
        'salary_type', 
        'created_by', 
        'created_on', 
        'updated_by', 
        'updated_on'
        ]

    search_fields = [
        'id',  
        'company_id', 
        'location', 
        'designation', 
        'start_date', 
        'basic_rate', 
        'allowance',
        'incentive', 
        'gross_monthly_rate', 
        'ot_rate', 
        'note',
        'salary_type', 
        'created_by', 
        'created_on', 
        'updated_by', 
        'updated_on'
        ]
    list_filter=[
        'company_id', 
    ]


admin.site.register(LocationDesignationRate, LocationDesignationRateAdmin)




class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['id',  'company_id', 'name', 'type',
                    'url', 'thumbnail', 'uploaded_by', 'uploaded_on']

    list_filter = ['company_id']
admin.site.register(Attachment, AttachmentAdmin)


class ErrorMessageListAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'type',
        'msg',
    ]


admin.site.register(ErrorMessageList, ErrorMessageListAdmin)


class AutoSuggestionModuleAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'type',
        'src',
        'notes'
    ]


admin.site.register(AutoSuggestionModule, AutoSuggestionModuleAdmin)
