import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import goalService from '../services/goalService';

export const fetchGoals = createAsyncThunk('goals/fetch', async (_, { rejectWithValue }) => {
  try { return await goalService.getGoals(); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const createGoal = createAsyncThunk('goals/create', async (data, { rejectWithValue }) => {
  try { return await goalService.createGoal(data); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const updateGoal = createAsyncThunk('goals/update', async ({ id, data }, { rejectWithValue }) => {
  try { return await goalService.updateGoal(id, data); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const deleteGoal = createAsyncThunk('goals/delete', async (id, { rejectWithValue }) => {
  try { await goalService.deleteGoal(id); return id; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const addContribution = createAsyncThunk('goals/contribute', async ({ id, data }, { rejectWithValue }) => {
  try { return await goalService.addContribution(id, data); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

const goalSlice = createSlice({
  name: 'goals',
  initialState: { goals: [], isLoading: false, error: null },
  reducers: { clearGoalError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchGoals.fulfilled, (state, action) => { state.isLoading = false; state.goals = action.payload; })
      .addCase(fetchGoals.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(createGoal.pending, (state) => { state.isLoading = true; })
      .addCase(createGoal.fulfilled, (state, action) => { state.isLoading = false; state.goals.unshift(action.payload); })
      .addCase(createGoal.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(updateGoal.fulfilled, (state, action) => { const i = state.goals.findIndex(g => g._id === action.payload._id); if (i !== -1) state.goals[i] = action.payload; })
      .addCase(deleteGoal.fulfilled, (state, action) => { state.goals = state.goals.filter(g => g._id !== action.payload); })
      .addCase(addContribution.fulfilled, (state, action) => { const i = state.goals.findIndex(g => g._id === action.payload.goal._id); if (i !== -1) state.goals[i] = action.payload.goal; });
  }
});
export const { clearGoalError } = goalSlice.actions;
export default goalSlice.reducer;
