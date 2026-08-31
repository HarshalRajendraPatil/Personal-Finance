package com.finora.app.ui.screens.accounts

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.finora.app.data.api.RetrofitClient
import com.finora.app.data.model.Account
import com.finora.app.data.model.CreateAccountRequest
import com.finora.app.data.repository.AccountRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class AccountsUiState {
    object Loading : AccountsUiState()
    data class Success(
        val accounts: List<Account>,
        val totalNetBalance: Double,
        val totalLiquidCash: Double,
        val totalDebt: Double
    ) : AccountsUiState()
    data class Error(val message: String) : AccountsUiState()
}

class AccountsViewModel(application: Application) : AndroidViewModel(application) {

    private val apiService = RetrofitClient.getApiService(application)
    private val repository = AccountRepository(apiService)

    private val _uiState = MutableStateFlow<AccountsUiState>(AccountsUiState.Loading)
    val uiState: StateFlow<AccountsUiState> = _uiState.asStateFlow()

    private val _actionStateMessage = MutableStateFlow<String?>(null)
    val actionStateMessage: StateFlow<String?> = _actionStateMessage.asStateFlow()

    init {
        loadAccounts()
    }

    fun loadAccounts() {
        viewModelScope.launch {
            _uiState.value = AccountsUiState.Loading
            val result = repository.getAccounts()
            if (result.isSuccess) {
                val accounts = result.getOrNull() ?: emptyList()
                val activeAccounts = accounts.filter { !it.isArchived }

                var liquid = 0.0
                var debt = 0.0

                activeAccounts.forEach { acc ->
                    if (acc.type == "Credit Card" || acc.currentBalance < 0) {
                        debt += kotlin.math.abs(acc.currentBalance)
                    } else {
                        liquid += acc.currentBalance
                    }
                }

                val net = liquid - debt

                _uiState.value = AccountsUiState.Success(
                    accounts = accounts,
                    totalNetBalance = net,
                    totalLiquidCash = liquid,
                    totalDebt = debt
                )
            } else {
                _uiState.value = AccountsUiState.Error(
                    result.exceptionOrNull()?.message ?: "Failed to fetch accounts"
                )
            }
        }
    }

    fun createAccount(request: CreateAccountRequest) {
        viewModelScope.launch {
            val result = repository.createAccount(request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Account created successfully"
                loadAccounts()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to create account"
            }
        }
    }

    fun updateAccount(id: String, request: CreateAccountRequest) {
        viewModelScope.launch {
            val result = repository.updateAccount(id, request)
            if (result.isSuccess) {
                _actionStateMessage.value = "Account updated successfully"
                loadAccounts()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to update account"
            }
        }
    }

    fun archiveAccount(id: String) {
        viewModelScope.launch {
            val result = repository.deleteAccount(id)
            if (result.isSuccess) {
                _actionStateMessage.value = result.getOrNull() ?: "Account archived"
                loadAccounts()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Failed to archive account"
            }
        }
    }

    fun reconcileAccount(id: String, actualBalance: Double, notes: String?) {
        viewModelScope.launch {
            val result = repository.reconcileAccount(id, actualBalance, notes)
            if (result.isSuccess) {
                _actionStateMessage.value = "Balance reconciled successfully"
                loadAccounts()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Reconciliation failed"
            }
        }
    }

    fun transferFunds(fromAccountId: String, toAccountId: String, amount: Double, notes: String?) {
        viewModelScope.launch {
            val result = repository.transferFunds(fromAccountId, toAccountId, amount, notes)
            if (result.isSuccess) {
                _actionStateMessage.value = "Transfer completed successfully"
                loadAccounts()
            } else {
                _actionStateMessage.value = result.exceptionOrNull()?.message ?: "Transfer failed"
            }
        }
    }

    fun clearActionMessage() {
        _actionStateMessage.value = null
    }
}
