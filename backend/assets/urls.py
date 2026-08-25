from django.urls import path
from .views import AssetListCreateView

urlpatterns = [
    path("spaces/<uuid:space_id>/", AssetListCreateView.as_view()),
]
