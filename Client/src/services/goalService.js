import api from './api';

const goalService = {
  getGoals: () => api.get('/goals').then(r => r.data),
  createGoal: (data) => api.post('/goals', data).then(r => r.data),
  updateGoal: (id, data) => api.put(`/goals/${id}`, data).then(r => r.data),
  deleteGoal: (id) => api.delete(`/goals/${id}`).then(r => r.data),
  addContribution: (id, data) => api.post(`/goals/${id}/contribute`, data).then(r => r.data),
};
export default goalService;
