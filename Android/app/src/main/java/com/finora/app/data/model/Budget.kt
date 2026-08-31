package com.finora.app.data.model

import com.google.gson.annotations.SerializedName

data class Budget(
    @SerializedName("_id") val id: String = "",
    val user: String = "",
    val name: String = "",
    val category: Any? = null, // Can be String ID or populated Category object
    val period: String = "monthly", // monthly, weekly, yearly, custom
    val startDate: String? = null,
    val endDate: String? = null,
    val limit: Double = 0.0,
    val alertThreshold: Int = 80,
    val isActive: Boolean = true,
    val rollover: Boolean = false,
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val categoryId: String?
        get() = when (category) {
            is String -> category
            is Map<*, *> -> category["_id"] as? String
            else -> null
        }

    val categoryName: String
        get() = when (category) {
            is Map<*, *> -> (category["name"] as? String) ?: name
            else -> name
        }

    val categoryColor: String
        get() = when (category) {
            is Map<*, *> -> (category["color"] as? String) ?: "#4F46E5"
            else -> "#4F46E5"
        }
}

// Server Response for GET /api/budgets/with-spend
data class BudgetWithSpend(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val category: Any? = null,
    val period: String = "monthly",
    val limit: Double = 0.0,
    val alertThreshold: Int = 80,
    val spent: Double = 0.0,
    val remaining: Double = 0.0,
    val percentage: Double = 0.0,
    val status: String = "Safe" // Safe, Warning, Exceeded
) {
    val categoryName: String
        get() = when (category) {
            is Map<*, *> -> (category["name"] as? String) ?: name
            else -> name
        }

    val categoryColor: String
        get() = when (category) {
            is Map<*, *> -> (category["color"] as? String) ?: "#4F46E5"
            else -> "#4F46E5"
        }
}
