package com.finora.app.data.model

import com.google.gson.annotations.SerializedName

data class Account(
    @SerializedName("_id") val id: String = "",
    val user: String = "",
    val name: String = "",
    val type: String = "Bank", // Enum: Bank, Cash, Credit Card, UPI, FD, Other
    val openingBalance: Double = 0.0,
    val currentBalance: Double = 0.0,
    val currency: String = "INR",
    val isArchived: Boolean = false,
    val notes: String? = null,
    val creditLimit: Double? = null,
    val issuer: String? = "",
    val last4Digits: String? = "",
    val billingCycleDay: Int? = null,
    val paymentDueDay: Int? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)
