import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import intelligenceService from '../services/intelligenceService';

export const fetchHealthScore = createAsyncThunk(
  'intelligence/fetchHealthScore',
  async (_, thunkAPI) => {
    try {
      return await intelligenceService.getHealthScore();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch health score'
      );
    }
  }
);

export const fetchMonthlyReview = createAsyncThunk(
  'intelligence/fetchMonthlyReview',
  async ({ month, year } = {}, thunkAPI) => {
    try {
      return await intelligenceService.getMonthlyReview(month, year);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch monthly review'
      );
    }
  }
);

export const fetchSpendingInsights = createAsyncThunk(
  'intelligence/fetchSpendingInsights',
  async (_, thunkAPI) => {
    try {
      return await intelligenceService.getSpendingInsights();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch spending insights'
      );
    }
  }
);

export const fetchCashflowForecast = createAsyncThunk(
  'intelligence/fetchCashflowForecast',
  async (affordAmount, thunkAPI) => {
    try {
      return await intelligenceService.getCashflowForecast(affordAmount);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch cash flow forecast'
      );
    }
  }
);

export const fetchLongtermProjection = createAsyncThunk(
  'intelligence/fetchLongtermProjection',
  async (params, thunkAPI) => {
    try {
      return await intelligenceService.getLongtermProjection(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch long term projection'
      );
    }
  }
);

const intelligenceSlice = createSlice({
  name: 'intelligence',
  initialState: {
    healthScore: null,
    monthlyReview: null,
    spendingInsights: null,
    cashflowForecast: null,
    longtermProjection: null,
    isLoading: false,
    isLoadingInsights: false,
    isLoadingForecast: false,
    isLoadingProjection: false,
    error: null,
  },
  reducers: {
    clearIntelligenceError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Health Score
      .addCase(fetchHealthScore.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHealthScore.fulfilled, (state, action) => {
        state.isLoading = false;
        state.healthScore = action.payload;
      })
      .addCase(fetchHealthScore.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Monthly Review
      .addCase(fetchMonthlyReview.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMonthlyReview.fulfilled, (state, action) => {
        state.isLoading = false;
        state.monthlyReview = action.payload;
      })
      .addCase(fetchMonthlyReview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Spending Insights
      .addCase(fetchSpendingInsights.pending, (state) => {
        state.isLoadingInsights = true;
      })
      .addCase(fetchSpendingInsights.fulfilled, (state, action) => {
        state.isLoadingInsights = false;
        state.spendingInsights = action.payload;
      })
      .addCase(fetchSpendingInsights.rejected, (state, action) => {
        state.isLoadingInsights = false;
        state.error = action.payload;
      })
      // Cashflow Forecast
      .addCase(fetchCashflowForecast.pending, (state) => {
        state.isLoadingForecast = true;
      })
      .addCase(fetchCashflowForecast.fulfilled, (state, action) => {
        state.isLoadingForecast = false;
        state.cashflowForecast = action.payload;
      })
      .addCase(fetchCashflowForecast.rejected, (state, action) => {
        state.isLoadingForecast = false;
        state.error = action.payload;
      })
      // Long-term Projection
      .addCase(fetchLongtermProjection.pending, (state) => {
        state.isLoadingProjection = true;
      })
      .addCase(fetchLongtermProjection.fulfilled, (state, action) => {
        state.isLoadingProjection = false;
        state.longtermProjection = action.payload;
      })
      .addCase(fetchLongtermProjection.rejected, (state, action) => {
        state.isLoadingProjection = false;
        state.error = action.payload;
      });
  },
});

export const { clearIntelligenceError } = intelligenceSlice.actions;
export default intelligenceSlice.reducer;
