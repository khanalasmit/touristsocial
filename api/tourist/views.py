"""
API Views for Tourist Social.

Auth:
  POST /auth/register/        — register + return JWT tokens
  POST /auth/login/           — login + return JWT tokens
  POST /auth/token/refresh/   — refresh access token (SimpleJWT built-in)
  GET  /users/me/             — current user profile
  PUT  /users/me/             — update profile

Posts:
  POST /posts/                — create post
  GET  /posts/feed/           — list all posts

Location:
  POST /location/update/      — upsert location
  GET  /users/nearby/         — nearby users

Users:
  GET  /users/search/?q=      — search users by username

Chat:
  GET  /chat/rooms/           — list user's rooms
  POST /chat/rooms/           — create/find direct room
  GET  /chat/rooms/<id>/messages/ — paginated message history
"""

import math

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from .models import Post, UserLocation, ChatRoom, Message, TouristProfile, LocationSharePermission
from .serializers import (
    PostCreateSerializer,
    PostSerializer,
    LocationUpdateSerializer,
    UserLocationSerializer,
    ChatRoomSerializer,
    MessageSerializer,
    RegisterSerializer,
    LoginSerializer,
    TouristProfileSerializer,
    UserSearchSerializer,
)

User = get_user_model()


# ──────────────────────────────────────────────
# JWT helpers
# ──────────────────────────────────────────────

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# ──────────────────────────────────────────────
# Authentication
# ──────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                "detail": "Registration successful.",
                **tokens,
                "profile": TouristProfileSerializer(user.profile).data,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            tokens = get_tokens_for_user(user)
            return Response({
                "detail": "Login successful.",
                **tokens,
                "profile": TouristProfileSerializer(user.profile).data,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(TouristProfileSerializer(request.user.profile).data)

    def put(self, request):
        serializer = TouristProfileSerializer(
            request.user.profile,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({"status": "healthy"})


# ──────────────────────────────────────────────
# Pagination
# ──────────────────────────────────────────────

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ──────────────────────────────────────────────
# Posts
# ──────────────────────────────────────────────

class PostCreateView(generics.CreateAPIView):
    serializer_class = PostCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        post = Post.objects.select_related("author").get(pk=serializer.instance.pk)
        return Response(PostSerializer(post).data, status=status.HTTP_201_CREATED)


class PostFeedView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPagination

    def get_queryset(self):
        return Post.objects.select_related("author").all()


# ──────────────────────────────────────────────
# Location
# ──────────────────────────────────────────────

NEARBY_RADIUS_KM = {"city": 5, "remote": 15}


def calculate_distance_km(lat1, lon1, lat2, lon2):
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def update_location(request):
    serializer = LocationUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    location, _ = UserLocation.objects.update_or_create(
        user=request.user,
        defaults=serializer.validated_data,
    )
    return Response(UserLocationSerializer(location).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def nearby_users(request):
    try:
        current_location = request.user.location
    except UserLocation.DoesNotExist:
        return Response(
            {"detail": "Update your location first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    context = request.query_params.get("context", "city").lower()
    if context not in NEARBY_RADIUS_KM:
        return Response({"detail": 'context must be "city" or "remote".'}, status=400)

    radius_km = NEARBY_RADIUS_KM[context]
    radius_param = request.query_params.get("radius")
    if radius_param:
        try:
            radius_km = float(radius_param)
        except ValueError:
            return Response({"detail": "radius must be a number."}, status=400)

    # Fetch permissions where granter is the nearby user and grantee is the current user
    permissions_granted = set(
        LocationSharePermission.objects.filter(grantee=request.user).values_list('granter_id', flat=True)
    )

    import hashlib
    def obfuscate_location(user_id, lat, lon):
        hash_val = int(hashlib.md5(str(user_id).encode()).hexdigest(), 16)
        offset_lat = ((hash_val % 4000) - 2000) / 100000.0  # -0.02 to 0.02
        offset_lon = (((hash_val // 4000) % 4000) - 2000) / 100000.0
        return lat + offset_lat, lon + offset_lon

    online_threshold = timezone.now() - timedelta(minutes=10)

    nearby = []
    for loc in UserLocation.objects.filter(
        is_sharing=True,
        user__profile__last_seen__gte=online_threshold,
    ).exclude(user=request.user).select_related("user", "user__profile"):
        dist = calculate_distance_km(
            current_location.latitude, current_location.longitude,
            loc.latitude, loc.longitude,
        )
        if dist <= radius_km:
            is_exact = loc.user_id in permissions_granted
            loc_data = UserLocationSerializer(loc).data
            
            if not is_exact:
                obs_lat, obs_lon = obfuscate_location(loc.user_id, loc.latitude, loc.longitude)
                loc_data["latitude"] = obs_lat
                loc_data["longitude"] = obs_lon
            
            loc_data["is_exact"] = is_exact
            nearby.append({**loc_data, "distance_km": round(dist, 2)})

    nearby.sort(key=lambda x: x["distance_km"])
    return Response({
        "context": context,
        "radius_km": radius_km,
        "origin": UserLocationSerializer(current_location).data,
        "results": nearby,
        "count": len(nearby),
    })

# ──────────────────────────────────────────────
# Location Permissions
# ──────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def grant_location_permission(request):
    target_user_id = request.data.get("user_id")
    if not target_user_id:
        return Response({"detail": "user_id is required."}, status=400)
    
    target_user = get_object_or_404(User, id=target_user_id)
    LocationSharePermission.objects.get_or_create(
        granter=request.user,
        grantee=target_user
    )
    return Response({"detail": "Location permission granted."})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def revoke_location_permission(request):
    target_user_id = request.data.get("user_id")
    if not target_user_id:
        return Response({"detail": "user_id is required."}, status=400)
    
    LocationSharePermission.objects.filter(
        granter=request.user,
        grantee_id=target_user_id
    ).delete()
    return Response({"detail": "Location permission revoked."})

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def check_location_permission(request):
    target_user_id = request.query_params.get("user_id")
    if not target_user_id:
        return Response({"detail": "user_id is required."}, status=400)
        
    has_granted = LocationSharePermission.objects.filter(
        granter=request.user,
        grantee_id=target_user_id
    ).exists()
    
    return Response({"has_granted": has_granted})


# ──────────────────────────────────────────────
# User Search
# ──────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def search_users(request):
    """GET /users/search/?q=<query> — search users by username/email."""
    q = request.query_params.get("q", "").strip()
    if len(q) < 2:
        return Response({"results": []})

    users = (
        User.objects
        .filter(username__icontains=q)
        .exclude(id=request.user.id)
        .select_related("profile")[:20]
    )
    return Response({"results": UserSearchSerializer(users, many=True).data})


# ──────────────────────────────────────────────
# Chat
# ──────────────────────────────────────────────

class ChatRoomListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """List all chat rooms the current user belongs to."""
        rooms = (
            ChatRoom.objects
            .filter(members=request.user)
            .prefetch_related("members", "messages")
            .order_by("-created_at")
        )
        return Response(ChatRoomSerializer(rooms, many=True, context={"request": request}).data)

    def post(self, request):
        """
        Create or retrieve a direct chat room with another user.
        Body: { member_ids: [<user_id>], room_type: 'direct'|'group', name: '' }
        For direct chats: if a room already exists between the two users, return it.
        """
        member_ids = request.data.get("member_ids", [])
        room_type = request.data.get("room_type", "direct")
        name = request.data.get("name", "")

        if not member_ids:
            return Response({"detail": "member_ids is required."}, status=400)

        # Validate all user IDs exist
        members = list(User.objects.filter(id__in=member_ids))
        if len(members) != len(member_ids):
            return Response({"detail": "One or more user IDs not found."}, status=400)

        all_member_ids = sorted(set(member_ids + [request.user.id]))

        # For direct messages, find existing room
        if room_type == "direct" and len(all_member_ids) == 2:
            existing = (
                ChatRoom.objects
                .filter(room_type="direct", members__id=all_member_ids[0])
                .filter(members__id=all_member_ids[1])
                .annotate_member_count()
                if hasattr(ChatRoom.objects, "annotate_member_count")
                else ChatRoom.objects.filter(room_type="direct", members__id=all_member_ids[0]).filter(members__id=all_member_ids[1])
            )
            # Find rooms with exactly these 2 members
            for room in existing:
                if set(room.members.values_list("id", flat=True)) == set(all_member_ids):
                    return Response(ChatRoomSerializer(room, context={"request": request}).data)

        # Create new room
        room = ChatRoom.objects.create(room_type=room_type, name=name)
        room.members.set(all_member_ids)
        return Response(
            ChatRoomSerializer(room, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ChatRoomMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_id):
        """GET paginated message history for a room."""
        room = get_object_or_404(ChatRoom, id=room_id)

        # Only members can read messages
        if not room.members.filter(id=request.user.id).exists():
            return Response({"detail": "Not a member of this room."}, status=403)

        messages = room.messages.select_related("sender").order_by("created_at")
        paginator = StandardPagination()
        page = paginator.paginate_queryset(messages, request)
        return paginator.get_paginated_response(MessageSerializer(page, many=True).data)
