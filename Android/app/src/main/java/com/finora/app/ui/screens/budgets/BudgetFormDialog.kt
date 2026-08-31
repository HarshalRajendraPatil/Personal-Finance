package com.finora.app.ui.screens.budgets

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BudgetFormDialog(
    budgetToEdit: BudgetWithSpend? = null,
    categories: List<Category>,
    onDismiss: () -> Unit,
    onSubmit: (CreateBudgetRequest) -> Unit
) {
    var name by remember { mutableStateOf(budgetToEdit?.name ?: "") }
    var limitStr by remember { mutableStateOf(budgetToEdit?.limit?.toString() ?: "") }
    var period by remember { mutableStateOf(budgetToEdit?.period ?: "monthly") }
    var alertThreshold by remember { mutableStateOf(budgetToEdit?.alertThreshold ?: 80) }
    var selectedCategory by remember { mutableStateOf(categories.firstOrNull { it.type == "Expense" }) }

    var categoryMenuExpanded by remember { mutableStateOf(false) }
    var periodMenuExpanded by remember { mutableStateOf(false) }

    val periods = listOf("monthly", "weekly", "yearly")
    val expenseCategories = remember(categories) { categories.filter { it.type == "Expense" } }

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
                    text = if (budgetToEdit == null) "Set Category Budget" else "Edit Budget Limit",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate900
                )

                Spacer(modifier = Modifier.height(16.dp))

                FinoraTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = "Budget Identifier / Name",
                    leadingIcon = Icons.Default.Flag
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Category Dropdown
                ExposedDropdownMenuBox(
                    expanded = categoryMenuExpanded,
                    onExpandedChange = { categoryMenuExpanded = !categoryMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = selectedCategory?.name ?: budgetToEdit?.categoryName ?: "Select Category",
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
                        expenseCategories.forEach { cat ->
                            DropdownMenuItem(
                                text = { Text(cat.name) },
                                onClick = {
                                    selectedCategory = cat
                                    if (name.isBlank()) name = "${cat.name} Budget"
                                    categoryMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                FinoraTextField(
                    value = limitStr,
                    onValueChange = { limitStr = it },
                    label = "Spend Limit Amount",
                    leadingIcon = Icons.Default.AttachMoney,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Period Dropdown
                ExposedDropdownMenuBox(
                    expanded = periodMenuExpanded,
                    onExpandedChange = { periodMenuExpanded = !periodMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = period.replaceFirstChar { it.uppercase() },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Budget Period") },
                        leadingIcon = { Icon(Icons.Default.DateRange, contentDescription = null, tint = Indigo600) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = periodMenuExpanded) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = periodMenuExpanded,
                        onDismissRequest = { periodMenuExpanded = false }
                    ) {
                        periods.forEach { p ->
                            DropdownMenuItem(
                                text = { Text(p.replaceFirstChar { it.uppercase() }) },
                                onClick = {
                                    period = p
                                    periodMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text("Alert Threshold: $alertThreshold%", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text("Show warning status badge when spend exceeds $alertThreshold%", fontSize = 12.sp, color = Slate500)
                Slider(
                    value = alertThreshold.toFloat(),
                    onValueChange = { alertThreshold = it.toInt() },
                    valueRange = 50f..100f,
                    steps = 10,
                    colors = SliderDefaults.colors(thumbColor = Indigo600, activeTrackColor = Indigo600)
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
                        text = if (budgetToEdit == null) "Set Budget" else "Save",
                        onClick = {
                            val limit = limitStr.toDoubleOrNull()
                            if (limit != null && limit > 0 && selectedCategory != null) {
                                onSubmit(
                                    CreateBudgetRequest(
                                        name = if (name.isNotBlank()) name.trim() else "${selectedCategory!!.name} Budget",
                                        category = selectedCategory!!.id,
                                        period = period,
                                        limit = limit,
                                        alertThreshold = alertThreshold
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
