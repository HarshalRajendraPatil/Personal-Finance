package com.finora.app.ui.screens.bills

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
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
import com.finora.app.ui.theme.Slate500
import com.finora.app.ui.theme.Slate900
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecurringFormDialog(
    ruleToEdit: RecurringRule? = null,
    accounts: List<Account>,
    categories: List<Category>,
    onDismiss: () -> Unit,
    onSubmit: (CreateRecurringRuleRequest) -> Unit
) {
    var name by remember { mutableStateOf(ruleToEdit?.name ?: "") }
    var type by remember { mutableStateOf(ruleToEdit?.type ?: "Expense") }
    var amountStr by remember { mutableStateOf(ruleToEdit?.amount?.toString() ?: "") }
    var frequency by remember { mutableStateOf(ruleToEdit?.frequency ?: "monthly") }
    var selectedAccount by remember { mutableStateOf(accounts.firstOrNull()) }
    var selectedCategory by remember { mutableStateOf(categories.firstOrNull { it.type == type }) }
    var merchant by remember { mutableStateOf(ruleToEdit?.merchant ?: "") }
    var notes by remember { mutableStateOf(ruleToEdit?.notes ?: "") }
    var autoPost by remember { mutableStateOf(ruleToEdit?.autoPost ?: false) }

    val sdf = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()) }
    var nextRunDate by remember { mutableStateOf(ruleToEdit?.nextRunDate ?: sdf.format(Date())) }

    var frequencyMenuExpanded by remember { mutableStateOf(false) }
    var accountMenuExpanded by remember { mutableStateOf(false) }
    var categoryMenuExpanded by remember { mutableStateOf(false) }

    val frequencies = listOf("monthly", "weekly", "yearly", "daily")
    val filteredCategories = remember(categories, type) { categories.filter { it.type == type } }

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
                    text = if (ruleToEdit == null) "Add Recurring Bill" else "Edit Recurring Rule",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate900
                )

                Spacer(modifier = Modifier.height(16.dp))

                FinoraTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = "Subscription / Bill Name",
                    leadingIcon = Icons.Default.EventRepeat
                )

                Spacer(modifier = Modifier.height(14.dp))

                FinoraTextField(
                    value = amountStr,
                    onValueChange = { amountStr = it },
                    label = "Amount",
                    leadingIcon = Icons.Default.AttachMoney,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Frequency Dropdown
                ExposedDropdownMenuBox(
                    expanded = frequencyMenuExpanded,
                    onExpandedChange = { frequencyMenuExpanded = !frequencyMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = frequency.capitalize(),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Frequency Schedule") },
                        leadingIcon = { Icon(Icons.Default.Update, contentDescription = null, tint = Indigo600) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = frequencyMenuExpanded) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = frequencyMenuExpanded,
                        onDismissRequest = { frequencyMenuExpanded = false }
                    ) {
                        frequencies.forEach { freq ->
                            DropdownMenuItem(
                                text = { Text(freq.capitalize()) },
                                onClick = {
                                    frequency = freq
                                    frequencyMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                FinoraTextField(
                    value = nextRunDate,
                    onValueChange = { nextRunDate = it },
                    label = "Next Due Date (YYYY-MM-DD)",
                    leadingIcon = Icons.Default.CalendarToday
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Account Dropdown
                ExposedDropdownMenuBox(
                    expanded = accountMenuExpanded,
                    onExpandedChange = { accountMenuExpanded = !accountMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = selectedAccount?.name ?: "Select Payment Account",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Account") },
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

                // AutoPost Switch
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Auto-Post on Due Date", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text("Automatically log transaction via midnight cron daemon", fontSize = 12.sp, color = Slate500)
                    }
                    Switch(
                        checked = autoPost,
                        onCheckedChange = { autoPost = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Indigo600)
                    )
                }

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
                        text = if (ruleToEdit == null) "Create Rule" else "Save",
                        onClick = {
                            val amount = amountStr.toDoubleOrNull()
                            if (name.isNotBlank() && amount != null && selectedAccount != null) {
                                onSubmit(
                                    CreateRecurringRuleRequest(
                                        name = name.trim(),
                                        type = type,
                                        amount = amount,
                                        account = selectedAccount!!.id,
                                        category = selectedCategory?.id,
                                        frequency = frequency,
                                        nextRunDate = nextRunDate,
                                        autoPost = autoPost,
                                        merchant = merchant.ifBlank { null },
                                        notes = notes.ifBlank { null }
                                    )
                                )
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

private fun String.capitalize(): String = replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }
