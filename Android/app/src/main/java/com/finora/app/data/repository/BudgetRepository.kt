package com.finora.app.data.repository

import com.finora.app.data.api.ApiService
import com.finora.app.data.model.*
import org.json.JSONObject
import retrofit2.Response

class BudgetRepository(private val apiService: ApiService) {

    suspend fun getBudgets(): Result<List<Budget>> {
        return try {
            val response = apiService.getBudgets()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getBudgetsWithSpend(): Result<List<BudgetWithSpend>> {
        return try {
            val response = apiService.getBudgetsWithSpend()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createBudget(request: CreateBudgetRequest): Result<Budget> {
        return try {
            val response = apiService.createBudget(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateBudget(id: String, request: CreateBudgetRequest): Result<Budget> {
        return try {
            val response = apiService.updateBudget(id, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteBudget(id: String): Result<String> {
        return try {
            val response = apiService.deleteBudget(id)
            if (response.isSuccessful) {
                Result.success(response.body()?.message ?: "Budget deleted successfully")
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
