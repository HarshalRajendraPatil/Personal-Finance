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

export const previewCSV = createAsyncThunk('transactions/previewCSV', async (data, thunkAPI) => {
  try {
    return await transactionService.previewCSV(data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const importCSV = createAsyncThunk('transactions/importCSV', async (data, thunkAPI) => {
  try {
    return await transactionService.importCSV(data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const scanReceipt = createAsyncThunk('transactions/scanReceipt', async (data, thunkAPI) => {
  try {
    return await transactionService.scanReceipt(data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

const transactionSlice = createSlice({
  name: 'transactions',
  initialState: {
    ...initialState,
    lastBudgetAlert: null,
    importResult: null,
    lastScannedReceipt: null,
    isScanningReceipt: false,
  },
  reducers: {
    clearTransactionError: (state) => { state.error = null; },
    clearBudgetAlert: (state) => { state.lastBudgetAlert = null; },
    clearImportResult: (state) => { state.importResult = null; },
    clearScannedReceipt: (state) => { state.lastScannedReceipt = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchTransactions.fulfilled, (state, action) => { state.isLoading = false; state.transactions = action.payload; })
      .addCase(fetchTransactions.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      
      .addCase(createTransaction.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createTransaction.fulfilled, (state, action) => { 
        state.isLoading = false; 
        state.transactions.unshift(action.payload);
        if (action.payload.budgetAlert) {
          state.lastBudgetAlert = action.payload.budgetAlert;
        }
      })
      .addCase(createTransaction.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      
      .addCase(updateTransaction.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(updateTransaction.fulfilled, (state, action) => { 
        state.isLoading = false; 
        const index = state.transactions.findIndex(t => t._id === action.payload._id);
        if (index !== -1) state.transactions[index] = action.payload;
        if (action.payload.budgetAlert) {
          state.lastBudgetAlert = action.payload.budgetAlert;
        }
      })
      .addCase(updateTransaction.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.transactions = state.transactions.filter(t => t._id !== action.payload);
      })

      .addCase(previewCSV.fulfilled, (state) => {
        state.error = null;
      })

      .addCase(importCSV.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(importCSV.fulfilled, (state, action) => {
        state.isLoading = false;
        state.importResult = action.payload;
        if (action.payload.transactions && Array.isArray(action.payload.transactions)) {
          state.transactions = [...action.payload.transactions, ...state.transactions];
        }
      })
      .addCase(importCSV.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      .addCase(scanReceipt.pending, (state) => {
        state.isScanningReceipt = true;
        state.error = null;
      })
      .addCase(scanReceipt.fulfilled, (state, action) => {
        state.isScanningReceipt = false;
        state.lastScannedReceipt = action.payload;
      })
      .addCase(scanReceipt.rejected, (state, action) => {
        state.isScanningReceipt = false;
        state.error = action.payload;
      });
  }
});

export const { clearTransactionError, clearBudgetAlert, clearImportResult, clearScannedReceipt } = transactionSlice.actions;

// ⚡ Ultra-High-Performance Memoized Selectors via createSelector
export const selectTransactions = (state) => state.transactions.transactions;

export const selectFilteredTransactions = (state, filters = {}) => {
  const { type, account, category, search, startDate, endDate } = filters;
  const list = state.transactions.transactions;
  if (!type && !account && !category && !search && !startDate && !endDate) return list;

  return list.filter((t) => {
    if (type && type !== 'All' && t.type !== type) return false;
    if (account && t.account?._id !== account && t.account !== account && t.toAccount?._id !== account && t.toAccount !== account) {
      return false;
    }
    if (category && t.category?._id !== category && t.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchMerchant = t.merchant && t.merchant.toLowerCase().includes(q);
      const matchNotes = t.notes && t.notes.toLowerCase().includes(q);
      const matchCat = t.category?.name && t.category.name.toLowerCase().includes(q);
      const matchAcc = t.account?.name && t.account.name.toLowerCase().includes(q);
      if (!matchMerchant && !matchNotes && !matchCat && !matchAcc) return false;
    }
    if (startDate && new Date(t.date) < new Date(startDate)) return false;
    if (endDate && new Date(t.date) > new Date(endDate + 'T23:59:59.999Z')) return false;
    return true;
  });
};

export default transactionSlice.reducer;



