import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTransactions,
  deleteTransaction,
} from '../store/transactionSlice';
import { fetchAccounts } from '../store/accountSlice';
import { fetchCategories } from '../store/categorySlice';
import TransactionFormModal from '../components/TransactionFormModal';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  X,
  Paperclip,
} from 'lucide-react-native';

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const TransactionsScreen = () => {
  const dispatch = useDispatch();
  const { transactions, isLoading, error } = useSelector(
    (state) => state.transactions
  );
  const { accounts } = useSelector((state) => state.accounts);
  const { categories } = useSelector((state) => state.categories);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    type: 'All',
    account: '',
    category: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v && v !== 'All'
  ).length;

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchAccounts());
    dispatch(fetchCategories());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchTransactions()),
      dispatch(fetchAccounts()),
      dispatch(fetchCategories()),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Transaction',
      'Delete this transaction? This will automatically update your account balances.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await dispatch(deleteTransaction(id));
            dispatch(fetchAccounts());
          },
        },
      ]
    );
  };

  const handleAddNew = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    dispatch(fetchAccounts());
  };

  const clearFilters = () =>
    setFilters({
      search: '',
      type: 'All',
      account: '',
      category: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
    });

  const filteredTransactions = transactions.filter((t) => {
    const s = filters.search.toLowerCase();
    const matchesSearch =
      !s ||
      t.merchant?.toLowerCase().includes(s) ||
      t.notes?.toLowerCase().includes(s) ||
      t.category?.name?.toLowerCase().includes(s);

    const matchesType = filters.type === 'All' || t.type === filters.type;
    const matchesAccount =
      !filters.account ||
      t.account?._id === filters.account ||
      t.account === filters.account;
    const matchesCategory =
      !filters.category ||
      t.category?._id === filters.category ||
      t.category === filters.category;

    const txDate = new Date(t.date);
    const matchesStartDate =
      !filters.startDate || txDate >= new Date(filters.startDate);
    const matchesEndDate =
      !filters.endDate ||
      txDate <= new Date(filters.endDate + 'T23:59:59');

    const matchesMinAmount =
      !filters.minAmount || t.amount >= parseFloat(filters.minAmount);
    const matchesMaxAmount =
      !filters.maxAmount || t.amount <= parseFloat(filters.maxAmount);

    return (
      matchesSearch &&
      matchesType &&
      matchesAccount &&
      matchesCategory &&
      matchesStartDate &&
      matchesEndDate &&
      matchesMinAmount &&
      matchesMaxAmount
    );
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.screenTitle}>Transactions</Text>
            <Text style={styles.screenSubtitle}>
              View and manage your transaction history.
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddNew}>
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filters Toggle */}
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Search size={18} color={COLORS.textLight} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search merchants, notes..."
                placeholderTextColor={COLORS.textLight}
                value={filters.search}
                onChangeText={(text) =>
                  setFilters((prev) => ({ ...prev, search: text }))
                }
              />
            </View>

            <TouchableOpacity
              style={[
                styles.filterToggleBtn,
                (filtersOpen || activeFilterCount > 0) &&
                  styles.filterToggleBtnActive,
              ]}
              onPress={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal
                size={16}
                color={
                  filtersOpen || activeFilterCount > 0
                    ? COLORS.primary
                    : COLORS.textSecondary
                }
              />
              {activeFilterCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          {/* Collapsible Filter Panel */}
          {filtersOpen && (
            <View style={styles.filterPanel}>
              {/* Type Filter Chips */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Type</Text>
                <View style={styles.typeChipsRow}>
                  {['All', 'Expense', 'Income', 'Transfer'].map((t) => {
                    const isSelected = filters.type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() =>
                          setFilters((prev) => ({ ...prev, type: t }))
                        }
                        style={[
                          styles.typeChip,
                          isSelected && styles.typeChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            isSelected && styles.typeChipTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Account Filter Chips */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Account</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScroll}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, account: '' }))
                    }
                    style={[
                      styles.typeChip,
                      !filters.account && styles.typeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        !filters.account && styles.typeChipTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {accounts.map((a) => {
                    const isSelected = filters.account === a._id;
                    return (
                      <TouchableOpacity
                        key={a._id}
                        onPress={() =>
                          setFilters((prev) => ({ ...prev, account: a._id }))
                        }
                        style={[
                          styles.typeChip,
                          isSelected && styles.typeChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            isSelected && styles.typeChipTextActive,
                          ]}
                        >
                          {a.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Date & Amount Ranges */}
              <View style={styles.twoColFilterRow}>
                <View style={styles.colHalf}>
                  <Text style={styles.filterLabel}>Min Amount (₹)</Text>
                  <TextInput
                    style={styles.smallInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textLight}
                    value={filters.minAmount}
                    onChangeText={(text) =>
                      setFilters((prev) => ({ ...prev, minAmount: text }))
                    }
                  />
                </View>
                <View style={styles.colHalf}>
                  <Text style={styles.filterLabel}>Max Amount (₹)</Text>
                  <TextInput
                    style={styles.smallInput}
                    keyboardType="numeric"
                    placeholder="∞"
                    placeholderTextColor={COLORS.textLight}
                    value={filters.maxAmount}
                    onChangeText={(text) =>
                      setFilters((prev) => ({ ...prev, maxAmount: text }))
                    }
                  />
                </View>
              </View>

              {/* Clear filters button */}
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={clearFilters}
                >
                  <X size={14} color={COLORS.danger} />
                  <Text style={styles.clearFiltersText}>Clear all filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Count subtitle */}
        <Text style={styles.countText}>
          {filteredTransactions.length} of {transactions.length} transactions
        </Text>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Transaction Cards List */}
        {isLoading && transactions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or add a new transaction.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddNew}>
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.emptyAddBtnText}>New Transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listCard}>
            {filteredTransactions.map((t, index) => {
              const isExpense = t.type === 'Expense';
              const isIncome = t.type === 'Income';
              const isTransfer = t.type === 'Transfer';
              const isLast = index === filteredTransactions.length - 1;

              return (
                <View
                  key={t._id}
                  style={[styles.txItem, !isLast && styles.itemBorder]}
                >
                  {/* Left: Icon & Details */}
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.typeIconBox,
                        isIncome && styles.typeIconIncome,
                        isExpense && styles.typeIconExpense,
                        isTransfer && styles.typeIconTransfer,
                      ]}
                    >
                      {isIncome && (
                        <ArrowDownRight size={20} color={COLORS.success} />
                      )}
                      {isExpense && (
                        <ArrowUpRight size={20} color={COLORS.danger} />
                      )}
                      {isTransfer && (
                        <ArrowRightLeft size={20} color={COLORS.primary} />
                      )}
                    </View>

                    <View style={styles.txInfo}>
                      <Text style={styles.txMerchant} numberOfLines={1}>
                        {t.merchant ||
                          (isTransfer
                            ? 'Transfer'
                            : t.category?.name || 'Uncategorized')}
                      </Text>

                      <View style={styles.txMetaRow}>
                        <Text style={styles.txDate}>{formatDate(t.date)}</Text>
                        <Text style={styles.txDot}>•</Text>
                        <Text style={styles.txAccount} numberOfLines={1}>
                          {isTransfer
                            ? `${t.account?.name || 'Account'} → ${
                                t.toAccount?.name || 'Account'
                              }`
                            : t.account?.name || 'Account'}
                        </Text>
                      </View>

                      {/* Category / Subcategory Badge */}
                      {!isTransfer && t.category && (
                        <View style={styles.categoryBadgeRow}>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>
                              {t.category.name}
                            </Text>
                          </View>
                          {t.subcategory && (
                            <Text style={styles.subcategoryText}>
                              → {t.subcategory.name}
                            </Text>
                          )}
                        </View>
                      )}

                      {t.notes ? (
                        <Text style={styles.txNotes} numberOfLines={1}>
                          {t.notes}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Right: Amount & Actions */}
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        isExpense && styles.amountExpense,
                        isIncome && styles.amountIncome,
                      ]}
                    >
                      {isExpense ? '-' : isIncome ? '+' : ''}
                      {formatCurrency(t.amount, t.account?.currency)}
                    </Text>

                    <View style={styles.txActionsRow}>
                      {t.attachmentUrl ? (
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => Linking.openURL(t.attachmentUrl)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Paperclip size={15} color={COLORS.primary} />
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleEdit(t)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Edit2 size={15} color={COLORS.textLight} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleDelete(t._id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Transaction Modal */}
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        transaction={editingTransaction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  headerTextCol: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  screenSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  searchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textMain,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surface,
  },
  filterToggleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  filterBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  filterPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
  },
  typeChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  twoColFilterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  smallInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: COLORS.textMain,
    marginTop: 4,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  clearFiltersText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },
  countText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: COLORS.dangerText,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 10,
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  typeIconIncome: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  typeIconExpense: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
  },
  typeIconTransfer: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  txInfo: {
    flex: 1,
  },
  txMerchant: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  txDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  txDot: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  txAccount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  subcategoryText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  txNotes: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  amountExpense: {
    color: COLORS.danger,
  },
  amountIncome: {
    color: COLORS.success,
  },
  txActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionIconBtn: {
    padding: 3,
  },
});

export default TransactionsScreen;
