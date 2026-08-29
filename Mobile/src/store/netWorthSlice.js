import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import netWorthService from '../services/netWorthService';

const initialState = {
  current: null,
  history: [],
  isLoading: false,
  error: null,
};

export const fetchCurrentNetWorth = createAsyncThunk(
  'netWorth/fetchCurrent',
  async (_, thunkAPI) => {
    try {
      return await netWorthService.getCurrentNetWorth();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const fetchHistory = createAsyncThunk(
  'netWorth/fetchHistory',
  async (_, thunkAPI) => {
    try {
      return await netWorthService.getHistory();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const takeSnapshot = createAsyncThunk(
  'netWorth/snapshot',
  async (data = {}, thunkAPI) => {
    try {
      return await netWorthService.takeSnapshot(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

const netWorthSlice = createSlice({
  name: 'netWorth',
  initialState,
  reducers: {
    clearNetWorthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Current
      .addCase(fetchCurrentNetWorth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentNetWorth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.current = action.payload;
      })
      .addCase(fetchCurrentNetWorth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Fetch History
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.history = action.payload || [];
      })

      // Take Snapshot
      .addCase(takeSnapshot.fulfilled, (state, action) => {
        state.history.push(action.payload);
      });
  },
});

export const { clearNetWorthError } = netWorthSlice.actions;
export default netWorthSlice.reducer;
