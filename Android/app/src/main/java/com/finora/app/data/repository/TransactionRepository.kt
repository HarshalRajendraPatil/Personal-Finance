package com.finora.app.data.repository

import com.finora.app.data.api.ApiService
import com.finora.app.data.model.*
import org.json.JSONObject
import retrofit2.Response

class TransactionRepository(private val apiService: ApiService) {

    suspend fun getTransactions(
        search: String? = null,
        type: String? = null,
        account: String? = null,
        category: String? = null,
        startDate: String? = null,
        endDate: String? = null,
        minAmount: Double? = null,
        maxAmount: Double? = null
    ): Result<List<Transaction>> {
        return try {
            val response = apiService.getTransactions(
                search = search.ifBlankNull(),
                type = type.ifBlankNull(),
                account = account.ifBlankNull(),
                category = category.ifBlankNull(),
                startDate = startDate.ifBlankNull(),
                endDate = endDate.ifBlankNull(),
                minAmount = minAmount,
                maxAmount = maxAmount
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createTransaction(request: CreateTransactionRequest): Result<Transaction> {
        return try {
            val response = apiService.createTransaction(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateTransaction(id: String, request: CreateTransactionRequest): Result<Transaction> {
        return try {
            val response = apiService.updateTransaction(id, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteTransaction(id: String): Result<String> {
        return try {
            val response = apiService.deleteTransaction(id)
            if (response.isSuccessful) {
                Result.success(response.body()?.message ?: "Transaction deleted successfully")
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun String?.ifBlankNull(): String? = if (this.isNullOrBlank()) null else this

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
