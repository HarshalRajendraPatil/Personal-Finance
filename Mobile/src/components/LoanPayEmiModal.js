import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addPayment } from '../store/loanSlice';
import { fetchAccounts } from '../store/accountSlice';
import { X, Landmark } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';

const LoanPayEmiModal = ({ isOpen, onClose, loan }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.loans);
  const { accounts } = useSelector((state) => state.accounts);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [bookTransaction, setBookTransaction] = useState(true);
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState('');

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  const paidPrincipal = loan
    ? (loan.payments || []).reduce((s, p) => s + (p.principal || 0), 0)
    : 0;
  const remainingPrincipal = loan
    ? Math.max(0, loan.principal - paidPrincipal)
    : 0;

  useEffect(() => {
    setLocalError('');
    if (loan) {
      setAmount(loan.emiAmount ? String(loan.emiAmount) : '');
      setDate(new Date().toISOString().split('T')[0]);
      setAccountId(
        loan.account?._id ||
          loan.account ||
          (activeAccounts.length > 0 ? activeAccounts[0]._id : '')
      );
      setBookTransaction(true);
      setNote(`EMI payment for ${loan.name}`);
    }
  }, [loan, isOpen, accounts]);

  const amtNum = parseFloat(amount) || 0;
  const r = loan ? loan.interestRate / 100 / 12 : 0;
  const estInterest = Math.round(remainingPrincipal * r);
  const estPrincipal = Math.max(0, Math.round(amtNum - estInterest));

  const handleSubmit = async () => {
    setLocalError('');
    if (isNaN(amtNum) || amtNum <= 0) {
      setLocalError('Please enter a valid payment amount.');
      return;
    }

    try {
      await dispatch(
        addPayment({
          id: loan._id,
          data: {
            amount: amtNum,
            date,
            note: note.trim(),
            accountId: accountId || null,
            bookTransaction: Boolean(bookTransaction && accountId),
          },
        })
      ).unwrap();

      dispatch(fetchAccounts());
      onClose();
    } catch (err) {
      setLocalError(
        typeof err === 'string' ? err : err?.message || 'Failed to record EMI payment'
      );
    }
  };

  if (!isOpen || !loan) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.iconCircle}>
                    <Landmark size={18} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.title}>Pay Loan EMI</Text>
                    <Text style={styles.subtitle}>{loan.name}</Text>
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

              <ScrollView
                style={styles.scrollArea}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Context Loan Banner */}
                <View style={styles.summaryBanner}>
                  <View>
                    <Text style={styles.summaryLabel}>Remaining Principal</Text>
                    <Text style={styles.summaryAmount}>
                      {formatCurrency(remainingPrincipal)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.summaryLabel}>Scheduled EMI</Text>
                    <Text style={styles.summaryEmi}>
                      {formatCurrency(loan.emiAmount)}/mo
                    </Text>
                  </View>
                </View>

                {/* Amount to Pay */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>EMI Payment Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textLight}
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                {/* Estimated Principal vs Interest Breakdown */}
                {amtNum > 0 && (
                  <View style={styles.breakdownBox}>
                    <Text style={styles.breakdownTitle}>Estimated Split:</Text>
                    <View style={styles.splitRow}>
                      <Text style={styles.splitPrincipal}>
                        Principal: {formatCurrency(estPrincipal)}
                      </Text>
                      <Text style={styles.splitInterest}>
                        Interest: {formatCurrency(estInterest)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Payment Date */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Payment Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textLight}
                    value={date}
                    onChangeText={setDate}
                  />
                </View>

                {/* Bank Account Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Debit From (Bank Account)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    <TouchableOpacity
                      onPress={() => setAccountId('')}
                      style={[styles.chip, !accountId && styles.chipActive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          !accountId && styles.chipTextActive,
                        ]}
                      >
                        None / Cash
                      </Text>
                    </TouchableOpacity>
                    {activeAccounts.map((a) => {
                      const isSelected = accountId === a._id;
                      return (
                        <TouchableOpacity
                          key={a._id}
                          onPress={() => setAccountId(a._id)}
                          style={[styles.chip, isSelected && styles.chipActive]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextActive,
                            ]}
                          >
                            {a.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Deduct from Bank Account switch */}
                {accountId ? (
                  <View style={styles.switchSection}>
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.switchTitle}>
                          Deduct from Bank Balance
                        </Text>
                        <Text style={styles.switchSubtitle}>
                          Logs an expense transaction under 'Debt Repayment'
                        </Text>
                      </View>
                      <Switch
                        value={bookTransaction}
                        onValueChange={setBookTransaction}
                        trackColor={{
                          false: COLORS.border,
                          true: COLORS.primaryLight,
                        }}
                        thumbColor={
                          bookTransaction ? COLORS.primary : '#FFFFFF'
                        }
                      />
                    </View>
                  </View>
                ) : null}

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Note</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Monthly auto-debit, partial pre-payment"
                    placeholderTextColor={COLORS.textLight}
                    value={note}
                    onChangeText={setNote}
                  />
                </View>

                {localError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{localError}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && styles.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Confirm EMI</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
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
  keyboardView: {
    width: '100%',
    maxWidth: 480,
  },
  card: {
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
    backgroundColor: COLORS.primaryLight,
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
    maxHeight: 440,
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.danger,
    marginTop: 2,
  },
  summaryEmi: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textMain,
  },
  breakdownBox: {
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  splitPrincipal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  splitInterest: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  switchSection: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  switchSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: COLORS.dangerText,
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
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default LoanPayEmiModal;
