"""
Admin registration for Tourist Social models.
"""

from django.contrib import admin
from .models import TouristProfile, Post, UserLocation, ChatRoom, Message


@admin.register(TouristProfile)
class TouristProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'travel_style', 'budget_category', 'created_at']
    list_filter = ['travel_style', 'budget_category']
    search_fields = ['user__username']


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['author', 'place_name', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['author__username', 'content', 'place_name']


@admin.register(UserLocation)
class UserLocationAdmin(admin.ModelAdmin):
    list_display = ['user', 'latitude', 'longitude', 'is_sharing', 'updated_at']
    list_filter = ['is_sharing']


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'room_type', 'created_at']
    list_filter = ['room_type']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'room', 'created_at']
    list_filter = ['created_at']
    search_fields = ['sender__username', 'content']
