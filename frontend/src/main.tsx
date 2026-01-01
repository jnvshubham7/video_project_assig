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
const org = localStorage.getItem('organization');
if (token && org) {
  try {
    const organization = JSON.parse(org);
    socketService.connect(organization.id);
  } catch (error) {
    console.error('Failed to initialize socket:', error);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
