import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as svc from '../services/taxService';

const handle = (builder, thunk) => {
  builder.addCase(thunk.pending, (s) => { s.isLoading = true; s.error = null; });
  builder.addCase(thunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; });
};

export const fetchTaxRecords = createAsyncThunk('taxes/fetchAll', async (_, { rejectWithValue }) => {
  try { return (await svc.fetchTaxRecords()).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchTaxRecordByYear = createAsyncThunk('taxes/fetchByYear', async (year, { rejectWithValue }) => {
  try { return (await svc.fetchTaxRecordByYear(year)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const updateTaxRecord = createAsyncThunk('taxes/update', async ({ year, data }, { rejectWithValue }) => {
  try { return (await svc.updateTaxRecord(year, data)).data; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const deleteTaxRecord = createAsyncThunk('taxes/delete', async (id, { rejectWithValue }) => {
  try { await svc.deleteTaxRecord(id); return id; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

const taxSlice = createSlice({
  name: 'taxes',
  initialState: { records: [], currentRecord: null, isLoading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    handle(builder, fetchTaxRecords);
    builder.addCase(fetchTaxRecords.fulfilled, (s, a) => { s.isLoading = false; s.records = a.payload; });
    
    handle(builder, fetchTaxRecordByYear);
    builder.addCase(fetchTaxRecordByYear.fulfilled, (s, a) => { s.isLoading = false; s.currentRecord = a.payload; });
    
    handle(builder, updateTaxRecord);
    builder.addCase(updateTaxRecord.fulfilled, (s, a) => { 
      s.isLoading = false; 
      s.currentRecord = a.payload;
      const idx = s.records.findIndex(r => r._id === a.payload._id);
      if (idx !== -1) s.records[idx] = a.payload;
      else s.records.unshift(a.payload);
    });

    handle(builder, deleteTaxRecord);
    builder.addCase(deleteTaxRecord.fulfilled, (s, a) => { 
      s.isLoading = false; 
      s.records = s.records.filter(r => r._id !== a.payload);
      if (s.currentRecord?._id === a.payload) s.currentRecord = null;
    });
  },
});

export default taxSlice.reducer;
