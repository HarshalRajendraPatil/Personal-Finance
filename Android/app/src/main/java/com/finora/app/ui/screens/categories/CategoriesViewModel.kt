package com.finora.app.ui.screens.categories

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.finora.app.data.api.RetrofitClient
import com.finora.app.data.model.Category
import com.finora.app.data.model.CreateCategoryRequest
import com.finora.app.data.repository.CategoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class CategoriesUiState {
    object Loading : CategoriesUiState()
    data class Success(val categories: List<Category>) : CategoriesUiState()
    data class Error(val message: String) : CategoriesUiState()
}

class CategoriesViewModel(application: Application) : AndroidViewModel(application) {

    private val apiService = RetrofitClient.getApiService(application)
    private val repository = CategoryRepository(apiService)

    private val _uiState = MutableStateFlow<CategoriesUiState>(CategoriesUiState.Loading)
    val uiState: StateFlow<CategoriesUiState> = _uiState.asStateFlow()

    private val _actionStateMessage = MutableStateFlow<String?>(null)
    val actionStateMessage: StateFlow<String?> = _actionStateMessage.asStateFlow()

    init {
        loadCategories()
    }

    fun loadCategories() {
        viewModelScope.launch {
            _uiState.value = CategoriesUiState.Loading
            val result = repository.getCategories()
            if (result.isSuccess) {
                _uiState.value = CategoriesUiState.Success(result.getOrNull() ?: emptyList())
            } else {
                _uiState.value = CategoriesUiState.Error(
                    result.exceptionOrNull()?.message ?: "Failed to load categories"
                )
            }
        }
    }

    fun createCategory(request: CreateCategoryRequest) {
        viewModelScope.launch {
            val result = repository.createCategory(request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Category created successfully"
                loadCategories()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to create category"
            }
        }
    }

    fun updateCategory(id: String, request: CreateCategoryRequest) {
        viewModelScope.launch {
            val result = repository.updateCategory(id, request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Category updated successfully"
                loadCategories()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to update category"
            }
        }
    }

    fun deleteCategory(id: String) {
        viewModelScope.launch {
            val result = repository.deleteCategory(id)
            if (result.isSuccess) {
                _actionStateMessage.value = result.getOrNull() ?: "Category deleted"
                loadCategories()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to delete category"
            }
        }
    }

    fun seedCategories() {
        viewModelScope.launch {
            _uiState.value = CategoriesUiState.Loading
            val result = repository.seedCategories()
            if (result.isSuccess) {
                _actionStateMessage.value = "Default categories seeded successfully"
                loadCategories()
            } else {
                _uiState.value = CategoriesUiState.Error(
                    result.exceptionOrNull()?.message ?: "Seeding failed"
                )
            }
        }
    }

    fun clearActionMessage() {
        _actionStateMessage.value = null
    }
}
