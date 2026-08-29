import api from './api';

const loanService = {
  getLoans: async () => {
    const res = await api.get('/loans');
    return res.data;
  },
  createLoan: async (data) => {
    const res = await api.post('/loans', data);
    return res.data;
  },
  updateLoan: async (id, data) => {
    const res = await api.put(`/loans/${id}`, data);
    return res.data;
  },
  deleteLoan: async (id) => {
    const res = await api.delete(`/loans/${id}`);
    return res.data;
  },
  getLoanSchedule: async (id) => {
    const res = await api.get(`/loans/${id}/schedule`);
    return res.data;
  },
  addPayment: async (id, data) => {
    const res = await api.post(`/loans/${id}/pay`, data);
    return res.data;
  },
};

export default loanService;
