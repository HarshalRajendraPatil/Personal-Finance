import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as svc from '../services/loanService';

const handle = (builder, thunk) => {
  builder.addCase(thunk.pending, (s) => { s.isLoading = true; s.error = null; });
  builder.addCase(thunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; });
};

export const fetchLoans = createAsyncThunk('loans/fetchAll', async (_, { rejectWithValue }) => {
  try { return (await svc.fetchLoans()).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const createLoan = createAsyncThunk('loans/create', async (data, { rejectWithValue }) => {
  try { return (await svc.createLoan(data)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateLoan = createAsyncThunk('loans/update', async ({ id, data }, { rejectWithValue }) => {
  try { return (await svc.updateLoan(id, data)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const deleteLoan = createAsyncThunk('loans/delete', async (id, { rejectWithValue }) => {
  try { await svc.deleteLoan(id); return id; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const addPayment = createAsyncThunk('loans/addPayment', async ({ id, data }, { rejectWithValue }) => {
  try { return (await svc.addPayment(id, data)).data.loan; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

const loanSlice = createSlice({
  name: 'loans',
  initialState: { loans: [], isLoading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    handle(builder, fetchLoans);
    builder.addCase(fetchLoans.fulfilled, (s, a) => { s.isLoading = false; s.loans = a.payload; });
    handle(builder, createLoan);
    builder.addCase(createLoan.fulfilled, (s, a) => { s.isLoading = false; s.loans.unshift(a.payload); });
    handle(builder, updateLoan);
    builder.addCase(updateLoan.fulfilled, (s, a) => { s.isLoading = false; s.loans = s.loans.map(l => l._id === a.payload._id ? a.payload : l); });
    handle(builder, deleteLoan);
    builder.addCase(deleteLoan.fulfilled, (s, a) => { s.isLoading = false; s.loans = s.loans.filter(l => l._id !== a.payload); });
    handle(builder, addPayment);
    builder.addCase(addPayment.fulfilled, (s, a) => { s.isLoading = false; s.loans = s.loans.map(l => l._id === a.payload._id ? a.payload : l); });
  },
});
export default loanSlice.reducer;
