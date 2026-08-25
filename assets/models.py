import uuid
from django.conf import settings
from django.db import models
from spaces.models import SharedSpace

class SharedAsset(models.Model):
    class SourceMode(models.TextChoices):
        LOCAL = "LOCAL", "Local device"
        ONLINE = "ONLINE", "Online copy"
        P2P = "P2P", "Peer to peer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        SharedSpace, on_delete=models.CASCADE, related_name="assets"
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shared_assets",
    )

    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=150)
    size_bytes = models.BigIntegerField()
    checksum = models.CharField(max_length=64, blank=True)

    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)

    # Development-only server copy of the thumbnail.
    thumbnail = models.ImageField(
        upload_to="thumbnails/",
        null=True,
        blank=True,
    )

    source_mode = models.CharField(
        max_length=20,
        choices=SourceMode.choices,
        default=SourceMode.LOCAL,
    )

    created_at = models.DateTimeField(auto_now_add=True)
