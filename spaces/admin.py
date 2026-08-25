from django.contrib import admin
from .models import Membership, SharedSpace

admin.site.register(SharedSpace)
admin.site.register(Membership)
