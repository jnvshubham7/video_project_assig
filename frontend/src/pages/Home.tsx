import './Home.css';
import { isAuthenticated } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function Home() {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();

  useEffect(() => {
    if (!authenticated) {
      navigate('/login');
    }
  }, [authenticated, navigate]);

  if (!authenticated) {
    return null;
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <h2>Welcome to Video Platform</h2>
        <p>Upload, manage, and share your videos with ease</p>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📤</div>
            <h3>Upload Videos</h3>
            <p>Easily upload your videos to the platform</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📁</div>
            <h3>Manage Videos</h3>
            <p>Organize and manage all your video files</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎬</div>
            <h3>Watch Videos</h3>
            <p>Stream and watch videos in high quality</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Share Videos</h3>
            <p>Share your videos with friends and colleagues</p>
          </div>
        </div>
      </div>
    </div>
  );
}
