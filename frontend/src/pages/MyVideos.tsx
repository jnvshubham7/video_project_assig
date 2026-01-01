import { useState, useEffect } from 'react';
import { videoAPI } from '../services/videoService';
import { useToast, ToastContainer } from '../components/Toast';
import socketService from '../services/socketService';
import '../styles/Videos.css';

interface Video {
  _id: string;
  title: string;
  description: string;
  filepath: string;
  views: number;
  createdAt: string;
  status: 'uploaded' | 'processing' | 'safe' | 'flagged' | 'failed';
  processingProgress: number;
  sensitivityAnalysis?: {
    score: number;
    result: string;
    rules: string[];
    summary?: string;
    detectedIssues?: Array<{
      category: string;
      score: number;
      keywords: string[];
    }>;
    categoryBreakdown?: {
      [key: string]: {
        score: number;
        keywords: string[];
      };
    };
  };
  userId?: { username: string };
}

export function MyVideos() {
  const { toasts, addToast, removeToast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'title'>('date');
  const [editFormData, setEditFormData] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchVideos();
    
    // Define Socket.io event handlers
    const handleVideoUploaded = (data: any) => {
      // Add newly uploaded video to the top of the list
      setVideos(prevVideos => {
        // Check if video already exists
        const exists = prevVideos.some(v => v._id === data.video._id);
        if (exists) return prevVideos;
        
        // Add new video to the beginning of the list
        return [data.video, ...prevVideos];
      });
      addToast(`New video uploaded: ${data.video.title}`, 'success');
    };

    const handleProcessingStart = (data: any) => {
      setVideos(videos.map(v => v._id === data.videoId ? { ...v, status: 'processing', processingProgress: 0 } : v));
    };

    const handleProgressUpdate = (data: any) => {
      setVideos(videos.map(v => v._id === data.videoId ? { ...v, processingProgress: data.progress } : v));
    };

    const handleProcessingComplete = (data: any) => {
      setVideos(videos.map(v => {
        if (v._id === data.videoId) {
          return {
            ...v,
            status: data.status,
            processingProgress: 100,
            sensitivityAnalysis: data.analysis
          };
        }
        return v;
      }));
      addToast(`Video processing complete: ${data.status === 'safe' ? '✅ Safe' : '⚠️ Flagged'}`, data.status === 'safe' ? 'success' : 'warning');
    };

    const handleProcessingFailed = (data: any) => {
      setVideos(videos.map(v => v._id === data.videoId ? { ...v, status: 'failed', processingProgress: 0 } : v));
      addToast(`Video processing failed: ${data.error}`, 'error');
    };

    // Listen for real-time video status updates
    socketService.on('video-uploaded', handleVideoUploaded);
    socketService.on('video-processing-start', handleProcessingStart);
    socketService.on('video-progress-update', handleProgressUpdate);
    socketService.on('video-processing-complete', handleProcessingComplete);
    socketService.on('video-processing-failed', handleProcessingFailed);

    return () => {
      socketService.off('video-uploaded', handleVideoUploaded);
      socketService.off('video-processing-start', handleProcessingStart);
      socketService.off('video-progress-update', handleProgressUpdate);
      socketService.off('video-processing-complete', handleProcessingComplete);
      socketService.off('video-processing-failed', handleProcessingFailed);
    };
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await videoAPI.getUserVideos();
      setVideos(response.data.videos);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load videos';
      setError(errorMsg);
      addToast(errorMsg, 'error');
      
      // If organization membership error, offer to refresh session
      if (errorMsg.includes('does not belong') || errorMsg.includes('not authenticated')) {
        addToast('Please refresh the page and login again', 'warning');
      }
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
      await videoAPI.updateVideo(videoId, { title: editFormData.title, description: editFormData.description });
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
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select" title="Sort videos by">
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
                    <div className="status-badge">
                      {video.status === 'processing' && <span className="badge badge-processing">⏳ Processing ({video.processingProgress}%)</span>}
                      {video.status === 'safe' && <span className="badge badge-safe">✅ Safe</span>}
                      {video.status === 'flagged' && <span className="badge badge-flagged">⚠️ Flagged</span>}
                      {video.status === 'failed' && <span className="badge badge-failed">❌ Failed</span>}
                      {video.status === 'uploaded' && <span className="badge badge-uploaded">📤 Uploaded</span>}
                    </div>
                    <p className="description">{video.description || 'No description'}</p>
                    {video.sensitivityAnalysis && (
                      <div className="sensitivity-info">
                        {video.sensitivityAnalysis.summary && (
                          <p className="summary"><strong>Summary:</strong> {video.sensitivityAnalysis.summary}</p>
                        )}
                        <p><strong>Safety Score:</strong> {video.sensitivityAnalysis.score}/100</p>
                        
                        {video.sensitivityAnalysis.categoryBreakdown && Object.keys(video.sensitivityAnalysis.categoryBreakdown).length > 0 && (
                          <details className="category-breakdown">
                            <summary>📊 Category Breakdown</summary>
                            <div className="breakdown-items">
                              {Object.entries(video.sensitivityAnalysis.categoryBreakdown).map(([category, data]) => (
                                <div key={category} className="breakdown-item">
                                  <span className="category-name">{category}:</span>
                                  <span className="category-score">{(data as any).score}/100</span>
                                  {(data as any).keywords && (data as any).keywords.length > 0 && (
                                    <div className="keywords-list">
                                      {(data as any).keywords.map((kw: string, idx: number) => (
                                        <span key={idx} className="keyword-tag">{kw}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        {video.sensitivityAnalysis.rules && video.sensitivityAnalysis.rules.length > 0 && (
                          <details className="analysis-rules">
                            <summary>🔍 Detection Rules Applied</summary>
                            <ul>
                              {video.sensitivityAnalysis.rules.map((rule, idx) => (
                                <li key={idx}>{rule}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                    <div className="video-stats">
                      <span>👁️ {video.views} views</span>
                      <span>📅 {new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>
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
