import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as svc from '../services/investmentService';

const handle = (builder, thunk) => {
  builder.addCase(thunk.pending, (s) => { s.isLoading = true; s.error = null; });
  builder.addCase(thunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; });
};

export const fetchInvestments = createAsyncThunk('investments/fetchAll', async (_, { rejectWithValue }) => {
  try { return (await svc.fetchInvestments()).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const createInvestment = createAsyncThunk('investments/create', async (data, { rejectWithValue }) => {
  try { return (await svc.createInvestment(data)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateInvestment = createAsyncThunk('investments/update', async ({ id, data }, { rejectWithValue }) => {
  try { return (await svc.updateInvestment(id, data)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const deleteInvestment = createAsyncThunk('investments/delete', async (id, { rejectWithValue }) => {
  try { await svc.deleteInvestment(id); return id; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateCurrentValue = createAsyncThunk('investments/updateValue', async ({ id, data }, { rejectWithValue }) => {
  try { return (await svc.updateCurrentValue(id, data)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const syncAllInvestments = createAsyncThunk('investments/syncAll', async (_, { rejectWithValue }) => {
  try { return (await svc.syncAllInvestments()).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const syncInvestmentPrice = createAsyncThunk('investments/syncPrice', async (id, { rejectWithValue }) => {
  try { return (await svc.syncInvestmentPrice(id)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

const investmentSlice = createSlice({
  name: 'investments',
  initialState: { investments: [], isLoading: false, isSyncing: false, error: null, syncMessage: null },
  reducers: {
    clearSyncMessage: (s) => { s.syncMessage = null; },
  },
  extraReducers: (builder) => {
    handle(builder, fetchInvestments);
    builder.addCase(fetchInvestments.fulfilled, (s, a) => { s.isLoading = false; s.investments = a.payload; });
    handle(builder, createInvestment);
    builder.addCase(createInvestment.fulfilled, (s, a) => { s.isLoading = false; s.investments.unshift(a.payload); });
    handle(builder, updateInvestment);
    builder.addCase(updateInvestment.fulfilled, (s, a) => { s.isLoading = false; s.investments = s.investments.map(i => i._id === a.payload._id ? a.payload : i); });
    handle(builder, deleteInvestment);
    builder.addCase(deleteInvestment.fulfilled, (s, a) => { s.isLoading = false; s.investments = s.investments.filter(i => i._id !== a.payload); });
    handle(builder, updateCurrentValue);
    builder.addCase(updateCurrentValue.fulfilled, (s, a) => { s.isLoading = false; s.investments = s.investments.map(i => i._id === a.payload._id ? a.payload : i); });
    builder.addCase(syncAllInvestments.pending, (s) => { s.isSyncing = true; s.syncMessage = null; });
    builder.addCase(syncAllInvestments.fulfilled, (s, a) => {
      s.isSyncing = false;
      s.investments = a.payload.investments || s.investments;
      s.syncMessage = a.payload.message;
    });
    builder.addCase(syncAllInvestments.rejected, (s, a) => { s.isSyncing = false; s.error = a.payload; });
    builder.addCase(syncInvestmentPrice.fulfilled, (s, a) => {
      if (a.payload.investment) {
        s.investments = s.investments.map(i => i._id === a.payload.investment._id ? a.payload.investment : i);
      }
      s.syncMessage = a.payload.message;
    });
  },
});
export const { clearSyncMessage } = investmentSlice.actions;
export default investmentSlice.reducer;
