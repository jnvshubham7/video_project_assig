import { useState, useEffect } from 'react';
import { videoAPI } from '../services/videoService';
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
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await videoAPI.getUserVideos();
      setVideos(response.data.videos);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await videoAPI.deleteVideo(videoId);
        setVideos(videos.filter(v => v._id !== videoId));
        alert('Video deleted successfully');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to delete video');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading videos...</div>;
  }

  return (
    <div className="videos-container">
      <div className="videos-header">
        <h2>My Videos</h2>
        <a href="/upload" className="upload-btn">+ Upload New Video</a>
      </div>

      {error && <div className="error-message">{error}</div>}

      {videos.length === 0 ? (
        <div className="no-videos">
          <p>No videos uploaded yet</p>
          <a href="/upload" className="upload-link">Upload your first video</a>
        </div>
      ) : (
        <div className="videos-grid">
          {videos.map(video => (
            <div key={video._id} className="video-card">
              <div className="video-thumb">
                <video src={`http://localhost:5000${video.filepath}`} />
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
                  <button onClick={() => handleDelete(video._id)} className="delete-btn">
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
