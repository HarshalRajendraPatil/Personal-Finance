package com.finora.app.ui.screens.accounts

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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.finora.app.data.model.Account
import com.finora.app.ui.components.*
import com.finora.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountsScreen(
    viewModel: AccountsViewModel,
    onNavigateToProfile: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val actionMessage by viewModel.actionStateMessage.collectAsState()

    var showAddDialog by remember { mutableStateOf(false) }
    var showTransferDialog by remember { mutableStateOf(false) }
    var accountToEdit by remember { mutableStateOf<Account?>(null) }
    var accountToReconcile by remember { mutableStateOf<Account?>(null) }

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
                title = { Text("Accounts & Wallets", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { showTransferDialog = true }) {
                        Icon(Icons.Default.SwapHoriz, contentDescription = "Transfer Funds", tint = Indigo600)
                    }
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
                    accountToEdit = null
                    showAddDialog = true
                },
                containerColor = Indigo600,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Account")
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
                is AccountsUiState.Loading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = Indigo600
                    )
                }

                is AccountsUiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        ErrorBanner(message = state.message)
                        Spacer(modifier = Modifier.height(16.dp))
                        FinoraButton(text = "Retry", onClick = { viewModel.loadAccounts() }, modifier = Modifier.width(140.dp))
                    }
                }

                is AccountsUiState.Success -> {
                    if (state.accounts.isEmpty()) {
                        EmptyStateView(
                            title = "No Accounts Found",
                            description = "Add your bank accounts, wallets, or credit cards to start tracking balances.",
                            icon = Icons.Default.AccountBalanceWallet,
                            actionButtonText = "Add Account",
                            onActionClick = { showAddDialog = true }
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            contentPadding = PaddingValues(bottom = 80.dp)
                        ) {
                            // Top KPI Summary Header Card
                            item {
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 8.dp),
                                    shape = RoundedCornerShape(20.dp),
                                    color = Indigo600,
                                    shadowElevation = 4.dp
                                ) {
                                    Column(
                                        modifier = Modifier.padding(20.dp)
                                    ) {
                                        Text(
                                            text = "Net Liquid Balance",
                                            color = Indigo100,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = CurrencyFormatter.format(state.totalNetBalance),
                                            color = Color.White,
                                            fontSize = 32.sp,
                                            fontWeight = FontWeight.Bold
                                        )

                                        Spacer(modifier = Modifier.height(16.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column {
                                                Text("Liquid Cash", color = Indigo100, fontSize = 12.sp)
                                                Text(
                                                    CurrencyFormatter.format(state.totalLiquidCash),
                                                    color = Emerald100,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 16.sp
                                                )
                                            }
                                            Column {
                                                Text("Total Liabilities", color = Indigo100, fontSize = 12.sp)
                                                Text(
                                                    CurrencyFormatter.format(state.totalDebt),
                                                    color = Rose100,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 16.sp
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // Group Accounts by Type
                            val activeAccounts = state.accounts.filter { !it.isArchived }
                            val grouped = activeAccounts.groupBy { it.type }

                            grouped.forEach { (typeGroup, accountList) ->
                                item {
                                    Text(
                                        text = "$typeGroup Accounts (${accountList.size})",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Slate900,
                                        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                                    )
                                }

                                items(accountList) { account ->
                                    AccountItemCard(
                                        account = account,
                                        onEdit = {
                                            accountToEdit = account
                                            showAddDialog = true
                                        },
                                        onReconcile = {
                                            accountToReconcile = account
                                        },
                                        onArchive = {
                                            viewModel.archiveAccount(account.id)
                                        }
                                    )
                                    Spacer(modifier = Modifier.height(10.dp))
                                }
                            }
                        }
                    }
                }
            }

            // Dialog Modals
            if (showAddDialog) {
                AccountFormDialog(
                    accountToEdit = accountToEdit,
                    onDismiss = { showAddDialog = false },
                    onSubmit = { req ->
                        if (accountToEdit != null) {
                            viewModel.updateAccount(accountToEdit!!.id, req)
                        } else {
                            viewModel.createAccount(req)
                        }
                    }
                )
            }

            if (showTransferDialog && uiState is AccountsUiState.Success) {
                val accountsList = (uiState as AccountsUiState.Success).accounts.filter { !it.isArchived }
                TransferDialog(
                    accounts = accountsList,
                    onDismiss = { showTransferDialog = false },
                    onSubmit = { fromId, toId, amount, notes ->
                        viewModel.transferFunds(fromId, toId, amount, notes)
                    }
                )
            }

            if (accountToReconcile != null) {
                ReconcileDialog(
                    account = accountToReconcile!!,
                    onDismiss = { accountToReconcile = null },
                    onSubmit = { actualBal, notes ->
                        viewModel.reconcileAccount(accountToReconcile!!.id, actualBal, notes)
                    }
                )
            }
        }
    }
}

@Composable
fun AccountItemCard(
    account: Account,
    onEdit: () -> Unit,
    onReconcile: () -> Unit,
    onArchive: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }

    val (icon, iconBg, iconTint) = getAccountTypeStyle(account.type)

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
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(iconBg),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(22.dp))
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = account.name,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            StatusBadge(text = account.type, backgroundColor = iconBg, textColor = iconTint)
                            if (!account.issuer.isNull_or_empty()) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(account.issuer!!, fontSize = 12.sp, color = Slate500)
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
                            text = { Text("Reconcile Balance") },
                            leadingIcon = { Icon(Icons.Default.AccountBalanceWallet, contentDescription = null) },
                            onClick = {
                                menuExpanded = false
                                onReconcile()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Edit Account") },
                            leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                            onClick = {
                                menuExpanded = false
                                onEdit()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Archive", color = Rose600) },
                            leadingIcon = { Icon(Icons.Default.Archive, contentDescription = null, tint = Rose600) },
                            onClick = {
                                menuExpanded = false
                                onArchive()
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    Text("Current Balance", fontSize = 12.sp, color = Slate500)
                    Text(
                        text = CurrencyFormatter.formatFull(account.currentBalance, account.currency),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (account.type == "Credit Card" || account.currentBalance < 0) Rose600 else Emerald600
                    )
                }

                if (account.type == "Credit Card" && account.creditLimit != null) {
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Credit Limit", fontSize = 12.sp, color = Slate500)
                        Text(
                            text = CurrencyFormatter.format(account.creditLimit),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Slate700
                        )
                    }
                }
            }
        }
    }
}

private fun getAccountTypeStyle(type: String): Triple<ImageVector, Color, Color> {
    return when (type) {
        "Bank" -> Triple(Icons.Default.AccountBalance, Indigo100, Indigo600)
        "Cash" -> Triple(Icons.Default.Payments, Emerald100, Emerald600)
        "Credit Card" -> Triple(Icons.Default.CreditCard, Rose100, Rose600)
        "UPI" -> Triple(Icons.Default.QrCode, Amber100, Amber600)
        "FD" -> Triple(Icons.Default.Savings, Blue100, Blue500)
        else -> Triple(Icons.Default.Wallet, Slate300, Slate700)
    }
}

private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()
