"""
DRF Serializers for Tourist Social.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from .models import TouristProfile, Post, UserLocation, ChatRoom, Message

User = get_user_model()


# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    bio = serializers.CharField(allow_blank=True, required=False)
    travel_style = serializers.CharField(allow_blank=True, required=False)
    budget_category = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = User
        fields = ("username", "email", "password", "profile_picture", "bio", "travel_style", "budget_category")

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        profile = user.profile
        profile.bio = validated_data.get("bio", "")
        profile.travel_style = validated_data.get("travel_style", "")
        profile.budget_category = validated_data.get("budget_category", "")
        profile.profile_picture = validated_data.get("profile_picture")
        profile.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        # Look up the user by email, then authenticate with their username
        try:
            user_obj = User.objects.get(email=attrs["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials.")

        user = authenticate(
            request=self.context.get("request"),
            username=user_obj.username,
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        attrs["user"] = user
        return attrs


# ──────────────────────────────────────────────
# Profile
# ──────────────────────────────────────────────

class TouristProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = TouristProfile
        fields = [
            "id", "user_id", "username", "email",
            "bio", "profile_picture",
            "travel_interests", "travel_style", "budget_category",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user_id", "created_at", "updated_at"]



class UserMinimalSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "profile_picture"]

    def get_profile_picture(self, obj):
        try:
            pic = obj.profile.profile_picture
            if pic:
                url = pic.url
                return url
        except Exception:
            pass
        return None


class UserSearchSerializer(serializers.ModelSerializer):
    """For the user-search endpoint."""
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "profile_picture"]

    def get_profile_picture(self, obj):
        try:
            pic = obj.profile.profile_picture
            if pic:
                url = pic.url
                return url
        except Exception:
            pass
        return None


# ──────────────────────────────────────────────
# Posts
# ──────────────────────────────────────────────

class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ["id", "content", "image", "place_name", "rating"]
        read_only_fields = ["id"]

    def validate_rating(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class PostSerializer(serializers.ModelSerializer):
    author = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Post
        fields = ["id", "author", "content", "image", "place_name", "rating", "created_at", "updated_at"]
        read_only_fields = fields


# ──────────────────────────────────────────────
# Location
# ──────────────────────────────────────────────

class LocationUpdateSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    is_sharing = serializers.BooleanField(default=True)


class UserLocationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = UserLocation
        fields = ["user_id", "username", "profile_picture", "latitude", "longitude", "is_sharing", "updated_at"]
        read_only_fields = fields

    def get_profile_picture(self, obj):
        try:
            pic = obj.user.profile.profile_picture
            if pic:
                url = pic.url
                return url
        except Exception:
            pass
        return None


# ──────────────────────────────────────────────
# Chat
# ──────────────────────────────────────────────

class MessageSerializer(serializers.ModelSerializer):
    sender = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "content", "created_at"]
        read_only_fields = fields


class ChatRoomSerializer(serializers.ModelSerializer):
    members = UserMinimalSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ["id", "name", "room_type", "members", "other_user", "last_message", "created_at"]
        read_only_fields = fields

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        return MessageSerializer(msg).data if msg else None

    def get_other_user(self, obj):
        """For direct rooms: return the other member's info."""
        request = self.context.get("request")
        if request and obj.room_type == "direct":
            other = obj.members.exclude(id=request.user.id).first()
            if other:
                return UserMinimalSerializer(other).data
        return None
