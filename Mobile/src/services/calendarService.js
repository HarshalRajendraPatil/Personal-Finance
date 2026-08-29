import api from './api';

const getCalendarEvents = async (startDate, endDate) => {
  const response = await api.get(
    `/calendar/events?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data;
};

const calendarService = {
  getCalendarEvents,
};

export default calendarService;
