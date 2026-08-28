import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as svc from '../services/netWorthService';

export const fetchCurrentNetWorth = createAsyncThunk('netWorth/fetchCurrent', async (_, { rejectWithValue }) => {
  try { return (await svc.fetchCurrentNetWorth()).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const fetchHistory = createAsyncThunk('netWorth/fetchHistory', async (_, { rejectWithValue }) => {
  try { return (await svc.fetchNetWorthHistory()).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const takeSnapshot = createAsyncThunk('netWorth/snapshot', async (data, { rejectWithValue }) => {
  try { return (await svc.takeSnapshot(data)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

const netWorthSlice = createSlice({
  name: 'netWorth',
  initialState: { current: null, history: [], isLoading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCurrentNetWorth.pending, (s) => { s.isLoading = true; })
      .addCase(fetchCurrentNetWorth.fulfilled, (s, a) => { s.isLoading = false; s.current = a.payload; })
      .addCase(fetchCurrentNetWorth.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; });
    builder.addCase(fetchHistory.fulfilled, (s, a) => { s.history = a.payload; });
    builder.addCase(takeSnapshot.fulfilled, (s, a) => { s.history.push(a.payload); });
  },
});
export default netWorthSlice.reducer;
