import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export interface OrganizationMember {
  userId: {
    _id: string;
    username: string;
    email: string;
    isActive: boolean;
    createdAt: string;
  };
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface OrganizationSettings {
  maxVideoSize: number;
  maxVideosPerUser: number;
  storageQuota: number;
  storageUsed: number;
  isPublic: boolean;
  allowPublicSharing: boolean;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  adminId: string;
  members: OrganizationMember[];
  settings: OrganizationSettings;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationStats {
  memberCount: number;
  videoCount: number;
  totalViews: number;
  storageUsed: number;
  storageQuota: number;
}

export const organizationAPI = {
  // Get organization details
  getOrganization: () => {
    return axios.get<{ organization: Organization }>(
      `${API_BASE_URL}/org`,
      { headers: getAuthHeader() }
    );
  },

  // Update organization details (admin only)
  updateOrganization: (data: { name?: string; description?: string; settings?: Partial<OrganizationSettings> }) => {
    return axios.put<{ message: string; organization: Organization }>(
      `${API_BASE_URL}/org`,
      data,
      { headers: getAuthHeader() }
    );
  },

  // Get organization members
  getMembers: () => {
    return axios.get<{ members: OrganizationMember[]; count: number }>(
      `${API_BASE_URL}/org/members`,
      { headers: getAuthHeader() }
    );
  },

  // Invite user to organization (admin only)
  inviteUser: (email: string, role: 'admin' | 'member' = 'member') => {
    return axios.post<{ message: string; member: any }>(
      `${API_BASE_URL}/org/invite`,
      { email, role },
      { headers: getAuthHeader() }
    );
  },

  // Remove user from organization (admin only)
  removeUser: (userId: string) => {
    return axios.delete<{ message: string }>(
      `${API_BASE_URL}/org/members/${userId}`,
      { headers: getAuthHeader() }
    );
  },

  // Change user role (admin only)
  changeUserRole: (userId: string, role: 'admin' | 'member') => {
    return axios.put<{ message: string; user: any }>(
      `${API_BASE_URL}/org/members/${userId}/role`,
      { role },
      { headers: getAuthHeader() }
    );
  },

  // Get organization statistics
  getStats: () => {
    return axios.get<{ stats: OrganizationStats }>(
      `${API_BASE_URL}/org/stats`,
      { headers: getAuthHeader() }
    );
  }
};
