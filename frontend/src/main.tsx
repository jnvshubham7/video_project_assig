import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'
import socketService from './services/socketService'

// Initialize auth token from localStorage on app start
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Initialize Socket.io connection if authenticated
if (token) {
  try {
    // Decode JWT token to get organizationId
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    const decoded = JSON.parse(jsonPayload);
    
    if (decoded.organizationId) {
      console.log('[MAIN] Initializing socket with org from token:', decoded.organizationId);
      socketService.connect(decoded.organizationId);
    }
  } catch (error) {
    console.error('Failed to initialize socket:', error);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
