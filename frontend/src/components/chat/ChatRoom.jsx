/**
 * ChatRoom — real-time message view using native WebSocket + JWT.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './ChatRoom.css';

function Avatar({ user, size = 32 }) {
  if (user?.profile_picture) {
    return (
      <img
        src={user.profile_picture}
        alt={user.username}
        className="cr-avatar cr-avatar--img"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className="cr-avatar cr-avatar--letter" style={{ width: size, height: size }}>
      {(user?.username?.[0] || '?').toUpperCase()}
    </div>
  );
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [room, setRoom] = useState(null);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const [hasGrantedLocation, setHasGrantedLocation] = useState(false);
  const [isTogglingLocation, setIsTogglingLocation] = useState(false);

  const myUserId = (() => {
    try {
      const p = JSON.parse(localStorage.getItem('authProfile') || '{}');
      return p.user_id;
    } catch { return null; }
  })();

  // Load room info + history
  useEffect(() => {
    // Get room details from room list
    api.get('/chat/rooms/').then((r) => {
      const found = r.data.find((rm) => rm.id === parseInt(roomId));
      setRoom(found || null);
    }).catch(console.error);

    api.get(`/chat/rooms/${roomId}/messages/`)
      .then((r) => setMessages(r.data.results || []))
      .catch((e) => {
        if (e.response?.status === 403) {
          setError('You are not a member of this room.');
        }
      });
  }, [roomId]);

  // Check location permission
  useEffect(() => {
    if (room?.other_user) {
      api.get(`/location/permissions/status/`, {
        params: { user_id: room.other_user.id }
      }).then(res => {
        setHasGrantedLocation(res.data.has_granted);
      }).catch(err => console.error("Failed to check location permission", err));
    }
  }, [room?.other_user]);

  const toggleLocationPermission = async () => {
    if (!room?.other_user) return;
    setIsTogglingLocation(true);
    try {
      if (hasGrantedLocation) {
        await api.post(`/location/permissions/revoke/`, { user_id: room.other_user.id });
        setHasGrantedLocation(false);
      } else {
        await api.post(`/location/permissions/grant/`, { user_id: room.other_user.id });
        setHasGrantedLocation(true);
      }
    } catch (err) {
      console.error("Failed to toggle location permission", err);
    } finally {
      setIsTogglingLocation(false);
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate('/login'); return; }

    let cancelled = false;

    // Determine WebSocket URL dynamically
    let wsUrl;
    if (import.meta.env.VITE_WS_BASE_URL) {
      wsUrl = `${import.meta.env.VITE_WS_BASE_URL}/chat/${roomId}/?token=${token}`;
    } else {
      // Fallback: Use Vite proxy or same-domain host
      const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      wsUrl = `${wsProto}://${window.location.host}/ws/chat/${roomId}/?token=${token}`;
    }
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) { ws.close(); return; }
      setConnected(true);
      setError('');
    };
    ws.onclose = (e) => {
      if (cancelled) return;
      setConnected(false);
      if (e.code === 4001) setError('Authentication failed. Please log in again.');
      else if (e.code === 4003) setError('You are not a member of this room.');
    };
    ws.onerror = () => {
      if (cancelled) return;
      // Only show error if not an intentional close
      if (ws.readyState !== WebSocket.CLOSED) {
        setError('WebSocket connection failed.');
      }
    };
    ws.onmessage = (e) => {
      if (cancelled) return;
      const data = JSON.parse(e.data);
      setMessages((prev) => [...prev, {
        id: data.message_id,
        sender: { id: data.sender_id, username: data.sender_username },
        content: data.content,
        created_at: data.created_at,
      }]);
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [roomId, navigate]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: text }));
    setInput('');
    inputRef.current?.focus();
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Room display name
  const roomTitle = (() => {
    if (!room) return `Room #${roomId}`;
    if (room.room_type === 'direct' && room.other_user) return room.other_user.username;
    return room.name || `Group (${room.members?.length ?? '?'})`;
  })();

  const otherUser = room?.other_user;

  return (
    <div className="chat-room">
      {/* Header */}
      <div className="chat-room__header">
        <button className="chat-room__back" onClick={() => navigate('/chat')} aria-label="Back">
          ‹
        </button>
        {otherUser && <Avatar user={otherUser} size={36} />}
        <div className="chat-room__header-info">
          <div className="chat-room__title">{roomTitle}</div>
          <div className={`chat-room__status ${connected ? 'chat-room__status--online' : ''}`}>
            {connected ? 'Connected' : 'Connecting…'}
          </div>
        </div>
        {otherUser && (
          <button
            onClick={toggleLocationPermission}
            disabled={isTogglingLocation}
            className={`chat-room__location-btn ${hasGrantedLocation ? 'chat-room__location-btn--granted' : ''}`}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              borderRadius: '20px',
              border: hasGrantedLocation ? '1px solid #34c759' : '1px solid #ff9500',
              background: hasGrantedLocation ? 'rgba(52,199,89,0.1)' : 'transparent',
              color: hasGrantedLocation ? '#34c759' : '#ff9500',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {isTogglingLocation ? 'Updating...' : hasGrantedLocation ? '📍 Location Shared' : '📍 Share Location'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && <div className="chat-room__error">{error}</div>}

      {/* Messages */}
      <div className="chat-room__messages">
        {messages.length === 0 && !error && (
          <div className="chat-room__empty">No messages yet. Say hello!</div>
        )}
        {messages.map((msg, idx) => {
          const isMine = msg.sender?.id === myUserId;
          const prevMsg = messages[idx - 1];
          const showSender = !isMine && msg.sender?.username !== prevMsg?.sender?.username;

          return (
            <div
              key={msg.id ?? `${msg.created_at}-${idx}`}
              className={`chat-room__msg ${isMine ? 'chat-room__msg--mine' : 'chat-room__msg--theirs'}`}
            >
              {showSender && (
                <span className="chat-room__msg-sender">{msg.sender?.username}</span>
              )}
              <div className="chat-room__bubble">
                {msg.content}
                <span className="chat-room__msg-time">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-room__input-bar">
        <textarea
          ref={inputRef}
          className="chat-room__input"
          placeholder="Type a message…"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!connected}
        />
        <button
          className="chat-room__send-btn"
          onClick={sendMessage}
          disabled={!connected || !input.trim()}
          aria-label="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
