import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import accountService from '../services/accountService';
import { X, Receipt, ArrowUpRight, ArrowDownRight, Calendar, AlertTriangle } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

const CreditCardStatementModal = ({
  isOpen,
  onClose,
  card,
  onPayClick,
}) => {
  const [statement, setStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (card && isOpen) {
      setIsLoading(true);
      setError('');
      accountService
        .getStatement(card._id)
        .then((data) => setStatement(data))
        .catch((err) => setError(err.message || 'Failed to load statement'))
        .finally(() => setIsLoading(false));
    }
  }, [card, isOpen]);

  if (!isOpen || !card) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Receipt size={18} color={COLORS.purple} />
              </View>
              <View>
                <Text style={styles.title}>{card.name} Statement</Text>
                <Text style={styles.subtitle}>
                  {card.issuer || 'Credit Card'}{' '}
                  {card.last4Digits ? `•••• ${card.last4Digits}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.purple} />
              <Text style={styles.loadingText}>Generating statement cycle...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : statement ? (
            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
            >
              {/* Cycle Grid Stats */}
              <View style={styles.gridStats}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Cycle Period</Text>
                  <Text style={styles.statBoxValue}>
                    {formatDate(statement.cycleStart)} –{' '}
                    {formatDate(statement.cycleEnd)}
                  </Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={[styles.statBoxLabel, { color: '#7E22CE' }]}>
                    Statement Balance
                  </Text>
                  <Text style={[styles.statBoxValue, { color: '#581C87' }]}>
                    {formatCurrency(statement.statementBalance, card.currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.gridStats}>
                <View style={[styles.statBox, { backgroundColor: '#FFFBEB' }]}>
                  <Text style={[styles.statBoxLabel, { color: '#B45309' }]}>
                    Payment Due Date
                  </Text>
                  <Text style={[styles.statBoxValue, { color: '#92400E' }]}>
                    {new Date(statement.dueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.dueCountdown}>
                    {statement.daysLeft > 0
                      ? `In ${statement.daysLeft} days`
                      : 'Due today'}
                  </Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.statBoxLabel, { color: '#1D4ED8' }]}>
                    Credit Utilization
                  </Text>
                  <Text style={[styles.statBoxValue, { color: '#1E40AF' }]}>
                    {statement.utilization}%
                  </Text>
                  <Text style={styles.availCreditText}>
                    Avail: {formatCurrency(statement.availableCredit)}
                  </Text>
                </View>
              </View>

              {/* Transactions in this cycle */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Transactions in Current Cycle ({statement.transactions.length})
                </Text>
              </View>

              {statement.transactions.length === 0 ? (
                <View style={styles.emptyTransactions}>
                  <Text style={styles.emptyText}>
                    No transactions in this billing cycle yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.txList}>
                  {statement.transactions.map((t, idx) => {
                    const isExpense = t.type === 'Expense';
                    const isLast = idx === statement.transactions.length - 1;
                    return (
                      <View
                        key={t._id}
                        style={[
                          styles.txRow,
                          !isLast && styles.txBorder,
                        ]}
                      >
                        <View style={styles.txLeft}>
                          <View
                            style={[
                              styles.txIconCircle,
                              isExpense
                                ? styles.iconExpense
                                : styles.iconIncome,
                            ]}
                          >
                            {isExpense ? (
                              <ArrowUpRight size={14} color={COLORS.danger} />
                            ) : (
                              <ArrowDownRight size={14} color={COLORS.success} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.txMerchant} numberOfLines={1}>
                              {t.merchant || t.notes || 'Transaction'}
                            </Text>
                            <Text style={styles.txDate}>
                              {formatDate(t.date)} ·{' '}
                              {t.category?.name || 'Transfer/Payment'}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.txAmount,
                            isExpense ? styles.amountExpense : styles.amountIncome,
                          ]}
                        >
                          {isExpense ? '-' : '+'}
                          {formatCurrency(t.amount, card.currency)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          ) : null}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => {
                onClose();
                if (onPayClick) onPayClick(card);
              }}
            >
              <Text style={styles.payBtnText}>Pay Bill Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    maxHeight: '92%',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 460,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  errorBox: {
    padding: 14,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 10,
  },
  errorText: {
    color: COLORS.dangerText,
    fontSize: 13,
  },
  gridStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  statBoxValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 2,
  },
  dueCountdown: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 2,
  },
  availCreditText: {
    fontSize: 11,
    color: '#2563EB',
    marginTop: 2,
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  emptyTransactions: {
    padding: 16,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 6,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  txList: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  txBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  txIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconExpense: {
    backgroundColor: COLORS.dangerBg,
  },
  iconIncome: {
    backgroundColor: COLORS.successBg,
  },
  txMerchant: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountExpense: {
    color: COLORS.danger,
  },
  amountIncome: {
    color: COLORS.success,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surface,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  payBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CreditCardStatementModal;
