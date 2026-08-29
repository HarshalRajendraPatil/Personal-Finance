import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAccounts, deleteAccount } from '../store/accountSlice';
import AccountFormModal from '../components/AccountFormModal';
import CreditCardPayModal from '../components/CreditCardPayModal';
import CreditCardStatementModal from '../components/CreditCardStatementModal';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Plus,
  Building2,
  CreditCard,
  Wallet,
  IndianRupee,
  Trash2,
  Edit2,
  Archive,
  CreditCard as CardIcon,
} from 'lucide-react-native';

const getAccountIcon = (type) => {
  switch (type) {
    case 'Bank':
      return <Building2 size={22} color={COLORS.primary} />;
    case 'Credit Card':
      return <CreditCard size={22} color={COLORS.purple} />;
    case 'Cash':
      return <IndianRupee size={22} color={COLORS.success} />;
    default:
      return <Wallet size={22} color={COLORS.textSecondary} />;
  }
};

const AccountsScreen = () => {
  const dispatch = useDispatch();
  const { accounts, isLoading, error } = useSelector((state) => state.accounts);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Credit Card modals
  const [payCard, setPayCard] = useState(null);
  const [statementCard, setStatementCard] = useState(null);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchAccounts());
    setRefreshing(false);
  }, [dispatch]);

  const handleEdit = (account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteAccount(id)),
        },
      ]
    );
  };

  const activeAccounts = accounts.filter((acc) => !acc.isArchived);
  const archivedAccounts = accounts.filter((acc) => acc.isArchived);

  // Quick Stats
  const totalAssets = activeAccounts
    .filter((acc) => acc.type !== 'Credit Card' && acc.currentBalance >= 0)
    .reduce((sum, acc) => sum + acc.currentBalance, 0);

  const totalLiabilities = activeAccounts
    .filter((acc) => acc.type === 'Credit Card' || acc.currentBalance < 0)
    .reduce((sum, acc) => sum + Math.abs(acc.currentBalance), 0);

  const netBalance = totalAssets - totalLiabilities;

  const creditCardAccounts = activeAccounts.filter((a) => a.type === 'Credit Card');
  const otherAccounts = activeAccounts.filter((a) => a.type !== 'Credit Card');

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
            <Text style={styles.screenTitle}>Accounts & Wallets</Text>
            <Text style={styles.screenSubtitle}>
              Manage bank accounts, credit cards, and cash.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddNew}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {/* Net Balance */}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Net Balance</Text>
            <Text style={[styles.statValue, styles.statValueNet]}>
              {formatCurrency(netBalance)}
            </Text>
          </View>

          {/* Total Assets & Total Liabilities in a row */}
          <View style={styles.statSubRow}>
            <View style={[styles.statCard, styles.statCardHalf]}>
              <Text style={styles.statLabel}>Total Assets</Text>
              <Text style={[styles.statValue, styles.statValueAssets]}>
                {formatCurrency(totalAssets)}
              </Text>
            </View>

            <View style={[styles.statCard, styles.statCardHalf]}>
              <Text style={styles.statLabel}>Total Liabilities</Text>
              <Text style={[styles.statValue, styles.statValueLiabilities]}>
                {formatCurrency(totalLiabilities)}
              </Text>
            </View>
          </View>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Credit Cards Section */}
        {creditCardAccounts.length > 0 && (
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeaderRow}>
              <CardIcon size={18} color={COLORS.purple} />
              <Text style={styles.sectionTitle}>
                Credit Cards ({creditCardAccounts.length})
              </Text>
            </View>

            <View style={styles.cardsCol}>
              {creditCardAccounts.map((card) => {
                const outstanding = Math.abs(Math.min(0, card.currentBalance));
                const limit = card.creditLimit || 0;
                const available = limit > 0 ? Math.max(0, limit - outstanding) : 0;
                const utilization =
                  limit > 0 ? Math.round((outstanding / limit) * 100) : 0;
                const utilColor =
                  utilization > 70
                    ? COLORS.danger
                    : utilization > 30
                    ? '#F59E0B'
                    : COLORS.success;

                return (
                  <View key={card._id} style={styles.creditCardBox}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardLeftInfo}>
                        <View style={styles.cardIconCircle}>
                          <CreditCard size={20} color={COLORS.purple} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardName} numberOfLines={1}>
                            {card.name}
                          </Text>
                          <Text style={styles.cardIssuerText}>
                            {card.issuer || 'Credit Card'}{' '}
                            {card.last4Digits ? `(•••• ${card.last4Digits})` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          onPress={() => handleEdit(card)}
                          style={styles.actionIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Edit2 size={16} color={COLORS.textLight} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(card._id)}
                          style={styles.actionIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={16} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Outstanding & Limit */}
                    <View style={styles.cardBalanceRow}>
                      <View>
                        <Text style={styles.cardBalanceLabel}>Outstanding</Text>
                        <Text style={styles.cardOutstandingAmount}>
                          {formatCurrency(outstanding, card.currency)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.cardBalanceLabel}>Credit Limit</Text>
                        <Text style={styles.cardLimitAmount}>
                          {limit > 0
                            ? formatCurrency(limit, card.currency)
                            : 'No Limit'}
                        </Text>
                      </View>
                    </View>

                    {/* Utilization Bar */}
                    {limit > 0 && (
                      <View style={styles.utilizationWrapper}>
                        <View style={styles.utilTrack}>
                          <View
                            style={[
                              styles.utilFill,
                              {
                                width: `${Math.min(utilization, 100)}%`,
                                backgroundColor: utilColor,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.utilMetaRow}>
                          <Text style={styles.utilText}>{utilization}% used</Text>
                          <Text style={styles.availText}>
                            Avail: {formatCurrency(available, card.currency)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Actions & Billing cycle */}
                    <View style={styles.cardFooterRow}>
                      <Text style={styles.billingCycleText}>
                        {card.billingCycleDay
                          ? `Stmt: ${card.billingCycleDay}th · Due: ${card.paymentDueDay || '—'}th`
                          : 'Monthly cycle'}
                      </Text>

                      <View style={styles.cardBtnGroup}>
                        <TouchableOpacity
                          style={styles.statementBtn}
                          onPress={() => setStatementCard(card)}
                        >
                          <Text style={styles.statementBtnText}>Statement</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.payBillBtn}
                          onPress={() => setPayCard(card)}
                        >
                          <Text style={styles.payBillBtnText}>Pay Bill</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Bank & Cash Accounts */}
        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitle}>
            Bank & Cash Accounts ({otherAccounts.length})
          </Text>

          {isLoading && accounts.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading accounts...</Text>
            </View>
          ) : otherAccounts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Wallet size={36} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No bank accounts</Text>
              <Text style={styles.emptySubtitle}>
                Get started by creating your primary bank account.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={handleAddNew}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.emptyAddBtnText}>New Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listCard}>
              {otherAccounts.map((account, index) => {
                const isNegative = account.currentBalance < 0;
                const isLast = index === otherAccounts.length - 1;

                return (
                  <View
                    key={account._id}
                    style={[styles.accountItem, !isLast && styles.itemBorder]}
                  >
                    <View style={styles.accountLeft}>
                      <View style={styles.accountIconBox}>
                        {getAccountIcon(account.type)}
                      </View>
                      <View style={styles.accountInfo}>
                        <Text style={styles.accountName} numberOfLines={1}>
                          {account.name}
                        </Text>
                        <View style={styles.accountMetaRow}>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{account.type}</Text>
                          </View>
                          {account.notes ? (
                            <Text style={styles.accountNotes} numberOfLines={1}>
                              • {account.notes}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={styles.accountRight}>
                      <Text
                        style={[
                          styles.accountBalance,
                          isNegative && styles.balanceNegative,
                        ]}
                      >
                        {formatCurrency(account.currentBalance, account.currency)}
                      </Text>
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          onPress={() => handleEdit(account)}
                          style={styles.actionIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Edit2 size={16} color={COLORS.textLight} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(account._id)}
                          style={styles.actionIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={16} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Archived Accounts */}
        {archivedAccounts.length > 0 && (
          <View style={styles.archivedSection}>
            <View style={styles.archivedHeader}>
              <Archive size={18} color={COLORS.textMuted} />
              <Text style={styles.archivedTitle}>Archived Accounts</Text>
            </View>
            <View style={styles.archivedListCard}>
              {archivedAccounts.map((account, index) => {
                const isLast = index === archivedAccounts.length - 1;
                return (
                  <View
                    key={account._id}
                    style={[styles.archivedItem, !isLast && styles.itemBorder]}
                  >
                    <View style={styles.accountLeft}>
                      <View style={styles.archivedIconBox}>
                        {getAccountIcon(account.type)}
                      </View>
                      <View>
                        <Text style={styles.archivedName}>{account.name}</Text>
                        <Text style={styles.archivedType}>{account.type}</Text>
                      </View>
                    </View>
                    <View style={styles.accountRight}>
                      <Text style={styles.archivedBalance}>
                        {formatCurrency(account.currentBalance, account.currency)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleEdit(account)}
                        style={styles.restoreBtn}
                      >
                        <Text style={styles.restoreBtnText}>Restore / Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <AccountFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        account={editingAccount}
      />

      <CreditCardPayModal
        isOpen={!!payCard}
        onClose={() => setPayCard(null)}
        card={payCard}
        onSuccess={() => dispatch(fetchAccounts())}
      />

      <CreditCardStatementModal
        isOpen={!!statementCard}
        onClose={() => setStatementCard(null)}
        card={statementCard}
        onPayClick={(c) => setPayCard(c)}
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
    marginBottom: 20,
    gap: 12,
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
  statsGrid: {
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statSubRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardHalf: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  statValueNet: {
    color: COLORS.textMain,
  },
  statValueAssets: {
    color: COLORS.success,
  },
  statValueLiabilities: {
    color: COLORS.danger,
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
  sectionWrapper: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  cardsCol: {
    gap: 12,
  },
  creditCardBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    ...SHADOWS.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  cardIssuerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  cardBalanceLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  cardOutstandingAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.danger,
    marginTop: 2,
  },
  cardLimitAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  utilizationWrapper: {
    marginBottom: 12,
  },
  utilTrack: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  utilFill: {
    height: '100%',
    borderRadius: 3,
  },
  utilMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  utilText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  availText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  billingCycleText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  cardBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statementBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3E8FF',
  },
  statementBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B21A8',
  },
  payBillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.purple,
  },
  payBillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  accountIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  accountMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  typeBadge: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  accountNotes: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  accountRight: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  balanceNegative: {
    color: COLORS.danger,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionIconBtn: {
    padding: 2,
  },
  archivedSection: {
    marginTop: 28,
  },
  archivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  archivedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  archivedListCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  archivedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    opacity: 0.8,
  },
  archivedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  archivedName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  archivedType: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  archivedBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  restoreBtn: {
    marginTop: 4,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default AccountsScreen;
