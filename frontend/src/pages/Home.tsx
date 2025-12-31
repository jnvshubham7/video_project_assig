import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../services/authService';
import '../styles/Home.css';

export function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(() => !!getAuthToken());

  useEffect(() => {
    // Check authentication whenever location changes or component mounts
    const token = getAuthToken();
    setAuthenticated(!!token);
  }, [location]);

  // Also listen to storage changes for real-time updates
  useEffect(() => {
    const handleStorageChange = () => {
      const token = getAuthToken();
      setAuthenticated(!!token);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!authenticated) {
    return (
      <div className="landing-page">
        <div className="landing-content">
          <div className="landing-hero">
            <h1>🎬 Welcome to Video Platform</h1>
            <p>Upload, manage, and share your videos with the world</p>
            
            <div className="landing-buttons">
              <button className="btn btn-primary" onClick={() => navigate('/register')}>
                Get Started
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
          </div>

          <div className="landing-features">
            <div className="feature">
              <div className="feature-icon">📤</div>
              <h3>Easy Upload</h3>
              <p>Upload videos up to 500MB with just a few clicks</p>
            </div>
            
            <div className="feature">
              <div className="feature-icon">🎥</div>
              <h3>Manage Videos</h3>
              <p>Organize and manage all your video files effortlessly</p>
            </div>
            
            <div className="feature">
              <div className="feature-icon">👥</div>
              <h3>Share & Stream</h3>
              <p>Share your videos with friends and stream in HD quality</p>
            </div>
            
            <div className="feature">
              <div className="feature-icon">📊</div>
              <h3>Analytics</h3>
              <p>Track video views and engagement metrics</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2>Welcome to your Dashboard</h2>
          <p>Upload and manage your videos</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-icon">📤</div>
            <h3>Upload Video</h3>
            <p>Add new videos to your library</p>
            <a href="/upload" className="card-btn">Upload Now</a>
          </div>
          
          <div className="dashboard-card">
            <div className="card-icon">📁</div>
            <h3>My Videos</h3>
            <p>View and manage your uploads</p>
            <a href="/my-videos" className="card-btn">View Videos</a>
          </div>
          
          <div className="dashboard-card">
            <div className="card-icon">🌍</div>
            <h3>Browse Videos</h3>
            <p>Discover videos from other users</p>
            <a href="/videos" className="card-btn">Browse</a>
          </div>
        </div>
      </div>
    </div>
  );
}
