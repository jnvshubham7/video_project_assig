import { useNavigate, useLocation } from 'react-router-dom';
import { clearAuthToken, getAuthToken } from '../services/authService';
import { useState, useEffect } from 'react';
import './Header.css';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(() => !!getAuthToken());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = getAuthToken();
    setAuthenticated(!!token);
    
    // Get user from localStorage if available
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, [location]);

  // Listen to storage changes for real-time updates
  useEffect(() => {
    const handleStorageChange = () => {
      const token = getAuthToken();
      setAuthenticated(!!token);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem('user');
    setAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo" onClick={handleLogoClick}>
          <h1>🎬 Video Platform</h1>
        </div>
        
        <nav className="nav">
          {authenticated ? (
            <div className="nav-authenticated">
              <a href="/" className="nav-item">Home</a>
              <a href="/videos" className="nav-item">All Videos</a>
              <a href="/my-videos" className="nav-item">My Videos</a>
              <a href="/upload" className="nav-item upload-link">+ Upload</a>
              <span className="user-info">👤 {user?.username || 'User'}</span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          ) : (
            <div className="nav-links">
              <a href="/login" className="nav-link">Login</a>
              <a href="/register" className="nav-link register-link">Register</a>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
