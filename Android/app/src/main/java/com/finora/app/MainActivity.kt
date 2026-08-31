package com.finora.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.finora.app.ui.navigation.MainAppNavigation
import com.finora.app.ui.screens.accounts.AccountsViewModel
import com.finora.app.ui.screens.auth.AuthViewModel
import com.finora.app.ui.screens.categories.CategoriesViewModel
import com.finora.app.ui.theme.FinoraTheme

class MainActivity : ComponentActivity() {

    private val authViewModel: AuthViewModel by viewModels()
    private val accountsViewModel: AccountsViewModel by viewModels()
    private val categoriesViewModel: CategoriesViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FinoraTheme {
                MainAppNavigation(
                    authViewModel = authViewModel,
                    accountsViewModel = accountsViewModel,
                    categoriesViewModel = categoriesViewModel
                )
            }
        }
    }
}
