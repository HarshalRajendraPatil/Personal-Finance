package com.finora.app.data.model

import com.google.gson.annotations.SerializedName

// Auth Request DTOs
data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val currency: String = "INR"
)

data class UpdateProfileRequest(
    val name: String? = null,
    val email: String? = null,
    val currency: String? = null,
    val profilePic: String? = null,
    val password: String? = null
)

// Account Request DTOs
data class CreateAccountRequest(
    val name: String,
    val type: String, // Bank, Cash, Credit Card, UPI, FD, Other
    val openingBalance: Double = 0.0,
    val currency: String = "INR",
    val notes: String? = null,
    val creditLimit: Double? = null,
    val issuer: String? = null,
    val last4Digits: String? = null
)

data class ReconcileAccountRequest(
    val actualBalance: Double,
    val notes: String? = "Balance Reconciliation Adjustment"
)

data class TransferRequest(
    val fromAccountId: String,
    val toAccountId: String,
    val amount: Double,
    val notes: String? = "Fund Transfer",
    val date: String? = null
)

// Category Request DTOs
data class CreateCategoryRequest(
    val name: String,
    val type: String, // Income, Expense, Transfer
    val parent: String? = null,
    val icon: String = "Folder",
    val color: String = "#6b7280",
    val isEssential: Boolean = false
)

// Common Message Response DTO
data class ApiResponse(
    val message: String? = null,
    val success: Boolean? = true
)
