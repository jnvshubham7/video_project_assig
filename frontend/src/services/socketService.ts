import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = {};
    this.currentOrganizationId = null;
  }

  /**
   * Initialize Socket.io connection
   */
  connect(organizationId) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      this.socket = io(API_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('✓ Socket connected:', this.socket.id);
        this.connected = true;
        
        // Join organization room for real-time updates
        if (organizationId) {
          this.currentOrganizationId = organizationId;
          this.socket.emit('join-org', organizationId);
          console.log('[SOCKET] Joined organization room:', organizationId);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('✗ Socket disconnected');
        this.connected = false;
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Listen for video processing events
      this.setupVideoListeners();
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }

  /**
   * Setup listeners for video processing events
   */
  setupVideoListeners() {
    this.socket.on('video-processing-start', (data) => {
      this.emit('video-processing-start', data);
    });

    this.socket.on('video-progress-update', (data) => {
      this.emit('video-progress-update', data);
    });

    this.socket.on('video-processing-complete', (data) => {
      this.emit('video-processing-complete', data);
    });

    this.socket.on('video-processing-failed', (data) => {
      this.emit('video-processing-failed', data);
    });
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Switch organization room - leave old room and join new one
   */
  switchOrganizationRoom(newOrganizationId) {
    if (!this.socket?.connected) {
      console.log('[SOCKET] Not connected, cannot switch room');
      return;
    }

    // Leave old organization room if exists
    if (this.currentOrganizationId && this.currentOrganizationId !== newOrganizationId) {
      console.log('[SOCKET] Leaving old organization room:', this.currentOrganizationId);
      this.socket.emit('leave-org', this.currentOrganizationId);
    }

    // Join new organization room
    this.currentOrganizationId = newOrganizationId;
    console.log('[SOCKET] Joining new organization room:', newOrganizationId);
    this.socket.emit('join-org', newOrganizationId);
  }

  /**
   * Join organization room
   */
  joinOrganization(organizationId) {
    if (this.socket?.connected) {
      this.currentOrganizationId = organizationId;
      this.socket.emit('join-org', organizationId);
      console.log('[SOCKET] Joined organization:', organizationId);
    }
  }

  /**
   * Leave organization room
   */
  leaveOrganization(organizationId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-org', organizationId);
      console.log('[SOCKET] Left organization:', organizationId);
      if (this.currentOrganizationId === organizationId) {
        this.currentOrganizationId = null;
      }
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

// Export singleton instance
export default new SocketService();
