import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import investmentService from '../services/investmentService';

const initialState = {
  investments: [],
  isLoading: false,
  error: null,
};

export const fetchInvestments = createAsyncThunk(
  'investments/fetchAll',
  async (_, thunkAPI) => {
    try {
      return await investmentService.getInvestments();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const createInvestment = createAsyncThunk(
  'investments/create',
  async (data, thunkAPI) => {
    try {
      return await investmentService.createInvestment(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const updateInvestment = createAsyncThunk(
  'investments/update',
  async ({ id, data }, thunkAPI) => {
    try {
      return await investmentService.updateInvestment(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const deleteInvestment = createAsyncThunk(
  'investments/delete',
  async (id, thunkAPI) => {
    try {
      await investmentService.deleteInvestment(id);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const updateCurrentValue = createAsyncThunk(
  'investments/updateValue',
  async ({ id, data }, thunkAPI) => {
    try {
      return await investmentService.updateCurrentValue(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

const investmentSlice = createSlice({
  name: 'investments',
  initialState,
  reducers: {
    clearInvestmentError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchInvestments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInvestments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.investments = action.payload || [];
      })
      .addCase(fetchInvestments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create
      .addCase(createInvestment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createInvestment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.investments.unshift(action.payload);
      })
      .addCase(createInvestment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update
      .addCase(updateInvestment.fulfilled, (state, action) => {
        const idx = state.investments.findIndex(
          (i) => i._id === action.payload._id
        );
        if (idx !== -1) {
          state.investments[idx] = action.payload;
        }
      })

      // Delete
      .addCase(deleteInvestment.fulfilled, (state, action) => {
        state.investments = state.investments.filter(
          (i) => i._id !== action.payload
        );
      })

      // Update Value
      .addCase(updateCurrentValue.fulfilled, (state, action) => {
        const idx = state.investments.findIndex(
          (i) => i._id === action.payload._id
        );
        if (idx !== -1) {
          state.investments[idx] = action.payload;
        }
      });
  },
});

export const { clearInvestmentError } = investmentSlice.actions;
export default investmentSlice.reducer;
