import api from './api';

const netWorthService = {
  getCurrentNetWorth: async () => {
    const res = await api.get('/networth/current');
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/networth/history');
    return res.data;
  },
  takeSnapshot: async (data = {}) => {
    const res = await api.post('/networth/snapshot', data);
    return res.data;
  },
};

export default netWorthService;
