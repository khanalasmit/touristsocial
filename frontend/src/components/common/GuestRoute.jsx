import { Navigate, useLocation } from 'react-router-dom';

/**
 * GuestRoute — only accessible when NOT logged in.
 * Redirects authenticated users to the page they came from, or /feed.
 */
export default function GuestRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  const location = useLocation();

  if (token) {
    const destination = location.state?.from?.pathname || '/feed';
    return <Navigate to={destination} replace />;
  }

  return children;
}
