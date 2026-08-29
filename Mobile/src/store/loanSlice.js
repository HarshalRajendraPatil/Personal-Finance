import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import loanService from '../services/loanService';

const initialState = {
  loans: [],
  isLoading: false,
  error: null,
};

export const fetchLoans = createAsyncThunk(
  'loans/fetchAll',
  async (_, thunkAPI) => {
    try {
      return await loanService.getLoans();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const createLoan = createAsyncThunk(
  'loans/create',
  async (data, thunkAPI) => {
    try {
      return await loanService.createLoan(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const updateLoan = createAsyncThunk(
  'loans/update',
  async ({ id, data }, thunkAPI) => {
    try {
      return await loanService.updateLoan(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const deleteLoan = createAsyncThunk(
  'loans/delete',
  async (id, thunkAPI) => {
    try {
      await loanService.deleteLoan(id);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const addPayment = createAsyncThunk(
  'loans/addPayment',
  async ({ id, data }, thunkAPI) => {
    try {
      const res = await loanService.addPayment(id, data);
      return res.loan;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

const loanSlice = createSlice({
  name: 'loans',
  initialState,
  reducers: {
    clearLoanError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchLoans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLoans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loans = action.payload || [];
      })
      .addCase(fetchLoans.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create
      .addCase(createLoan.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loans.unshift(action.payload);
      })
      .addCase(createLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update
      .addCase(updateLoan.fulfilled, (state, action) => {
        const idx = state.loans.findIndex((l) => l._id === action.payload._id);
        if (idx !== -1) {
          state.loans[idx] = action.payload;
        }
      })

      // Delete
      .addCase(deleteLoan.fulfilled, (state, action) => {
        state.loans = state.loans.filter((l) => l._id !== action.payload);
      })

      // Add Payment
      .addCase(addPayment.fulfilled, (state, action) => {
        const idx = state.loans.findIndex((l) => l._id === action.payload._id);
        if (idx !== -1) {
          state.loans[idx] = action.payload;
        }
      });
  },
});

export const { clearLoanError } = loanSlice.actions;
export default loanSlice.reducer;
