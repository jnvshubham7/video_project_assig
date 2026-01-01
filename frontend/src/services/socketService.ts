import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

class SocketService {
  socket: Socket | null;
  connected: boolean;
  listeners: Record<string, Array<(data?: any) => void>>;
  currentOrganizationId: string | null | undefined;

  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = {};
    this.currentOrganizationId = null;
  }

  /**
   * Initialize Socket.io connection
   */
  connect(organizationId?: string) {
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

      const sock = this.socket;

      sock.on('connect', () => {
        console.log('✓ Socket connected:', sock.id);
        this.connected = true;

        // Join organization room for real-time updates
        if (organizationId) {
          this.currentOrganizationId = organizationId;
          sock.emit('join-org', organizationId);
          console.log('[SOCKET] Joined organization room:', organizationId);
        }
      });

      sock.on('disconnect', () => {
        console.log('✗ Socket disconnected');
        this.connected = false;
      });

      sock.on('error', (error: any) => {
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
  setupVideoListeners(): void {
    this.socket?.on('video-processing-start', (data: any) => {
      this.emit('video-processing-start', data);
    });

    this.socket?.on('video-progress-update', (data: any) => {
      this.emit('video-progress-update', data);
    });

    this.socket?.on('video-processing-complete', (data: any) => {
      this.emit('video-processing-complete', data);
    });

    this.socket?.on('video-processing-failed', (data: any) => {
      this.emit('video-processing-failed', data);
    });
  }

  /**
   * Register event listener
   */
  on(event: string, callback: (data?: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (data?: any) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event: string, data?: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Switch organization room - leave old room and join new one
   */
  switchOrganizationRoom(newOrganizationId?: string) {
    if (!this.socket?.connected) {
      console.log('[SOCKET] Socket not connected, reconnecting with new org:', newOrganizationId);
      // Socket is disconnected, just reconnect with new org
      this.disconnect();
      this.connect(newOrganizationId);
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
  joinOrganization(organizationId: string) {
    if (this.socket?.connected) {
      this.currentOrganizationId = organizationId;
      this.socket.emit('join-org', organizationId);
      console.log('[SOCKET] Joined organization:', organizationId);
    }
  }

  /**
   * Leave organization room
   */
  leaveOrganization(organizationId: string) {
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
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && !!this.socket?.connected;
  }
}

// Export singleton instance
export default new SocketService();
