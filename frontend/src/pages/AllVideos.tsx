import { useState, useEffect } from 'react';
import { videoAPI } from '../services/videoService';
import { useOrganization } from '../context/OrganizationContext';
import { useToast, ToastContainer } from '../components/Toast';
import '../styles/Videos.css';

interface Video {
  _id: string;
  title: string;
  description: string;
  filepath: string;
  views: number;
  createdAt: string;
  userId: { _id: string; username: string };
}

export function AllVideos() {
  const { currentOrganization, addOrganizationChangeListener, refreshOrganizations } = useOrganization();
  const { toasts, addToast, removeToast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'title'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', description: '' });
  const videosPerPage = 12;

  // Check if user can edit videos (admin or editor role)
  const canEditVideos = currentOrganization?.role === 'admin' || currentOrganization?.role === 'editor';
  
  // No per-video ownership checks: org admins and editors can edit videos

  useEffect(() => {
    // Ensure we have fresh organization data with current role
    refreshOrganizations();
    fetchVideos();
    
    // Listen for organization changes and refetch videos
    const unsubscribe = addOrganizationChangeListener(() => {
      console.log('[ALLVIDEOS] Organization changed, refetching organization videos');
      setVideos([]); // Clear current videos
      setCurrentPage(1); // Reset to first page
      refreshOrganizations(); // Refresh to get latest role
      fetchVideos(); // Refetch for new organization
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      // Fetch organization videos instead of public videos
      const response = await videoAPI.getOrganizationVideos();
      setVideos(response.data.videos);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load videos';
      setError(errorMsg);
      
      // If organization membership error, show helpful message
      if (errorMsg.includes('does not belong') || errorMsg.includes('not authenticated')) {
        setError('Please refresh the page. Organization data is out of sync.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedVideos = () => {
    let filtered = videos.filter(video => 
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.userId?.username.toLowerCase().includes(searchTerm.toLowerCase())
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

  const canEditVideo = (): boolean => {
    return !!canEditVideos;
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
    return <div className="loading">Loading videos...</div>;
  }

  const filteredVideos = getFilteredAndSortedVideos();
  const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
  const startIdx = (currentPage - 1) * videosPerPage;
  const paginatedVideos = filteredVideos.slice(startIdx, startIdx + videosPerPage);

  return (
    <div className="videos-container">
      <div className="videos-header">
        <h2>Organization Videos{currentOrganization ? ` - ${currentOrganization.name}` : ''}</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {videos.length > 0 && (
        <div className="filter-controls">
          <input
            type="text"
            placeholder="Search videos by title, description, or uploader..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)} 
            className="sort-select"
            title="Sort videos by date, views, or title"
          >
            <option value="date">Sort by Date (Newest)</option>
            <option value="views">Sort by Views (Most)</option>
            <option value="title">Sort by Title (A-Z)</option>
          </select>
          {searchTerm && <span className="search-result-count">{filteredVideos.length} results</span>}
        </div>
      )}

      {videos.length === 0 ? (
        <div className="no-videos">
          <p>No videos available</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="no-videos">
          <p>No videos match your search</p>
        </div>
      ) : (
        <>
          <div className="videos-grid">
            {paginatedVideos.map((video) => (
              <div key={video._id} className="video-card">
                {editingId === video._id ? (
                  <div className="edit-form">
                    <h3>Edit Video</h3>
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      placeholder="Video title"
                      className="edit-input"
                    />
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      placeholder="Video description"
                      className="edit-textarea"
                      rows={3}
                    />
                    <div className="edit-buttons">
                      <button onClick={() => handleSaveEdit(video._id)} className="save-btn">
                        Save
                      </button>
                      <button onClick={handleCancelEdit} className="cancel-btn">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="video-thumb">
                      <video src={video.filepath} />
                      <div className="video-overlay">
                        <a href={`/video/${video._id}`} className="play-btn">▶</a>
                      </div>
                    </div>
                    <div className="video-info">
                      <h3>{video.title}</h3>
                      <p className="uploader">By {video.userId?.username || 'Unknown'}</p>
                      <p className="description">{video.description || 'No description'}</p>
                      <div className="video-stats">
                        <span>👁️ {video.views} views</span>
                        <span>📅 {new Date(video.createdAt).toLocaleDateString()}</span>
                      </div>
                      {canEditVideo() && (
                        <div className="video-actions">
                          <button 
                            onClick={() => handleEdit(video)}
                            className="edit-btn"
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(video._id, video.title)}
                            className="delete-btn"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
