/**
 * ChatList — shows all chat rooms + user search to start a new DM.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './ChatList.css';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Avatar({ user, size = 38 }) {
  if (user?.profile_picture) {
    return (
      <img
        src={user.profile_picture}
        alt={user.username}
        className="chat-avatar chat-avatar--img"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className="chat-avatar chat-avatar--letter" style={{ width: size, height: size }}>
      {(user?.username?.[0] || '?').toUpperCase()}
    </div>
  );
}

export default function ChatList() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [startingChat, setStartingChat] = useState(null);

  // Load rooms
  useEffect(() => {
    api.get('/chat/rooms/')
      .then((r) => setRooms(r.data))
      .catch(console.error)
      .finally(() => setLoadingRooms(false));
  }, []);

  // Debounced user search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api.get('/users/search/', { params: { q: searchQuery } })
        .then((r) => setSearchResults(r.data.results || []))
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const openRoom = async (userId) => {
    setStartingChat(userId);
    try {
      const res = await api.post('/chat/rooms/', {
        member_ids: [userId],
        room_type: 'direct',
      });
      navigate(`/chat/${res.data.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <div className="chat-list-page">
      {/* Search bar */}
      <div className="chat-list__search-wrap">
        <input
          className="chat-list__search-input"
          type="text"
          placeholder="Search people to chat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searching && <span className="chat-list__search-spinner" />}

        {searchResults.length > 0 && (
          <div className="chat-list__search-dropdown">
            {searchResults.map((user) => (
              <button
                key={user.id}
                className="chat-list__search-item"
                onClick={() => { setSearchQuery(''); setSearchResults([]); openRoom(user.id); }}
                disabled={startingChat === user.id}
              >
                <Avatar user={user} size={32} />
                <span className="chat-list__search-name">{user.username}</span>
                {startingChat === user.id && <span className="chat-list__search-spinner" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Room list */}
      <div className="chat-list__rooms">
        <h3 className="chat-list__section-title">Conversations</h3>

        {loadingRooms && (
          <div className="chat-list__empty">Loading conversations...</div>
        )}

        {!loadingRooms && rooms.length === 0 && (
          <div className="chat-list__empty">
            No conversations yet. Find nearby people on the Explore map!
          </div>
        )}

        {rooms.map((room) => {
          const other = room.other_user;
          const displayName = room.room_type === 'direct' && other
            ? other.username
            : room.name || `Group (${room.members.length})`;
          const lastMsg = room.last_message;

          return (
            <button
              key={room.id}
              className="chat-list__room-item"
              onClick={() => navigate(`/chat/${room.id}`)}
            >
              <Avatar user={other || { username: displayName }} size={44} />
              <div className="chat-list__room-info">
                <div className="chat-list__room-name">{displayName}</div>
                {lastMsg && (
                  <div className="chat-list__room-preview">
                    <span className="chat-list__room-sender">
                      {lastMsg.sender?.username}:&nbsp;
                    </span>
                    {lastMsg.content.length > 50
                      ? lastMsg.content.slice(0, 50) + '…'
                      : lastMsg.content}
                  </div>
                )}
                {!lastMsg && (
                  <div className="chat-list__room-preview chat-list__room-preview--empty">
                    No messages yet
                  </div>
                )}
              </div>
              {lastMsg && (
                <div className="chat-list__room-time">
                  {timeAgo(lastMsg.created_at)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
