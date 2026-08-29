import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import goalService from '../services/goalService';

const initialState = {
  goals: [],
  isLoading: false,
  error: null,
};

export const fetchGoals = createAsyncThunk(
  'goals/fetch',
  async (_, thunkAPI) => {
    try {
      return await goalService.getGoals();
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const createGoal = createAsyncThunk(
  'goals/create',
  async (data, thunkAPI) => {
    try {
      return await goalService.createGoal(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const updateGoal = createAsyncThunk(
  'goals/update',
  async ({ id, data }, thunkAPI) => {
    try {
      return await goalService.updateGoal(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const deleteGoal = createAsyncThunk(
  'goals/delete',
  async (id, thunkAPI) => {
    try {
      await goalService.deleteGoal(id);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

export const addContribution = createAsyncThunk(
  'goals/contribute',
  async ({ id, data }, thunkAPI) => {
    try {
      return await goalService.addContribution(id, data);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || error.toString()
      );
    }
  }
);

const goalSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    clearGoalError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchGoals.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.goals = action.payload || [];
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create
      .addCase(createGoal.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.isLoading = false;
        state.goals.unshift(action.payload);
      })
      .addCase(createGoal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update
      .addCase(updateGoal.fulfilled, (state, action) => {
        const idx = state.goals.findIndex((g) => g._id === action.payload._id);
        if (idx !== -1) {
          state.goals[idx] = action.payload;
        }
      })

      // Delete
      .addCase(deleteGoal.fulfilled, (state, action) => {
        state.goals = state.goals.filter((g) => g._id !== action.payload);
      })

      // Contribute
      .addCase(addContribution.fulfilled, (state, action) => {
        const idx = state.goals.findIndex((g) => g._id === action.payload._id);
        if (idx !== -1) {
          state.goals[idx] = action.payload;
        }
      });
  },
});

export const { clearGoalError } = goalSlice.actions;
export default goalSlice.reducer;
