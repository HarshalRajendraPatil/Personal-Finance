import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import budgetService from '../services/budgetService';

const initialState = {
  budgets: [],
  isLoading: false,
  error: null,
};

export const fetchBudgets = createAsyncThunk(
  'budgets/fetchWithSpend',
  async (_, thunkAPI) => {
    try {
      return await budgetService.getBudgetsWithSpend();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const createBudget = createAsyncThunk(
  'budgets/create',
  async (data, thunkAPI) => {
    try {
      return await budgetService.createBudget(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const updateBudget = createAsyncThunk(
  'budgets/update',
  async ({ id, data }, thunkAPI) => {
    try {
      return await budgetService.updateBudget(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const deleteBudget = createAsyncThunk(
  'budgets/delete',
  async (id, thunkAPI) => {
    try {
      await budgetService.deleteBudget(id);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

const budgetSlice = createSlice({
  name: 'budgets',
  initialState,
  reducers: {
    clearBudgetError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch with spend
      .addCase(fetchBudgets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.budgets = action.payload || [];
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create
      .addCase(createBudget.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBudget.fulfilled, (state, action) => {
        state.isLoading = false;
        state.budgets.push({
          ...action.payload,
          spent: 0,
          percentage: 0,
          remaining: action.payload.limit,
        });
      })
      .addCase(createBudget.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update
      .addCase(updateBudget.fulfilled, (state, action) => {
        const idx = state.budgets.findIndex(
          (b) => b._id === action.payload._id
        );
        if (idx !== -1) {
          state.budgets[idx] = {
            ...state.budgets[idx],
            ...action.payload,
          };
        }
      })

      // Delete
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.budgets = state.budgets.filter((b) => b._id !== action.payload);
      });
  },
});

export const { clearBudgetError } = budgetSlice.actions;
export default budgetSlice.reducer;
