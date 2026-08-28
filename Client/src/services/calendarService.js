import axios from 'axios';
const API = `${import.meta.env.VITE_API_URL}/calendar`;

export const fetchCalendarEvents = (startDate, endDate) => 
  axios.get(`${API}/events?startDate=${startDate}&endDate=${endDate}`, { withCredentials: true });
