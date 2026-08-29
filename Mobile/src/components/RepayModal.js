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
import { addRepayment, settleLending } from '../store/lendingSlice';
import { fetchAccounts } from '../store/accountSlice';
import { X } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';

const RepayModal = ({
  isOpen,
  onClose,
  entry,
  isSettleMode = false,
}) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.lending);
  const { accounts } = useSelector((state) => state.accounts);

  const outstanding = entry
    ? Math.max(
        0,
        entry.amount -
          (entry.repayments || []).reduce((s, r) => s + r.amount, 0)
      )
    : 0;

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [bookTransaction, setBookTransaction] = useState(true);
  const [localError, setLocalError] = useState('');

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  useEffect(() => {
    setLocalError('');
    if (entry) {
      setAmount(isSettleMode ? String(outstanding) : '');
      setDate(new Date().toISOString().split('T')[0]);
      setNote(isSettleMode ? 'Full settlement' : 'Partial repayment');
      setAccountId(activeAccounts.length > 0 ? activeAccounts[0]._id : '');
      setBookTransaction(true);
    }
  }, [isOpen, outstanding, isSettleMode, entry, accounts]);

  const handleSubmit = async () => {
    setLocalError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setLocalError('Please enter a valid amount greater than 0.');
      return;
    }
    if (amt > outstanding + 0.01) {
      setLocalError(`Amount cannot exceed remaining debt of ₹${outstanding}`);
      return;
    }

    try {
      const payload = {
        amount: amt,
        date,
        note: note.trim(),
        accountId: accountId || null,
        bookTransaction: Boolean(bookTransaction && accountId),
      };

      if (isSettleMode || amt >= outstanding - 0.01) {
        await dispatch(
          settleLending({ id: entry._id, data: payload })
        ).unwrap();
      } else {
        await dispatch(
          addRepayment({ id: entry._id, data: payload })
        ).unwrap();
      }

      dispatch(fetchAccounts());
      onClose();
    } catch (err) {
      setLocalError(
        typeof err === 'string' ? err : err?.message || 'Something went wrong.'
      );
    }
  };

  if (!isOpen || !entry) return null;

  const isLent = entry.type === 'lent';

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
                <Text style={styles.title}>
                  {isSettleMode ? 'Settle Up' : 'Record Repayment'}
                </Text>
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
                {/* Outstanding Context Banner */}
                <View
                  style={[
                    styles.summaryBanner,
                    isLent ? styles.summaryLent : styles.summaryBorrowed,
                  ]}
                >
                  <Text style={styles.summaryTitle}>
                    {isLent
                      ? `${entry.person} owes you`
                      : `You owe ${entry.person}`}
                  </Text>
                  <Text
                    style={[
                      styles.summaryAmount,
                      isLent ? styles.amountLent : styles.amountBorrowed,
                    ]}
                  >
                    Outstanding: {formatCurrency(outstanding)}
                  </Text>
                </View>

                {/* Amount */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Repayment Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textLight}
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                {/* Date */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textLight}
                    value={date}
                    onChangeText={setDate}
                  />
                </View>

                {/* Account Selection */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    {isLent ? 'Receiving Bank Account' : 'Paying Bank Account'}
                  </Text>
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
                        None
                      </Text>
                    </TouchableOpacity>
                    {activeAccounts.map((a) => {
                      const isSelected = accountId === a._id;
                      return (
                        <TouchableOpacity
                          key={a._id}
                          onPress={() => setAccountId(a._id)}
                          style={[
                            styles.chip,
                            isSelected && styles.chipActive,
                          ]}
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

                {/* Book Transaction switch */}
                {accountId ? (
                  <View style={styles.switchSection}>
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.switchTitle}>
                          Log Account Transaction
                        </Text>
                        <Text style={styles.switchSubtitle}>
                          {isLent
                            ? 'Increases bank balance as an incoming return'
                            : 'Decreases bank balance as an outgoing payment'}
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

                {/* Note */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Note (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. UPI transfer, Cash return"
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
                    <Text style={styles.submitBtnText}>
                      {isSettleMode ? 'Settle Up' : 'Save Repayment'}
                    </Text>
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 440,
  },
  summaryBanner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  summaryLent: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  summaryBorrowed: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  amountLent: {
    color: COLORS.successText,
  },
  amountBorrowed: {
    color: COLORS.dangerText,
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
    fontSize: 13,
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

export default RepayModal;
