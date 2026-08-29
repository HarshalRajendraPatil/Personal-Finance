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
} from 'react-native';
import { useSelector } from 'react-redux';
import accountService from '../services/accountService';
import { X, CreditCard } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';

const CreditCardPayModal = ({ isOpen, onClose, card, onSuccess }) => {
  const { accounts } = useSelector((state) => state.accounts);

  const bankAccounts = accounts.filter(
    (a) => !a.isArchived && a.type !== 'Credit Card'
  );

  const outstanding = card ? Math.abs(Math.min(0, card.currentBalance)) : 0;
  const minDue =
    outstanding > 0
      ? Math.min(outstanding, Math.max(500, Math.round(outstanding * 0.05)))
      : 0;

  const [fromAccountId, setFromAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (card) {
      setFromAccountId(bankAccounts.length > 0 ? bankAccounts[0]._id : '');
      setAmount(outstanding > 0 ? String(outstanding) : '');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes(`Bill payment for ${card.name}`);
      setError('');
    }
  }, [card, isOpen]);

  const handleSubmit = async () => {
    if (!fromAccountId || !amount || parseFloat(amount) <= 0) {
      setError('Please select a paying bank account and enter an amount.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await accountService.payBill(card._id, {
        fromAccountId,
        amount: parseFloat(amount),
        date,
        notes: notes.trim(),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to record credit card payment'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !card) return null;

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
                    <CreditCard size={18} color={COLORS.purple} />
                  </View>
                  <View>
                    <Text style={styles.title}>Pay Card Bill</Text>
                    <Text style={styles.subtitle}>
                      {card.name} {card.last4Digits ? `(•••• ${card.last4Digits})` : ''}
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

              <ScrollView
                style={styles.scrollArea}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Outstanding summary banner */}
                <View style={styles.summaryBanner}>
                  <View>
                    <Text style={styles.summaryLabel}>Total Outstanding</Text>
                    <Text style={styles.summaryAmount}>
                      {formatCurrency(outstanding, card.currency)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.summaryLabel}>Min Due</Text>
                    <Text style={styles.summaryMinDue}>
                      {formatCurrency(minDue, card.currency)}
                    </Text>
                  </View>
                </View>

                {/* Quick amount chips */}
                <View style={styles.quickChipsRow}>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => setAmount(String(outstanding))}
                  >
                    <Text style={styles.quickChipText}>
                      Full: {formatCurrency(outstanding)}
                    </Text>
                  </TouchableOpacity>

                  {minDue > 0 && minDue < outstanding ? (
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={() => setAmount(String(minDue))}
                    >
                      <Text style={styles.quickChipText}>
                        Min: {formatCurrency(minDue)}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Pay From Bank Account */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Pay From (Bank Account)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {bankAccounts.map((a) => {
                      const isSelected = fromAccountId === a._id;
                      return (
                        <TouchableOpacity
                          key={a._id}
                          onPress={() => setFromAccountId(a._id)}
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
                            {a.name} ({formatCurrency(a.currentBalance, a.currency)})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Amount */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Amount to Pay (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textLight}
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

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

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Full settlement"
                    placeholderTextColor={COLORS.textLight}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                <View style={styles.infoNotice}>
                  <Text style={styles.infoNoticeText}>
                    ℹ️ Logs a Transfer from your bank to your card, reducing outstanding debt without double-counting expenses.
                  </Text>
                </View>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{error}</Text>
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
                    <Text style={styles.submitBtnText}>Confirm Payment</Text>
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
    maxHeight: 440,
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7E22CE',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#581C87',
    marginTop: 2,
  },
  summaryMinDue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7E22CE',
    marginTop: 2,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickChip: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B21A8',
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
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  infoNotice: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  infoNoticeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
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
    backgroundColor: COLORS.purple,
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

export default CreditCardPayModal;
