package com.finora.app.data.model

import com.google.gson.annotations.SerializedName

data class Category(
    @SerializedName("_id") val id: String = "",
    val user: String? = null,
    val name: String = "",
    val type: String = "Expense", // Enum: Income, Expense, Transfer
    val parent: Any? = null, // Can be String ID or populated Category object or null
    val icon: String = "Folder",
    val color: String = "#6b7280",
    val isSystemDefault: Boolean = false,
    val isEssential: Boolean = false,
    val subcategories: List<Category> = emptyList(),
    val createdAt: String? = null,
    val updatedAt: String? = null
) {
    val parentId: String?
        get() = when (parent) {
            is String -> parent
            is Map<*, *> -> parent["_id"] as? String
            else -> null
        }
}
