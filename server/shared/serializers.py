from rest_framework import serializers
from . models import Compartment, Location, SubLocation


class LocationSerializer(serializers.ModelSerializer):    
    class Meta:
        model = Location
        fields = '__all__'


class SubLocationSerializer(serializers.ModelSerializer):    
    class Meta:
        model = SubLocation
        fields = '__all__'


class CompartmentSerializer(serializers.ModelSerializer):    
    class Meta:
        model = Compartment
        fields = '__all__'