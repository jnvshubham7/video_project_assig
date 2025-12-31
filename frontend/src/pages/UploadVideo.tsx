import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/videoService';
import { ProgressBar } from '../components/ProgressBar';
import { useToast, ToastContainer } from '../components/Toast';
import '../styles/Upload.css';

export function UploadVideo() {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video: null as File | null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

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
        addToast('Invalid file type. Please select a video.', 'error');
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError('File size must be less than 500MB');
        addToast('File size exceeds 500MB limit', 'error');
        return;
      }
      setFormData(prev => ({
        ...prev,
        video: file
      }));
      setFileName(file.name);
      setError('');
      addToast(`File selected: ${file.name}`, 'info');
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Title is required');
      addToast('Please enter a video title', 'warning');
      return false;
    }

    if (formData.title.trim().length < 3) {
      setError('Title must be at least 3 characters');
      addToast('Title too short (minimum 3 characters)', 'warning');
      return false;
    }

    if (!formData.video) {
      setError('Video file is required');
      addToast('Please select a video file to upload', 'warning');
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

    setLoading(true);
    setUploadProgress(0);
    setRetryCount(0);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('video', formData.video);

      await videoAPI.uploadVideo(uploadFormData, (progress) => {
        setUploadProgress(progress);
      });
      
      addToast('Video uploaded successfully!', 'success');
      navigate('/my-videos');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Upload failed. Please try again.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="upload-container">
      <ToastContainer toasts={toasts} onClose={removeToast} />
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
              disabled={loading}
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
              disabled={loading}
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
                disabled={loading}
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

          {loading && uploadProgress > 0 && (
            <div className="progress-section">
              <ProgressBar 
                progress={uploadProgress} 
                label="Upload Progress" 
                showPercentage={true}
              />
            </div>
          )}

          <button type="submit" disabled={loading || !formData.video}>
            {loading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Video'}
          </button>
        </form>
      </div>
    </div>
  );
}
