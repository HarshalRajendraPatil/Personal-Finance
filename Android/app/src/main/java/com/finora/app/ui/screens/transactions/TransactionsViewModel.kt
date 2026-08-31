package com.finora.app.ui.screens.transactions

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.finora.app.data.api.RetrofitClient
import com.finora.app.data.model.*
import com.finora.app.data.repository.AccountRepository
import com.finora.app.data.repository.CategoryRepository
import com.finora.app.data.repository.TransactionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class TransactionsUiState {
    object Loading : TransactionsUiState()
    data class Success(
        val transactions: List<Transaction>,
        val accounts: List<Account>,
        val categories: List<Category>,
        val totalIncome: Double,
        val totalExpense: Double
    ) : TransactionsUiState()
    data class Error(val message: String) : TransactionsUiState()
}

class TransactionsViewModel(application: Application) : AndroidViewModel(application) {

    private val apiService = RetrofitClient.getApiService(application)
    private val repository = TransactionRepository(apiService)
    private val accountRepository = AccountRepository(apiService)
    private val categoryRepository = CategoryRepository(apiService)

    private val _uiState = MutableStateFlow<TransactionsUiState>(TransactionsUiState.Loading)
    val uiState: StateFlow<TransactionsUiState> = _uiState.asStateFlow()

    private val _actionStateMessage = MutableStateFlow<String?>(null)
    val actionStateMessage: StateFlow<String?> = _actionStateMessage.asStateFlow()

    // Filters
    var searchQuery = MutableStateFlow("")
    var filterType = MutableStateFlow<String?>(null)

    init {
        loadTransactions()
    }

    fun loadTransactions() {
        viewModelScope.launch {
            _uiState.value = TransactionsUiState.Loading
            val txResult = repository.getTransactions(
                search = searchQuery.value.ifBlank { null },
                type = filterType.value
            )
            val accResult = accountRepository.getAccounts()
            val catResult = categoryRepository.getCategories()

            if (txResult.isSuccess) {
                val transactions = txResult.getOrNull() ?: emptyList()
                val accounts = accResult.getOrNull() ?: emptyList()
                val categories = catResult.getOrNull() ?: emptyList()

                val income = transactions.filter { it.type == "Income" }.sumOf { it.amount }
                val expense = transactions.filter { it.type == "Expense" }.sumOf { it.amount }

                _uiState.value = TransactionsUiState.Success(
                    transactions = transactions,
                    accounts = accounts,
                    categories = categories,
                    totalIncome = income,
                    totalExpense = expense
                )
            } else {
                _uiState.value = TransactionsUiState.Error(
                    txResult.exceptionOrNull()?.message ?: "Failed to fetch transactions"
                )
            }
        }
    }

    fun setFilterType(type: String?) {
        filterType.value = type
        loadTransactions()
    }

    fun setSearchQuery(query: String) {
        searchQuery.value = query
        loadTransactions()
    }

    fun createTransaction(request: CreateTransactionRequest) {
        viewModelScope.launch {
            val result = repository.createTransaction(request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Transaction recorded"
                loadTransactions()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to record transaction"
            }
        }
    }

    fun updateTransaction(id: String, request: CreateTransactionRequest) {
        viewModelScope.launch {
            val result = repository.updateTransaction(id, request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Transaction updated"
                loadTransactions()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to update transaction"
            }
        }
    }

    fun deleteTransaction(id: String) {
        viewModelScope.launch {
            val result = repository.deleteTransaction(id)
            if (result.isSuccess) {
                _actionStateMessage.value = "Transaction deleted"
                loadTransactions()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to delete transaction"
            }
        }
    }

    fun clearActionMessage() {
        _actionStateMessage.value = null
    }
}
