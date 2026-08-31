package com.finora.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Person
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector? = null) {
    object Login : Screen("login", "Sign In")
    object Register : Screen("register", "Register")

    object Accounts : Screen("accounts", "Accounts", Icons.Default.AccountBalanceWallet)
    object Categories : Screen("categories", "Categories", Icons.Default.Category)
    object Profile : Screen("profile", "Profile", Icons.Default.Person)
}

val bottomNavScreens = listOf(
    Screen.Accounts,
    Screen.Categories,
    Screen.Profile
)
