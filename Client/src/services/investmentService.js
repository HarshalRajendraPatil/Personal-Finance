import axios from 'axios';
const API = `${import.meta.env.VITE_API_URL}/investments`;
export const fetchInvestments = () => axios.get(API, { withCredentials: true });
export const createInvestment = (data) => axios.post(API, data, { withCredentials: true });
export const updateInvestment = (id, data) => axios.put(`${API}/${id}`, data, { withCredentials: true });
export const deleteInvestment = (id) => axios.delete(`${API}/${id}`, { withCredentials: true });
export const updateCurrentValue = (id, data) => axios.put(`${API}/${id}/value`, data, { withCredentials: true });
