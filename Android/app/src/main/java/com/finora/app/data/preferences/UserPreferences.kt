package com.finora.app.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.finora.app.data.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_preferences")

class UserPreferences(private val context: Context) {

    companion object {
        private val KEY_TOKEN = stringPreferencesKey("auth_token")
        private val KEY_USER_ID = stringPreferencesKey("user_id")
        private val KEY_USER_NAME = stringPreferencesKey("user_name")
        private val KEY_USER_EMAIL = stringPreferencesKey("user_email")
        private val KEY_USER_CURRENCY = stringPreferencesKey("user_currency")
        private val KEY_USER_PIC = stringPreferencesKey("user_pic")
    }

    val authToken: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[KEY_TOKEN]
    }

    val userFlow: Flow<User?> = context.dataStore.data.map { preferences ->
        val id = preferences[KEY_USER_ID] ?: return@map null
        val name = preferences[KEY_USER_NAME] ?: ""
        val email = preferences[KEY_USER_EMAIL] ?: ""
        val currency = preferences[KEY_USER_CURRENCY] ?: "INR"
        val pic = preferences[KEY_USER_PIC] ?: ""
        val token = preferences[KEY_TOKEN]
        User(id = id, name = name, email = email, currency = currency, profilePic = pic, token = token)
    }

    suspend fun saveAuthUser(user: User, token: String? = user.token) {
        context.dataStore.edit { preferences ->
            if (token != null) {
                preferences[KEY_TOKEN] = token
            }
            preferences[KEY_USER_ID] = user.id
            preferences[KEY_USER_NAME] = user.name
            preferences[KEY_USER_EMAIL] = user.email
            preferences[KEY_USER_CURRENCY] = user.currency
            preferences[KEY_USER_PIC] = user.profilePic
        }
    }

    suspend fun clear() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
