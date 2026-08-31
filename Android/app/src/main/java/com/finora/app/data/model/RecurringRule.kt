package com.finora.app.data.model

import com.google.gson.annotations.SerializedName

data class RecurringRule(
    @SerializedName("_id") val id: String = "",
    val user: String = "",
    val name: String = "",
    val type: String = "Expense", // Income, Expense, Transfer
    val amount: Double = 0.0,
    val account: Any? = null,
    val toAccount: Any? = null,
    val category: Any? = null,
    val subcategory: Any? = null,
    val merchant: String = "",
    val notes: String = "",
    val frequency: String = "monthly", // daily, weekly, monthly, yearly
    val nextRunDate: String = "",
    val endDate: String? = null,
    val isActive: Boolean = true,
    val autoPost: Boolean = false,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val categoryName: String
        get() = when (category) {
            is Map<*, *> -> (category["name"] as? String) ?: "General"
            else -> "General"
        }

    val categoryColor: String
        get() = when (category) {
            is Map<*, *> -> (category["color"] as? String) ?: "#4F46E5"
            else -> "#4F46E5"
        }

    val accountName: String
        get() = when (account) {
            is Map<*, *> -> (account["name"] as? String) ?: "Account"
            else -> "Account"
        }
}
