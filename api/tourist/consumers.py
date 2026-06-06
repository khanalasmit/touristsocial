"""
WebSocket consumer for real-time chat.

Connection URL: ws://<host>/ws/chat/<room_id>/?token=<JWT_access_token>
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import ChatRoom, Message

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):

    # ──────────────────────────────────────────────
    # Connection lifecycle
    # ──────────────────────────────────────────────

    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.group_name = f"chat_{self.room_id}"

        # Authenticate via JWT in query string
        token_str = self._get_token_from_scope()
        user = await self._authenticate(token_str)
        if user is None:
            await self.close(code=4001)
            return

        # Verify user is a member of this room
        is_member = await self._is_member(user, self.room_id)
        if not is_member:
            await self.close(code=4003)
            return

        self.user = user

        # Join channel group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ──────────────────────────────────────────────
    # Receive message from WebSocket client
    # ──────────────────────────────────────────────

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        content = (data.get("content") or "").strip()
        if not content:
            return

        # Persist to DB
        message = await self._save_message(self.room_id, self.user, content)

        # Broadcast to group
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",
                "message_id": message.id,
                "sender_id": self.user.id,
                "sender_username": self.user.username,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
            },
        )

    # ──────────────────────────────────────────────
    # Receive broadcast from channel group → send to WebSocket
    # ──────────────────────────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "message_id": event["message_id"],
            "sender_id": event["sender_id"],
            "sender_username": event["sender_username"],
            "content": event["content"],
            "created_at": event["created_at"],
        }))

    # ──────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────

    def _get_token_from_scope(self):
        """Extract ?token=... from the WebSocket query string."""
        qs = self.scope.get("query_string", b"").decode()
        for part in qs.split("&"):
            if part.startswith("token="):
                return part[len("token="):]
        return None

    @database_sync_to_async
    def _authenticate(self, token_str):
        if not token_str:
            return None
        try:
            token = AccessToken(token_str)
            user_id = token["user_id"]
            return User.objects.get(id=user_id)
        except (InvalidToken, TokenError, User.DoesNotExist, Exception):
            return None

    @database_sync_to_async
    def _is_member(self, user, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
            return room.members.filter(id=user.id).exists()
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def _save_message(self, room_id, user, content):
        room = ChatRoom.objects.get(id=room_id)
        return Message.objects.create(room=room, sender=user, content=content)
