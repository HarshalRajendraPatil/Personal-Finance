package com.finora.app.ui.screens.accounts

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Notes
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
import com.finora.app.ui.theme.Emerald600
import com.finora.app.ui.theme.Rose600
import com.finora.app.ui.theme.Slate500
import com.finora.app.ui.theme.Slate900

@Composable
fun ReconcileDialog(
    account: Account,
    onDismiss: () -> Unit,
    onSubmit: (actualBalance: Double, notes: String?) -> Unit
) {
    var actualBalanceStr by remember { mutableStateOf(account.currentBalance.toString()) }
    var notes by remember { mutableStateOf("Statement Reconciliation Adjustment") }

    val actualBalance = actualBalanceStr.toDoubleOrNull() ?: account.currentBalance
    val difference = actualBalance - account.currentBalance

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
                Text(
                    text = "Reconcile Balance",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate900
                )

                Text(
                    text = "Account: ${account.name}",
                    fontSize = 14.sp,
                    color = Slate500,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Current App Balance: ${CurrencyFormatter.formatFull(account.currentBalance, account.currency)}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Slate900
                )

                Spacer(modifier = Modifier.height(12.dp))

                FinoraTextField(
                    value = actualBalanceStr,
                    onValueChange = { actualBalanceStr = it },
                    label = "Actual Bank/Wallet Balance",
                    leadingIcon = Icons.Default.AccountBalanceWallet,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Calculated Adjustment Warning/Info Card
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (difference != 0.0) MaterialTheme.colorScheme.surfaceVariant else Slate500.copy(alpha = 0.1f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Adjustment Amount:",
                            fontSize = 12.sp,
                            color = Slate500
                        )
                        Text(
                            text = CurrencyFormatter.formatFull(difference, account.currency),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = when {
                                difference > 0 -> Emerald600
                                difference < 0 -> Rose600
                                else -> Slate900
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                FinoraTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = "Reconciliation Note",
                    leadingIcon = Icons.Default.Notes
                )

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    FinoraButton(
                        text = "Reconcile",
                        onClick = {
                            if (actualBalanceStr.isNotBlank()) {
                                onSubmit(actualBalance, notes.ifBlank { null })
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
