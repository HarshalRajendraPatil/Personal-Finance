package com.finora.app.ui.screens.budgets

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.finora.app.data.model.BudgetWithSpend
import com.finora.app.ui.components.*
import com.finora.app.ui.screens.categories.parseHexColor
import com.finora.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BudgetsScreen(
    viewModel: BudgetsViewModel,
    onNavigateToProfile: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val actionMessage by viewModel.actionStateMessage.collectAsState()

    var showAddDialog by remember { mutableStateOf(false) }
    var budgetToEdit by remember { mutableStateOf<BudgetWithSpend?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(actionMessage) {
        actionMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearActionMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Budgeting & Caps", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Default.AccountCircle, contentDescription = "Profile", tint = Indigo600)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Slate50,
                    titleContentColor = Slate900
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    budgetToEdit = null
                    showAddDialog = true
                },
                containerColor = Indigo600,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Set Budget")
            }
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        containerColor = Slate50
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (val state = uiState) {
                is BudgetsUiState.Loading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = Indigo600
                    )
                }

                is BudgetsUiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        ErrorBanner(message = state.message)
                        Spacer(modifier = Modifier.height(16.dp))
                        FinoraButton(text = "Retry", onClick = { viewModel.loadBudgets() }, modifier = Modifier.width(140.dp))
                    }
                }

                is BudgetsUiState.Success -> {
                    if (state.budgets.isEmpty()) {
                        EmptyStateView(
                            title = "No Active Budgets",
                            description = "Set category spending limits to prevent overspending and track monthly targets.",
                            icon = Icons.Default.PieChart,
                            actionButtonText = "Set Category Budget",
                            onActionClick = { showAddDialog = true }
                        )
                    } else {
                        val overallPercentage = if (state.totalLimit > 0) (state.totalSpent / state.totalLimit) * 100 else 0.0

                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            contentPadding = PaddingValues(bottom = 80.dp)
                        ) {
                            // Master Budget Progress Header Card
                            item {
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    shape = RoundedCornerShape(20.dp),
                                    color = Indigo600,
                                    shadowElevation = 3.dp
                                ) {
                                    Column(
                                        modifier = Modifier.padding(20.dp)
                                    ) {
                                        Text("Total Monthly Budget Allowance", color = Indigo100, fontSize = 13.sp)
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.Bottom
                                        ) {
                                            Text(
                                                text = CurrencyFormatter.format(state.totalSpent),
                                                color = Color.White,
                                                fontSize = 28.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = "of ${CurrencyFormatter.format(state.totalLimit)}",
                                                color = Indigo100,
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(12.dp))

                                        LinearProgressIndicator(
                                            progress = { (overallPercentage / 100.0).toFloat().coerceIn(0f, 1f) },
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(10.dp)
                                                .clip(RoundedCornerShape(5.dp)),
                                            color = when {
                                                overallPercentage >= 100 -> Rose500
                                                overallPercentage >= 80 -> Amber500
                                                else -> Emerald500
                                            },
                                            trackColor = Color.White.copy(alpha = 0.2f)
                                        )

                                        Spacer(modifier = Modifier.height(8.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = "${overallPercentage.toInt()}% Spent",
                                                color = Color.White,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = "Remaining: ${CurrencyFormatter.format(kotlin.math.max(0.0, state.totalLimit - state.totalSpent))}",
                                                color = Indigo100,
                                                fontSize = 12.sp
                                            )
                                        }
                                    }
                                }
                            }

                            item {
                                Text(
                                    text = "Category Budget Allowances (${state.budgets.size})",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate900,
                                    modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                                )
                            }

                            items(state.budgets) { budget ->
                                CategoryBudgetCard(
                                    budget = budget,
                                    onEdit = {
                                        budgetToEdit = budget
                                        showAddDialog = true
                                    },
                                    onDelete = {
                                        viewModel.deleteBudget(budget.id)
                                    }
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                            }
                        }
                    }
                }
            }

            if (showAddDialog && uiState is BudgetsUiState.Success) {
                val successState = uiState as BudgetsUiState.Success
                BudgetFormDialog(
                    budgetToEdit = budgetToEdit,
                    categories = successState.categories,
                    onDismiss = { showAddDialog = false },
                    onSubmit = { req ->
                        if (budgetToEdit != null) {
                            viewModel.updateBudget(budgetToEdit!!.id, req)
                        } else {
                            viewModel.createBudget(req)
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun CategoryBudgetCard(
    budget: BudgetWithSpend,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }

    val categoryColor = parseHexColor(budget.categoryColor)
    val percentage = budget.percentage
    val isExceeded = budget.status == "Exceeded" || percentage >= 100
    val isWarning = budget.status == "Warning" || percentage >= budget.alertThreshold

    val progressColor = when {
        isExceeded -> Rose600
        isWarning -> Amber500
        else -> Emerald600
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, Slate300.copy(alpha = 0.5f)),
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(categoryColor.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Category, contentDescription = null, tint = categoryColor, modifier = Modifier.size(20.dp))
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = budget.categoryName,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                        StatusBadge(
                            text = when {
                                isExceeded -> "Exceeded"
                                isWarning -> "Warning (${percentage.toInt()}%)"
                                else -> "Safe"
                            },
                            backgroundColor = when {
                                isExceeded -> Rose100
                                isWarning -> Amber100
                                else -> Emerald100
                            },
                            textColor = when {
                                isExceeded -> Rose600
                                isWarning -> Amber600
                                else -> Emerald600
                            }
                        )
                    }
                }

                Box {
                    IconButton(onClick = { menuExpanded = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Menu", tint = Slate500)
                    }
                    DropdownMenu(
                        expanded = menuExpanded,
                        onDismissRequest = { menuExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Edit Limit") },
                            leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                            onClick = {
                                menuExpanded = false
                                onEdit()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Remove Cap", color = Rose600) },
                            leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = Rose600) },
                            onClick = {
                                menuExpanded = false
                                onDelete()
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            LinearProgressIndicator(
                progress = { (percentage / 100.0).toFloat().coerceIn(0f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = progressColor,
                trackColor = Slate100
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${CurrencyFormatter.format(budget.spent)} / ${CurrencyFormatter.format(budget.limit)}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate900
                )

                Text(
                    text = if (isExceeded) {
                        "Over by ${CurrencyFormatter.format(budget.spent - budget.limit)}"
                    } else {
                        "${CurrencyFormatter.format(budget.remaining)} left"
                    },
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isExceeded) Rose600 else Slate500
                )
            }
        }
    }
}
