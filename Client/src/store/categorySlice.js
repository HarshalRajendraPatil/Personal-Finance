import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import categoryService from '../services/categoryService';

const initialState = {
  categories: [],
  isLoading: false,
  error: null,
};

export const fetchCategories = createAsyncThunk('categories/fetch', async (_, thunkAPI) => {
  try {
    return await categoryService.getCategories();
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const createCategory = createAsyncThunk('categories/create', async (data, thunkAPI) => {
  try {
    return await categoryService.createCategory(data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const updateCategory = createAsyncThunk('categories/update', async ({ id, data }, thunkAPI) => {
  try {
    return await categoryService.updateCategory(id, data);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const deleteCategory = createAsyncThunk('categories/delete', async (id, thunkAPI) => {
  try {
    await categoryService.deleteCategory(id);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const seedCategories = createAsyncThunk('categories/seed', async (_, thunkAPI) => {
  try {
    await categoryService.seedCategories();
    return await categoryService.getCategories(); // refetch after seed
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearCategoryError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCategories.fulfilled, (state, action) => { state.isLoading = false; state.categories = action.payload; })
      .addCase(fetchCategories.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      
      .addCase(createCategory.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createCategory.fulfilled, (state, action) => { state.isLoading = false; state.categories.push(action.payload); })
      .addCase(createCategory.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.categories.findIndex(c => c._id === action.payload._id);
        if (index !== -1) state.categories[index] = action.payload;
        
        // Also update subcategories' icon/color if parent was updated
        if (!action.payload.parent) {
          state.categories = state.categories.map(c => {
            if (c.parent === action.payload._id) {
              return { ...c, icon: action.payload.icon, color: action.payload.color };
            }
            return c;
          });
        }
      })
      
      .addCase(deleteCategory.fulfilled, (state, action) => {
        // Remove category and its subcategories
        state.categories = state.categories.filter(c => c._id !== action.payload && c.parent !== action.payload);
      })
      
      .addCase(seedCategories.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(seedCategories.fulfilled, (state, action) => { state.isLoading = false; state.categories = action.payload; })
      .addCase(seedCategories.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; });
  }
});

export const { clearCategoryError } = categorySlice.actions;
export default categorySlice.reducer;
