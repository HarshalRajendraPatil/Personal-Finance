package com.finora.app.ui.screens.bills

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.finora.app.data.api.RetrofitClient
import com.finora.app.data.model.*
import com.finora.app.data.repository.AccountRepository
import com.finora.app.data.repository.CategoryRepository
import com.finora.app.data.repository.RecurringRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class BillsUiState {
    object Loading : BillsUiState()
    data class Success(
        val rules: List<RecurringRule>,
        val accounts: List<Account>,
        val categories: List<Category>,
        val monthlyRecurringTotal: Double,
        val autoPostCount: Int
    ) : BillsUiState()
    data class Error(val message: String) : BillsUiState()
}

class BillsViewModel(application: Application) : AndroidViewModel(application) {

    private val apiService = RetrofitClient.getApiService(application)
    private val repository = RecurringRepository(apiService)
    private val accountRepository = AccountRepository(apiService)
    private val categoryRepository = CategoryRepository(apiService)

    private val _uiState = MutableStateFlow<BillsUiState>(BillsUiState.Loading)
    val uiState: StateFlow<BillsUiState> = _uiState.asStateFlow()

    private val _actionStateMessage = MutableStateFlow<String?>(null)
    val actionStateMessage: StateFlow<String?> = _actionStateMessage.asStateFlow()

    init {
        loadBills()
    }

    fun loadBills() {
        viewModelScope.launch {
            _uiState.value = BillsUiState.Loading
            val rulesResult = repository.getRecurringRules()
            val accResult = accountRepository.getAccounts()
            val catResult = categoryRepository.getCategories()

            if (rulesResult.isSuccess) {
                val rules = rulesResult.getOrNull() ?: emptyList()
                val accounts = accResult.getOrNull() ?: emptyList()
                val categories = catResult.getOrNull() ?: emptyList()

                val monthlyTotal = rules.filter { it.isActive && it.type == "Expense" }.sumOf {
                    when (it.frequency) {
                        "daily" -> it.amount * 30
                        "weekly" -> it.amount * 4
                        "monthly" -> it.amount
                        "yearly" -> it.amount / 12
                        else -> it.amount
                    }
                }
                val autoPostCount = rules.count { it.isActive && it.autoPost }

                _uiState.value = BillsUiState.Success(
                    rules = rules,
                    accounts = accounts,
                    categories = categories,
                    monthlyRecurringTotal = monthlyTotal,
                    autoPostCount = autoPostCount
                )
            } else {
                _uiState.value = BillsUiState.Error(
                    rulesResult.exceptionOrNull()?.message ?: "Failed to fetch bills"
                )
            }
        }
    }

    fun createRule(request: CreateRecurringRuleRequest) {
        viewModelScope.launch {
            val result = repository.createRecurringRule(request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Recurring bill created"
                loadBills()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to create rule"
            }
        }
    }

    fun updateRule(id: String, request: CreateRecurringRuleRequest) {
        viewModelScope.launch {
            val result = repository.updateRecurringRule(id, request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Recurring bill updated"
                loadBills()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to update rule"
            }
        }
    }

    fun deleteRule(id: String) {
        viewModelScope.launch {
            val result = repository.deleteRecurringRule(id)
            if (result.isSuccess) {
                _actionStateMessage.value = "Recurring bill deleted"
                loadBills()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to delete rule"
            }
        }
    }

    fun payBill(id: String, accountId: String? = null, notes: String? = null) {
        viewModelScope.launch {
            val result = repository.payBill(id, PayBillRequest(account = accountId, notes = notes))
            if (result.isSuccess) {
                _actionStateMessage.value = "Bill payment recorded & next due date updated"
                loadBills()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Payment failed"
            }
        }
    }

    fun clearActionMessage() {
        _actionStateMessage.value = null
    }
}
