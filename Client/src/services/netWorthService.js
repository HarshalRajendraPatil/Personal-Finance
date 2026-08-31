import axios from 'axios';
const API = `${import.meta.env.VITE_API_URL}/networth`;
export const fetchCurrentNetWorth = () => axios.get(`${API}/current`, { withCredentials: true });
export const fetchNetWorthHistory = () => axios.get(`${API}/history`, { withCredentials: true });
export const takeSnapshot = (data) => axios.post(`${API}/snapshot`, data, { withCredentials: true });
export const triggerAutoSnapshot = (data) => axios.post(`${API}/auto-capture`, data, { withCredentials: true });
