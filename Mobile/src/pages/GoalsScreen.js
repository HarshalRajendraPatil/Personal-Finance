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
import { fetchGoals, deleteGoal } from '../store/goalSlice';
import { fetchAccounts } from '../store/accountSlice';
import GoalFormModal from '../components/GoalFormModal';
import ContributeModal from '../components/ContributeModal';
import CategoryIcon from '../components/CategoryIcon';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Plus,
  Edit2,
  Trash2,
  Target,
  PiggyBank,
  Sparkles,
  Calendar,
} from 'lucide-react-native';

const formatDate = (dateString) => {
  if (!dateString) return 'No deadline';
  return new Date(dateString).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
};

const getRequiredMonthly = (goal) => {
  if (!goal.deadline) return null;
  const remaining = Math.max(0, goal.targetAmount - (goal.currentAmount || 0));
  if (remaining <= 0) return 0;
  const now = new Date();
  const dl = new Date(goal.deadline);
  const months = Math.max(
    1,
    (dl.getFullYear() - now.getFullYear()) * 12 +
      (dl.getMonth() - now.getMonth())
  );
  return Math.ceil(remaining / months);
};

const GoalsScreen = () => {
  const dispatch = useDispatch();
  const { goals, isLoading, error } = useSelector((state) => state.goals);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [contributeGoal, setContributeGoal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchGoals());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([dispatch(fetchGoals()), dispatch(fetchAccounts())]);
    setRefreshing(false);
  }, [dispatch]);

  const handleAddNew = () => {
    setEditingGoal(null);
    setIsFormOpen(true);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => dispatch(deleteGoal(id)),
      },
    ]);
  };

  // Summary statistics
  const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const overallPct =
    totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

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
            <Text style={styles.screenTitle}>Savings Goals</Text>
            <Text style={styles.screenSubtitle}>
              Plan and track progress toward your financial dreams.
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddNew}>
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          {/* Total Saved */}
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statLabel}>Total Saved</Text>
                <Text style={[styles.statValue, styles.statValueGreen]}>
                  {formatCurrency(totalSaved)}
                </Text>
              </View>
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: COLORS.successBg },
                ]}
              >
                <PiggyBank size={20} color={COLORS.success} />
              </View>
            </View>
          </View>

          {/* Target & Progress row */}
          <View style={styles.statSubRow}>
            <View style={[styles.statCard, styles.statCardHalf]}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statLabel}>Total Target</Text>
                  <Text style={[styles.statValue, styles.statValueBlue]}>
                    {formatCurrency(totalTarget)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statIconBox,
                    { backgroundColor: COLORS.primaryLight },
                  ]}
                >
                  <Target size={18} color={COLORS.primary} />
                </View>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardHalf]}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statLabel}>Completion</Text>
                  <Text style={[styles.statValue, styles.statValuePurple]}>
                    {overallPct}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.statIconBox,
                    { backgroundColor: '#F3E8FF' },
                  ]}
                >
                  <Sparkles size={18} color={COLORS.purple} />
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

        {/* Goal Cards List */}
        {isLoading && goals.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading savings goals...</Text>
          </View>
        ) : goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Target size={32} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No savings goals yet</Text>
            <Text style={styles.emptySubtitle}>
              Create goals for emergency fund, vacation, or purchases.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddNew}>
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.emptyAddBtnText}>Add Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsCol}>
            {goals.map((goal) => {
              const current = goal.currentAmount || 0;
              const target = goal.targetAmount || 1;
              const pct = Math.min(100, Math.round((current / target) * 100));
              const remaining = Math.max(0, target - current);
              const monthlyReq = getRequiredMonthly(goal);
              const goalColor = goal.color || COLORS.primary;

              return (
                <View key={goal._id} style={styles.goalCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.goalTitleRow}>
                      <View
                        style={[
                          styles.goalIconBox,
                          { backgroundColor: `${goalColor}20` },
                        ]}
                      >
                        <CategoryIcon
                          name={goal.icon || 'Target'}
                          color={goalColor}
                          size={20}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalName} numberOfLines={1}>
                          {goal.name}
                        </Text>
                        <View style={styles.deadlineRow}>
                          <Calendar size={12} color={COLORS.textMuted} />
                          <Text style={styles.deadlineText}>
                            Target: {formatDate(goal.deadline)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.headerActions}>
                      <TouchableOpacity
                        onPress={() => handleEdit(goal)}
                        style={styles.actionIconBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Edit2 size={15} color={COLORS.textLight} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(goal._id)}
                        style={styles.actionIconBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${pct}%`, backgroundColor: goalColor },
                        ]}
                      />
                    </View>
                    <View style={styles.progressNumbers}>
                      <Text style={styles.savedAmountText}>
                        {formatCurrency(current)}
                        <Text style={styles.targetAmountText}>
                          {' '}
                          / {formatCurrency(target)}
                        </Text>
                      </Text>
                      <Text style={[styles.pctBadgeText, { color: goalColor }]}>
                        {pct}%
                      </Text>
                    </View>
                  </View>

                  {/* Smart Projection Insight */}
                  {monthlyReq !== null && remaining > 0 ? (
                    <View style={styles.insightBox}>
                      <Text style={styles.insightText}>
                        💡 Save ~{formatCurrency(monthlyReq)}/mo to reach target by{' '}
                        {formatDate(goal.deadline)}.
                      </Text>
                    </View>
                  ) : null}

                  {remaining === 0 ? (
                    <View style={styles.completedBox}>
                      <Text style={styles.completedText}>
                        🎉 Goal Reached! Congratulations!
                      </Text>
                    </View>
                  ) : null}

                  {/* Actions Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.remainingText}>
                      {remaining > 0
                        ? `${formatCurrency(remaining)} remaining`
                        : 'Completed'}
                    </Text>

                    <TouchableOpacity
                      style={[styles.contributeBtn, { backgroundColor: goalColor }]}
                      onPress={() => setContributeGoal(goal)}
                    >
                      <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.contributeBtnText}>Add Funds</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Goal Form Modal */}
      <GoalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        goal={editingGoal}
      />

      {/* Contribute Modal */}
      <ContributeModal
        isOpen={!!contributeGoal}
        onClose={() => setContributeGoal(null)}
        goal={contributeGoal}
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
  statValueGreen: {
    color: COLORS.success,
  },
  statValueBlue: {
    color: COLORS.primary,
  },
  statValuePurple: {
    color: COLORS.purple,
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
  cardsCol: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  goalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  deadlineText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    padding: 2,
  },
  progressSection: {
    marginBottom: 10,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedAmountText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  targetAmountText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  pctBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  insightBox: {
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  insightText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 16,
  },
  completedBox: {
    backgroundColor: COLORS.successBg,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  completedText: {
    fontSize: 12,
    color: COLORS.successText,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  remainingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  contributeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  contributeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default GoalsScreen;
