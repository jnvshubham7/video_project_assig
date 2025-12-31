import { useState, useEffect } from 'react';
import './Toast.css';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

function ToastComponent({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(message.id);
    }, message.duration || 3000);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className={`toast toast-${message.type}`}>
      <div className="toast-icon">
        {message.type === 'success' && '✓'}
        {message.type === 'error' && '✕'}
        {message.type === 'info' && 'ℹ'}
        {message.type === 'warning' && '⚠'}
      </div>
      <div className="toast-message">{message.message}</div>
      <button 
        className="toast-close" 
        onClick={() => onClose(message.id)}
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: ToastMessage[]; onClose: (id: string) => void }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastComponent 
          key={toast.id} 
          message={toast} 
          onClose={onClose}
        />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration?: number) => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
