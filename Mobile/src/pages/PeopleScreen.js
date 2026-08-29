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
  fetchLendings,
  deleteLending,
} from '../store/lendingSlice';
import { fetchAccounts } from '../store/accountSlice';
import LendingFormModal from '../components/LendingFormModal';
import RepayModal from '../components/RepayModal';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  HandCoins,
  TrendingDown,
  Scale,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const PeopleScreen = () => {
  const dispatch = useDispatch();
  const { lendings, isLoading, error } = useSelector((state) => state.lending);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [repayEntry, setRepayEntry] = useState(null);
  const [isSettleMode, setIsSettleMode] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchLendings());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchLendings()),
      dispatch(fetchAccounts()),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleAddNew = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this lending/borrowing record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteLending(id)),
        },
      ]
    );
  };

  const handleOpenRepay = (entry, settle = false) => {
    setRepayEntry(entry);
    setIsSettleMode(settle);
  };

  // Calculations
  const totalLent = lendings
    .filter((l) => l.type === 'lent' && l.status !== 'settled')
    .reduce((sum, l) => {
      const repaid = (l.repayments || []).reduce((s, r) => s + r.amount, 0);
      return sum + Math.max(0, l.amount - repaid);
    }, 0);

  const totalBorrowed = lendings
    .filter((l) => l.type === 'borrowed' && l.status !== 'settled')
    .reduce((sum, l) => {
      const repaid = (l.repayments || []).reduce((s, r) => s + r.amount, 0);
      return sum + Math.max(0, l.amount - repaid);
    }, 0);

  const netBalance = totalLent - totalBorrowed;

  const filteredLendings = lendings.filter((l) => {
    if (filterType === 'All') return l.status !== 'settled';
    if (filterType === 'lent') return l.type === 'lent' && l.status !== 'settled';
    if (filterType === 'borrowed') return l.type === 'borrowed' && l.status !== 'settled';
    if (filterType === 'settled') return l.status === 'settled';
    return true;
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
            <Text style={styles.screenTitle}>People & Ledgers</Text>
            <Text style={styles.screenSubtitle}>
              Track money you lent and money you borrowed.
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddNew}>
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          {/* Net Position */}
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statLabel}>Net Position</Text>
                <Text
                  style={[
                    styles.statValue,
                    netBalance >= 0 ? styles.statValueGreen : styles.statValueRed,
                  ]}
                >
                  {formatCurrency(netBalance)}
                </Text>
              </View>
              <View
                style={[
                  styles.statIconBox,
                  {
                    backgroundColor:
                      netBalance >= 0 ? COLORS.successBg : COLORS.dangerBg,
                  },
                ]}
              >
                <Scale
                  size={20}
                  color={netBalance >= 0 ? COLORS.success : COLORS.danger}
                />
              </View>
            </View>
          </View>

          {/* Lent & Borrowed row */}
          <View style={styles.statSubRow}>
            <View style={[styles.statCard, styles.statCardHalf]}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statLabel}>Owed to You</Text>
                  <Text style={[styles.statValue, styles.statValueGreen]}>
                    {formatCurrency(totalLent)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statIconBox,
                    { backgroundColor: COLORS.successBg },
                  ]}
                >
                  <HandCoins size={18} color={COLORS.success} />
                </View>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardHalf]}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statLabel}>You Owe</Text>
                  <Text style={[styles.statValue, styles.statValueRed]}>
                    {formatCurrency(totalBorrowed)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statIconBox,
                    { backgroundColor: COLORS.dangerBg },
                  ]}
                >
                  <TrendingDown size={18} color={COLORS.danger} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          {[
            { key: 'All', label: 'Active' },
            { key: 'lent', label: '💸 I Lent' },
            { key: 'borrowed', label: '🙏 I Borrowed' },
            { key: 'settled', label: '✓ Settled' },
          ].map((item) => {
            const isSelected = filterType === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFilterType(item.key)}
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
                  {item.label}
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

        {/* List of Lendings */}
        {isLoading && lendings.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading ledgers...</Text>
          </View>
        ) : filteredLendings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <HandCoins size={32} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No records found</Text>
            <Text style={styles.emptySubtitle}>
              Keep track of friends, family, and shared expenses.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddNew}>
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.emptyAddBtnText}>Add Entry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsCol}>
            {filteredLendings.map((lending) => {
              const isLent = lending.type === 'lent';
              const isSettled = lending.status === 'settled';
              const repaid = (lending.repayments || []).reduce(
                (sum, r) => sum + r.amount,
                0
              );
              const outstanding = Math.max(0, lending.amount - repaid);
              const pct = Math.min(
                100,
                Math.round((repaid / lending.amount) * 100)
              );
              const isExpanded = expandedId === lending._id;

              return (
                <View
                  key={lending._id}
                  style={[
                    styles.entryCard,
                    isSettled && styles.cardSettled,
                  ]}
                >
                  {/* Card Top */}
                  <View style={styles.cardHeader}>
                    <View style={styles.personRow}>
                      <View
                        style={[
                          styles.typeTag,
                          isLent ? styles.tagLent : styles.tagBorrowed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeTagText,
                            isLent
                              ? styles.tagTextLent
                              : styles.tagTextBorrowed,
                          ]}
                        >
                          {isLent ? '💸 I Lent' : '🙏 I Borrowed'}
                        </Text>
                      </View>
                      <Text style={styles.personName} numberOfLines={1}>
                        {lending.person}
                      </Text>
                    </View>

                    <View style={styles.headerRightActions}>
                      <TouchableOpacity
                        onPress={() => handleEdit(lending)}
                        style={styles.actionIconBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Edit2 size={15} color={COLORS.textLight} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(lending._id)}
                        style={styles.actionIconBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Amounts & Progress */}
                  <View style={styles.amountRow}>
                    <View>
                      <Text style={styles.amountLabel}>Outstanding</Text>
                      <Text
                        style={[
                          styles.outstandingAmount,
                          isLent ? styles.amountGreen : styles.amountRed,
                        ]}
                      >
                        {isSettled ? 'Settled' : formatCurrency(outstanding)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.amountLabel}>Total Principal</Text>
                      <Text style={styles.principalAmount}>
                        {formatCurrency(lending.amount)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  {!isSettled && (
                    <View style={styles.progressBarWrapper}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: isLent
                                ? COLORS.success
                                : COLORS.primary,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.progressMeta}>
                        <Text style={styles.pctText}>{pct}% repaid</Text>
                        <Text style={styles.repaidText}>
                          {formatCurrency(repaid)} paid
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Due Date & Notes */}
                  <View style={styles.metaFooter}>
                    {lending.dueDate ? (
                      <View style={styles.dateBadge}>
                        <Calendar size={12} color={COLORS.textMuted} />
                        <Text style={styles.dateText}>
                          Due {formatDate(lending.dueDate)}
                        </Text>
                      </View>
                    ) : null}

                    {lending.notes ? (
                      <Text style={styles.notesText} numberOfLines={1}>
                        {lending.notes}
                      </Text>
                    ) : null}
                  </View>

                  {/* Action Buttons */}
                  {!isSettled && (
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.repayBtn}
                        onPress={() => handleOpenRepay(lending, false)}
                      >
                        <Text style={styles.repayBtnText}>+ Repayment</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.settleBtn}
                        onPress={() => handleOpenRepay(lending, true)}
                      >
                        <CheckCircle2 size={14} color="#FFFFFF" />
                        <Text style={styles.settleBtnText}>Settle Up</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Repayments History Toggle */}
                  {lending.repayments && lending.repayments.length > 0 && (
                    <TouchableOpacity
                      style={styles.historyToggle}
                      onPress={() =>
                        setExpandedId(isExpanded ? null : lending._id)
                      }
                    >
                      <Text style={styles.historyToggleText}>
                        Repayment History ({lending.repayments.length})
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={14} color={COLORS.textMuted} />
                      ) : (
                        <ChevronDown size={14} color={COLORS.textMuted} />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Expanded Repayment History */}
                  {isExpanded && lending.repayments && (
                    <View style={styles.historyList}>
                      {lending.repayments.map((r, rIdx) => (
                        <View key={rIdx} style={styles.historyItem}>
                          <View>
                            <Text style={styles.historyDate}>
                              {formatDate(r.date)}
                            </Text>
                            {r.note ? (
                              <Text style={styles.historyNote}>{r.note}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.historyAmount}>
                            +{formatCurrency(r.amount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Form Modal */}
      <LendingFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        entry={editingEntry}
      />

      {/* Repay / Settle Modal */}
      <RepayModal
        isOpen={!!repayEntry}
        onClose={() => setRepayEntry(null)}
        entry={repayEntry}
        isSettleMode={isSettleMode}
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
  statValueRed: {
    color: COLORS.danger,
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
    paddingHorizontal: 12,
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
    fontSize: 12,
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
  cardsCol: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardSettled: {
    opacity: 0.75,
    backgroundColor: COLORS.surfaceAlt,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagLent: {
    backgroundColor: COLORS.successBg,
  },
  tagBorrowed: {
    backgroundColor: COLORS.dangerBg,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagTextLent: {
    color: COLORS.successText,
  },
  tagTextBorrowed: {
    color: COLORS.dangerText,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    padding: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  outstandingAmount: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  amountGreen: {
    color: COLORS.success,
  },
  amountRed: {
    color: COLORS.danger,
  },
  principalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressBarWrapper: {
    marginBottom: 12,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pctText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  repaidText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  metaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  repayBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
  },
  repayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  settleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.success,
  },
  settleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  historyToggleText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  historyList: {
    marginTop: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  historyNote: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  historyAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.successText,
  },
});

export default PeopleScreen;
