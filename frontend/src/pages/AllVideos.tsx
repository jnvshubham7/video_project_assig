import { useState, useEffect } from 'react';
import { videoAPI } from '../services/videoService';
import { useOrganization } from '../context/OrganizationContext';
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

export function AllVideos() {
  const { currentOrganization, addOrganizationChangeListener } = useOrganization();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'title'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const videosPerPage = 12;

  useEffect(() => {
    fetchVideos();
    
    // Listen for organization changes and refetch videos
    const unsubscribe = addOrganizationChangeListener(() => {
      console.log('[ALLVIDEOS] Organization changed, refetching organization videos');
      setVideos([]); // Clear current videos
      setCurrentPage(1); // Reset to first page
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
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
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
            {paginatedVideos.map(video => (
              <div key={video._id} className="video-card">
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
                </div>
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
    </div>
  );
}
