import axios from 'axios';
const API = `${import.meta.env.VITE_API_URL}/loans`;
export const fetchLoans = () => axios.get(API, { withCredentials: true });
export const createLoan = (data) => axios.post(API, data, { withCredentials: true });
export const updateLoan = (id, data) => axios.put(`${API}/${id}`, data, { withCredentials: true });
export const deleteLoan = (id) => axios.delete(`${API}/${id}`, { withCredentials: true });
export const getLoanSchedule = (id) => axios.get(`${API}/${id}/schedule`, { withCredentials: true });
export const addPayment = (id, data) => axios.post(`${API}/${id}/pay`, data, { withCredentials: true });
export const syncLoanEmis = () => axios.post(`${API}/sync-emis`, {}, { withCredentials: true });
