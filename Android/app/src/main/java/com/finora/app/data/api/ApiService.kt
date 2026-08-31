package com.finora.app.data.api

import com.finora.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Auth Endpoints
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<User>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<User>

    @POST("auth/logout")
    suspend fun logout(): Response<ApiResponse>

    @GET("auth/profile")
    suspend fun getProfile(): Response<User>

    @PUT("auth/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<User>

    // Account Endpoints
    @GET("accounts")
    suspend fun getAccounts(): Response<List<Account>>

    @POST("accounts")
    suspend fun createAccount(@Body request: CreateAccountRequest): Response<Account>

    @PUT("accounts/{id}")
    suspend fun updateAccount(
        @Path("id") id: String,
        @Body request: CreateAccountRequest
    ): Response<Account>

    @DELETE("accounts/{id}")
    suspend fun deleteAccount(@Path("id") id: String): Response<ApiResponse>

    @POST("accounts/{id}/reconcile")
    suspend fun reconcileAccount(
        @Path("id") id: String,
        @Body request: ReconcileAccountRequest
    ): Response<Account>

    @POST("accounts/transfer")
    suspend fun transferFunds(@Body request: TransferRequest): Response<ApiResponse>

    // Category Endpoints
    @GET("categories")
    suspend fun getCategories(): Response<List<Category>>

    @POST("categories")
    suspend fun createCategory(@Body request: CreateCategoryRequest): Response<Category>

    @PUT("categories/{id}")
    suspend fun updateCategory(
        @Path("id") id: String,
        @Body request: CreateCategoryRequest
    ): Response<Category>

    @DELETE("categories/{id}")
    suspend fun deleteCategory(@Path("id") id: String): Response<ApiResponse>

    @POST("categories/seed")
    suspend fun seedCategories(): Response<List<Category>>
}
