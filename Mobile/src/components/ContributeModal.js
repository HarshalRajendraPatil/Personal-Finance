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
import { addContribution } from '../store/goalSlice';
import { fetchAccounts } from '../store/accountSlice';
import { X } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';

const ContributeModal = ({ isOpen, onClose, goal }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.goals);
  const { accounts } = useSelector((state) => state.accounts);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [bookTransaction, setBookTransaction] = useState(true);
  const [localError, setLocalError] = useState('');

  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const remaining = goal
    ? Math.max(0, goal.targetAmount - (goal.currentAmount || 0))
    : 0;

  useEffect(() => {
    setLocalError('');
    if (goal) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote(`Contribution for ${goal.name}`);
      setAccountId(activeAccounts.length > 0 ? activeAccounts[0]._id : '');
      setBookTransaction(true);
    }
  }, [isOpen, goal, accounts]);

  const handleSubmit = async () => {
    setLocalError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setLocalError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      await dispatch(
        addContribution({
          id: goal._id,
          data: {
            amount: amt,
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
        typeof err === 'string' ? err : err?.message || 'Failed to add contribution'
      );
    }
  };

  if (!isOpen || !goal) return null;

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
                <Text style={styles.title}>Add Savings Funds</Text>
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
                {/* Goal Info Banner */}
                <View
                  style={[
                    styles.infoBanner,
                    {
                      backgroundColor: `${goal.color || '#3B82F6'}15`,
                      borderColor: `${goal.color || '#3B82F6'}40`,
                    },
                  ]}
                >
                  <Text style={styles.bannerGoalName}>{goal.name}</Text>
                  <Text style={styles.bannerMeta}>
                    Saved: {formatCurrency(goal.currentAmount || 0)} /{' '}
                    {formatCurrency(goal.targetAmount)} (
                    {formatCurrency(remaining)} remaining)
                  </Text>
                </View>

                {/* Amount */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Contribution Amount (₹)</Text>
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

                {/* Source Bank Account */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Fund From (Bank Account)</Text>
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
                        None / Manual
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

                {/* Deduct from Bank Account switch */}
                {accountId ? (
                  <View style={styles.switchSection}>
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.switchTitle}>
                          Deduct from Bank Balance
                        </Text>
                        <Text style={styles.switchSubtitle}>
                          Logs an expense/allocation from your selected bank account
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
                    placeholder="e.g. Monthly allocation, Bonus savings"
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
                    <Text style={styles.submitBtnText}>Add Contribution</Text>
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
  infoBanner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  bannerGoalName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  bannerMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
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

export default ContributeModal;
