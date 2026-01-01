import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../services/authService';
import { videoAPI } from '../services/videoService';
import socketService from '../services/socketService';
import { ProgressBar } from '../components/ProgressBar';
import '../styles/Upload.css';

export function UploadVideo() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video: null as File | null
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'uploading' | 'processing' | 'complete' | 'failed' | null>(null);

  useEffect(() => {
    // Check user role from localStorage or JWT
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    // Decode JWT to get user role
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role || null);
    } catch {
      console.error('Failed to decode token');
    }
    setLoading(false);

    // Set up Socket.io listeners
    const handleProcessingStart = (data: any) => {
      if (data.videoId === uploadedVideoId) {
        setProcessingStatus('processing');
        setProcessingProgress(10);
      }
    };

    const handleProgressUpdate = (data: any) => {
      if (data.videoId === uploadedVideoId) {
        setProcessingProgress(data.progress);
        setProcessingStep(data.step || '');
      }
    };

    const handleProcessingComplete = (data: any) => {
      if (data.videoId === uploadedVideoId) {
        setProcessingStatus('complete');
        setProcessingProgress(100);
      }
    };

    const handleProcessingFailed = (data: any) => {
      if (data.videoId === uploadedVideoId) {
        setProcessingStatus('failed');
        setError(data.error);
      }
    };

    socketService.on('video-processing-start', handleProcessingStart);
    socketService.on('video-progress-update', handleProgressUpdate);
    socketService.on('video-processing-complete', handleProcessingComplete);
    socketService.on('video-processing-failed', handleProcessingFailed);

    return () => {
      socketService.off('video-processing-start', handleProcessingStart);
      socketService.off('video-progress-update', handleProgressUpdate);
      socketService.off('video-processing-complete', handleProcessingComplete);
      socketService.off('video-processing-failed', handleProcessingFailed);
    };
  }, [navigate, uploadedVideoId]);

  if (loading) {
    return <div className="upload-container"><div className="upload-card"><p>Loading...</p></div></div>;
  }

  if (userRole === 'viewer') {
    return (
      <div className="upload-container">
        <div className="upload-card">
          <h2>Upload Video</h2>
          <div className="error-message">
            <strong>Access Denied</strong><br />
            Viewers cannot upload videos. Contact your organization admin to change your role to Editor or Admin.
          </div>
          <button
            onClick={() => navigate('/my-videos')}
            className="back-btn"
          >
            Back to My Videos
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError('File size must be less than 500MB');
        return;
      }
      setFormData(prev => ({
        ...prev,
        video: file
      }));
      setFileName(file.name);
      setError('');
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }

    if (formData.title.trim().length < 3) {
      setError('Title must be at least 3 characters');
      return false;
    }

    if (!formData.video) {
      setError('Video file is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setProcessingStatus('uploading');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      if (formData.video) {
        uploadFormData.append('video', formData.video);
      }

      const response = await videoAPI.uploadVideo(uploadFormData, (progress) => {
        setUploadProgress(progress);
      });

      // Capture the video ID for tracking processing
      setUploadedVideoId(response.data.video._id);
      
      // Show processing status for 5 seconds before redirecting
      setTimeout(() => {
        if (processingStatus !== 'failed') {
          navigate('/my-videos');
        }
      }, 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      const errorMessage = error.response?.data?.error || 'Upload failed. Please try again.';
      setError(errorMessage);
      setProcessingStatus('failed');
      console.error('Upload error:', err);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h2>Upload Video</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label>Video Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter video title (min 3 characters)"
              required
              disabled={isSubmitting}
              maxLength={100}
            />
            <small className="char-count">{formData.title.length}/100</small>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter video description (optional)"
              rows={4}
              disabled={isSubmitting}
              maxLength={500}
            />
            <small className="char-count">{formData.description.length}/500</small>
          </div>

          <div className="form-group">
            <label>Select Video File *</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="video-input"
                accept="video/*"
                onChange={handleFileChange}
                required
                disabled={isSubmitting}
              />
              <label htmlFor="video-input" className="file-label">
                {fileName ? (
                  <span>📁 {fileName}</span>
                ) : (
                  <span>Click to select video or drag & drop</span>
                )}
              </label>
            </div>
          </div>

          {isSubmitting && uploadProgress > 0 && processingStatus === 'uploading' && (
            <div className="progress-section">
              <ProgressBar 
                progress={uploadProgress} 
                label="Upload Progress" 
                showPercentage={true}
              />
            </div>
          )}

          {processingStatus === 'processing' && (
            <div className="progress-section">
              <h4>Processing Video...</h4>
              <ProgressBar 
                progress={processingProgress} 
                label={processingStep || 'Processing'} 
                showPercentage={true}
              />
            </div>
          )}

          {processingStatus === 'complete' && (
            <div className="success-section">
              <div className="success-icon">✅</div>
              <h4>Video Processing Complete!</h4>
              <p>Redirecting to your videos...</p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting || !formData.video || processingStatus === 'processing' || processingStatus === 'complete'}>
            {isSubmitting ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Video'}
          </button>
        </form>
      </div>
    </div>
  );
}
