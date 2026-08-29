import api from './api';

const lendingService = {
  getLendings: async () => {
    const res = await api.get('/lending');
    return res.data;
  },
  createLending: async (data) => {
    const res = await api.post('/lending', data);
    return res.data;
  },
  updateLending: async (id, data) => {
    const res = await api.put(`/lending/${id}`, data);
    return res.data;
  },
  deleteLending: async (id) => {
    const res = await api.delete(`/lending/${id}`);
    return res.data;
  },
  addRepayment: async (id, data) => {
    const res = await api.post(`/lending/${id}/repay`, data);
    return res.data;
  },
  settle: async (id, data = {}) => {
    const res = await api.post(`/lending/${id}/settle`, data);
    return res.data;
  },
};

export default lendingService;
