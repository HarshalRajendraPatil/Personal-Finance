package com.finora.app.ui.screens/auth

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.finora.app.data.api.RetrofitClient
import com.finora.app.data.model.*
import com.finora.app.data.preferences.UserPreferences
import com.finora.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Authenticated(val user: User) : AuthState()
    data class Unauthenticated(val message: String? = null) : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val userPreferences = UserPreferences(application)
    private val apiService = RetrofitClient.getApiService(application)
    private val repository = AuthRepository(apiService, userPreferences)

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    val currentUser: StateFlow<User?> = repository.user
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    init {
        checkSession()
    }

    fun checkSession() {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            repository.authToken.collect { token ->
                if (!token.isNull_or_empty()) {
                    val result = repository.getProfile()
                    if (result.isSuccess) {
                        _authState.value = AuthState.Authenticated(result.getOrNull()!!)
                    } else {
                        _authState.value = AuthState.Unauthenticated()
                    }
                } else {
                    _authState.value = AuthState.Unauthenticated()
                }
            }
        }
    }

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("Please enter email and password")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val result = repository.login(LoginRequest(email.trim(), password.trim()))
            if (result.isSuccess) {
                _authState.value = AuthState.Authenticated(result.getOrNull()!!)
            } else {
                _authState.value = AuthState.Error(result.exceptionOrNull()?.message ?: "Login failed")
            }
        }
    }

    fun register(name: String, email: String, password: String, currency: String = "INR") {
        if (name.isBlank() || email.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("Please fill in all required fields")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val request = RegisterRequest(name.trim(), email.trim(), password.trim(), currency)
            val result = repository.register(request)
            if (result.isSuccess) {
                _authState.value = AuthState.Authenticated(result.getOrNull()!!)
            } else {
                _authState.value = AuthState.Error(result.exceptionOrNull()?.message ?: "Registration failed")
            }
        }
    }

    fun updateProfile(name: String?, currency: String?, password: String? = null) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val request = UpdateProfileRequest(name = name, currency = currency, password = password)
            val result = repository.updateProfile(request)
            if (result.isSuccess) {
                _authState.value = AuthState.Authenticated(result.getOrNull()!!)
            } else {
                _authState.value = AuthState.Error(result.exceptionOrNull()?.message ?: "Update failed")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            _authState.value = AuthState.Unauthenticated()
        }
    }

    fun clearError() {
        if (_authState.value is AuthState.Error) {
            _authState.value = AuthState.Unauthenticated()
        }
    }

    private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()
}
