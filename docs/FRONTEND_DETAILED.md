# Frontend Implementation - Detailed Technical Guide

## Table of Contents
1. [Project Setup & Architecture](#project-setup--architecture)
2. [React Fundamentals Used](#react-fundamentals-used)
3. [TypeScript Configuration](#typescript-configuration)
4. [Routing & Navigation](#routing--navigation)
5. [State Management](#state-management)
6. [API Integration](#api-integration)
7. [Components Deep Dive](#components-deep-dive)
8. [Pages Deep Dive](#pages-deep-dive)
9. [Real-time Communication](#real-time-communication)
10. [Error Handling & Validation](#error-handling--validation)
11. [Testing](#testing)
12. [Build & Deployment](#build--deployment)

---

## Project Setup & Architecture

### Directory Structure
```
frontend/
├── src/
│   ├── main.tsx                 # React root entry point
│   ├── App.tsx                  # Root component + routing
│   ├── setupTests.ts            # Jest configuration
│   ├── index.css                # Global styles
│   ├── App.css                  # Root styles
│   ├── components/              # Reusable UI components
│   │   ├── Header.tsx           # Navigation bar
│   │   ├── Header.css
│   │   ├── ProtectedRoute.tsx   # Auth guard for routes
│   │   ├── Toast.tsx            # Notification messages
│   │   ├── Toast.css
│   │   ├── ProgressBar.tsx      # Upload progress indicator
│   │   └── ProgressBar.css
│   ├── context/                 # State management (Context API)
│   │   └── OrganizationContext.tsx  # Org + user state
│   ├── pages/                   # Page components (full pages)
│   │   ├── Home.tsx             # Landing page
│   │   ├── Login.tsx            # Login form
│   │   ├── Register.tsx         # Registration form
│   │   ├── UploadVideo.tsx      # Video upload page
│   │   ├── MyVideos.tsx         # User's uploaded videos
│   │   ├── AllVideos.tsx        # Org's videos
│   │   ├── VideoPlayer.tsx      # Video streaming/playback
│   │   ├── MemberManagement.tsx # Manage org members
│   │   ├── OrganizationSettings.tsx  # Org settings
│   │   └── image/               # Page-specific images
│   │       ├── Login/
│   │       └── MemberManagement/
│   ├── services/                # API & business logic
│   │   ├── authService.ts       # Auth API calls + token management
│   │   ├── videoService.ts      # Video API calls
│   │   ├── organizationService.ts  # Organization API calls
│   │   ├── socketService.ts     # Socket.io real-time updates
│   │   └── image/               # Service-related images
│   │       └── videoService/
│   └── styles/                  # Page-specific styles
│       ├── Auth.css             # Login/Register styles
│       ├── Home.css
│       ├── Upload.css
│       └── Videos.css
├── public/                      # Static assets
├── index.html                   # HTML entry point
├── tsconfig.json                # TypeScript config
├── tsconfig.app.json            # App TypeScript config
├── tsconfig.node.json           # Node TypeScript config
├── vite.config.ts               # Vite build config
├── jest.config.ts               # Jest testing config
├── eslint.config.js             # Code linting config
├── package.json
├── README.md
└── .env / .env.local           # Environment variables
```

### Environment Variables (.env)
```bash
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Socket.io Configuration
VITE_SOCKET_URL=http://localhost:5000

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=true
VITE_MAX_VIDEO_SIZE=500000000
```

---

## React Fundamentals Used

### Component Types

#### 1. Functional Components with Hooks
```typescript
// Modern React approach using hooks
import { useState, useEffect } from 'react';

export const UploadVideo: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Runs when component mounts
    console.log('Component mounted');

    return () => {
      // Cleanup function (unmount)
      console.log('Component unmounted');
    };
  }, []); // Empty dependency array = run once on mount

  return <div>Upload Video</div>;
};
```

#### 2. JSX Syntax
```typescript
// JSX = JavaScript + XML
// Compiles to: React.createElement('div', {}, ...)

export const MyComponent = () => {
  return (
    <div className="container">
      <h1>Hello World</h1>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
};
```

### State Management with Hooks

#### useState
```typescript
// Single state value
const [count, setCount] = useState(0);

// Object state
const [form, setForm] = useState({
  email: '',
  password: ''
});

const updateForm = (field: string, value: string) => {
  setForm(prev => ({
    ...prev,
    [field]: value
  }));
};
```

#### useEffect
```typescript
// Run when component mounts
useEffect(() => {
  loadVideos();
}, []);  // Empty dependency array

// Run when dependency changes
useEffect(() => {
  console.log('Org changed:', organizationId);
}, [organizationId]);  // Runs when organizationId changes

// Cleanup
useEffect(() => {
  const subscription = videoService.subscribe();
  return () => subscription.unsubscribe();
}, []);
```

#### useContext
```typescript
// Access context value
const { currentOrganization } = useContext(OrganizationContext);

// If null, component not inside provider
if (!currentOrganization) {
  return <div>No organization selected</div>;
}
```

#### useReducer (Optional, for complex state)
```typescript
const [state, dispatch] = useReducer(reducer, initialState);

dispatch({ type: 'SET_LOADING', payload: true });
// vs
setLoading(true);

// useReducer better for complex state logic
// useState better for simple state
```

### Event Handling
```typescript
// Function definition
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setInputValue(value);
};

// Inline (with proper typing)
<input 
  onChange={(e) => setEmail(e.target.value)}
  type="email"
/>

// Prevent default
<form onSubmit={(e) => {
  e.preventDefault();
  handleSubmit();
}}>
```

### Conditional Rendering
```typescript
// Option 1: if/else
if (isLoading) {
  return <div>Loading...</div>;
}

// Option 2: ternary
return isLoading ? <div>Loading...</div> : <div>Content</div>;

// Option 3: logical AND
return (
  <div>
    {isAuthed && <div>Welcome!</div>}
  </div>
);

// Option 4: switch
switch (status) {
  case 'loading':
    return <LoadingSpinner />;
  case 'error':
    return <ErrorMessage />;
  default:
    return <Content />;
}
```

### Lists & Keys
```typescript
// Always use unique key prop
const videos = [
  { id: '1', title: 'Video 1' },
  { id: '2', title: 'Video 2' }
];

return (
  <ul>
    {videos.map(video => (
      <li key={video.id}>  {/* ✓ Use ID as key */}
        {video.title}
      </li>
    ))}
  </ul>
);

// ✗ BAD: Don't use index as key (breaks reordering)
{videos.map((video, index) => (
  <li key={index}>{video.title}</li>  // Only if list is static
))}
```

---

## TypeScript Configuration

### Type Definitions

#### API Response Types
```typescript
// services/types.ts

export interface User {
  _id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: 'admin' | 'editor' | 'viewer';
}

export interface Video {
  _id: string;
  title: string;
  description: string;
  owner: User;
  organization: Organization;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sensitivity: {
    score: number;
    isFlagged: boolean;
    categories: Record<string, number>;
    flaggedReasons: string[];
  };
  duration?: number;
  resolution?: string;
  fileSize?: number;
  createdAt: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
  currentOrganization: Organization;
  organizations: Organization[];
}
```

#### Component Props Types
```typescript
// components/Header.tsx

interface HeaderProps {
  isAuthenticated: boolean;
  user: User | null;
  onLogout: () => void;
  currentOrganization: Organization | null;
  onSwitchOrg: (orgId: string) => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  isAuthenticated,
  user,
  onLogout,
  currentOrganization,
  onSwitchOrg
}) => {
  // Component implementation
};
```

#### Utility Types
```typescript
// Use TypeScript utility types for better code

// Partial<T> = all properties optional
type PartialUser = Partial<User>;

// Record<K, V> = object with specific keys
type VideoStatus = Record<'pending' | 'processing' | 'completed', string>;

// Pick<T, K> = select specific properties
type UserPreview = Pick<User, 'username' | 'email'>;

// Omit<T, K> = exclude specific properties
type UserWithoutPassword = Omit<User, 'password'>;

// ReturnType<T> = get function return type
type ApiResponse = ReturnType<typeof apiCall>;
```

### Type Safety Benefits
```typescript
// ✓ Compile-time error catching
const user: User = {
  _id: '123',
  username: 'john',
  email: 'john@example.com',
  isActive: true,
  createdAt: new Date().toISOString(),
  nonExistentField: 'value'  // ✗ TypeScript error!
};

// ✓ IDE autocomplete
user.  // Shows: _id, username, email, isActive, createdAt

// ✓ Type inference
const videos: Video[] = [];
videos.forEach(video => {
  // video automatically typed as Video
  console.log(video.title);  // ✓ Works
  console.log(video.nonExistent);  // ✗ Error
});
```

---

## Routing & Navigation

### React Router Setup

#### App.tsx Main Router
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';

// Protected pages
import { UploadVideo } from './pages/UploadVideo';
import { MyVideos } from './pages/MyVideos';
import { AllVideos } from './pages/AllVideos';
import { VideoPlayer } from './pages/VideoPlayer';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
          <Route path="/upload" element={<UploadVideo />} />
          <Route path="/my-videos" element={<MyVideos />} />
          <Route path="/all-videos" element={<AllVideos />} />
          <Route path="/video/:id" element={<VideoPlayer />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
```

#### ProtectedRoute Component
```typescript
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isAuthenticated }) => {
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render nested routes
  return <Outlet />;
};

// Usage:
<Route element={<ProtectedRoute isAuthenticated={!!token} />}>
  <Route path="/upload" element={<UploadVideo />} />
</Route>
```

#### Navigation Patterns
```typescript
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    // Programmatic navigation
    navigate('/dashboard', { replace: true });
    // replace: true = replace history (user can't go back to login)
  };

  return <button onClick={handleLoginSuccess}>Login</button>;
};

// Link component (declarative navigation)
import { Link } from 'react-router-dom';

<Link to="/videos">My Videos</Link>

// useParams - get URL parameters
import { useParams } from 'react-router-dom';

export const VideoPlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // URL: /video/:id
  // Access id parameter
};
```

---

## State Management

### OrganizationContext

#### Context Definition
```typescript
// context/OrganizationContext.tsx

import React, { createContext, useState, useEffect, ReactNode } from 'react';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
  switchOrganization: (orgId: string) => Promise<void>;
  updateOrganizations: (orgs: Organization[]) => void;
}

export const OrganizationContext = createContext<OrganizationContextType | null>(null);

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load organizations on mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      const response = await authService.getMyOrganizations();
      setOrganizations(response.data.organizations);
      
      // Set first as current
      if (response.data.organizations.length > 0) {
        setCurrentOrganization(response.data.organizations[0]);
      }
    } catch (err) {
      setError('Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    try {
      setIsLoading(true);
      const response = await authService.switchOrganization(orgId);
      
      // Update token
      localStorage.setItem('authToken', response.data.token);
      
      // Update current org
      setCurrentOrganization(response.data.organization);
    } catch (err) {
      setError('Failed to switch organization');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrganizations = (orgs: Organization[]) => {
    setOrganizations(orgs);
  };

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    isLoading,
    error,
    switchOrganization,
    updateOrganizations
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
```

#### Using Context
```typescript
// Inside any component
import { useContext } from 'react';
import { OrganizationContext } from '../context/OrganizationContext';

export const MyComponent: React.FC = () => {
  const context = useContext(OrganizationContext);
  
  if (!context) {
    throw new Error('Component must be used inside OrganizationProvider');
  }

  const { currentOrganization, switchOrganization } = context;

  return (
    <div>
      <h2>Current Org: {currentOrganization?.name}</h2>
      <button onClick={() => switchOrganization('org-id')}>
        Switch Organization
      </button>
    </div>
  );
};

// In App.tsx:
<OrganizationProvider>
  <Routes>
    {/* routes here can use context */}
  </Routes>
</OrganizationProvider>
```

---

## API Integration

### Services Architecture

#### authService.ts
```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const authService = {
  /**
   * Register new user
   */
  register: async (username: string, email: string, password: string, organizationName?: string) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      username,
      email,
      password,
      confirmPassword: password,
      organizationName
    });
    return response.data;
  },

  /**
   * Login user
   */
  login: async (identifier: string, password: string) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      identifier,
      password
    });
    return response.data;
  },

  /**
   * Get current user info
   */
  getCurrentUser: async () => {
    const token = getAuthToken();
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Get user's organizations
   */
  getMyOrganizations: async () => {
    const token = getAuthToken();
    const response = await axios.get(`${API_BASE_URL}/auth/my-organizations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Switch active organization
   */
  switchOrganization: async (organizationId: string) => {
    const token = getAuthToken();
    const response = await axios.post(
      `${API_BASE_URL}/auth/switch-organization`,
      { organizationId },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Logout (client-side only)
   */
  logout: () => {
    localStorage.removeItem('authToken');
  }
};

/**
 * Token management
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
  // Set default header for future requests
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};
```

#### videoService.ts
```typescript
import axios from 'axios';
import { getAuthToken } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getConfig = () => ({
  headers: {
    'Authorization': `Bearer ${getAuthToken()}`
  }
});

export const videoService = {
  /**
   * Upload video
   */
  uploadVideo: async (file: File, title: string, description: string) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);

    // For upload progress tracking
    const response = await axios.post(
      `${API_BASE_URL}/videos`,
      formData,
      {
        ...getConfig(),
        headers: {
          ...getConfig().headers,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total!
          );
          // Can dispatch event or callback here
        }
      }
    );

    return response.data;
  },

  /**
   * Get videos list (with pagination)
   */
  getVideos: async (page: number = 1, limit: number = 20, search: string = '') => {
    const response = await axios.get(
      `${API_BASE_URL}/videos`,
      {
        ...getConfig(),
        params: { page, limit, search }
      }
    );
    return response.data;
  },

  /**
   * Get single video details
   */
  getVideoById: async (videoId: string) => {
    const response = await axios.get(
      `${API_BASE_URL}/videos/${videoId}`,
      getConfig()
    );
    return response.data;
  },

  /**
   * Delete video
   */
  deleteVideo: async (videoId: string) => {
    const response = await axios.delete(
      `${API_BASE_URL}/videos/${videoId}`,
      getConfig()
    );
    return response.data;
  },

  /**
   * Get video stream URL (with Range support)
   * Browser handles Range requests automatically
   */
  getVideoStreamUrl: (videoId: string) => {
    const token = getAuthToken();
    return `${API_BASE_URL}/videos/${videoId}/stream?token=${token}`;
  },

  /**
   * Search videos
   */
  searchVideos: async (query: string) => {
    const response = await axios.get(
      `${API_BASE_URL}/videos`,
      {
        ...getConfig(),
        params: { search: query }
      }
    );
    return response.data;
  }
};
```

#### socketService.ts
```typescript
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const socketService = {
  /**
   * Initialize Socket.io connection
   */
  connect: (token: string): Socket => {
    if (socket) {
      return socket;
    }

    socket = io(SOCKET_URL, {
      auth: {
        token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('✓ Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('✗ Disconnected from server');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return socket;
  },

  /**
   * Join organization room
   */
  joinOrganization: (organizationId: string) => {
    if (!socket) return;
    socket.emit('join-org', organizationId);
  },

  /**
   * Leave organization room
   */
  leaveOrganization: (organizationId: string) => {
    if (!socket) return;
    socket.emit('leave-org', organizationId);
  },

  /**
   * Listen for video processing status
   */
  onVideoStatus: (callback: (data: any) => void) => {
    if (!socket) return;
    socket.on('video-status', callback);
  },

  /**
   * Listen for processing complete
   */
  onProcessingComplete: (callback: (data: any) => void) => {
    if (!socket) return;
    socket.on('processing-complete', callback);
  },

  /**
   * Remove event listener
   */
  offEvent: (event: string) => {
    if (!socket) return;
    socket.off(event);
  },

  /**
   * Disconnect from server
   */
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  /**
   * Get socket instance
   */
  getSocket: (): Socket | null => {
    return socket;
  }
};
```

### Axios Configuration
```typescript
// Setup default headers and interceptors
import axios from 'axios';

// Create axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Components Deep Dive

### Header Component
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './Header.css';

interface HeaderProps {
  isAuthenticated: boolean;
  user: User | null;
  currentOrganization: Organization | null;
  organizations: Organization[];
  onLogout: () => void;
  onSwitchOrganization: (orgId: string) => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  isAuthenticated,
  user,
  currentOrganization,
  organizations,
  onLogout,
  onSwitchOrganization
}) => {
  const navigate = useNavigate();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  const handleLogout = () => {
    authService.logout();
    onLogout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="logo" onClick={() => navigate('/')}>
        Video Platform
      </div>

      {isAuthenticated ? (
        <>
          <nav className="nav-links">
            <a href="/upload" onClick={(e) => {
              e.preventDefault();
              navigate('/upload');
            }}>
              Upload
            </a>
            <a href="/my-videos">My Videos</a>
            <a href="/all-videos">All Videos</a>
          </nav>

          <div className="user-section">
            {/* Organization Switcher */}
            <div className="org-selector">
              <button 
                className="org-button"
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              >
                {currentOrganization?.name} ▼
              </button>

              {showOrgDropdown && (
                <div className="org-dropdown">
                  {organizations.map(org => (
                    <button
                      key={org.id}
                      onClick={async () => {
                        await onSwitchOrganization(org.id);
                        setShowOrgDropdown(false);
                      }}
                      className={org.id === currentOrganization?.id ? 'active' : ''}
                    >
                      {org.name} ({org.role})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Info */}
            <span className="user-email">{user?.email}</span>

            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </>
      ) : (
        <nav className="nav-links">
          <button onClick={() => navigate('/login')}>Login</button>
          <button onClick={() => navigate('/register')}>Register</button>
        </nav>
      )}
    </header>
  );
};
```

### ProgressBar Component
```typescript
import './ProgressBar.css';

interface ProgressBarProps {
  progress: number;  // 0-100
  isVisible: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  isVisible,
  label = 'Uploading...'
}) => {
  if (!isVisible) return null;

  return (
    <div className="progress-container">
      <div className="progress-label">
        {label} {progress}%
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
```

### Toast Notification Component
```typescript
import { useState, useEffect } from 'react';
import './Toast.css';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export const Toast: React.FC<Toast> = ({ message, type, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => setIsVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  if (!isVisible) return null;

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button onClick={() => setIsVisible(false)}>✕</button>
    </div>
  );
};

// Custom hook for easier usage
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    const toast: Toast = { id, message, type };

    setToasts(prev => [...prev, toast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return {
    toasts,
    addToast,
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info')
  };
};
```

---

## Pages Deep Dive

### UploadVideo Page
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { OrganizationContext } from '../context/OrganizationContext';
import { videoService } from '../services/videoService';
import { socketService } from '../services/socketService';
import { ProgressBar } from '../components/ProgressBar';
import { useToast } from '../components/Toast';
import '../styles/Upload.css';

export const UploadVideo: React.FC = () => {
  const navigate = useNavigate();
  const context = useContext(OrganizationContext);
  const { success, error } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  if (!context?.currentOrganization) {
    return <div>Please select an organization</div>;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      error('Please select a valid video file');
      return;
    }

    // Validate file size (500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      error('File size exceeds 500MB limit');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !title) {
      error('Please select a file and enter a title');
      return;
    }

    try {
      setIsUploading(true);

      // Upload video
      const response = await videoService.uploadVideo(
        selectedFile,
        title,
        description
      );

      setVideoId(response.data._id);
      success('Video uploaded! Processing started...');

      // Join Socket.io room for real-time updates
      socketService.joinOrganization(context.currentOrganization.id);

      // Listen for processing complete
      socketService.onProcessingComplete((data) => {
        if (data.videoId === response.data._id) {
          success(`Video processing complete! Sensitivity: ${data.sensitivity.score}`);
          
          // Redirect to video player after 2 seconds
          setTimeout(() => {
            navigate(`/video/${data.videoId}`);
          }, 2000);
        }
      });

      // Listen for processing status
      socketService.onVideoStatus((data) => {
        if (data.videoId === response.data._id) {
          console.log('Status:', data.status);
        }
      });

    } catch (err: any) {
      error(err.response?.data?.error || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h1>Upload Video</h1>

      <form onSubmit={handleUpload} className="upload-form">
        <div className="form-group">
          <label htmlFor="title">Video Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            disabled={isUploading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter video description"
            disabled={isUploading}
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="video">Select Video File *</label>
          <input
            id="video"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            required
          />
          {selectedFile && (
            <div className="file-info">
              <p>File: {selectedFile.name}</p>
              <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
        </div>

        <ProgressBar 
          progress={uploadProgress}
          isVisible={isUploading}
          label="Uploading"
        />

        <button 
          type="submit" 
          disabled={!selectedFile || !title || isUploading}
          className="upload-btn"
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>

      {videoId && (
        <div className="upload-success">
          <p>Video uploaded! ID: {videoId}</p>
          <p>Processing... Check back soon for sensitivity analysis.</p>
        </div>
      )}
    </div>
  );
};
```

### VideoPlayer Page
```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { videoService } from '../services/videoService';
import { Video } from '../services/types';
import '../styles/Videos.css';

export const VideoPlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVideo();
  }, [id]);

  const loadVideo = async () => {
    try {
      if (!id) return;

      setIsLoading(true);
      const response = await videoService.getVideoById(id);
      setVideo(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!video) return <div>Video not found</div>;

  // Show if still processing
  if (video.status !== 'completed') {
    return (
      <div className="video-processing">
        <h2>{video.title}</h2>
        <p>Status: {video.status}</p>
        <p>Video is being processed. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      <div className="video-wrapper">
        <video 
          controls 
          width="100%"
          src={videoService.getVideoStreamUrl(video._id)}
        />
      </div>

      <div className="video-info">
        <h1>{video.title}</h1>
        <p>{video.description}</p>

        <div className="metadata">
          <span>Duration: {video.duration}s</span>
          <span>Resolution: {video.resolution}</span>
          <span>Size: {(video.fileSize! / 1024 / 1024).toFixed(2)} MB</span>
        </div>

        {/* Sensitivity Analysis Results */}
        <div className={`sensitivity ${video.sensitivity.isFlagged ? 'flagged' : 'safe'}`}>
          <h3>Content Analysis</h3>
          <p>Score: {video.sensitivity.score}</p>
          {video.sensitivity.isFlagged && (
            <div className="flagged-reasons">
              <p>⚠️ This video contains sensitive content:</p>
              <ul>
                {video.sensitivity.flaggedReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

## Real-time Communication

### Socket.io Integration in Components
```typescript
import { useEffect } from 'react';
import { socketService } from '../services/socketService';

export const VideoUploadWithRealtime: React.FC = () => {
  useEffect(() => {
    // Connect to Socket.io when component mounts
    const token = localStorage.getItem('authToken');
    if (token) {
      const socket = socketService.connect(token);

      // Join organization room
      socketService.joinOrganization(organizationId);

      // Listen for events
      socketService.onVideoStatus((data) => {
        console.log('Video status:', data);
        // Update UI with status
      });

      socketService.onProcessingComplete((data) => {
        console.log('Processing complete:', data);
        // Show completion message
      });

      // Cleanup on unmount
      return () => {
        socketService.leaveOrganization(organizationId);
        socketService.offEvent('video-status');
        socketService.offEvent('processing-complete');
      };
    }
  }, [organizationId]);

  return <div>Component</div>;
};
```

---

## Error Handling & Validation

### Form Validation
```typescript
interface ValidationErrors {
  [key: string]: string;
}

const validateForm = (formData: any): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!formData.email.includes('@')) {
    errors.email = 'Invalid email format';
  }

  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return errors;
};

// Usage in form
const [errors, setErrors] = useState<ValidationErrors>({});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const validationErrors = validateForm(formData);
  
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  // Submit form
};

// Render errors
{errors.email && <span className="error">{errors.email}</span>}
```

### API Error Handling
```typescript
try {
  const response = await axios.post('/api/login', credentials);
  // Success
} catch (error: any) {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    if (status === 401) {
      showError('Invalid credentials');
    } else if (status === 422) {
      // Validation errors from backend
      Object.entries(data.errors).forEach(([field, message]) => {
        setFieldError(field, message);
      });
    } else {
      showError(data.error || 'An error occurred');
    }
  } else if (error.request) {
    // Request made but no response
    showError('Network error. Please check your connection.');
  } else {
    // Error setting up request
    showError('An unexpected error occurred');
  }
}
```

---

## Testing

### Component Testing with React Testing Library
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from '../pages/Login';

describe('Login Page', () => {
  test('renders login form', () => {
    render(<Login />);
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('shows error for invalid email', async () => {
    render(<Login />);
    
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'invalid-email' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    render(<Login />);
    
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      // Assert API was called or navigation occurred
      expect(window.location.pathname).toBe('/dashboard');
    });
  });
});
```

---

## Build & Deployment

### Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  },
  define: {
    'process.env': {}
  }
})
```

### Environment Variables Setup
```bash
# .env.development
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# .env.production
VITE_API_URL=https://api.example.com/api
VITE_SOCKET_URL=https://api.example.com
```

### Production Build
```bash
# Build frontend
npm run build

# Creates optimized dist/ folder
# Ready for deployment to Vercel, Netlify, etc.

# Test production build locally
npm run preview
```

---

**This comprehensive frontend guide covers all major concepts, patterns, and implementation details for the React/TypeScript video platform!**
