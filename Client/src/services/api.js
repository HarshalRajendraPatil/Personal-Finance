import axios from 'axios';

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

api.interceptors.request.use((config) => {
  if (config.method?.toLowerCase() === 'get') {
    const key = `${config.baseURL || ''}${config.url}?${JSON.stringify(config.params || {})}`;
    if (inFlightRequests.has(key)) {
      // Return existing promise
      config.adapter = () => inFlightRequests.get(key);
    }
  }
  return config;
});

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
      const key = `${error.config.baseURL || ''}${error.config.url}?${JSON.stringify(error.config.params || {})}`;
      inFlightRequests.delete(key);
    }
    return Promise.reject(error);
  }
);

export default api;
