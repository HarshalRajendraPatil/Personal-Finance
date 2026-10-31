import { createContext, useContext, useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const NetworkStatusContext = createContext({
  isOnline: true,
  wasOffline: false,
});

export const NetworkStatusProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowRestoredNotice(true);
        const timer = setTimeout(() => {
          setShowRestoredNotice(false);
          setWasOffline(false);
        }, 3500);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowRestoredNotice(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, wasOffline }}>
      {/* ⚠️ Offline Top Notification Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2.5 shadow-md flex items-center justify-center space-x-2.5 text-xs sm:text-sm font-semibold transition-transform animate-in slide-in-from-top duration-300">
          <WifiOff className="w-4 h-4 animate-pulse flex-shrink-0" />
          <span>You are currently offline. Changes cannot be synchronized until your connection is restored.</span>
        </div>
      )}

      {/* ✅ Reconnected Notification Banner */}
      {isOnline && showRestoredNotice && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white px-4 py-2 shadow-md flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold transition-transform animate-in slide-in-from-top duration-300">
          <Wifi className="w-4 h-4 flex-shrink-0" />
          <span>Connection restored! You are back online.</span>
        </div>
      )}

      <div className={!isOnline || showRestoredNotice ? 'pt-9 transition-all duration-200' : ''}>
        {children}
      </div>
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkStatus = () => useContext(NetworkStatusContext);
export default NetworkStatusContext;

