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
import { fetchBudgets, deleteBudget } from '../store/budgetSlice';
import { fetchCategories } from '../store/categorySlice';
import BudgetFormModal from '../components/BudgetFormModal';
import CategoryIcon from '../components/CategoryIcon';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Target,
} from 'lucide-react-native';

const PERIOD_LABELS = {
  monthly: 'This Month',
  weekly: 'This Week',
  yearly: 'This Year',
  custom: 'Custom',
};

const ProgressBar = ({ percentage, isOverBudget, isNearLimit }) => {
  const clampedPct = Math.min(Math.max(percentage || 0, 0), 100);
  const barColor = isOverBudget
    ? COLORS.danger
    : isNearLimit
    ? COLORS.warning
    : COLORS.success;

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${clampedPct}%`, backgroundColor: barColor },
        ]}
      />
    </View>
  );
};

const BudgetsScreen = () => {
  const dispatch = useDispatch();
  const { budgets, isLoading, error } = useSelector((state) => state.budgets);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchBudgets());
    dispatch(fetchCategories());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchBudgets()),
      dispatch(fetchCategories()),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Budget', 'Delete this budget?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => dispatch(deleteBudget(id)),
      },
    ]);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    dispatch(fetchBudgets());
  };

  // Summary numbers
  const totalBudgeted = budgets.reduce((sum, b) => sum + (b.limit || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const overBudgetCount = budgets.filter((b) => b.isOverBudget).length;

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
            <Text style={styles.screenTitle}>Budgets</Text>
            <Text style={styles.screenSubtitle}>
              Set category limits and track usage in real time.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditingBudget(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          {/* Total Budgeted */}
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statLabel}>Total Budgeted</Text>
                <Text style={[styles.statValue, styles.statValueNormal]}>
                  {formatCurrency(totalBudgeted)}
                </Text>
              </View>
              <View style={[styles.statIconBox, { backgroundColor: COLORS.primaryLight }]}>
                <Target size={22} color={COLORS.primary} />
              </View>
            </View>
          </View>

          {/* Spent & Over Budget row */}
          <View style={styles.statSubRow}>
            <View style={[styles.statCard, styles.statCardHalf]}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statLabel}>Total Spent</Text>
                  <Text style={[styles.statValue, styles.statValuePurple]}>
                    {formatCurrency(totalSpent)}
                  </Text>
                </View>
                <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <TrendingUp size={18} color={COLORS.purple} />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.statCard,
                styles.statCardHalf,
                overBudgetCount > 0 && styles.statCardOverBudget,
              ]}
            >
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statLabel}>Over Budget</Text>
                  <Text
                    style={[
                      styles.statValue,
                      overBudgetCount > 0
                        ? styles.statValueDanger
                        : styles.statValueNormal,
                    ]}
                  >
                    {overBudgetCount}{' '}
                    {overBudgetCount === 1 ? 'cat' : 'cats'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statIconBox,
                    {
                      backgroundColor:
                        overBudgetCount > 0
                          ? COLORS.dangerBg
                          : COLORS.successBg,
                    },
                  ]}
                >
                  {overBudgetCount > 0 ? (
                    <AlertTriangle size={18} color={COLORS.danger} />
                  ) : (
                    <CheckCircle size={18} color={COLORS.success} />
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Budgets List */}
        {isLoading && budgets.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading budgets...</Text>
          </View>
        ) : budgets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Target size={32} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No budgets yet</Text>
            <Text style={styles.emptySubtitle}>
              Create budgets to track your spending against limits.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setIsModalOpen(true)}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.emptyAddBtnText}>New Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.budgetCardsCol}>
            {budgets.map((budget) => {
              const pct = budget.percentage || 0;
              const isOver = budget.isOverBudget;
              const isNear = budget.isNearLimit && !isOver;

              return (
                <View
                  key={budget._id}
                  style={[
                    styles.budgetCard,
                    isOver && styles.cardOverBudget,
                    isNear && styles.cardNearLimit,
                  ]}
                >
                  {/* Budget Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View
                        style={[
                          styles.categoryIconBox,
                          {
                            backgroundColor: `${
                              budget.category?.color || '#3B82F6'
                            }20`,
                          },
                        ]}
                      >
                        <CategoryIcon
                          name={budget.category?.icon || 'Tag'}
                          color={budget.category?.color || '#3B82F6'}
                          size={20}
                        />
                      </View>
                      <View style={styles.headerInfo}>
                        <Text style={styles.budgetName} numberOfLines={1}>
                          {budget.name}
                        </Text>
                        <Text style={styles.budgetMeta}>
                          {PERIOD_LABELS[budget.period] || 'Period'} ·{' '}
                          {budget.category?.name || 'Category'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.headerRight}>
                      {isOver && (
                        <View style={styles.overBadge}>
                          <AlertTriangle size={11} color={COLORS.dangerText} />
                          <Text style={styles.overBadgeText}>Over</Text>
                        </View>
                      )}
                      {isNear && (
                        <View style={styles.nearBadge}>
                          <Text style={styles.nearBadgeText}>{pct}% used</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={() => handleEdit(budget)}
                        style={styles.actionBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Edit2 size={15} color={COLORS.textLight} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDelete(budget._id)}
                        style={styles.actionBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <ProgressBar
                    percentage={pct}
                    isOverBudget={isOver}
                    isNearLimit={isNear}
                  />

                  {/* Spend Info Footer */}
                  <View style={styles.cardFooter}>
                    <View>
                      <Text
                        style={[
                          styles.spentText,
                          isOver && styles.spentTextOver,
                        ]}
                      >
                        {formatCurrency(budget.spent || 0)}
                        <Text style={styles.limitText}>
                          {' '}
                          / {formatCurrency(budget.limit)}
                        </Text>
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.remainingText,
                          isOver ? styles.remainingOver : styles.remainingGood,
                        ]}
                      >
                        {isOver
                          ? `${formatCurrency(
                              (budget.spent || 0) - budget.limit
                            )} over`
                          : `${formatCurrency(budget.remaining || 0)} left`}
                      </Text>
                      <Text style={styles.pctText}>{pct}% used</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Budget Modal */}
      <BudgetFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        budget={editingBudget}
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
  statCardOverBudget: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
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
  statValueNormal: {
    color: COLORS.textMain,
  },
  statValuePurple: {
    color: COLORS.purple,
  },
  statValueDanger: {
    color: COLORS.danger,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  budgetCardsCol: {
    gap: 12,
  },
  budgetCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardOverBudget: {
    borderColor: COLORS.dangerBorder,
  },
  cardNearLimit: {
    borderColor: '#FED7AA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  categoryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  budgetMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  overBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.dangerText,
  },
  nearBadge: {
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  nearBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warningText,
  },
  actionBtn: {
    padding: 2,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spentText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  spentTextOver: {
    color: COLORS.danger,
  },
  limitText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  remainingGood: {
    color: COLORS.success,
  },
  remainingOver: {
    color: COLORS.danger,
  },
  pctText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});

export default BudgetsScreen;
