package com.finora.app.ui.screens.accounts

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.finora.app.data.model.Account
import com.finora.app.ui.components.CurrencyFormatter
import com.finora.app.ui.components.FinoraButton
import com.finora.app.ui.components.FinoraTextField
import com.finora.app.ui.theme.Indigo600
import com.finora.app.ui.theme.Slate900

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransferDialog(
    accounts: List<Account>,
    onDismiss: () -> Unit,
    onSubmit: (fromId: String, toId: String, amount: Double, notes: String?) -> Unit
) {
    var fromAccount by remember { mutableStateOf(accounts.firstOrNull()) }
    var toAccount by remember { mutableStateOf(accounts.getOrNull(1) ?: accounts.firstOrNull()) }
    var amountStr by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("Fund Transfer") }

    var fromMenuExpanded by remember { mutableStateOf(false) }
    var toMenuExpanded by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp)
            ) {
                Row(
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.SwapHoriz, contentDescription = null, tint = Indigo600)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Transfer Funds",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Source Account Dropdown
                ExposedDropdownMenuBox(
                    expanded = fromMenuExpanded,
                    onExpandedChange = { fromMenuExpanded = !fromMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = fromAccount?.let { "${it.name} (${CurrencyFormatter.formatFull(it.currentBalance, it.currency)})" } ?: "Select Source Account",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("From Account (Debit)") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = fromMenuExpanded) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = fromMenuExpanded,
                        onDismissRequest = { fromMenuExpanded = false }
                    ) {
                        accounts.forEach { acc ->
                            DropdownMenuItem(
                                text = { Text("${acc.name} (${CurrencyFormatter.formatFull(acc.currentBalance, acc.currency)})") },
                                onClick = {
                                    fromAccount = acc
                                    fromMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Destination Account Dropdown
                ExposedDropdownMenuBox(
                    expanded = toMenuExpanded,
                    onExpandedChange = { toMenuExpanded = !toMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = toAccount?.let { "${it.name} (${CurrencyFormatter.formatFull(it.currentBalance, it.currency)})" } ?: "Select Destination Account",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("To Account (Credit)") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = toMenuExpanded) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = toMenuExpanded,
                        onDismissRequest = { toMenuExpanded = false }
                    ) {
                        accounts.filter { it.id != fromAccount?.id }.forEach { acc ->
                            DropdownMenuItem(
                                text = { Text("${acc.name} (${CurrencyFormatter.formatFull(acc.currentBalance, acc.currency)})") },
                                onClick = {
                                    toAccount = acc
                                    toMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                FinoraTextField(
                    value = amountStr,
                    onValueChange = { amountStr = it },
                    label = "Transfer Amount",
                    leadingIcon = Icons.Default.AttachMoney,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Spacer(modifier = Modifier.height(14.dp))

                FinoraTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = "Transfer Note",
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
                        text = "Transfer",
                        onClick = {
                            val amount = amountStr.toDoubleOrNull()
                            if (fromAccount != null && toAccount != null && amount != null && amount > 0) {
                                onSubmit(fromAccount!!.id, toAccount!!.id, amount, notes.ifBlank { null })
                                onDismiss()
                            }
                        },
                        modifier = Modifier.widthIn(min = 110.dp)
                    )
                }
            }
        }
    }
}
