package com.finora.app.ui.screens.budgets

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.finora.app.data.api.RetrofitClient
import com.finora.app.data.model.*
import com.finora.app.data.repository.BudgetRepository
import com.finora.app.data.repository.CategoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class BudgetsUiState {
    object Loading : BudgetsUiState()
    data class Success(
        val budgets: List<BudgetWithSpend>,
        val categories: List<Category>,
        val totalLimit: Double,
        val totalSpent: Double
    ) : BudgetsUiState()
    data class Error(val message: String) : BudgetsUiState()
}

class BudgetsViewModel(application: Application) : AndroidViewModel(application) {

    private val apiService = RetrofitClient.getApiService(application)
    private val repository = BudgetRepository(apiService)
    private val categoryRepository = CategoryRepository(apiService)

    private val _uiState = MutableStateFlow<BudgetsUiState>(BudgetsUiState.Loading)
    val uiState: StateFlow<BudgetsUiState> = _uiState.asStateFlow()

    private val _actionStateMessage = MutableStateFlow<String?>(null)
    val actionStateMessage: StateFlow<String?> = _actionStateMessage.asStateFlow()

    init {
        loadBudgets()
    }

    fun loadBudgets() {
        viewModelScope.launch {
            _uiState.value = BudgetsUiState.Loading
            val budgetsResult = repository.getBudgetsWithSpend()
            val catResult = categoryRepository.getCategories()

            if (budgetsResult.isSuccess) {
                val budgets = budgetsResult.getOrNull() ?: emptyList()
                val categories = catResult.getOrNull() ?: emptyList()

                val totalLimit = budgets.sumOf { it.limit }
                val totalSpent = budgets.sumOf { it.spent }

                _uiState.value = BudgetsUiState.Success(
                    budgets = budgets,
                    categories = categories,
                    totalLimit = totalLimit,
                    totalSpent = totalSpent
                )
            } else {
                _uiState.value = BudgetsUiState.Error(
                    budgetsResult.exceptionOrNull()?.message ?: "Failed to fetch budgets"
                )
            }
        }
    }

    fun createBudget(request: CreateBudgetRequest) {
        viewModelScope.launch {
            val result = repository.createBudget(request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Category budget set"
                loadBudgets()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to set budget"
            }
        }
    }

    fun updateBudget(id: String, request: CreateBudgetRequest) {
        viewModelScope.launch {
            val result = repository.updateBudget(id, request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Budget limit updated"
                loadBudgets()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to update budget"
            }
        }
    }

    fun deleteBudget(id: String) {
        viewModelScope.launch {
            val result = repository.deleteBudget(id)
            if (result.isSuccess) {
                _actionStateMessage.value = "Budget cap removed"
                loadBudgets()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to delete budget"
            }
        }
    }

    fun clearActionMessage() {
        _actionStateMessage.value = null
    }
}
