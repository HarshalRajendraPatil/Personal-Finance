package com.finora.app.data.model

import com.google.gson.annotations.SerializedName

data class Transaction(
    @SerializedName("_id") val id: String = "",
    val user: String = "",
    val type: String = "Expense", // Enum: Income, Expense, Transfer
    val amount: Double = 0.0,
    val date: String = "",
    val account: Any? = null, // Can be String ID or populated Account object
    val toAccount: Any? = null, // Can be String ID or populated Account object
    val category: Any? = null, // Can be String ID or populated Category object
    val subcategory: Any? = null,
    val merchant: String = "",
    val notes: String = "",
    val tags: List<String> = emptyList(),
    val attachmentUrl: String = "",
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val accountObj: Account?
        get() = if (account is Map<*, *>) {
            // Unpack if needed or Gson populated object handling
            null
        } else null

    val categoryName: String
        get() = when (category) {
            is Map<*, *> -> (category["name"] as? String) ?: "General"
            else -> "General"
        }

    val categoryColor: String
        get() = when (category) {
            is Map<*, *> -> (category["color"] as? String) ?: "#6b7280"
            else -> "#6b7280"
        }

    val accountName: String
        get() = when (account) {
            is Map<*, *> -> (account["name"] as? String) ?: "Account"
            else -> "Account"
        }

    val toAccountName: String?
        get() = when (toAccount) {
            is Map<*, *> -> toAccount["name"] as? String
            else -> null
        }
}
