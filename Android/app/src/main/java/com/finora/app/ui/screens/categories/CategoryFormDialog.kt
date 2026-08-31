package com.finora.app.ui.screens.categories

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.window.Dialog
import com.finora.app.data.model.Category
import com.finora.app.data.model.CreateCategoryRequest
import com.finora.app.ui.components.FinoraButton
import com.finora.app.ui.components.FinoraTextField
import com.finora.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryFormDialog(
    categoryToEdit: Category? = null,
    allCategories: List<Category>,
    selectedType: String = "Expense",
    onDismiss: () -> Unit,
    onSubmit: (CreateCategoryRequest) -> Unit
) {
    var name by remember { mutableStateOf(categoryToEdit?.name ?: "") }
    var type by remember { mutableStateOf(categoryToEdit?.type ?: selectedType) }
    var parentId by remember { mutableStateOf(categoryToEdit?.parentId) }
    var icon by remember { mutableStateOf(categoryToEdit?.icon ?: "Folder") }
    var colorHex by remember { mutableStateOf(categoryToEdit?.color ?: "#4F46E5") }
    var isEssential by remember { mutableStateOf(categoryToEdit?.isEssential ?: false) }

    var typeMenuExpanded by remember { mutableStateOf(false) }
    var parentMenuExpanded by remember { mutableStateOf(false) }

    val presetColors = listOf(
        "#4F46E5", "#10B981", "#EF4444", "#F59E0B",
        "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"
    )

    val parentCategories = remember(allCategories, type) {
        allCategories.filter { it.type == type && it.parentId == null && it.id != categoryToEdit?.id }
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
                    text = if (categoryToEdit == null) "Create Category" else "Edit Category",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate900
                )

                Spacer(modifier = Modifier.height(16.dp))

                FinoraTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = "Category Name",
                    leadingIcon = Icons.Default.Folder
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Type Dropdown
                ExposedDropdownMenuBox(
                    expanded = typeMenuExpanded,
                    onExpandedChange = { typeMenuExpanded = !typeMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = type,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Taxonomy Type") },
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
                        listOf("Expense", "Income", "Transfer").forEach { t ->
                            DropdownMenuItem(
                                text = { Text(t) },
                                onClick = {
                                    type = t
                                    parentId = null
                                    typeMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Optional Parent Category Dropdown for subcategories
                ExposedDropdownMenuBox(
                    expanded = parentMenuExpanded,
                    onExpandedChange = { parentMenuExpanded = !parentMenuExpanded }
                ) {
                    val parentName = parentCategories.find { it.id == parentId }?.name ?: "None (Top-Level Category)"
                    OutlinedTextField(
                        value = parentName,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Parent Category (Optional)") },
                        leadingIcon = { Icon(Icons.Default.SubdirectoryArrowRight, contentDescription = null, tint = Indigo600) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = parentMenuExpanded) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = parentMenuExpanded,
                        onDismissRequest = { parentMenuExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("None (Top-Level Category)") },
                            onClick = {
                                parentId = null
                                parentMenuExpanded = false
                            }
                        )
                        parentCategories.forEach { p ->
                            DropdownMenuItem(
                                text = { Text(p.name) },
                                onClick = {
                                    parentId = p.id
                                    parentMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Color Picker Grid
                Text("Select Category Color", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Slate700)
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    presetColors.forEach { hex ->
                        val parsedColor = parseHexColor(hex)
                        val isSelected = hex.equals(colorHex, ignoreCase = true)
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(parsedColor)
                                .border(
                                    width = if (isSelected) 3.dp else 0.dp,
                                    color = if (isSelected) Slate900 else Color.Transparent,
                                    shape = CircleShape
                                )
                                .clickable { colorHex = hex }
                        )
                    }
                }

                if (type == "Expense") {
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = isEssential,
                            onCheckedChange = { isEssential = it },
                            colors = CheckboxDefaults.colors(checkedColor = Indigo600)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Column {
                            Text("Essential Need", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            Text("Mark as essential for spending radar & intelligence analytics", fontSize = 12.sp, color = Slate500)
                        }
                    }
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
                        text = if (categoryToEdit == null) "Create" else "Save",
                        onClick = {
                            if (name.isNotBlank()) {
                                onSubmit(
                                    CreateCategoryRequest(
                                        name = name.trim(),
                                        type = type,
                                        parent = parentId,
                                        icon = icon,
                                        color = colorHex,
                                        isEssential = isEssential
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

fun parseHexColor(hex: String?): Color {
    if (hex.isNull_or_empty()) return Indigo600
    return try {
        val cleanHex = hex.replace("#", "")
        val colorInt = cleanHex.toLong(16)
        if (cleanHex.length == 6) {
            Color(0xFF000000 or colorInt)
        } else {
            Color(colorInt)
        }
    } catch (e: Exception) {
        Indigo600
    }
}

private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()
