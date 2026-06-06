/**
 * Top navigation bar — JWT-aware, fetches profile from API on auth.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './Navbar.css';

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('accessToken')
  );
  const [profile, setProfile] = useState(() => {
    const raw = localStorage.getItem('authProfile');
    return raw ? JSON.parse(raw) : null;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();

  const avatarLabel = useMemo(() => {
    if (profile?.username) return profile.username[0]?.toUpperCase();
    return 'U';
  }, [profile]);

  // Fetch fresh profile from API
  const refreshProfile = async () => {
    try {
      const res = await api.get('/users/me/');
      setProfile(res.data);
      localStorage.setItem('authProfile', JSON.stringify(res.data));
    } catch {
      setProfile(null);
    }
  };

  // Listen for login/logout events
  useEffect(() => {
    const handleAuthChange = () => {
      const authed = !!localStorage.getItem('accessToken');
      setIsAuthenticated(authed);
      if (authed) refreshProfile();
      else setProfile(null);
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  // Fetch profile on mount if already logged in
  useEffect(() => {
    if (isAuthenticated) refreshProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authProfile');
    setIsAuthenticated(false);
    setProfile(null);
    setIsProfileOpen(false);
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  return (
    <nav className="ts-navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <NavLink to="/" className="ts-navbar-brand">
          <span className="navbar-brand-icon">🌍</span>
          <span className="brand-text">Tourist Social</span>
        </NavLink>

        {/* Nav links */}
        <nav className="navbar-nav">
          {isAuthenticated && (
            <>
              <NavLink to="/feed" className="ts-nav-link">
                Feed
              </NavLink>
              <NavLink to="/explore" className="ts-nav-link">
                Explore
              </NavLink>
              <NavLink to="/chat" className="ts-nav-link">
                Chat
              </NavLink>
            </>
          )}
          {!isAuthenticated && (
            <>
              <NavLink to="/login" className="ts-nav-link">
                Login
              </NavLink>
              <NavLink to="/register" className="ts-nav-link">
                Register
              </NavLink>
            </>
          )}
        </nav>

        {/* Right actions — profile menu */}
        {isAuthenticated && (
          <div className="navbar-right">
            <div className="profile-menu" ref={profileMenuRef}>
              <button
                className="profile-menu__trigger"
                onClick={() => setIsProfileOpen((v) => !v)}
                aria-label="Open profile menu"
              >
                {profile?.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt="avatar"
                    className="profile-menu__avatar-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  avatarLabel
                )}
              </button>

              <div className={`profile-menu__dropdown ${isProfileOpen ? 'open' : ''}`}>
                <button
                  className="profile-menu__item"
                  onClick={() => { setIsProfileOpen(false); navigate('/profile/edit'); }}
                >
                  Edit Profile
                </button>
                <button
                  className="profile-menu__item profile-menu__item--logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
