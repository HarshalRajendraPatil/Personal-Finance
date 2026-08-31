package com.finora.app.data.api

import com.finora.app.data.preferences.UserPreferences
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val userPreferences: UserPreferences) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val token = runBlocking {
            userPreferences.authToken.firstOrNull()
        }

        val requestBuilder = originalRequest.newBuilder()

        if (!token.isNull_or_empty()) {
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }

        requestBuilder.addHeader("Accept", "application/json")

        return chain.proceed(requestBuilder.build())
    }

    private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()
}
