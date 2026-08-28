import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import lendingService from '../services/lendingService';

export const fetchLendings = createAsyncThunk('lending/fetch', async (_, { rejectWithValue }) => {
  try { return await lendingService.getLendings(); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const createLending = createAsyncThunk('lending/create', async (data, { rejectWithValue }) => {
  try { return await lendingService.createLending(data); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateLending = createAsyncThunk('lending/update', async ({ id, data }, { rejectWithValue }) => {
  try { return await lendingService.updateLending(id, data); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const deleteLending = createAsyncThunk('lending/delete', async (id, { rejectWithValue }) => {
  try { await lendingService.deleteLending(id); return id; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const addRepayment = createAsyncThunk('lending/repay', async ({ id, data }, { rejectWithValue }) => {
  try { return await lendingService.addRepayment(id, data); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const settleLending = createAsyncThunk('lending/settle', async ({ id, data }, { rejectWithValue }) => {
  try { return await lendingService.settle(id, data); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

const lendingSlice = createSlice({
  name: 'lending',
  initialState: { lendings: [], isLoading: false, error: null },
  reducers: { clearError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    const loading = (state) => { state.isLoading = true; state.error = null; };
    const failed = (state, action) => { state.isLoading = false; state.error = action.payload; };
    builder
      .addCase(fetchLendings.pending, loading)
      .addCase(fetchLendings.fulfilled, (state, action) => { state.isLoading = false; state.lendings = action.payload; })
      .addCase(fetchLendings.rejected, failed)
      .addCase(createLending.pending, loading)
      .addCase(createLending.fulfilled, (state, action) => { state.isLoading = false; state.lendings.unshift(action.payload); })
      .addCase(createLending.rejected, failed)
      .addCase(updateLending.fulfilled, (state, action) => { const i = state.lendings.findIndex(l => l._id === action.payload._id); if (i !== -1) state.lendings[i] = action.payload; })
      .addCase(deleteLending.fulfilled, (state, action) => { state.lendings = state.lendings.filter(l => l._id !== action.payload); })
      .addCase(addRepayment.fulfilled, (state, action) => { const i = state.lendings.findIndex(l => l._id === action.payload.lending._id); if (i !== -1) state.lendings[i] = action.payload.lending; })
      .addCase(settleLending.fulfilled, (state, action) => { const i = state.lendings.findIndex(l => l._id === action.payload.lending._id); if (i !== -1) state.lendings[i] = action.payload.lending; });
  }
});
export const { clearError } = lendingSlice.actions;
export default lendingSlice.reducer;
