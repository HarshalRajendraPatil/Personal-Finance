import api from './api';

const investmentService = {
  getInvestments: async () => {
    const res = await api.get('/investments');
    return res.data;
  },
  createInvestment: async (data) => {
    const res = await api.post('/investments', data);
    return res.data;
  },
  updateInvestment: async (id, data) => {
    const res = await api.put(`/investments/${id}`, data);
    return res.data;
  },
  deleteInvestment: async (id) => {
    const res = await api.delete(`/investments/${id}`);
    return res.data;
  },
  updateCurrentValue: async (id, data) => {
    const res = await api.put(`/investments/${id}/value`, data);
    return res.data;
  },
};

export default investmentService;
