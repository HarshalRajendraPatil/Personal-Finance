import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import lendingService from '../services/lendingService';

const initialState = {
  lendings: [],
  isLoading: false,
  error: null,
};

export const fetchLendings = createAsyncThunk(
  'lending/fetch',
  async (_, thunkAPI) => {
    try {
      return await lendingService.getLendings();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const createLending = createAsyncThunk(
  'lending/create',
  async (data, thunkAPI) => {
    try {
      return await lendingService.createLending(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const updateLending = createAsyncThunk(
  'lending/update',
  async ({ id, data }, thunkAPI) => {
    try {
      return await lendingService.updateLending(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const deleteLending = createAsyncThunk(
  'lending/delete',
  async (id, thunkAPI) => {
    try {
      await lendingService.deleteLending(id);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const addRepayment = createAsyncThunk(
  'lending/repay',
  async ({ id, data }, thunkAPI) => {
    try {
      return await lendingService.addRepayment(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const settleLending = createAsyncThunk(
  'lending/settle',
  async ({ id, data }, thunkAPI) => {
    try {
      return await lendingService.settle(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

const lendingSlice = createSlice({
  name: 'lending',
  initialState,
  reducers: {
    clearLendingError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchLendings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLendings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lendings = action.payload || [];
      })
      .addCase(fetchLendings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create
      .addCase(createLending.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createLending.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lendings.unshift(action.payload);
      })
      .addCase(createLending.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update
      .addCase(updateLending.fulfilled, (state, action) => {
        const idx = state.lendings.findIndex(
          (l) => l._id === action.payload._id
        );
        if (idx !== -1) {
          state.lendings[idx] = action.payload;
        }
      })

      // Delete
      .addCase(deleteLending.fulfilled, (state, action) => {
        state.lendings = state.lendings.filter((l) => l._id !== action.payload);
      })

      // Repay
      .addCase(addRepayment.fulfilled, (state, action) => {
        const idx = state.lendings.findIndex(
          (l) => l._id === action.payload._id
        );
        if (idx !== -1) {
          state.lendings[idx] = action.payload;
        }
      })

      // Settle
      .addCase(settleLending.fulfilled, (state, action) => {
        const idx = state.lendings.findIndex(
          (l) => l._id === action.payload._id
        );
        if (idx !== -1) {
          state.lendings[idx] = action.payload;
        }
      });
  },
});

export const { clearLendingError } = lendingSlice.actions;
export default lendingSlice.reducer;
