import axios from 'axios';
const API = `${import.meta.env.VITE_API_URL}/taxes`;

export const fetchTaxRecords = () => axios.get(API, { withCredentials: true });
export const fetchTaxRecordByYear = (year) => axios.get(`${API}/${year}`, { withCredentials: true });
export const updateTaxRecord = (year, data) => axios.put(`${API}/${year}`, data, { withCredentials: true });
export const deleteTaxRecord = (id) => axios.delete(`${API}/record/${id}`, { withCredentials: true });
