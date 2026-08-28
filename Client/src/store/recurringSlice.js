import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import recurringService from '../services/recurringService';

const initialState = {
  rules: [],
  isLoading: false,
  error: null,
};

export const fetchRecurringRules = createAsyncThunk('recurring/fetch', async (_, thunkAPI) => {
  try {
    return await recurringService.getRules();
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const createRecurringRule = createAsyncThunk('recurring/create', async (data, thunkAPI) => {
  try {
    return await recurringService.createRule(data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const updateRecurringRule = createAsyncThunk('recurring/update', async ({ id, data }, thunkAPI) => {
  try {
    return await recurringService.updateRule(id, data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const deleteRecurringRule = createAsyncThunk('recurring/delete', async (id, thunkAPI) => {
  try {
    await recurringService.deleteRule(id);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const payBill = createAsyncThunk('recurring/pay', async ({ id, data }, thunkAPI) => {
  try {
    return await recurringService.payBill(id, data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

const recurringSlice = createSlice({
  name: 'recurring',
  initialState,
  reducers: {
    clearRecurringError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecurringRules.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchRecurringRules.fulfilled, (state, action) => { state.isLoading = false; state.rules = action.payload; })
      .addCase(fetchRecurringRules.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      .addCase(createRecurringRule.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createRecurringRule.fulfilled, (state, action) => { state.isLoading = false; state.rules.push(action.payload); })
      .addCase(createRecurringRule.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      .addCase(updateRecurringRule.fulfilled, (state, action) => {
        const idx = state.rules.findIndex(r => r._id === action.payload._id);
        if (idx !== -1) state.rules[idx] = action.payload;
      })

      .addCase(deleteRecurringRule.fulfilled, (state, action) => {
        state.rules = state.rules.filter(r => r._id !== action.payload);
      })

      .addCase(payBill.fulfilled, (state, action) => {
        const idx = state.rules.findIndex(r => r._id === action.payload.rule._id);
        if (idx !== -1) state.rules[idx] = action.payload.rule;
      });
  }
});

export const { clearRecurringError } = recurringSlice.actions;
export default recurringSlice.reducer;
