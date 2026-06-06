import { useState } from 'react';
import api from '../../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    bio: '',
    travel_style: '',
    budget_category: ''
  });
  const [error, setError] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });
      if (profilePhoto) {
        payload.append('profile_picture', profilePhoto);
      }

      const response = await api.post('/auth/register/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { access, refresh, profile } = response.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('isAuthenticated', 'true');
      if (profile) localStorage.setItem('authProfile', JSON.stringify(profile));
      window.dispatchEvent(new Event('auth-change'));
      navigate('/feed');
    } catch (err) {
      if (err.response?.data) {
        const firstError = Object.values(err.response.data)[0];
        setError(Array.isArray(firstError) ? firstError[0] : 'Registration failed');
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="glass-panel register-card">
        <h2 className="register-card__title">Join Tourist Social</h2>
        {error && <div className="register-card__error">{error}</div>}
        <form onSubmit={handleRegister} className="register-form">
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="ts-input"
            value={formData.username}
            onChange={handleChange}
            required
            minLength={3}
            maxLength={150}
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            className="ts-input"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="ts-input"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <textarea
            name="bio"
            placeholder="Tell us about yourself (Bio)"
            className="ts-input"
            value={formData.bio}
            onChange={handleChange}
            rows="3"
          />
          <select 
            name="travel_style" 
            className="ts-input" 
            value={formData.travel_style} 
            onChange={handleChange}
          >
            <option value="">Select Travel Style</option>
            <option value="adventure">Adventure Traveler</option>
            <option value="cultural">Cultural Explorer</option>
            <option value="food">Food Enthusiast</option>
            <option value="backpacker">Backpacker</option>
            <option value="luxury">Luxury Traveler</option>
            <option value="solo">Solo Traveler</option>
          </select>

          <div className="register-form__photo">
            <label className="register-form__photo-label" htmlFor="profile_photo">
              Profile Photo (optional)
            </label>
            <input
              id="profile_photo"
              type="file"
              accept="image/*"
              className="register-form__file-input"
              onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
            />
          </div>
          <select 
            name="budget_category" 
            className="ts-input" 
            value={formData.budget_category} 
            onChange={handleChange}
          >
            <option value="">Select Budget</option>
            <option value="budget">Budget</option>
            <option value="mid">Mid-range</option>
            <option value="luxury">Luxury</option>
          </select>
          
          <button 
            type="submit" 
            className="ts-btn ts-btn-primary register-form__submit"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner" aria-label="Loading" />
            ) : (
              'Register'
            )}
          </button>
        </form>
        <div className="register-card__footer">
          Already have an account? <Link to="/login" className="register-card__link">Login</Link>
        </div>
      </div>
    </div>
  );
}
