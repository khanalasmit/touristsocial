import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import PostFeed from './components/feed/PostFeed'
import CreatePost from './components/feed/CreatePost'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import MapGeo from './components/explore/MapGeo'
import EditProfile from './components/profile/EditProfile'
import ChatList from './components/chat/ChatList'
import ChatRoom from './components/chat/ChatRoom'
import './App.css'

import ProtectedRoute from './components/common/ProtectedRoute'
import GuestRoute from './components/common/GuestRoute'
import Home from './components/common/Home'

function FeedPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <div className="app-page">
      <div className="container-main app-page__container">
        <div className="app-page__header">
          <h2 className="app-page__title">Travel Feed</h2>
          <button
            className="ts-btn ts-btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <i className="bi bi-plus-lg"></i> Post Experience
          </button>
        </div>
        <PostFeed refreshKey={refreshKey} />
        <CreatePost
          show={showCreate}
          onHide={() => setShowCreate(false)}
          onCreated={() => setRefreshKey((prev) => prev + 1)}
        />
      </div>
    </div>
  )
}

function ExplorePage() {
  return (
    <div className="app-page">
      <div className="container-main app-page__container">
        <div className="glass-panel app-explore-panel">
          <p className="app-muted-copy">
            Discover nearby tourists — click a marker to start a chat!
          </p>
          <MapGeo />
        </div>
      </div>
    </div>
  )
}

function ChatListPage() {
  return (
    <div className="app-page">
      <div className="container-main app-page__container">
        <h2 className="app-page__title">Messages</h2>
        <ChatList />
      </div>
    </div>
  )
}

function ChatRoomPage() {
  return <ChatRoom />
}

function EditProfilePage() {
  return (
    <div className="app-page">
      <div className="container-main app-page__container">
        <h2 className="app-page__title">Edit Profile</h2>
        <EditProfile />
      </div>
    </div>
  )
}

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatListPage /></ProtectedRoute>} />
          <Route path="/chat/:roomId" element={<ProtectedRoute><ChatRoomPage /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        </Routes>
      </main>
    </>
  )
}

export default App
