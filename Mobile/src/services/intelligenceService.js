import api from './api';

const getHealthScore = async () => {
  const response = await api.get('/intelligence/health-score');
  return response.data;
};

const getMonthlyReview = async (month, year) => {
  const query =
    month !== undefined && year !== undefined
      ? `?month=${month}&year=${year}`
      : '';
  const response = await api.get(`/intelligence/monthly-review${query}`);
  return response.data;
};

const getSpendingInsights = async () => {
  const response = await api.get('/intelligence/spending-insights');
  return response.data;
};

const getCashflowForecast = async (affordAmount) => {
  const query = affordAmount ? `?affordAmount=${affordAmount}` : '';
  const response = await api.get(`/intelligence/cashflow-forecast${query}`);
  return response.data;
};

const getLongtermProjection = async (params = {}) => {
  const { salaryGrowthRate, investmentReturnRate, inflationRate } = params;
  const query = new URLSearchParams();
  if (salaryGrowthRate !== undefined)
    query.set('salaryGrowthRate', salaryGrowthRate);
  if (investmentReturnRate !== undefined)
    query.set('investmentReturnRate', investmentReturnRate);
  if (inflationRate !== undefined)
    query.set('inflationRate', inflationRate);
  const response = await api.get(
    `/intelligence/longterm-projection${
      query.toString() ? '?' + query.toString() : ''
    }`
  );
  return response.data;
};

const intelligenceService = {
  getHealthScore,
  getMonthlyReview,
  getSpendingInsights,
  getCashflowForecast,
  getLongtermProjection,
};

export default intelligenceService;
