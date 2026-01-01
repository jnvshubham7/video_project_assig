import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/videoService';
import '../styles/Videos.css';

interface Video {
  _id: string;
  title: string;
  description: string;
  filepath: string;
  views: number;
  status: 'uploaded' | 'processing' | 'safe' | 'flagged' | 'failed';
  createdAt?: string;
  sensitivityAnalysis?: {
    score: number;
    result: string;
    rules: string[];
  };
  userId?: { username: string } | string;
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
        {video.status === 'flagged' ? (
          <div className="restricted-content">
            <div className="restricted-icon">⚠️</div>
            <h2>Content Flagged</h2>
            <p>This video has been flagged as potentially inappropriate content and cannot be played.</p>
            <div className="safety-score">Safety Score: {video.sensitivityAnalysis?.score || 'N/A'}/100</div>
          </div>
        ) : video.status === 'processing' ? (
          <div className="processing-content">
            <div className="processing-icon">⏳</div>
            <h2>Processing Video</h2>
            <p>Your video is being analyzed for content safety. Please check back in a moment.</p>
          </div>
        ) : video.status === 'failed' ? (
          <div className="failed-content">
            <div className="failed-icon">❌</div>
            <h2>Processing Failed</h2>
            <p>An error occurred while processing this video. Please contact support.</p>
          </div>
        ) : (
          <>
            <video
              controls
              autoPlay
              className="player-video"
            >
              <source src={video.filepath} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            {video.status === 'safe' && (
              <div className="safe-indicator">✅ Safe to View</div>
            )}
          </>
        )}
      </div>

      <div className="video-details">
        <h1>{video.title}</h1>
        <div className="status-display">
          {video.status === 'safe' && <span className="status-badge status-safe">✅ Safe</span>}
          {video.status === 'flagged' && <span className="status-badge status-flagged">⚠️ Flagged</span>}
          {video.status === 'processing' && <span className="status-badge status-processing">⏳ Processing</span>}
          {video.status === 'failed' && <span className="status-badge status-failed">❌ Failed</span>}
          {video.status === 'uploaded' && <span className="status-badge status-uploaded">📤 Uploaded</span>}
        </div>
        <div className="video-meta">
          <span>👁️ {video.views} views</span>
          <span>📅 {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Unknown date'}</span>
        </div>

        <div className="uploader-info">
          <h3>Uploaded by: {typeof video.userId === 'object' ? video.userId?.username : video.userId || 'Unknown'}</h3>
        </div>

        <div className="video-description">
          <h3>Description</h3>
          <p>{video.description || 'No description provided'}</p>
        </div>

        {video.sensitivityAnalysis && (
          <div className="sensitivity-details">
            <h3>Content Analysis</h3>
            <p><strong>Safety Score:</strong> {video.sensitivityAnalysis.score}/100</p>
            <p><strong>Result:</strong> {video.sensitivityAnalysis.result.toUpperCase()}</p>
            {video.sensitivityAnalysis.rules && video.sensitivityAnalysis.rules.length > 0 && (
              <details className="analysis-details">
                <summary>Analysis Details</summary>
                <ul>
                  {video.sensitivityAnalysis.rules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <button onClick={() => navigate('/videos')} className="back-btn">
          ← Back to Videos
        </button>
      </div>
    </div>
  );
}
