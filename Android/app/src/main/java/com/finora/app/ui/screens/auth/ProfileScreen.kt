package com.finora.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.finora.app.ui.components.*
import com.finora.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    viewModel: AuthViewModel,
    onLoggedOut: () -> Unit
) {
    val user by viewModel.currentUser.collectAsState()
    val authState by viewModel.authState.collectAsState()

    var name by remember(user) { mutableStateOf(user?.name ?: "") }
    var currency by remember(user) { mutableStateOf(user?.currency ?: "INR") }
    var newPassword by remember { mutableStateOf("") }

    var isEditing by remember { mutableStateOf(false) }
    var currencyMenuExpanded by remember { mutableStateOf(false) }
    val currencies = listOf("INR", "USD", "EUR", "GBP", "CAD", "AUD")

    LaunchedEffect(authState) {
        if (authState is AuthState.Unauthenticated) {
            onLoggedOut()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("User Profile & Security", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Slate50,
                    titleContentColor = Slate900
                )
            )
        },
        containerColor = Slate50
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // User Avatar Header Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate300.copy(alpha = 0.5f)),
                shadowElevation = 2.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(Indigo600),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (user?.name?.firstOrNull() ?: 'U').toString().uppercase(),
                            color = Color.White,
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = user?.name ?: "User",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )

                    Text(
                        text = user?.email ?: "",
                        fontSize = 14.sp,
                        color = Slate500
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    StatusBadge(
                        text = "Primary Currency: ${user?.currency ?: "INR"}",
                        backgroundColor = Emerald100,
                        textColor = Emerald600
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Profile Edit Form Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate300.copy(alpha = 0.5f)),
                shadowElevation = 2.dp
            ) {
                Column(
                    modifier = Modifier.padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Profile Settings",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )

                        TextButton(onClick = { isEditing = !isEditing }) {
                            Icon(
                                imageVector = if (isEditing) Icons.Default.Close else Icons.Default.Edit,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (isEditing) "Cancel" else "Edit")
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (isEditing) {
                        FinoraTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = "Display Name",
                            leadingIcon = Icons.Default.Person
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        ExposedDropdownMenuBox(
                            expanded = currencyMenuExpanded,
                            onExpandedChange = { currencyMenuExpanded = !currencyMenuExpanded }
                        ) {
                            OutlinedTextField(
                                value = currency,
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Default Currency") },
                                leadingIcon = { Icon(Icons.Default.AttachMoney, contentDescription = null, tint = Indigo600) },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = currencyMenuExpanded) },
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .menuAnchor()
                                    .fillMaxWidth()
                            )
                            ExposedDropdownMenu(
                                expanded = currencyMenuExpanded,
                                onDismissRequest = { currencyMenuExpanded = false }
                            ) {
                                currencies.forEach { curr ->
                                    DropdownMenuItem(
                                        text = { Text(curr) },
                                        onClick = {
                                            currency = curr
                                            currencyMenuExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        FinoraTextField(
                            value = newPassword,
                            onValueChange = { newPassword = it },
                            label = "New Password (Optional)",
                            leadingIcon = Icons.Default.Lock
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        FinoraButton(
                            text = "Save Profile Changes",
                            onClick = {
                                viewModel.updateProfile(
                                    name = name,
                                    currency = currency,
                                    password = if (newPassword.isNotBlank()) newPassword else null
                                )
                                isEditing = false
                            },
                            isLoading = authState is AuthState.Loading
                        )
                    } else {
                        // Display mode
                        ProfileDetailRow(icon = Icons.Default.Person, label = "Full Name", value = user?.name ?: "")
                        Divider(modifier = Modifier.padding(vertical = 12.dp), color = Slate100)
                        ProfileDetailRow(icon = Icons.Default.Email, label = "Email Address", value = user?.email ?: "")
                        Divider(modifier = Modifier.padding(vertical = 12.dp), color = Slate100)
                        ProfileDetailRow(icon = Icons.Default.AttachMoney, label = "Default Currency", value = user?.currency ?: "INR")
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Logout Action
            FinoraButton(
                text = "Sign Out",
                onClick = { viewModel.logout() },
                containerColor = Rose600,
                icon = Icons.Default.Logout
            )
        }
    }
}

@Composable
fun ProfileDetailRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(Indigo100),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = Indigo600, modifier = Modifier.size(18.dp))
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column {
            Text(text = label, color = Slate500, fontSize = 12.sp)
            Text(text = value, color = Slate900, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}
