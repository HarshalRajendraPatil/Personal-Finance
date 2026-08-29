import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import calendarService from '../services/calendarService';

export const fetchCalendarEvents = createAsyncThunk(
  'calendar/fetchEvents',
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      return await calendarService.getCalendarEvents(startDate, endDate);
    } catch (e) {
      return rejectWithValue(
        e.response?.data?.message || e.message || 'Failed to fetch calendar events'
      );
    }
  }
);

const calendarSlice = createSlice({
  name: 'calendar',
  initialState: {
    events: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCalendarEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCalendarEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events = action.payload;
      })
      .addCase(fetchCalendarEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export default calendarSlice.reducer;
