package com.finora.app.ui.screens.accounts

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.finora.app.data.model.Account
import com.finora.app.data.model.CreateAccountRequest
import com.finora.app.ui.components.FinoraButton
import com.finora.app.ui.components.FinoraTextField
import com.finora.app.ui.theme.Indigo600
import com.finora.app.ui.theme.Slate900

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountFormDialog(
    accountToEdit: Account? = null,
    onDismiss: () -> Unit,
    onSubmit: (CreateAccountRequest) -> Unit
) {
    var name by remember { mutableStateOf(accountToEdit?.name ?: "") }
    var type by remember { mutableStateOf(accountToEdit?.type ?: "Bank") }
    var openingBalance by remember { mutableStateOf(accountToEdit?.openingBalance?.toString() ?: "0") }
    var creditLimit by remember { mutableStateOf(accountToEdit?.creditLimit?.toString() ?: "") }
    var issuer by remember { mutableStateOf(accountToEdit?.issuer ?: "") }
    var last4Digits by remember { mutableStateOf(accountToEdit?.last4Digits ?: "") }
    var notes by remember { mutableStateOf(accountToEdit?.notes ?: "") }

    var typeMenuExpanded by remember { mutableStateOf(false) }
    val accountTypes = listOf("Bank", "Cash", "Credit Card", "UPI", "FD", "Other")

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = if (accountToEdit == null) "Add New Account" else "Edit Account",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate900
                )

                Spacer(modifier = Modifier.height(16.dp))

                FinoraTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = "Account Name",
                    leadingIcon = Icons.Default.AccountBalance
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Account Type Selector
                ExposedDropdownMenuBox(
                    expanded = typeMenuExpanded,
                    onExpandedChange = { typeMenuExpanded = !typeMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = type,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Account Type") },
                        leadingIcon = { Icon(Icons.Default.Category, contentDescription = null, tint = Indigo600) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = typeMenuExpanded) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = typeMenuExpanded,
                        onDismissRequest = { typeMenuExpanded = false }
                    ) {
                        accountTypes.forEach { accType ->
                            DropdownMenuItem(
                                text = { Text(accType) },
                                onClick = {
                                    type = accType
                                    typeMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                if (accountToEdit == null) {
                    FinoraTextField(
                        value = openingBalance,
                        onValueChange = { openingBalance = it },
                        label = "Opening Balance",
                        leadingIcon = Icons.Default.AttachMoney,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                }

                if (type == "Credit Card") {
                    FinoraTextField(
                        value = creditLimit,
                        onValueChange = { creditLimit = it },
                        label = "Credit Limit (Optional)",
                        leadingIcon = Icons.Default.CreditCard,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                    Spacer(modifier = Modifier.height(14.dp))

                    FinoraTextField(
                        value = issuer,
                        onValueChange = { issuer = it },
                        label = "Card Issuer (e.g. HDFC, SBI)",
                        leadingIcon = Icons.Default.Business
                    )
                    Spacer(modifier = Modifier.height(14.dp))

                    FinoraTextField(
                        value = last4Digits,
                        onValueChange = { last4Digits = it },
                        label = "Last 4 Digits",
                        leadingIcon = Icons.Default.Pin,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                }

                FinoraTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = "Notes (Optional)",
                    leadingIcon = Icons.Default.Notes,
                    singleLine = false
                )

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    FinoraButton(
                        text = if (accountToEdit == null) "Create" else "Save",
                        onClick = {
                            if (name.isNotBlank()) {
                                onSubmit(
                                    CreateAccountRequest(
                                        name = name.trim(),
                                        type = type,
                                        openingBalance = openingBalance.toDoubleOrNull() ?: 0.0,
                                        notes = notes.ifBlank { null },
                                        creditLimit = creditLimit.toDoubleOrNull(),
                                        issuer = issuer.ifBlank { null },
                                        last4Digits = last4Digits.ifBlank { null }
                                    )
                                )
                                onDismiss()
                            }
                        },
                        modifier = Modifier.widthIn(min = 100.dp)
                    )
                }
            }
        }
    }
}
