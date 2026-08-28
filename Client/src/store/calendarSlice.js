import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as svc from '../services/calendarService';

export const fetchCalendarEvents = createAsyncThunk('calendar/fetchEvents', async ({ startDate, endDate }, { rejectWithValue }) => {
  try { return (await svc.fetchCalendarEvents(startDate, endDate)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

const calendarSlice = createSlice({
  name: 'calendar',
  initialState: { events: [], isLoading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCalendarEvents.pending, (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(fetchCalendarEvents.fulfilled, (s, a) => { s.isLoading = false; s.events = a.payload; });
    builder.addCase(fetchCalendarEvents.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; });
  },
});

export default calendarSlice.reducer;
