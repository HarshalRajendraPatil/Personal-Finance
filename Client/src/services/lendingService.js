import api from './api';

const lendingService = {
  getLendings: () => api.get('/lending').then(r => r.data),
  createLending: (data) => api.post('/lending', data).then(r => r.data),
  updateLending: (id, data) => api.put(`/lending/${id}`, data).then(r => r.data),
  deleteLending: (id) => api.delete(`/lending/${id}`).then(r => r.data),
  addRepayment: (id, data) => api.post(`/lending/${id}/repay`, data).then(r => r.data),
  settle: (id, data) => api.post(`/lending/${id}/settle`, data).then(r => r.data),
};
export default lendingService;
