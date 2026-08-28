import api from './api';

const reportService = {
  getSummary: (params) => api.get('/reports/summary', { params }).then(r => r.data),
  getByCategory: (params) => api.get('/reports/by-category', { params }).then(r => r.data),
  getMonthlyTrend: (params) => api.get('/reports/monthly-trend', { params }).then(r => r.data),
  // For CSV export — returns a URL to trigger download
  getExportUrl: (params) => {
    const query = new URLSearchParams(params).toString();
    return `${import.meta?.env?.VITE_API_URL || 'http://localhost:5000'}/api/reports/export-csv?${query}`;
  },
};
export default reportService;
