import api from './api';

const transactionService = {
  getTransactions: async () => {
    const response = await api.get('/transactions');
    return response.data;
  },
  createTransaction: async (transactionData) => {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },
  updateTransaction: async (id, transactionData) => {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  },
  deleteTransaction: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },
  previewCSV: async (data) => {
    const response = await api.post('/transactions/preview-csv', data);
    return response.data;
  },
  importCSV: async (data) => {
    const response = await api.post('/transactions/import-csv', data);
    return response.data;
  },
  scanReceipt: async (data) => {
    const response = await api.post('/transactions/scan-receipt', data);
    return response.data;
  },
};

export default transactionService;


