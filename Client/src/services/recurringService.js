import api from './api';

const recurringService = {
  getRules: async () => {
    const res = await api.get('/recurring');
    return res.data;
  },
  createRule: async (data) => {
    const res = await api.post('/recurring', data);
    return res.data;
  },
  updateRule: async (id, data) => {
    const res = await api.put(`/recurring/${id}`, data);
    return res.data;
  },
  deleteRule: async (id) => {
    const res = await api.delete(`/recurring/${id}`);
    return res.data;
  },
  payBill: async (id, data) => {
    const res = await api.post(`/recurring/${id}/pay`, data);
    return res.data;
  }
};

export default recurringService;
