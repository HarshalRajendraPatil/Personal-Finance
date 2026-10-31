import axios from 'axios';
import { parseApiError } from '../utils/errorHandler';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ⚡ In-flight Request Deduplication Cache (Prevents redundant simultaneous HTTP requests)
const inFlightRequests = new Map();

api.interceptors.request.use(
  (config) => {
    // 1. Proactive Offline Guard: Reject before hitting the network if the browser is offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineError = new Error('You are currently offline. Please check your internet connection.');
      offlineError.isOffline = true;
      offlineError.code = 'ERR_NETWORK';
      offlineError.__isParsedError = true;
      offlineError.parsed = parseApiError(offlineError);
      return Promise.reject(offlineError);
    }

    // 2. In-flight GET deduplication
    if (config.method?.toLowerCase() === 'get') {
      const key = `${config.baseURL || ''}${config.url}?${JSON.stringify(config.params || {})}`;
      if (inFlightRequests.has(key)) {
        config.adapter = () => inFlightRequests.get(key);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.config?.method?.toLowerCase() === 'get') {
      const key = `${response.config.baseURL || ''}${response.config.url}?${JSON.stringify(response.config.params || {})}`;
      inFlightRequests.delete(key);
    }
    return response;
  },
  (error) => {
    if (error.config?.method?.toLowerCase() === 'get') {
      const key = `${error.config?.baseURL || ''}${error.config?.url}?${JSON.stringify(error.config?.params || {})}`;
      inFlightRequests.delete(key);
    }

    // ⚡ Robust Error Parsing & Formatting
    const method = error.config?.method?.toUpperCase() || 'REQUEST';
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
    const parsed = parseApiError(error, isMutation ? 'transaction or update' : 'data retrieval');

    // Mutate error message for compatibility with redux rejectWithValue / catch blocks
    error.parsed = parsed;
    error.message = parsed.message;
    if (error.response?.data) {
      error.response.data.message = parsed.message;
      if (parsed.errorId) {
        error.response.data.errorId = parsed.errorId;
      }
    }

    // Automatic silent redirect to login on session/cookie expiration (401)
    if (parsed.statusCode === 401 && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('user');
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new CustomEvent('capise:auth-expired'));

      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
      const isPublicPath = publicPaths.some((p) => window.location.pathname.startsWith(p));
      if (!isPublicPath) {
        window.location.replace('/login');
      }
      return Promise.reject(error);
    }

    // Broadcast API error event for global toast feedback (excluding 401 which auto-redirects)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('capise:api-error', { detail: parsed }));
    }

    return Promise.reject(error);
  }
);

export default api;
