import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/videoService';
import '../styles/Upload.css';

export function UploadVideo() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video: null as File | null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.video) {
      setError('Video file is required');
      return;
    }

    setLoading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('video', formData.video);

      await videoAPI.uploadVideo(uploadFormData);
      
      alert('Video uploaded successfully!');
      navigate('/my-videos');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
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
              placeholder="Enter video title"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter video description (optional)"
              rows={4}
            />
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

          <button type="submit" disabled={loading || !formData.video}>
            {loading ? 'Uploading...' : 'Upload Video'}
          </button>
        </form>
      </div>
    </div>
  );
}
