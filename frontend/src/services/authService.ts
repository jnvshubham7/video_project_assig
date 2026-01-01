import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  organizationId: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  organization: Organization;
}

export interface RegisterResponse {
  token: string;
  user: User;
  organization: Organization;
}

export const authAPI = {
  register: (username: string, email: string, password: string, confirmPassword: string, organizationName?: string) => {
    return axios.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, {
      username,
      email,
      password,
      confirmPassword,
      organizationName
    });
  },

  login: (identifier: string, password: string) => {
    return axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
      identifier,
      password
    });
  },

  getCurrentUser: () => {
    return axios.get<{ user: User; organization: Organization }>(`${API_BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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

export const setOrganization = (organization: Organization) => {
  localStorage.setItem('organization', JSON.stringify(organization));
};

export const getOrganization = (): Organization | null => {
  const org = localStorage.getItem('organization');
  return org ? JSON.parse(org) : null;
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('organization');
  delete axios.defaults.headers.common['Authorization'];
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

