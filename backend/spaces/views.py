from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Membership, SharedSpace
from .serializers import SpaceSerializer

User = get_user_model()

def user_space(space_id, user):
    return get_object_or_404(
        SharedSpace,
        id=space_id,
        memberships__user=user,
    )

class SpaceListCreateView(APIView):
    def get(self, request):
        spaces = SharedSpace.objects.filter(
            memberships__user=request.user
        ).distinct()
        return Response(SpaceSerializer(spaces, many=True).data)

    def post(self, request):
        name = str(request.data.get("name", "")).strip()
        description = str(request.data.get("description", "")).strip()

        if not name:
            return Response(
                {"detail": "Name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        space = SharedSpace.objects.create(
            name=name,
            description=description,
            created_by=request.user,
        )
        Membership.objects.create(
            user=request.user,
            space=space,
            role=Membership.Role.OWNER,
        )
        return Response(
            SpaceSerializer(space).data,
            status=status.HTTP_201_CREATED,
        )

class SpaceDetailView(APIView):
    def get(self, request, space_id):
        return Response(SpaceSerializer(user_space(space_id, request.user)).data)

class AddMemberView(APIView):
    def post(self, request, space_id):
        space = user_space(space_id, request.user)
        membership = get_object_or_404(
            Membership, space=space, user=request.user
        )
        if membership.role not in [Membership.Role.OWNER, Membership.Role.ADMIN]:
            return Response({"detail": "Permission denied."}, status=403)

        email = str(request.data.get("email", "")).lower().strip()
        user = get_object_or_404(User, email=email)

        member, created = Membership.objects.get_or_create(
            user=user,
            space=space,
            defaults={"role": Membership.Role.MEMBER},
        )
        return Response(
            {"created": created, "user_id": str(user.id), "email": user.email}
        )
