from django.urls import path
from .views import AddMemberView, SpaceDetailView, SpaceListCreateView

urlpatterns = [
    path("", SpaceListCreateView.as_view()),
    path("<uuid:space_id>/", SpaceDetailView.as_view()),
    path("<uuid:space_id>/members/", AddMemberView.as_view()),
]
