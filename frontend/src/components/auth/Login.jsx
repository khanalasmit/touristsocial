import { useState } from 'react';
import api from '../../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import LoadingSpinner from '../common/LoadingSpinner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login/', { email, password });

      const { access, refresh, profile } = response.data;

      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('isAuthenticated', 'true');

      if (profile) {
        localStorage.setItem('authProfile', JSON.stringify(profile));
      }

      window.dispatchEvent(new Event('auth-change'));

      navigate('/feed');
    } catch (err) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="glass-panel login-card">
        <h2 className="login-card__title">Welcome Back</h2>

        {error && <div className="login-card__error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            className="ts-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="ts-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="ts-btn ts-btn-primary login-form__submit"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner" aria-label="Loading" />
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="login-card__footer">
          Don't have an account?{' '}
          <Link to="/register" className="login-card__link">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}