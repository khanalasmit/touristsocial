"""
Models for the Tourist Social application.

Covers: User profiles, posts, locations, chat rooms, and messages.
Authentication models are excluded for now — we use Django's built-in User.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

# Enforce unique email on the built-in User model natively
User = get_user_model()
User._meta.get_field('email')._unique = True


class TouristProfile(models.Model):
    """
    Extended profile for each tourist user.
    Linked one-to-one with Django's built-in User model.
    """

    TRAVEL_STYLE_CHOICES = [
        ('adventure', 'Adventure Traveler'),
        ('cultural', 'Cultural Explorer'),
        ('food', 'Food Enthusiast'),
        ('backpacker', 'Backpacker'),
        ('luxury', 'Luxury Traveler'),
        ('solo', 'Solo Traveler'),
        ('family', 'Family Traveler'),
    ]

    BUDGET_CHOICES = [
        ('budget', 'Budget'),
        ('mid', 'Mid-range'),
        ('luxury', 'Luxury'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    bio = models.TextField(blank=True, default='')
    profile_picture = models.ImageField(
        upload_to='profile_pics/',
        blank=True,
        null=True,
    )
    travel_interests = models.JSONField(
        default=list,
        blank=True,
        help_text='List of travel interest tags, e.g. ["hiking", "museums"]',
    )
    travel_style = models.CharField(
        max_length=20,
        choices=TRAVEL_STYLE_CHOICES,
        blank=True,
        default='',
    )
    budget_category = models.CharField(
        max_length=10,
        choices=BUDGET_CHOICES,
        blank=True,
        default='',
    )
    last_seen = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp of last API activity, used to determine online status.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile({self.user.username})"


class Post(models.Model):
    """
    Experience-sharing feed post.
    Tourists can share photos, reviews, travel stories, and place ratings.
    """

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts',
    )
    content = models.TextField()
    image = models.ImageField(
        upload_to='post_images/',
        blank=True,
        null=True,
    )
    place_name = models.CharField(max_length=200, blank=True, default='')
    rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text='Place rating from 1 to 5',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Post by {self.author.username} at {self.created_at:%Y-%m-%d %H:%M}"


class UserLocation(models.Model):
    """
    Stores the latest known location for a user.
    Used for nearby-tourist discovery and map features.
    One record per user (upserted on each update).
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='location',
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    is_sharing = models.BooleanField(
        default=True,
        help_text='Whether the user is actively sharing their location',
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Location({self.user.username}: {self.latitude}, {self.longitude})"


class ChatRoom(models.Model):
    """
    A chat room between two or more tourists.
    Supports both 1-to-1 and group conversations.
    """

    ROOM_TYPE_CHOICES = [
        ('direct', 'Direct Message'),
        ('group', 'Group Chat'),
    ]

    name = models.CharField(max_length=100, blank=True, default='')
    room_type = models.CharField(
        max_length=10,
        choices=ROOM_TYPE_CHOICES,
        default='direct',
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='chat_rooms',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ChatRoom({self.name or self.id} — {self.room_type})"


class Message(models.Model):
    """
    A single message inside a chat room.
    """

    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message({self.sender.username} in room {self.room_id})"


class LocationSharePermission(models.Model):
    """
    Tracks whether a user (granter) has allowed another user (grantee)
    to view their exact location.
    """

    granter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='granted_location_permissions',
    )
    grantee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_location_permissions',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('granter', 'grantee')

    def __str__(self):
        return f"LocationPermission({self.granter.username} -> {self.grantee.username})"



# ──────────────────────────────────────────────
# Signals for Profile Creation
# ──────────────────────────────────────────────
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a TouristProfile when a new User is created."""
    if created:
        TouristProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def save_user_profile(sender, instance, **kwargs):
    """Save the profile when the User object is saved."""
    try:
        instance.profile.save()
    except Exception:
        pass


