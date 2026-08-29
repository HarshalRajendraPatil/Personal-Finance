import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import taxService from '../services/taxService';

export const fetchTaxRecords = createAsyncThunk(
  'taxes/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await taxService.getTaxRecords();
    } catch (e) {
      return rejectWithValue(
        e.response?.data?.message || e.message || 'Failed to fetch tax records'
      );
    }
  }
);

export const fetchTaxRecordByYear = createAsyncThunk(
  'taxes/fetchByYear',
  async (year, { rejectWithValue }) => {
    try {
      return await taxService.getTaxRecordByYear(year);
    } catch (e) {
      return rejectWithValue(
        e.response?.data?.message || e.message || 'Failed to fetch tax record'
      );
    }
  }
);

export const updateTaxRecord = createAsyncThunk(
  'taxes/update',
  async ({ year, data }, { rejectWithValue }) => {
    try {
      return await taxService.updateTaxRecord(year, data);
    } catch (e) {
      return rejectWithValue(
        e.response?.data?.message || e.message || 'Failed to update tax record'
      );
    }
  }
);

export const deleteTaxRecord = createAsyncThunk(
  'taxes/delete',
  async (id, { rejectWithValue }) => {
    try {
      await taxService.deleteTaxRecord(id);
      return id;
    } catch (e) {
      return rejectWithValue(
        e.response?.data?.message || e.message || 'Failed to delete tax record'
      );
    }
  }
);

const taxSlice = createSlice({
  name: 'taxes',
  initialState: {
    records: [],
    currentRecord: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearTaxError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchTaxRecords.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTaxRecords.fulfilled, (state, action) => {
        state.isLoading = false;
        state.records = action.payload;
      })
      .addCase(fetchTaxRecords.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Fetch by year
    builder
      .addCase(fetchTaxRecordByYear.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTaxRecordByYear.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRecord = action.payload;
      })
      .addCase(fetchTaxRecordByYear.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Update
    builder
      .addCase(updateTaxRecord.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTaxRecord.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRecord = action.payload;
        const idx = state.records.findIndex(
          (r) => r._id === action.payload._id
        );
        if (idx !== -1) {
          state.records[idx] = action.payload;
        } else {
          state.records.unshift(action.payload);
        }
      })
      .addCase(updateTaxRecord.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Delete
    builder
      .addCase(deleteTaxRecord.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteTaxRecord.fulfilled, (state, action) => {
        state.isLoading = false;
        state.records = state.records.filter((r) => r._id !== action.payload);
        if (state.currentRecord?._id === action.payload) {
          state.currentRecord = null;
        }
      })
      .addCase(deleteTaxRecord.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearTaxError } = taxSlice.actions;
export default taxSlice.reducer;
