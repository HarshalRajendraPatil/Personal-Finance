package com.finora.app.ui.screens.transactions

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
import com.finora.app.data.model.Transaction
import com.finora.app.ui.components.*
import com.finora.app.ui.screens.categories.parseHexColor
import com.finora.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    viewModel: TransactionsViewModel,
    onNavigateToProfile: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val actionMessage by viewModel.actionStateMessage.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()

    var showAddDialog by remember { mutableStateOf(false) }
    var transactionToEdit by remember { mutableStateOf<Transaction?>(null) }
    var selectedFilterType by remember { mutableStateOf<String?>(null) }

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
                title = { Text("Transaction Ledger", fontWeight = FontWeight.Bold) },
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
                    transactionToEdit = null
                    showAddDialog = true
                },
                containerColor = Indigo600,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Log Transaction")
            }
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        containerColor = Slate50
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search Bar & Type Filter Chips
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                FinoraTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.setSearchQuery(it) },
                    label = "Search merchant or notes...",
                    leadingIcon = Icons.Default.Search,
                    trailingIcon = if (searchQuery.isNotEmpty()) {
                        {
                            IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                Icon(Icons.Default.Close, contentDescription = "Clear")
                            }
                        }
                    } else null
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = selectedFilterType == null,
                        onClick = {
                            selectedFilterType = null
                            viewModel.setFilterType(null)
                        },
                        label = { Text("All") }
                    )
                    FilterChip(
                        selected = selectedFilterType == "Expense",
                        onClick = {
                            selectedFilterType = "Expense"
                            viewModel.setFilterType("Expense")
                        },
                        label = { Text("Expenses") }
                    )
                    FilterChip(
                        selected = selectedFilterType == "Income",
                        onClick = {
                            selectedFilterType = "Income"
                            viewModel.setFilterType("Income")
                        },
                        label = { Text("Income") }
                    )
                    FilterChip(
                        selected = selectedFilterType == "Transfer",
                        onClick = {
                            selectedFilterType = "Transfer"
                            viewModel.setFilterType("Transfer")
                        },
                        label = { Text("Transfers") }
                    )
                }
            }

            Box(modifier = Modifier.fillMaxSize()) {
                when (val state = uiState) {
                    is TransactionsUiState.Loading -> {
                        CircularProgressIndicator(
                            modifier = Modifier.align(Alignment.Center),
                            color = Indigo600
                        )
                    }

                    is TransactionsUiState.Error -> {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            ErrorBanner(message = state.message)
                            Spacer(modifier = Modifier.height(16.dp))
                            FinoraButton(text = "Retry", onClick = { viewModel.loadTransactions() }, modifier = Modifier.width(140.dp))
                        }
                    }

                    is TransactionsUiState.Success -> {
                        if (state.transactions.isEmpty()) {
                            EmptyStateView(
                                title = "No Transactions Found",
                                description = "Log your daily income, expenses, and transfers to track spending.",
                                icon = Icons.Default.Receipt,
                                actionButtonText = "Log Transaction",
                                onActionClick = { showAddDialog = true }
                            )
                        } else {
                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 16.dp),
                                contentPadding = PaddingValues(bottom = 80.dp)
                            ) {
                                items(state.transactions) { transaction ->
                                    TransactionItemCard(
                                        transaction = transaction,
                                        onEdit = {
                                            transactionToEdit = transaction
                                            showAddDialog = true
                                        },
                                        onDelete = {
                                            viewModel.deleteTransaction(transaction.id)
                                        }
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                }
                            }
                        }
                    }
                }
            }

            if (showAddDialog && uiState is TransactionsUiState.Success) {
                val successState = uiState as TransactionsUiState.Success
                TransactionFormDialog(
                    transactionToEdit = transactionToEdit,
                    accounts = successState.accounts,
                    categories = successState.categories,
                    onDismiss = { showAddDialog = false },
                    onSubmit = { req ->
                        if (transactionToEdit != null) {
                            viewModel.updateTransaction(transactionToEdit!!.id, req)
                        } else {
                            viewModel.createTransaction(req)
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun TransactionItemCard(
    transaction: Transaction,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }

    val isExpense = transaction.type == "Expense"
    val isIncome = transaction.type == "Income"
    val isTransfer = transaction.type == "Transfer"

    val iconColor = when {
        isExpense -> Rose600
        isIncome -> Emerald600
        else -> Blue500
    }
    val iconBg = iconColor.copy(alpha = 0.12f)

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, Slate300.copy(alpha = 0.5f)),
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(iconBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when {
                            isExpense -> Icons.Default.ArrowUpward
                            isIncome -> Icons.Default.ArrowDownward
                            else -> Icons.Default.SwapHoriz
                        },
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = if (transaction.merchant.isNotBlank()) transaction.merchant else transaction.categoryName,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = if (isTransfer && transaction.toAccountName != null) {
                                "${transaction.accountName} ➔ ${transaction.toAccountName}"
                            } else {
                                transaction.accountName
                            },
                            fontSize = 12.sp,
                            color = Slate500
                        )
                    }
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${if (isExpense) "-" else if (isIncome) "+" else ""}${CurrencyFormatter.format(transaction.amount)}",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = iconColor
                )

                Box {
                    IconButton(onClick = { menuExpanded = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Menu", tint = Slate500)
                    }
                    DropdownMenu(
                        expanded = menuExpanded,
                        onDismissRequest = { menuExpanded = false }
                    ) {
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
        }
    }
}
