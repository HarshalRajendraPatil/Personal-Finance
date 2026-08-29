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
import {
  fetchRecurringRules,
  deleteRecurringRule,
  payBill,
  updateRecurringRule,
} from '../store/recurringSlice';
import { fetchAccounts } from '../store/accountSlice';
import { fetchCategories } from '../store/categorySlice';
import RecurringFormModal from '../components/RecurringFormModal';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Pause,
  Play,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';

const FREQ_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const getDaysUntilDue = (dateStr) => {
  if (!dateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const DueBadge = ({ daysLeft }) => {
  if (daysLeft < 0) {
    return (
      <View style={[styles.dueBadge, styles.dueBadgeOverdue]}>
        <AlertCircle size={11} color={COLORS.dangerText} />
        <Text style={styles.dueBadgeTextOverdue}>Overdue</Text>
      </View>
    );
  }
  if (daysLeft === 0) {
    return (
      <View style={[styles.dueBadge, styles.dueBadgeToday]}>
        <Text style={styles.dueBadgeTextToday}>Due Today</Text>
      </View>
    );
  }
  if (daysLeft <= 7) {
    return (
      <View style={[styles.dueBadge, styles.dueBadgeSoon]}>
        <Text style={styles.dueBadgeTextSoon}>In {daysLeft}d</Text>
      </View>
    );
  }
  const date = new Date(
    new Date().setDate(new Date().getDate() + daysLeft)
  ).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <View style={[styles.dueBadge, styles.dueBadgeNormal]}>
      <Text style={styles.dueBadgeTextNormal}>{date}</Text>
    </View>
  );
};

const BillsScreen = () => {
  const dispatch = useDispatch();
  const { rules, isLoading, error } = useSelector((state) => state.recurring);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchRecurringRules());
    dispatch(fetchAccounts());
    dispatch(fetchCategories());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchRecurringRules()),
      dispatch(fetchAccounts()),
      dispatch(fetchCategories()),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Recurring Rule', 'Delete this recurring rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => dispatch(deleteRecurringRule(id)),
      },
    ]);
  };

  const handleToggleActive = (rule) => {
    dispatch(
      updateRecurringRule({
        id: rule._id,
        data: {
          ...rule,
          account: rule.account?._id || rule.account,
          toAccount: rule.toAccount?._id || rule.toAccount,
          category: rule.category?._id || rule.category,
          isActive: !rule.isActive,
        },
      })
    );
  };

  const handlePayNow = (rule) => {
    Alert.alert(
      'Mark as Paid',
      `Mark "${rule.name}" as paid now? This will create a transaction and advance the next due date.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            await dispatch(payBill({ id: rule._id, data: {} }));
            dispatch(fetchAccounts());
          },
        },
      ]
    );
  };

  const filtered =
    filterType === 'All'
      ? rules
      : rules.filter((r) => r.type === filterType);
  const active = filtered.filter((r) => r.isActive);
  const paused = filtered.filter((r) => !r.isActive);

  // Summary numbers
  const totalMonthlyExpenses = rules
    .filter((r) => r.isActive && r.type === 'Expense')
    .reduce((sum, r) => {
      if (r.frequency === 'monthly') return sum + r.amount;
      if (r.frequency === 'weekly') return sum + r.amount * 4.33;
      if (r.frequency === 'yearly') return sum + r.amount / 12;
      if (r.frequency === 'daily') return sum + r.amount * 30;
      return sum;
    }, 0);

  const totalMonthlyIncome = rules
    .filter((r) => r.isActive && r.type === 'Income')
    .reduce((sum, r) => {
      if (r.frequency === 'monthly') return sum + r.amount;
      if (r.frequency === 'weekly') return sum + r.amount * 4.33;
      if (r.frequency === 'yearly') return sum + r.amount / 12;
      if (r.frequency === 'daily') return sum + r.amount * 30;
      return sum;
    }, 0);

  const upcomingThisWeek = rules.filter(
    (r) =>
      r.isActive &&
      getDaysUntilDue(r.nextRunDate) <= 7 &&
      getDaysUntilDue(r.nextRunDate) >= 0
  );

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
            <Text style={styles.screenTitle}>Bills & Recurring</Text>
            <Text style={styles.screenSubtitle}>
              Track subscriptions, salary, rent, and EMIs.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditingRule(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          {/* Outflow */}
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statLabel}>Monthly Outflow</Text>
                <Text style={[styles.statValue, styles.statValueOutflow]}>
                  {formatCurrency(totalMonthlyExpenses)}
                </Text>
              </View>
              <View style={[styles.statIconBox, { backgroundColor: COLORS.dangerBg }]}>
                <TrendingDown size={22} color={COLORS.danger} />
              </View>
            </View>
          </View>

          {/* Inflow & Due This week row */}
          <View style={styles.statSubRow}>
            <View style={[styles.statCard, styles.statCardHalf]}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statLabel}>Monthly Inflow</Text>
                  <Text style={[styles.statValue, styles.statValueInflow]}>
                    {formatCurrency(totalMonthlyIncome)}
                  </Text>
                </View>
                <View style={[styles.statIconBox, { backgroundColor: COLORS.successBg }]}>
                  <TrendingUp size={18} color={COLORS.success} />
                </View>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardHalf]}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statLabel}>Due This Week</Text>
                  <Text style={[styles.statValue, styles.statValueDue]}>
                    {upcomingThisWeek.length} bills
                  </Text>
                </View>
                <View style={[styles.statIconBox, { backgroundColor: COLORS.warningBg }]}>
                  <Calendar size={18} color={COLORS.warning} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          {['All', 'Expense', 'Income', 'Transfer'].map((t) => {
            const isSelected = filterType === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setFilterType(t)}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Content */}
        {isLoading && rules.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading recurring rules...</Text>
          </View>
        ) : active.length === 0 && paused.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Calendar size={32} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No recurring rules</Text>
            <Text style={styles.emptySubtitle}>
              Add salary, rent, EMIs, or subscriptions to track them.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => {
                setEditingRule(null);
                setIsModalOpen(true);
              }}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.emptyAddBtnText}>Add Rule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Active Rules List */}
            {active.length > 0 && (
              <View style={styles.listCard}>
                <View style={styles.listSectionHeader}>
                  <Text style={styles.listSectionTitle}>
                    ACTIVE ({active.length})
                  </Text>
                </View>

                {active
                  .sort(
                    (a, b) =>
                      getDaysUntilDue(a.nextRunDate) -
                      getDaysUntilDue(b.nextRunDate)
                  )
                  .map((rule, index) => {
                    const daysLeft = getDaysUntilDue(rule.nextRunDate);
                    const isLast = index === active.length - 1;
                    const isIncome = rule.type === 'Income';
                    const isExpense = rule.type === 'Expense';

                    return (
                      <View
                        key={rule._id}
                        style={[styles.ruleItem, !isLast && styles.itemBorder]}
                      >
                        <View style={styles.ruleLeft}>
                          <View
                            style={[
                              styles.ruleIconBox,
                              isIncome && styles.iconIncome,
                              isExpense && styles.iconExpense,
                            ]}
                          >
                            {isIncome ? (
                              <TrendingUp size={18} color={COLORS.success} />
                            ) : rule.type === 'Transfer' ? (
                              <ArrowRightLeft size={18} color={COLORS.primary} />
                            ) : (
                              <TrendingDown size={18} color={COLORS.danger} />
                            )}
                          </View>

                          <View style={styles.ruleInfo}>
                            <View style={styles.ruleNameRow}>
                              <Text style={styles.ruleName} numberOfLines={1}>
                                {rule.name}
                              </Text>
                              <DueBadge daysLeft={daysLeft} />
                            </View>

                            <Text style={styles.ruleMeta} numberOfLines={1}>
                              {FREQ_LABELS[rule.frequency]}
                              {rule.category ? ` · ${rule.category.name}` : ''}
                              {rule.merchant ? ` · ${rule.merchant}` : ''}
                              {rule.account ? ` · ${rule.account.name}` : ''}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.ruleRight}>
                          <Text
                            style={[
                              styles.ruleAmount,
                              isIncome && styles.amountIncome,
                              isExpense && styles.amountExpense,
                            ]}
                          >
                            {formatCurrency(rule.amount)}
                          </Text>

                          <View style={styles.ruleActionsRow}>
                            <TouchableOpacity
                              onPress={() => handlePayNow(rule)}
                              style={styles.payBtn}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <CheckCircle2 size={16} color={COLORS.success} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleToggleActive(rule)}
                              style={styles.actionBtn}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Pause size={15} color={COLORS.warning} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleEdit(rule)}
                              style={styles.actionBtn}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Edit2 size={15} color={COLORS.textLight} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleDelete(rule._id)}
                              style={styles.actionBtn}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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

            {/* Paused Rules */}
            {paused.length > 0 && (
              <View style={styles.pausedSection}>
                <View style={styles.pausedCard}>
                  <View style={styles.pausedHeader}>
                    <Text style={styles.pausedTitle}>
                      PAUSED ({paused.length})
                    </Text>
                  </View>
                  {paused.map((rule, pIdx) => {
                    const isLast = pIdx === paused.length - 1;
                    return (
                      <View
                        key={rule._id}
                        style={[
                          styles.pausedItem,
                          !isLast && styles.itemBorder,
                        ]}
                      >
                        <View style={styles.ruleLeft}>
                          <View style={styles.pausedIconBox}>
                            <Pause size={16} color={COLORS.textMuted} />
                          </View>
                          <View>
                            <Text style={styles.pausedName}>{rule.name}</Text>
                            <Text style={styles.pausedMeta}>
                              {FREQ_LABELS[rule.frequency]} ·{' '}
                              {formatCurrency(rule.amount)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.pausedActionsRow}>
                          <TouchableOpacity
                            onPress={() => handleToggleActive(rule)}
                            style={styles.resumeBtn}
                          >
                            <Play size={14} color={COLORS.success} />
                            <Text style={styles.resumeBtnText}>Resume</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDelete(rule._id)}
                            style={styles.actionBtn}
                          >
                            <Trash2 size={14} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Recurring Rule Modal */}
      <RecurringFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rule={editingRule}
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
  statsGrid: {
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statSubRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCardHalf: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  statValueOutflow: {
    color: COLORS.danger,
  },
  statValueInflow: {
    color: COLORS.success,
  },
  statValueDue: {
    color: COLORS.warning,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surface,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    marginBottom: 16,
  },
  listSectionHeader: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ruleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  ruleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: COLORS.surfaceAlt,
  },
  iconIncome: {
    backgroundColor: COLORS.successBg,
  },
  iconExpense: {
    backgroundColor: COLORS.dangerBg,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ruleName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  ruleMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  ruleRight: {
    alignItems: 'flex-end',
  },
  ruleAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  amountIncome: {
    color: COLORS.success,
  },
  amountExpense: {
    color: COLORS.danger,
  },
  ruleActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  payBtn: {
    padding: 2,
  },
  actionBtn: {
    padding: 2,
  },
  dueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dueBadgeOverdue: {
    backgroundColor: COLORS.dangerBg,
  },
  dueBadgeTextOverdue: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.dangerText,
  },
  dueBadgeToday: {
    backgroundColor: COLORS.warningBg,
  },
  dueBadgeTextToday: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warningText,
  },
  dueBadgeSoon: {
    backgroundColor: '#FEF9C3',
  },
  dueBadgeTextSoon: {
    fontSize: 10,
    fontWeight: '700',
    color: '#854D0E',
  },
  dueBadgeNormal: {
    backgroundColor: COLORS.surfaceAlt,
  },
  dueBadgeTextNormal: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  pausedSection: {
    marginTop: 8,
  },
  pausedCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    opacity: 0.85,
  },
  pausedHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pausedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  pausedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  pausedIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pausedName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pausedMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pausedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.successBg,
  },
  resumeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.successText,
  },
});

export default BillsScreen;
