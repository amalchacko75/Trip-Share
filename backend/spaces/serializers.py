from rest_framework import serializers
from .models import Membership, SharedSpace

class MemberSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    display_name = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user_id", "email", "display_name", "role", "joined_at"]

class SpaceSerializer(serializers.ModelSerializer):
    created_by = serializers.UUIDField(source="created_by.id", read_only=True)
    members = serializers.SerializerMethodField()

    class Meta:
        model = SharedSpace
        fields = ["id", "name", "description", "created_by", "members", "created_at"]

    def get_members(self, obj):
        return MemberSerializer(
            obj.memberships.select_related("user"), many=True
        ).data
