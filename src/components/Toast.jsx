import React, { useState, useEffect } from 'react';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose && onClose(), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles = {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '16px 20px',
      borderRadius: '8px',
      color: '#fff',
      fontWeight: '600',
      fontSize: '14px',
      zIndex: 9999,
      minWidth: '300px',
      maxWidth: '500px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      opacity: isVisible ? 1 : 0,
      transition: 'all 0.3s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    };

    const typeStyles = {
      success: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: '1px solid #10b981'
      },
      error: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        border: '1px solid #ef4444'
      },
      warning: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        border: '1px solid #f59e0b'
      },
      info: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: '1px solid #3b82f6'
      }
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  const getIcon = () => {
    const iconStyles = {
      fontSize: '18px',
      flexShrink: 0
    };

    switch (type) {
      case 'success':
        return <span style={iconStyles}>✅</span>;
      case 'error':
        return <span style={iconStyles}>❌</span>;
      case 'warning':
        return <span style={iconStyles}>⚠️</span>;
      case 'info':
        return <span style={iconStyles}>ℹ️</span>;
      default:
        return <span style={iconStyles}>✅</span>;
    }
  };

  return (
    <div style={getToastStyles()}>
      {getIcon()}
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose && onClose(), 300);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0',
          opacity: 0.7,
          flexShrink: 0
        }}
      >
        ×
      </button>
    </div>
  );
};

// Toast Manager Hook
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: `${20 + (index * 80)}px`,
            right: '20px',
            zIndex: 9999
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );

  return { showToast, ToastContainer };
};

export default Toast;