import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const Toast = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="var(--success)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--warning)" />;
      case 'danger':
        return <AlertCircle size={18} color="var(--danger)" />;
      default:
        return <Info size={18} color="var(--info)" />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'var(--success)';
      case 'warning':
        return 'var(--warning)';
      case 'danger':
        return 'var(--danger)';
      default:
        return 'var(--info)';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            borderLeft: `4px solid ${getBorderColor(toast.type)}`,
            borderTop: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '0.9rem',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {getIcon(toast.type)}
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
