package com.finora.app.ui.screens.transactions

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
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.finora.app.data.model.*
import com.finora.app.ui.components.FinoraButton
import com.finora.app.ui.components.FinoraTextField
import com.finora.app.ui.theme.Indigo600
import com.finora.app.ui.theme.Slate900

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionFormDialog(
    transactionToEdit: Transaction? = null,
    accounts: List<Account>,
    categories: List<Category>,
    onDismiss: () -> Unit,
    onSubmit: (CreateTransactionRequest) -> Unit
) {
    var type by remember { mutableStateOf(transactionToEdit?.type ?: "Expense") }
    var amountStr by remember { mutableStateOf(transactionToEdit?.amount?.toString() ?: "") }
    var selectedAccount by remember { mutableStateOf(accounts.firstOrNull()) }
    var selectedToAccount by remember { mutableStateOf(accounts.getOrNull(1)) }
    var selectedCategory by remember { mutableStateOf(categories.firstOrNull { it.type == type }) }
    var merchant by remember { mutableStateOf(transactionToEdit?.merchant ?: "") }
    var notes by remember { mutableStateOf(transactionToEdit?.notes ?: "") }

    var accountMenuExpanded by remember { mutableStateOf(false) }
    var toAccountMenuExpanded by remember { mutableStateOf(false) }
    var categoryMenuExpanded by remember { mutableStateOf(false) }

    val filteredCategories = remember(categories, type) {
        categories.filter { it.type == type }
    }

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
                    text = if (transactionToEdit == null) "Log Transaction" else "Edit Transaction",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate900
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Type Tab Row
                TabRow(
                    selectedTabIndex = when (type) {
                        "Expense" -> 0
                        "Income" -> 1
                        else -> 2
                    },
                    containerColor = MaterialTheme.colorScheme.surface
                ) {
                    Tab(
                        selected = type == "Expense",
                        onClick = {
                            type = "Expense"
                            selectedCategory = categories.firstOrNull { it.type == "Expense" }
                        },
                        text = { Text("Expense") }
                    )
                    Tab(
                        selected = type == "Income",
                        onClick = {
                            type = "Income"
                            selectedCategory = categories.firstOrNull { it.type == "Income" }
                        },
                        text = { Text("Income") }
                    )
                    Tab(
                        selected = type == "Transfer",
                        onClick = {
                            type = "Transfer"
                            selectedCategory = categories.firstOrNull { it.type == "Transfer" }
                        },
                        text = { Text("Transfer") }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                FinoraTextField(
                    value = amountStr,
                    onValueChange = { amountStr = it },
                    label = "Amount",
                    leadingIcon = Icons.Default.AttachMoney,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Source Account Dropdown
                ExposedDropdownMenuBox(
                    expanded = accountMenuExpanded,
                    onExpandedChange = { accountMenuExpanded = !accountMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = selectedAccount?.name ?: "Select Account",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(if (type == "Transfer") "From Account" else "Account") },
                        leadingIcon = { Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = Indigo600) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = accountMenuExpanded) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = accountMenuExpanded,
                        onDismissRequest = { accountMenuExpanded = false }
                    ) {
                        accounts.forEach { acc ->
                            DropdownMenuItem(
                                text = { Text(acc.name) },
                                onClick = {
                                    selectedAccount = acc
                                    accountMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                if (type == "Transfer") {
                    Spacer(modifier = Modifier.height(14.dp))

                    // Destination Account Dropdown
                    ExposedDropdownMenuBox(
                        expanded = toAccountMenuExpanded,
                        onExpandedChange = { toAccountMenuExpanded = !toAccountMenuExpanded }
                    ) {
                        OutlinedTextField(
                            value = selectedToAccount?.name ?: "Select Destination Account",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("To Account") },
                            leadingIcon = { Icon(Icons.Default.SwapHoriz, contentDescription = null, tint = Indigo600) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = toAccountMenuExpanded) },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .menuAnchor()
                                .fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = toAccountMenuExpanded,
                            onDismissRequest = { toAccountMenuExpanded = false }
                        ) {
                            accounts.filter { it.id != selectedAccount?.id }.forEach { acc ->
                                DropdownMenuItem(
                                    text = { Text(acc.name) },
                                    onClick = {
                                        selectedToAccount = acc
                                        toAccountMenuExpanded = false
                                    }
                                )
                            }
                        }
                    }
                } else {
                    Spacer(modifier = Modifier.height(14.dp))

                    // Category Dropdown
                    ExposedDropdownMenuBox(
                        expanded = categoryMenuExpanded,
                        onExpandedChange = { categoryMenuExpanded = !categoryMenuExpanded }
                    ) {
                        OutlinedTextField(
                            value = selectedCategory?.name ?: "Select Category",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Category") },
                            leadingIcon = { Icon(Icons.Default.Category, contentDescription = null, tint = Indigo600) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryMenuExpanded) },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .menuAnchor()
                                .fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = categoryMenuExpanded,
                            onDismissRequest = { categoryMenuExpanded = false }
                        ) {
                            filteredCategories.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text(cat.name) },
                                    onClick = {
                                        selectedCategory = cat
                                        categoryMenuExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    FinoraTextField(
                        value = merchant,
                        onValueChange = { merchant = it },
                        label = "Merchant / Payee (Optional)",
                        leadingIcon = Icons.Default.Store
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                FinoraTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = "Notes (Optional)",
                    leadingIcon = Icons.Default.Notes
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
                        text = if (transactionToEdit == null) "Record" else "Save",
                        onClick = {
                            val amount = amountStr.toDoubleOrNull()
                            if (amount != null && amount > 0 && selectedAccount != null) {
                                onSubmit(
                                    CreateTransactionRequest(
                                        type = type,
                                        amount = amount,
                                        account = selectedAccount!!.id,
                                        toAccount = if (type == "Transfer") selectedToAccount?.id else null,
                                        category = if (type != "Transfer") selectedCategory?.id else null,
                                        merchant = merchant.ifBlank { null },
                                        notes = notes.ifBlank { null }
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
