import api from './api';

const accountService = {
  getAccounts: async () => {
    const response = await api.get('/accounts');
    return response.data;
  },
  createAccount: async (accountData) => {
    const response = await api.post('/accounts', accountData);
    return response.data;
  },
  updateAccount: async (id, accountData) => {
    const response = await api.put(`/accounts/${id}`, accountData);
    return response.data;
  },
  deleteAccount: async (id) => {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
  },
};

export default accountService;
