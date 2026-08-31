package com.finora.app.data.repository

import com.finora.app.data.api.ApiService
import com.finora.app.data.model.*
import org.json.JSONObject
import retrofit2.Response

class CategoryRepository(private val apiService: ApiService) {

    suspend fun getCategories(): Result<List<Category>> {
        return try {
            val response = apiService.getCategories()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createCategory(request: CreateCategoryRequest): Result<Category> {
        return try {
            val response = apiService.createCategory(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateCategory(id: String, request: CreateCategoryRequest): Result<Category> {
        return try {
            val response = apiService.updateCategory(id, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteCategory(id: String): Result<String> {
        return try {
            val response = apiService.deleteCategory(id)
            if (response.isSuccessful) {
                Result.success(response.body()?.message ?: "Category deleted successfully")
            } else {
                Result.failure(Exception(parseErrorMessage(response)))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun seedCategories(): Result<List<Category>> {
        return try {
            val response = apiService.seedCategories()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
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
