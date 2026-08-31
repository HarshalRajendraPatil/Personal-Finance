package com.finora.app.data.model

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("_id") val id: String = "",
    val name: String = "",
    val email: String = "",
    val currency: String = "INR",
    val profilePic: String = "",
    val token: String? = null
)
