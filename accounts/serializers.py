from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "display_name"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "display_name", "password"]

    def create(self, validated_data):
        email = validated_data["email"].lower().strip()
        return User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
            display_name=validated_data.get("display_name", ""),
        )
