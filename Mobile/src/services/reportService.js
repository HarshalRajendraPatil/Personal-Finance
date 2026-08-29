import api from './api';

const reportService = {
  getSummary: async (params) => {
    const res = await api.get('/reports/summary', { params });
    return res.data;
  },
  getByCategory: async (params) => {
    const res = await api.get('/reports/by-category', { params });
    return res.data;
  },
  getMonthlyTrend: async (params) => {
    const res = await api.get('/reports/monthly-trend', { params });
    return res.data;
  },
  exportCsv: async (params) => {
    const res = await api.get('/reports/export-csv', {
      params,
      responseType: 'text',
    });
    return res.data;
  },
};

export default reportService;
