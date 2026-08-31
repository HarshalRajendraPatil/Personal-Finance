package com.finora.app.ui.screens.categories

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
import com.finora.app.data.model.Category
import com.finora.app.ui.components.*
import com.finora.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoriesScreen(
    viewModel: CategoriesViewModel,
    onNavigateToProfile: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val actionMessage by viewModel.actionStateMessage.collectAsState()

    var selectedTab by remember { mutableStateOf("Expense") }
    var showAddDialog by remember { mutableStateOf(false) }
    var categoryToEdit by remember { mutableStateOf<Category?>(null) }

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
                title = { Text("Categories & Taxonomy", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { viewModel.seedCategories() }) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = "Seed Defaults", tint = Indigo600)
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
                    categoryToEdit = null
                    showAddDialog = true
                },
                containerColor = Indigo600,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Category")
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
            // Tab Selector
            TabRow(
                selectedTabIndex = when (selectedTab) {
                    "Expense" -> 0
                    "Income" -> 1
                    else -> 2
                },
                containerColor = Slate50,
                contentColor = Indigo600
            ) {
                Tab(
                    selected = selectedTab == "Expense",
                    onClick = { selectedTab = "Expense" },
                    text = { Text("Expense", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == "Income",
                    onClick = { selectedTab = "Income" },
                    text = { Text("Income", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == "Transfer",
                    onClick = { selectedTab = "Transfer" },
                    text = { Text("Transfer", fontWeight = FontWeight.Bold) }
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                when (val state = uiState) {
                    is CategoriesUiState.Loading -> {
                        CircularProgressIndicator(
                            modifier = Modifier.align(Alignment.Center),
                            color = Indigo600
                        )
                    }

                    is CategoriesUiState.Error -> {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            ErrorBanner(message = state.message)
                            Spacer(modifier = Modifier.height(16.dp))
                            FinoraButton(text = "Retry", onClick = { viewModel.loadCategories() }, modifier = Modifier.width(140.dp))
                        }
                    }

                    is CategoriesUiState.Success -> {
                        val filteredList = state.categories.filter { it.type == selectedTab }

                        if (filteredList.isEmpty()) {
                            EmptyStateView(
                                title = "No $selectedTab Categories",
                                description = "Seed standard personal finance categories or create a custom one.",
                                icon = Icons.Default.Category,
                                actionButtonText = "Seed Defaults",
                                onActionClick = { viewModel.seedCategories() }
                            )
                        } else {
                            // Build parent & child subcategory hierarchy
                            val parentCategories = filteredList.filter { it.parentId == null }

                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(bottom = 80.dp)
                            ) {
                                items(parentCategories) { parent ->
                                    val children = filteredList.filter { it.parentId == parent.id }

                                    CategoryTreeCard(
                                        parentCategory = parent,
                                        subcategories = children,
                                        onEdit = { cat ->
                                            categoryToEdit = cat
                                            showAddDialog = true
                                        },
                                        onDelete = { cat ->
                                            viewModel.deleteCategory(cat.id)
                                        }
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                }
                            }
                        }
                    }
                }
            }

            if (showAddDialog && uiState is CategoriesUiState.Success) {
                val catList = (uiState as CategoriesUiState.Success).categories
                CategoryFormDialog(
                    categoryToEdit = categoryToEdit,
                    allCategories = catList,
                    selectedType = selectedTab,
                    onDismiss = { showAddDialog = false },
                    onSubmit = { req ->
                        if (categoryToEdit != null) {
                            viewModel.updateCategory(categoryToEdit!!.id, req)
                        } else {
                            viewModel.createCategory(req)
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun CategoryTreeCard(
    parentCategory: Category,
    subcategories: List<Category>,
    onEdit: (Category) -> Unit,
    onDelete: (Category) -> Unit
) {
    val categoryColor = parseHexColor(parentCategory.color)
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
            // Parent Category Header
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
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = null,
                            tint = categoryColor,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = parentCategory.name,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (parentCategory.isEssential) {
                                StatusBadge(text = "Essential Need", backgroundColor = Indigo100, textColor = Indigo600)
                                Spacer(modifier = Modifier.width(6.dp))
                            }
                            Text("${subcategories.size} subcategories", fontSize = 12.sp, color = Slate500)
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
                            text = { Text("Edit Category") },
                            leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                            onClick = {
                                menuExpanded = false
                                onEdit(parentCategory)
                            }
                        )
                        if (!parentCategory.isSystemDefault) {
                            DropdownMenuItem(
                                text = { Text("Delete Category", color = Rose600) },
                                leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = Rose600) },
                                onClick = {
                                    menuExpanded = false
                                    onDelete(parentCategory)
                                }
                            )
                        }
                    }
                }
            }

            // Subcategories List if present
            if (subcategories.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = Slate100)
                Spacer(modifier = Modifier.height(8.dp))

                subcategories.forEach { sub ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.SubdirectoryArrowRight,
                                contentDescription = null,
                                tint = Slate500,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(sub.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Slate700)
                        }

                        IconButton(
                            onClick = { onEdit(sub) },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null, tint = Slate500, modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }
        }
    }
}
