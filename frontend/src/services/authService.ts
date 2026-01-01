import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Organization interface
export interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: 'admin' | 'editor' | 'viewer';
}

// User is now global (no organizationId)
export interface User {
  _id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

// New response format
export interface LoginResponse {
  message: string;
  token: string;
  user: User;
  currentOrganization: Organization & { role: 'admin' | 'editor' | 'viewer' };
  organizations: (Organization & { role: 'admin' | 'editor' | 'viewer' })[];
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: User;
  organization: Organization;
  isNewOrganization: boolean;
}

export interface CurrentUserResponse {
  user: User;
  currentOrganization: Organization | null;
  organizations: (Organization & { role: 'admin' | 'editor' | 'viewer' })[];
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
    return axios.get<CurrentUserResponse>(`${API_BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
  },

  switchOrganization: (organizationId: string) => {
    return axios.post<{ message: string; token: string; organization: Organization & { role: 'admin' | 'editor' | 'viewer' } }>(`${API_BASE_URL}/auth/switch-organization`, {
      organizationId
    }, {
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

export const setOrganization = (organization: Organization & { role: string }) => {
  localStorage.setItem('currentOrganization', JSON.stringify(organization));
};

export const getOrganization = (): (Organization & { role: string }) | null => {
  const org = localStorage.getItem('currentOrganization');
  if (!org) return null;
  try {
    return JSON.parse(org);
  } catch (e) {
    return null;
  }
};

export const setOrganizations = (organizations: (Organization & { role: string })[]) => {
  localStorage.setItem('organizations', JSON.stringify(organizations));
};

export const getOrganizations = (): (Organization & { role: string })[] => {
  const orgs = localStorage.getItem('organizations');
  if (!orgs) return [];
  try {
    return JSON.parse(orgs);
  } catch (e) {
    return [];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('currentOrganization');
  localStorage.removeItem('organizations');
  localStorage.removeItem('user');
  delete axios.defaults.headers.common['Authorization'];
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

