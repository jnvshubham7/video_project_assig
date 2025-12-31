import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const videoAPI = {
  uploadVideo: (formData: FormData) => {
    return axios.post(`${API_BASE_URL}/videos/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  getUserVideos: () => {
    return axios.get(`${API_BASE_URL}/videos/user/myvideos`);
  },

  getAllVideos: () => {
    return axios.get(`${API_BASE_URL}/videos`);
  },

  getVideoById: (id: string) => {
    return axios.get(`${API_BASE_URL}/videos/${id}`);
  },

  updateVideo: (id: string, title: string, description: string) => {
    return axios.put(`${API_BASE_URL}/videos/${id}`, {
      title,
      description
    });
  },

  deleteVideo: (id: string) => {
    return axios.delete(`${API_BASE_URL}/videos/${id}`);
  }
};
