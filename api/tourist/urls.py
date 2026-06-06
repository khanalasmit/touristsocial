"""
URL routes for Tourist Social.
Mounted at /api/ from root urls.py.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Health
    path("health/", views.health_check, name="health-check"),

    # Auth — JWT
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Current user profile
    path("users/me/", views.CurrentUserProfileView.as_view(), name="users-me"),

    # User search
    path("users/search/", views.search_users, name="users-search"),

    # Posts
    path("posts/", views.PostCreateView.as_view(), name="post-create"),
    path("posts/feed/", views.PostFeedView.as_view(), name="post-feed"),

    # Location
    path("location/update/", views.update_location, name="location-update"),
    path("users/nearby/", views.nearby_users, name="users-nearby"),
    path("location/permissions/grant/", views.grant_location_permission, name="grant-location-permission"),
    path("location/permissions/revoke/", views.revoke_location_permission, name="revoke-location-permission"),
    path("location/permissions/status/", views.check_location_permission, name="check-location-permission"),

    # Chat REST
    path("chat/rooms/", views.ChatRoomListCreateView.as_view(), name="chat-rooms"),
    path("chat/rooms/<int:room_id>/messages/", views.ChatRoomMessagesView.as_view(), name="chat-messages"),
]
