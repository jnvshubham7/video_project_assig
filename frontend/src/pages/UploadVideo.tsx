import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../services/authService';
import { videoAPI } from '../services/videoService';
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
  }, [navigate]);

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

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      if (formData.video) {
        uploadFormData.append('video', formData.video);
      }

      await videoAPI.uploadVideo(uploadFormData, (progress) => {
        setUploadProgress(progress);
      });
      
      navigate('/my-videos');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      const errorMessage = error.response?.data?.error || 'Upload failed. Please try again.';
      setError(errorMessage);
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

          {isSubmitting && uploadProgress > 0 && (
            <div className="progress-section">
              <ProgressBar 
                progress={uploadProgress} 
                label="Upload Progress" 
                showPercentage={true}
              />
            </div>
          )}

          <button type="submit" disabled={isSubmitting || !formData.video}>
            {isSubmitting ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Video'}
          </button>
        </form>
      </div>
    </div>
  );
}
