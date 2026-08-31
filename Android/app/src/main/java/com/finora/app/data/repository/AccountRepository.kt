package com.finora.app.data.repository

import com.finora.app.data.api.ApiService
import com.finora.app.data.model.*
import org.json.JSONObject
import retrofit2.Response

class AccountRepository(private val apiService: ApiService) {

    suspend fun getAccounts(): Result<List<Account>> {
        return try {
            val response = apiService.getAccounts()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createAccount(request: CreateAccountRequest): Result<Account> {
        return try {
            val response = apiService.createAccount(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateAccount(id: String, request: CreateAccountRequest): Result<Account> {
        return try {
            val response = apiService.updateAccount(id, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteAccount(id: String): Result<String> {
        return try {
            val response = apiService.deleteAccount(id)
            if (response.isSuccessful) {
                Result.success(response.body()?.message ?: "Account archived successfully")
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun reconcileAccount(id: String, actualBalance: Double, notes: String?): Result<Account> {
        return try {
            val request = ReconcileAccountRequest(actualBalance = actualBalance, notes = notes)
            val response = apiService.reconcileAccount(id, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun transferFunds(fromAccountId: String, toAccountId: String, amount: Double, notes: String?): Result<String> {
        return try {
            val request = TransferRequest(
                fromAccountId = fromAccountId,
                toAccountId = toAccountId,
                amount = amount,
                notes = notes
            )
            val response = apiService.transferFunds(request)
            if (response.isSuccessful) {
                Result.success(response.body()?.message ?: "Transfer completed successfully")
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
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
