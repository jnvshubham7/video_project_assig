import { useState, useEffect } from 'react';
import { videoAPI } from '../services/videoService';
import { useToast, ToastContainer } from '../components/Toast';
import '../styles/Videos.css';

interface Video {
  _id: string;
  title: string;
  description: string;
  filepath: string;
  views: number;
  createdAt: string;
  userId?: { username: string };
}

export function MyVideos() {
  const { toasts, addToast, removeToast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await videoAPI.getUserVideos();
      setVideos(response.data.videos);
      setRetryCount(0);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load videos';
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId: string, videoTitle: string) => {
    if (window.confirm(`Delete "${videoTitle}"? This action cannot be undone.`)) {
      try {
        await videoAPI.deleteVideo(videoId);
        setVideos(videos.filter(v => v._id !== videoId));
        addToast('Video deleted successfully', 'success');
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || 'Failed to delete video';
        addToast(errorMsg, 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="videos-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="videos-container">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="videos-header">
        <h2>My Videos</h2>
        <a href="/upload" className="upload-btn">+ Upload New Video</a>
      </div>

      {error && (
        <div className="error-section">
          <div className="error-message">{error}</div>
          <button onClick={fetchVideos} className="retry-btn">Retry</button>
        </div>
      )}

      {!error && videos.length === 0 ? (
        <div className="no-videos">
          <p>No videos uploaded yet</p>
          <a href="/upload" className="upload-link">Upload your first video</a>
        </div>
      ) : (
        <div className="videos-grid">
          {videos.map(video => (
            <div key={video._id} className="video-card">
              <div className="video-thumb">
                <video src={video.filepath} />
                <div className="video-overlay">
                  <a href={`/video/${video._id}`} className="play-btn">▶</a>
                </div>
              </div>
              <div className="video-info">
                <h3>{video.title}</h3>
                <p className="description">{video.description || 'No description'}</p>
                <div className="video-stats">
                  <span>👁️ {video.views} views</span>
                  <span>📅 {new Date(video.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="video-actions">
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(video._id, video.title)}
                    title="Delete video"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
