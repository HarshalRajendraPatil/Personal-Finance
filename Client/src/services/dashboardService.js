import api from './api';

const dashboardService = {
  getDashboardData: async (startDate, endDate) => {
    let url = '/dashboard';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await api.get(url);
    return response.data;
  },
};

export default dashboardService;
