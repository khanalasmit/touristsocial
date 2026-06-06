import { useNavigate } from 'react-router-dom';
import heroImg from '../../assets/hero-image.png';
import './Home.css';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('accessToken')
  )
  const [profile, setProfile] = useState(() => {
    const raw = localStorage.getItem('authProfile');
    return raw ? JSON.parse(raw) : null;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
    <div className="home-wrapper">
      <section className="home-hero">
        <div className="home-hero__bg">
          <img src={heroImg} alt="Tourist Social" className="home-hero__img" />
          <div className="home-hero__overlay"></div>
        </div>
        <div className="home-hero__content">
          <h1 className="home-hero__title">Discover the World,<br />Together.</h1>
          <p className="home-hero__subtitle">
            Connect with travelers around the globe in real-time. Share your experiences, discover nearby explorers, and make unforgettable memories.
          </p>
          {
            isAuthenticated && (
              <div className="home-hero__actions">
                <button className="ts-btn ts-btn-primary home-btn-large" onClick={() => navigate('/feed')}>
                  Start Exploring
                </button>
                <button className="ts-btn ts-btn-secondary home-btn-large" onClick={() => handleLogout()}>
                  Logout
                </button>
              </div>
            )
          }
          {
            !isAuthenticated && (<div className="home-hero__actions">
              <button className="ts-btn ts-btn-primary home-btn-large" onClick={() => navigate('/register')}>
                Start Exploring
              </button>
              <button className="ts-btn ts-btn-secondary home-btn-large" onClick={() => navigate('/login')}>
                Log In
              </button>
            </div>)}
        </div>
      </section>

      <section className="home-features">
        <div className="feature-card">
          <div className="feature-card__icon">📸</div>
          <h3>Share Experiences</h3>
          <p>Post photos and stories from your travels and get inspired by a global community.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card__icon">🗺️</div>
          <h3>Find Tourists Nearby</h3>
          <p>Use the interactive map to discover and connect with other travelers right around the corner.</p>
        </div>
        <div className="feature-card">
          <div className="feature-card__icon">💬</div>
          <h3>Real-time Chat</h3>
          <p>Instantly message new friends, plan meetups, and share tips on the go.</p>
        </div>
      </section>
    </div>
  );
}
