import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import accountService from '../services/accountService';

const initialState = {
  accounts: [],
  isLoading: false,
  error: null,
};

export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async (_, thunkAPI) => {
    try {
      return await accountService.getAccounts();
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createAccount = createAsyncThunk(
  'accounts/createAccount',
  async (accountData, thunkAPI) => {
    try {
      return await accountService.createAccount(accountData);
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateAccount = createAsyncThunk(
  'accounts/updateAccount',
  async ({ id, accountData }, thunkAPI) => {
    try {
      return await accountService.updateAccount(id, accountData);
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'accounts/deleteAccount',
  async (id, thunkAPI) => {
    try {
      await accountService.deleteAccount(id);
      return id;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const accountSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    clearAccountError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Accounts
      .addCase(fetchAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts = action.payload || [];
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create Account
      .addCase(createAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts.unshift(action.payload);
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update Account
      .addCase(updateAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.accounts.findIndex((acc) => acc._id === action.payload._id);
        if (index !== -1) {
          state.accounts[index] = action.payload;
        }
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Delete Account
      .addCase(deleteAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts = state.accounts.filter((acc) => acc._id !== action.payload);
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAccountError } = accountSlice.actions;
export default accountSlice.reducer;
