package com.finora.app.data.repository

import com.finora.app.data.api.ApiService
import com.finora.app.data.model.*
import org.json.JSONObject
import retrofit2.Response

class RecurringRepository(private val apiService: ApiService) {

    suspend fun getRecurringRules(): Result<List<RecurringRule>> {
        return try {
            val response = apiService.getRecurringRules()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createRecurringRule(request: CreateRecurringRuleRequest): Result<RecurringRule> {
        return try {
            val response = apiService.createRecurringRule(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateRecurringRule(id: String, request: CreateRecurringRuleRequest): Result<RecurringRule> {
        return try {
            val response = apiService.updateRecurringRule(id, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteRecurringRule(id: String): Result<String> {
        return try {
            val response = apiService.deleteRecurringRule(id)
            if (response.isSuccessful) {
                Result.success(response.body()?.message ?: "Rule deleted successfully")
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun payBill(id: String, request: PayBillRequest): Result<String> {
        return try {
            val response = apiService.payBill(id, request)
            if (response.isSuccessful) {
                Result.success(response.body()?.message ?: "Bill payment recorded successfully")
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
