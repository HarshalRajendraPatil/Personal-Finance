import api from './api';

export const fetchTaxRecords = () => api.get('/taxes');
export const fetchTaxRecordByYear = (year) => api.get(`/taxes/${year}`);
export const fetchTaxAutoSummary = (year) => api.get(`/taxes/auto-summary/${year}`);
export const updateTaxRecord = (year, data) => api.put(`/taxes/${year}`, data);
export const deleteTaxRecord = (id) => api.delete(`/taxes/record/${id}`);
