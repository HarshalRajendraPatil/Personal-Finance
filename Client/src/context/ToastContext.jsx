import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X, Copy, Check } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, errorId = null, duration = 6000 }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const newToast = { id, type, title, message, errorId, duration };

    setToasts((prev) => [...prev.slice(-3), newToast]); // Keep at most 4 active toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const showError = useCallback((message, errorId = null, title = 'Action Failed') => {
    return addToast({ type: 'error', title, message, errorId });
  }, [addToast]);

  const showSuccess = useCallback((message, title = 'Success') => {
    return addToast({ type: 'success', title, message });
  }, [addToast]);

  const showWarning = useCallback((message, title = 'Notice') => {
    return addToast({ type: 'warning', title, message });
  }, [addToast]);

  const showInfo = useCallback((message, title = 'Info') => {
    return addToast({ type: 'info', title, message });
  }, [addToast]);

  // Global listener for automatic API error broadcasting
  useEffect(() => {
    const handleApiError = (event) => {
      const detail = event?.detail;
      if (!detail) return;

      // Deduplicate recent identical messages
      const isDuplicate = toasts.some((t) => t.message === detail.message);
      if (isDuplicate) return;

      if (detail.statusCode === 401) {
        // Suppress error toast on 401 as user is automatically redirected to the login screen
        return;
      }

      if (detail.isServerError) {
        showError(detail.message, detail.errorId, 'Server Issue Encountered');
      } else if (detail.isOffline || detail.isNetworkError) {
        showWarning(detail.message, 'Network Interruption');
      } else if (detail.isClientError && detail.statusCode !== 404) {
        showError(detail.message, null, 'Unable to Complete Request');
      }
    };

    window.addEventListener('capise:api-error', handleApiError);
    return () => window.removeEventListener('capise:api-error', handleApiError);
  }, [toasts, showError, showWarning]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, showError, showSuccess, showWarning, showInfo }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRef = (e) => {
    e.stopPropagation();
    if (toast.errorId) {
      navigator.clipboard.writeText(toast.errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const typeConfig = {
    error: {
      border: 'border-red-200',
      bg: 'bg-white',
      icon: <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-red-900',
      barColor: 'bg-red-500',
    },
    warning: {
      border: 'border-amber-200',
      bg: 'bg-white',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-amber-900',
      barColor: 'bg-amber-500',
    },
    success: {
      border: 'border-emerald-200',
      bg: 'bg-white',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-emerald-900',
      barColor: 'bg-emerald-500',
    },
    info: {
      border: 'border-indigo-200',
      bg: 'bg-white',
      icon: <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />,
      titleColor: 'text-indigo-900',
      barColor: 'bg-indigo-500',
    },
  };

  const config = typeConfig[toast.type] || typeConfig.info;

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-xl border ${config.border} ${config.bg} p-3.5 shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in-20`}
    >
      <div className="flex items-start space-x-3">
        {config.icon}
        <div className="flex-1 min-w-0 pr-4">
          <p className={`text-xs font-bold ${config.titleColor}`}>{toast.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 break-words leading-relaxed">{toast.message}</p>

          {/* Reference ID Pill with 1-click Copy for Server Errors */}
          {toast.errorId && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-100 text-gray-700 border border-gray-200">
                Ref: {toast.errorId}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="inline-flex items-center text-[10px] text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Copy developer reference ID"
              >
                {copied ? (
                  <span className="flex items-center text-emerald-600 font-semibold">
                    <Check className="w-3 h-3 mr-0.5" /> Copied
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Copy className="w-3 h-3 mr-0.5" /> Copy Ref
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 rounded-md p-0.5 transition-colors cursor-pointer flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${config.barColor} opacity-30`} />
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback dummy if rendered outside ToastProvider
    return {
      addToast: () => { },
      removeToast: () => { },
      showError: () => { },
      showSuccess: () => { },
      showWarning: () => { },
      showInfo: () => { },
    };
  }
  return context;
};

export default ToastContext;

