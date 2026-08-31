package com.finora.app.data.repository

import com.finora.app.data.api.ApiService
import com.finora.app.data.model.*
import com.finora.app.data.preferences.UserPreferences
import kotlinx.coroutines.flow.Flow
import org.json.JSONObject
import retrofit2.Response

class AuthRepository(
    private val apiService: ApiService,
    private val userPreferences: UserPreferences
) {

    val user: Flow<User?> = userPreferences.userFlow
    val authToken: Flow<String?> = userPreferences.authToken

    suspend fun login(request: LoginRequest): Result<User> {
        return try {
            val response = apiService.login(request)
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                userPreferences.saveAuthUser(user, user.token)
                Result.success(user)
            } else {
                val errorMsg = parseErrorMessage(response)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(request: RegisterRequest): Result<User> {
        return try {
            val response = apiService.register(request)
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                userPreferences.saveAuthUser(user, user.token)
                Result.success(user)
            } else {
                val errorMsg = parseErrorMessage(response)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getProfile(): Result<User> {
        return try {
            val response = apiService.getProfile()
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                userPreferences.saveAuthUser(user)
                Result.success(user)
            } else {
                val errorMsg = parseErrorMessage(response)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateProfile(request: UpdateProfileRequest): Result<User> {
        return try {
            val response = apiService.updateProfile(request)
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                userPreferences.saveAuthUser(user)
                Result.success(user)
            } else {
                val errorMsg = parseErrorMessage(response)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            apiService.logout()
            userPreferences.clear()
            Result.success(Unit)
        } catch (e: Exception) {
            userPreferences.clear()
            Result.success(Unit)
        }
    }

    private fun <T> parseErrorMessage(response: Response<T>): String {
        return try {
            val errorBody = response.errorBody()?.string()
            if (errorBody != null) {
                val json = JSONObject(errorBody)
                json.optString("message", "Request failed with status ${response.code()}")
            } else {
                "Request failed with status ${response.code()}"
            }
        } catch (e: Exception) {
            "An error occurred (${response.code()})"
        }
    }
}
