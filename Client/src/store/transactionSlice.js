import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import transactionService from '../services/transactionService';

const initialState = {
  transactions: [],
  isLoading: false,
  error: null,
};

export const fetchTransactions = createAsyncThunk('transactions/fetch', async (_, thunkAPI) => {
  try {
    return await transactionService.getTransactions();
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const createTransaction = createAsyncThunk('transactions/create', async (data, thunkAPI) => {
  try {
    return await transactionService.createTransaction(data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const updateTransaction = createAsyncThunk('transactions/update', async ({ id, data }, thunkAPI) => {
  try {
    return await transactionService.updateTransaction(id, data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const deleteTransaction = createAsyncThunk('transactions/delete', async (id, thunkAPI) => {
  try {
    await transactionService.deleteTransaction(id);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    clearTransactionError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchTransactions.fulfilled, (state, action) => { state.isLoading = false; state.transactions = action.payload; })
      .addCase(fetchTransactions.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      
      .addCase(createTransaction.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createTransaction.fulfilled, (state, action) => { 
        state.isLoading = false; 
        state.transactions.unshift(action.payload); // Add new transaction to beginning
      })
      .addCase(createTransaction.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      
      .addCase(updateTransaction.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(updateTransaction.fulfilled, (state, action) => { 
        state.isLoading = false; 
        const index = state.transactions.findIndex(t => t._id === action.payload._id);
        if (index !== -1) state.transactions[index] = action.payload;
      })
      .addCase(updateTransaction.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.transactions = state.transactions.filter(t => t._id !== action.payload);
      });
  }
});

export const { clearTransactionError } = transactionSlice.actions;
export default transactionSlice.reducer;
