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
  safetyStatus?: 'safe' | 'flagged';
  userId?: { username: string };
}

export function MyVideos() {
  const { toasts, addToast, removeToast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'title'>('date');
  const [editFormData, setEditFormData] = useState({ title: '', description: '' });

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

  const getFilteredAndSortedVideos = () => {
    let filtered = videos.filter(video => 
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch(sortBy) {
      case 'views':
        return filtered.sort((a, b) => b.views - a.views);
      case 'title':
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case 'date':
      default:
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  };

  const handleEdit = (video: Video) => {
    setEditingId(video._id);
    setEditFormData({ title: video.title, description: video.description });
  };

  const handleSaveEdit = async (videoId: string) => {
    if (!editFormData.title.trim()) {
      addToast('Title cannot be empty', 'error');
      return;
    }

    try {
      await videoAPI.updateVideo(videoId, editFormData.title, editFormData.description);
      setVideos(videos.map(v => v._id === videoId ? { ...v, ...editFormData } : v));
      setEditingId(null);
      addToast('Video updated successfully', 'success');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update video';
      addToast(errorMsg, 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ title: '', description: '' });
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

  const handleUpdateSafetyStatus = async (videoId: string, newStatus: 'safe' | 'flagged') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/videos/${videoId}/safety`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ safetyStatus: newStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update safety status');
      }

      setVideos(videos.map(v => v._id === videoId ? { ...v, safetyStatus: newStatus } : v));
      addToast(`Video marked as ${newStatus}`, 'success');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update safety status';
      addToast(errorMsg, 'error');
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

  const filteredVideos = getFilteredAndSortedVideos();

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

      {!error && videos.length > 0 && (
        <div className="filter-controls">
          <input
            type="text"
            placeholder="Search videos by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
            <option value="date">Sort by Date (Newest)</option>
            <option value="views">Sort by Views (Most)</option>
            <option value="title">Sort by Title (A-Z)</option>
          </select>
          {searchTerm && <span className="search-result-count">{filteredVideos.length} results</span>}
        </div>
      )}

      {!error && videos.length === 0 ? (
        <div className="no-videos">
          <p>No videos uploaded yet</p>
          <a href="/upload" className="upload-link">Upload your first video</a>
        </div>
      ) : !error && filteredVideos.length === 0 ? (
        <div className="no-videos">
          <p>No videos match your search</p>
        </div>
      ) : (
        <div className="videos-grid">
          {filteredVideos.map(video => (
            <div key={video._id} className="video-card">
              <div className="video-thumb">
                <video src={video.filepath} />
                <div className="video-overlay">
                  <a href={`/video/${video._id}`} className="play-btn">▶</a>
                </div>
                {video.safetyStatus && (
                  <div className={`safety-badge ${video.safetyStatus}`}>
                    {video.safetyStatus === 'flagged' ? '⚠️ Flagged' : '✓ Safe'}
                  </div>
                )}
              </div>
              <div className="video-info">
                {editingId === video._id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      className="edit-input"
                      placeholder="Video title"
                      maxLength={100}
                    />
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="edit-textarea"
                      placeholder="Video description"
                      maxLength={500}
                      rows={2}
                    />
                    <div className="edit-actions">
                      <button onClick={() => handleSaveEdit(video._id)} className="save-btn">Save</button>
                      <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{video.title}</h3>
                    <p className="description">{video.description || 'No description'}</p>
                    <div className="video-stats">
                      <span>👁️ {video.views} views</span>
                      <span>📅 {new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>
                    {video.safetyStatus && (
                      <div className="safety-controls">
                        <small>Safety Status: <strong>{video.safetyStatus}</strong></small>
                        <div className="safety-buttons">
                          <button 
                            className={`safety-btn ${video.safetyStatus === 'safe' ? 'active' : ''}`}
                            onClick={() => handleUpdateSafetyStatus(video._id, 'safe')}
                            title="Mark as safe"
                          >
                            ✓ Safe
                          </button>
                          <button 
                            className={`safety-btn ${video.safetyStatus === 'flagged' ? 'active' : ''}`}
                            onClick={() => handleUpdateSafetyStatus(video._id, 'flagged')}
                            title="Mark as flagged"
                          >
                            ⚠️ Flag
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="video-actions">
                      <button 
                        className="edit-btn"
                        onClick={() => handleEdit(video)}
                        title="Edit video"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDelete(video._id, video.title)}
                        title="Delete video"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
