import api from './api';

const getTaxRecords = async () => {
  const response = await api.get('/taxes');
  return response.data;
};

const getTaxRecordByYear = async (year) => {
  const response = await api.get(`/taxes/${year}`);
  return response.data;
};

const updateTaxRecord = async (year, data) => {
  const response = await api.put(`/taxes/${year}`, data);
  return response.data;
};

const deleteTaxRecord = async (id) => {
  const response = await api.delete(`/taxes/record/${id}`);
  return response.data;
};

const taxService = {
  getTaxRecords,
  getTaxRecordByYear,
  updateTaxRecord,
  deleteTaxRecord,
};

export default taxService;
