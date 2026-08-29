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
import { fetchLoans, deleteLoan } from '../store/loanSlice';
import { fetchAccounts } from '../store/accountSlice';
import LoanFormModal, { LOAN_TYPE_COLORS } from '../components/LoanFormModal';
import LoanPayEmiModal from '../components/LoanPayEmiModal';
import AmortizationScheduleModal from '../components/AmortizationScheduleModal';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Plus,
  Landmark,
  CreditCard,
  Table,
  Edit2,
  Trash2,
  Calendar,
  Percent,
} from 'lucide-react-native';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
};

const LoansScreen = () => {
  const dispatch = useDispatch();
  const { loans, isLoading, error } = useSelector((state) => state.loans);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [payEmiLoan, setPayEmiLoan] = useState(null);
  const [scheduleLoan, setScheduleLoan] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchLoans());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([dispatch(fetchLoans()), dispatch(fetchAccounts())]);
    setRefreshing(false);
  }, [dispatch]);

  const handleAddNew = () => {
    setEditingLoan(null);
    setIsFormOpen(true);
  };

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Loan',
      'Are you sure you want to delete this loan record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteLoan(id)),
        },
      ]
    );
  };

  // Calculations
  const totalOriginal = loans.reduce((s, l) => s + (l.principal || 0), 0);
  const totalPaidPrincipal = loans.reduce((s, l) => {
    const paid = (l.payments || []).reduce((ps, p) => ps + (p.principal || 0), 0);
    return s + paid;
  }, 0);
  const totalRemainingDebt = Math.max(0, totalOriginal - totalPaidPrincipal);
  const totalInterestPaid = loans.reduce((s, l) => {
    const int = (l.payments || []).reduce((ps, p) => ps + (p.interest || 0), 0);
    return s + int;
  }, 0);

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
            <Text style={styles.screenTitle}>Loans & EMIs</Text>
            <Text style={styles.screenSubtitle}>
              Amortization, principal & interest tracking.
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddNew}>
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Debt Summary Stats */}
        <View style={styles.statsGrid}>
          {/* Outstanding Debt */}
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statLabel}>Total Outstanding Debt</Text>
                <Text style={styles.debtAmount}>
                  {formatCurrency(totalRemainingDebt)}
                </Text>
              </View>
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: COLORS.dangerBg },
                ]}
              >
                <Landmark size={20} color={COLORS.danger} />
              </View>
            </View>
          </View>

          {/* Original Borrowed & Interest Paid in a row */}
          <View style={styles.statSubRow}>
            <View style={[styles.statCard, styles.statCardHalf]}>
              <Text style={styles.statLabel}>Original Borrowed</Text>
              <Text style={styles.statSubValue}>
                {formatCurrency(totalOriginal)}
              </Text>
            </View>

            <View style={[styles.statCard, styles.statCardHalf]}>
              <Text style={styles.statLabel}>Interest Paid</Text>
              <Text style={[styles.statSubValue, { color: '#EA580C' }]}>
                {formatCurrency(totalInterestPaid)}
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

        {/* List of Loans */}
        {isLoading && loans.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading loans...</Text>
          </View>
        ) : loans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Landmark size={32} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No loans recorded</Text>
            <Text style={styles.emptySubtitle}>
              Track home loans, car loans, education loans, and EMI schedules.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddNew}>
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.emptyAddBtnText}>Add Loan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsCol}>
            {loans.map((loan) => {
              const typeColor =
                LOAN_TYPE_COLORS[loan.type] || COLORS.primary;
              const principalPaid = (loan.payments || []).reduce(
                (sum, p) => sum + (p.principal || 0),
                0
              );
              const remaining = Math.max(0, loan.principal - principalPaid);
              const pctPaid = Math.min(
                100,
                Math.round((principalPaid / loan.principal) * 100)
              );
              const isClosed = remaining <= 0;

              return (
                <View
                  key={loan._id}
                  style={[styles.loanCard, isClosed && styles.loanCardClosed]}
                >
                  {/* Top Row */}
                  <View style={styles.loanCardHeader}>
                    <View style={styles.loanTitleRow}>
                      <View
                        style={[
                          styles.typeTag,
                          { backgroundColor: `${typeColor}15` },
                        ]}
                      >
                        <Text style={[styles.typeTagText, { color: typeColor }]}>
                          {loan.type}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.loanName} numberOfLines={1}>
                          {loan.name}
                        </Text>
                        {loan.lender ? (
                          <Text style={styles.lenderText}>{loan.lender}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.headerActions}>
                      <TouchableOpacity
                        onPress={() => handleEdit(loan)}
                        style={styles.actionIconBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Edit2 size={15} color={COLORS.textLight} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(loan._id)}
                        style={styles.actionIconBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Loan Balances */}
                  <View style={styles.loanBalancesRow}>
                    <View>
                      <Text style={styles.balLabel}>Remaining Principal</Text>
                      <Text style={styles.remainingVal}>
                        {isClosed ? 'Paid Off' : formatCurrency(remaining)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.balLabel}>Scheduled EMI</Text>
                      <Text style={styles.emiVal}>
                        {formatCurrency(loan.emiAmount)}/mo
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${pctPaid}%`,
                            backgroundColor: isClosed
                              ? COLORS.success
                              : COLORS.primary,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.progressMetaRow}>
                      <Text style={styles.progressText}>{pctPaid}% principal paid</Text>
                      <Text style={styles.progressSubText}>
                        {formatCurrency(principalPaid)} / {formatCurrency(loan.principal)}
                      </Text>
                    </View>
                  </View>

                  {/* Key Metadata */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Percent size={12} color={COLORS.textMuted} />
                      <Text style={styles.metaBadgeText}>
                        {loan.interestRate}% p.a.
                      </Text>
                    </View>

                    <View style={styles.metaBadge}>
                      <Calendar size={12} color={COLORS.textMuted} />
                      <Text style={styles.metaBadgeText}>
                        {loan.tenureMonths} mo (from {formatDate(loan.startDate)})
                      </Text>
                    </View>
                  </View>

                  {/* Action Footer */}
                  {!isClosed && (
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.scheduleBtn}
                        onPress={() => setScheduleLoan(loan)}
                      >
                        <Table size={13} color={COLORS.textSecondary} />
                        <Text style={styles.scheduleBtnText}>Schedule</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.payEmiBtn}
                        onPress={() => setPayEmiLoan(loan)}
                      >
                        <CreditCard size={13} color="#FFFFFF" />
                        <Text style={styles.payEmiBtnText}>Pay EMI</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Form Modal */}
      <LoanFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        loan={editingLoan}
      />

      {/* Pay EMI Modal */}
      <LoanPayEmiModal
        isOpen={!!payEmiLoan}
        onClose={() => setPayEmiLoan(null)}
        loan={payEmiLoan}
      />

      {/* Amortization Schedule Modal */}
      <AmortizationScheduleModal
        isOpen={!!scheduleLoan}
        onClose={() => setScheduleLoan(null)}
        loan={scheduleLoan}
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
  debtAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.danger,
    marginTop: 4,
  },
  statSubValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
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
  loanCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  loanCardClosed: {
    opacity: 0.75,
    backgroundColor: COLORS.surfaceAlt,
  },
  loanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  loanTitleRow: {
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
  typeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loanName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  lenderText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    padding: 2,
  },
  loanBalancesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  balLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  remainingVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.danger,
    marginTop: 2,
  },
  emiVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 10,
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
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  progressSubText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
  },
  scheduleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  payEmiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  payEmiBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default LoansScreen;
