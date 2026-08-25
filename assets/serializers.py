from rest_framework import serializers
from .models import SharedAsset

class SharedAssetSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(
        source="owner.display_name", read_only=True
    )
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = SharedAsset
        fields = [
            "id",
            "space",
            "owner",
            "owner_name",
            "original_filename",
            "mime_type",
            "size_bytes",
            "checksum",
            "width",
            "height",
            "thumbnail_url",
            "source_mode",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "thumbnail_url",
            "created_at",
        ]

    def get_thumbnail_url(self, obj):
        request = self.context.get("request")
        if not obj.thumbnail:
            return None
        url = obj.thumbnail.url
        return request.build_absolute_uri(url) if request else url
