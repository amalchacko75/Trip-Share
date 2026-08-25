import hashlib
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from spaces.models import SharedSpace
from .models import SharedAsset
from .serializers import SharedAssetSerializer

class AssetListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get_space(self, request, space_id):
        return get_object_or_404(
            SharedSpace,
            id=space_id,
            memberships__user=request.user,
        )

    def get(self, request, space_id):
        space = self.get_space(request, space_id)
        assets = space.assets.select_related("owner").order_by("-created_at")
        return Response(
            SharedAssetSerializer(
                assets, many=True, context={"request": request}
            ).data
        )

    def post(self, request, space_id):
        space = self.get_space(request, space_id)

        thumbnail = request.FILES.get("thumbnail")
        filename = str(request.data.get("original_filename", "")).strip()
        mime_type = str(request.data.get("mime_type", "")).strip()
        size_bytes = int(request.data.get("size_bytes", 0))
        checksum = str(request.data.get("checksum", "")).strip()
        width = request.data.get("width") or None
        height = request.data.get("height") or None

        if not filename or not mime_type or size_bytes <= 0:
            return Response(
                {"detail": "filename, mime_type and size_bytes are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset = SharedAsset.objects.create(
            space=space,
            owner=request.user,
            original_filename=filename,
            mime_type=mime_type,
            size_bytes=size_bytes,
            checksum=checksum,
            width=width,
            height=height,
            thumbnail=thumbnail,
            source_mode=SharedAsset.SourceMode.LOCAL,
        )

        return Response(
            SharedAssetSerializer(
                asset, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )
