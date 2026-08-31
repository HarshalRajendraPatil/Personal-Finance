package com.finora.app.ui.screens.bills

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
import com.finora.app.data.model.RecurringRule
import com.finora.app.ui.components.*
import com.finora.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillsScreen(
    viewModel: BillsViewModel,
    onNavigateToProfile: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val actionMessage by viewModel.actionStateMessage.collectAsState()

    var showAddDialog by remember { mutableStateOf(false) }
    var ruleToEdit by remember { mutableStateOf<RecurringRule?>(null) }
    var selectedTab by remember { mutableStateOf("All") }

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
                title = { Text("Bills & Subscriptions", fontWeight = FontWeight.Bold) },
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
                    ruleToEdit = null
                    showAddDialog = true
                },
                containerColor = Indigo600,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Bill")
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
                is BillsUiState.Loading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = Indigo600
                    )
                }

                is BillsUiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        ErrorBanner(message = state.message)
                        Spacer(modifier = Modifier.height(16.dp))
                        FinoraButton(text = "Retry", onClick = { viewModel.loadBills() }, modifier = Modifier.width(140.dp))
                    }
                }

                is BillsUiState.Success -> {
                    if (state.rules.isEmpty()) {
                        EmptyStateView(
                            title = "No Recurring Bills",
                            description = "Automate your salary, rent, Netflix, or utility subscriptions.",
                            icon = Icons.Default.EventRepeat,
                            actionButtonText = "Add Recurring Bill",
                            onActionClick = { showAddDialog = true }
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            contentPadding = PaddingValues(bottom = 80.dp)
                        ) {
                            // Executive Summary KPI Header
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
                                        Text("Est. Monthly Recurring Outflow", color = Indigo100, fontSize = 13.sp)
                                        Text(
                                            text = CurrencyFormatter.format(state.monthlyRecurringTotal),
                                            color = Color.White,
                                            fontSize = 30.sp,
                                            fontWeight = FontWeight.Bold
                                        )

                                        Spacer(modifier = Modifier.height(14.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            StatusBadge(
                                                text = "${state.rules.size} Active Subscriptions",
                                                backgroundColor = Color.White.copy(alpha = 0.2f),
                                                textColor = Color.White
                                            )
                                            StatusBadge(
                                                text = "${state.autoPostCount} Auto-Post Cron Rules",
                                                backgroundColor = Emerald100,
                                                textColor = Emerald600
                                            )
                                        }
                                    }
                                }
                            }

                            item {
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    listOf("All", "Monthly", "Weekly", "Yearly").forEach { tab ->
                                        FilterChip(
                                            selected = selectedTab == tab,
                                            onClick = { selectedTab = tab },
                                            label = { Text(tab) }
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                            }

                            val filtered = state.rules.filter {
                                if (selectedTab == "All") true
                                else it.frequency.equals(selectedTab, ignoreCase = true)
                            }

                            items(filtered) { rule ->
                                RecurringRuleCard(
                                    rule = rule,
                                    onPay = {
                                        viewModel.payBill(rule.id)
                                    },
                                    onEdit = {
                                        ruleToEdit = rule
                                        showAddDialog = true
                                    },
                                    onDelete = {
                                        viewModel.deleteRule(rule.id)
                                    }
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                            }
                        }
                    }
                }
            }

            if (showAddDialog && uiState is BillsUiState.Success) {
                val successState = uiState as BillsUiState.Success
                RecurringFormDialog(
                    ruleToEdit = ruleToEdit,
                    accounts = successState.accounts,
                    categories = successState.categories,
                    onDismiss = { showAddDialog = false },
                    onSubmit = { req ->
                        if (ruleToEdit != null) {
                            viewModel.updateRule(ruleToEdit!!.id, req)
                        } else {
                            viewModel.createRule(req)
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun RecurringRuleCard(
    rule: RecurringRule,
    onPay: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }

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
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Indigo100),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.EventRepeat, contentDescription = null, tint = Indigo600, modifier = Modifier.size(20.dp))
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = rule.name,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            StatusBadge(text = rule.frequency.replaceFirstChar { it.uppercase() }, backgroundColor = Slate100, textColor = Slate700)
                            if (rule.autoPost) {
                                Spacer(modifier = Modifier.width(6.dp))
                                StatusBadge(text = "Auto-Post", backgroundColor = Emerald100, textColor = Emerald600)
                            }
                        }
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
                            text = { Text("Mark as Paid") },
                            leadingIcon = { Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Emerald600) },
                            onClick = {
                                menuExpanded = false
                                onPay()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Edit") },
                            leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                            onClick = {
                                menuExpanded = false
                                onEdit()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Delete", color = Rose600) },
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

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Next Due Date: ${rule.nextRunDate.take(10)}", fontSize = 12.sp, color = Slate500)
                    Text(
                        text = CurrencyFormatter.format(rule.amount),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (rule.type == "Income") Emerald600 else Rose600
                    )
                }

                FinoraButton(
                    text = "Mark Paid",
                    onClick = onPay,
                    containerColor = Emerald600,
                    modifier = Modifier.widthIn(max = 120.dp)
                )
            }
        }
    }
}
