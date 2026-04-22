# serializers.py
from rest_framework import serializers
from .models import Companies, CompanyUser

class AgreeDisclaimerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyUser
        fields = ['id', 'disclaimer']





class CompaniesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Companies
        fields = "__all__"
