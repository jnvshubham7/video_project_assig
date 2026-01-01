import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/videoService';
import { getAuthToken } from '../services/authService';
import '../styles/Videos.css';

interface Video {
  _id: string;
  title: string;
  description: string;
  filepath: string;
  views: number;
  createdAt: string;
  safetyStatus?: 'safe' | 'flagged';
  userId?: { username: string };
}

export function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('No video ID provided');
      setLoading(false);
      return;
    }

    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await videoAPI.getVideoById(id!);
      setVideo(response.data.video);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading video...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/videos')} className="back-btn">
          Back to Videos
        </button>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="error-container">
        <div className="error-message">Video not found</div>
        <button onClick={() => navigate('/videos')} className="back-btn">
          Back to Videos
        </button>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      <div className="player-wrapper">
        <video
          controls
          autoPlay
          style={{ width: '100%', maxHeight: '600px', backgroundColor: '#000' }}
        >
          <source src={video.filepath} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="video-details">
        <h1>{video.title}</h1>
        <div className="video-meta">
          <span>👁️ {video.views} views</span>
          <span>📅 {new Date(video.createdAt).toLocaleDateString()}</span>
          {video.safetyStatus && (
            <span className={`safety-status ${video.safetyStatus}`}>
              {video.safetyStatus === 'flagged' ? '⚠️ Flagged Content' : '✓ Safe Content'}
            </span>
          )}
        </div>

        <div className="uploader-info">
          <h3>Uploaded by: {video.userId?.username || 'Unknown'}</h3>
        </div>

        <div className="video-description">
          <h3>Description</h3>
          <p>{video.description || 'No description provided'}</p>
        </div>

        <button onClick={() => navigate('/videos')} className="back-btn">
          ← Back to Videos
        </button>
      </div>
    </div>
  );
}
