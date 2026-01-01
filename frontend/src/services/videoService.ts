import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Retry logic with exponential backoff
const retryRequest = async (fn: () => Promise<any>, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      // Don't retry on 4xx errors (except 408, 429)
      const status = error.response?.status;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

export const videoAPI = {
  uploadVideo: (formData: FormData, onProgress?: (progress: number) => void) => {
    return retryRequest(() => 
      axios.post(`${API_BASE_URL}/videos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeader()
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress?.(progress);
          }
        }
      })
    );
  },

  getUserVideos: () => {
    return retryRequest(() => 
      axios.get(`${API_BASE_URL}/videos/user/myvideos`, {
        headers: getAuthHeader()
      })
    );
  },

  getAllVideos: () => {
    return retryRequest(() => 
      axios.get(`${API_BASE_URL}/videos`)
    );
  },

  getVideoById: (id: string) => {
    return retryRequest(() => 
      axios.get(`${API_BASE_URL}/videos/${id}`)
    );
  },

  updateVideo: (id: string, title: string, description: string) => {
    return retryRequest(() => 
      axios.put(`${API_BASE_URL}/videos/${id}`, {
        title,
        description
      }, {
        headers: getAuthHeader()
      })
    );
  },

  deleteVideo: (id: string) => {
    return retryRequest(() => 
      axios.delete(`${API_BASE_URL}/videos/${id}`, {
        headers: getAuthHeader()
      })
    );
  },

  updateVideoSafetyStatus: (id: string, safetyStatus: 'safe' | 'flagged') => {
    return retryRequest(() => 
      axios.put(`${API_BASE_URL}/videos/${id}/safety`, {
        safetyStatus
      }, {
        headers: getAuthHeader()
      })
    );
  },

  reanalyzeSafety: (id: string) => {
    return retryRequest(() => 
      axios.post(`${API_BASE_URL}/videos/${id}/reanalyze`, {}, {
        headers: getAuthHeader()
      })
    );
  }
};

