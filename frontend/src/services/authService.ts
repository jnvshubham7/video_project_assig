import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const authAPI = {
  register: (username: string, email: string, password: string, confirmPassword: string) => {
    return axios.post(`${API_BASE_URL}/auth/register`, {
      username,
      email,
      password,
      confirmPassword
    });
  },

  login: (email: string, password: string) => {
    return axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
  }
};

export const setAuthToken = (token: string) => {
  if (token) {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};
