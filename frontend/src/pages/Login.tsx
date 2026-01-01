import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, setAuthToken } from '../services/authService';
import socketService from '../services/socketService';
import '../styles/Auth.css';

export function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.identifier.trim()) {
      setError('Username or email is required');
      return false;
    }

    // If user entered an email, validate its format; otherwise require a short username
    const value = formData.identifier.trim();
    if (value.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setError('Please enter a valid email address');
        return false;
      }
    } else {
      if (value.length < 3) {
        setError('Username must be at least 3 characters');
        return false;
      }
    }

    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(formData.identifier, formData.password);
      const { setOrganization, setOrganizations } = await import('../services/authService');
      
      setAuthToken(response.data.token);
      setOrganization(response.data.currentOrganization);
      setOrganizations(response.data.organizations);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Initialize Socket.io connection for real-time updates
      try {
        socketService.connect(response.data.currentOrganization.id);
      } catch (socketError) {
        console.error('Failed to initialize socket connection:', socketError);
      }
      
      // Redirect to home after login
      navigate('/', { replace: true });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username or Email</label>
            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="Username or you@example.com"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <a href="/register">Register here</a>
        </p>
      </div>
    </div>
  );
}
