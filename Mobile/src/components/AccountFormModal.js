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
import { useDispatch, useSelector } from 'react-redux';
import { createAccount, updateAccount, clearAccountError } from '../store/accountSlice';
import { X } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../styles/theme';

const CURRENCIES = [
  { code: 'INR', label: 'INR (₹)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
];

const ACCOUNT_TYPES = ['Bank', 'Cash', 'Credit Card', 'UPI', 'FD', 'Other'];

const AccountFormModal = ({ isOpen, onClose, account = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.accounts);

  const [name, setName] = useState('');
  const [type, setType] = useState('Bank');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [currency, setCurrency] = useState('INR');
  const [notes, setNotes] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [issuer, setIssuer] = useState('');
  const [last4Digits, setLast4Digits] = useState('');
  const [billingCycleDay, setBillingCycleDay] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setType(account.type || 'Bank');
      setOpeningBalance(account.openingBalance !== undefined ? String(account.openingBalance) : '0');
      setCurrency(account.currency || 'INR');
      setNotes(account.notes || '');
      setCreditLimit(account.creditLimit !== null && account.creditLimit !== undefined ? String(account.creditLimit) : '');
      setIssuer(account.issuer || '');
      setLast4Digits(account.last4Digits || '');
      setBillingCycleDay(account.billingCycleDay ? String(account.billingCycleDay) : '');
      setPaymentDueDay(account.paymentDueDay ? String(account.paymentDueDay) : '');
    } else {
      setName('');
      setType('Bank');
      setOpeningBalance('0');
      setCurrency('INR');
      setNotes('');
      setCreditLimit('');
      setIssuer('');
      setLast4Digits('');
      setBillingCycleDay('');
      setPaymentDueDay('');
    }
    setFormErrors({});
    dispatch(clearAccountError());
  }, [account, isOpen, dispatch]);

  const validate = () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Account name must be at least 2 characters';
    }
    if (isNaN(Number(openingBalance))) {
      errs.openingBalance = 'Must be a valid number';
    }
    if (type === 'Credit Card' && creditLimit && isNaN(Number(creditLimit))) {
      errs.creditLimit = 'Credit limit must be a number';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const accountData = {
      name: name.trim(),
      type,
      openingBalance: parseFloat(openingBalance) || 0,
      currency,
      notes: notes.trim(),
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      issuer: issuer.trim(),
      last4Digits: last4Digits.trim(),
      billingCycleDay: billingCycleDay ? parseInt(billingCycleDay, 10) : null,
      paymentDueDay: paymentDueDay ? parseInt(paymentDueDay, 10) : null,
    };

    try {
      if (account) {
        await dispatch(updateAccount({ id: account._id, accountData })).unwrap();
      } else {
        await dispatch(createAccount(accountData)).unwrap();
      }
      onClose();
    } catch {
      // Handled in Redux error state
    }
  };

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
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {account ? 'Edit Account' : 'Add New Account'}
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
                {/* Account Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Account Name</Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    placeholder="e.g. HDFC Salary, Regalia Credit Card"
                    placeholderTextColor={COLORS.textLight}
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }));
                    }}
                  />
                  {formErrors.name && (
                    <Text style={styles.errorText}>{formErrors.name}</Text>
                  )}
                </View>

                {/* Account Type Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Account Type</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {ACCOUNT_TYPES.map((t) => {
                      const isSelected = type === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setType(t)}
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
                            {t}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Currency Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Currency</Text>
                  <View style={styles.currencyRow}>
                    {CURRENCIES.map((curr) => {
                      const isSelected = currency === curr.code;
                      return (
                        <TouchableOpacity
                          key={curr.code}
                          onPress={() => setCurrency(curr.code)}
                          style={[
                            styles.currencyBtn,
                            isSelected && styles.currencyBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.currencyText,
                              isSelected && styles.currencyTextActive,
                            ]}
                          >
                            {curr.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Credit Card Specific Fields */}
                {type === 'Credit Card' && (
                  <View style={styles.creditCardBox}>
                    <Text style={styles.creditCardHeader}>Credit Card Information</Text>
                    
                    <View style={styles.rowTwoCols}>
                      <View style={styles.colHalf}>
                        <Text style={styles.subLabel}>Card Issuer</Text>
                        <TextInput
                          style={styles.subInput}
                          placeholder="e.g. HDFC, ICICI"
                          placeholderTextColor={COLORS.textLight}
                          value={issuer}
                          onChangeText={setIssuer}
                        />
                      </View>

                      <View style={styles.colHalf}>
                        <Text style={styles.subLabel}>Last 4 Digits</Text>
                        <TextInput
                          style={styles.subInput}
                          placeholder="4321"
                          maxLength={4}
                          placeholderTextColor={COLORS.textLight}
                          value={last4Digits}
                          onChangeText={setLast4Digits}
                        />
                      </View>
                    </View>

                    <View style={styles.subFieldGroup}>
                      <Text style={styles.subLabel}>Total Credit Limit (₹)</Text>
                      <TextInput
                        style={styles.subInput}
                        keyboardType="numeric"
                        placeholder="e.g. 100000"
                        placeholderTextColor={COLORS.textLight}
                        value={creditLimit}
                        onChangeText={setCreditLimit}
                      />
                    </View>

                    <View style={styles.rowTwoCols}>
                      <View style={styles.colHalf}>
                        <Text style={styles.subLabel}>Statement Day (1-31)</Text>
                        <TextInput
                          style={styles.subInput}
                          keyboardType="numeric"
                          placeholder="15"
                          placeholderTextColor={COLORS.textLight}
                          value={billingCycleDay}
                          onChangeText={setBillingCycleDay}
                        />
                      </View>

                      <View style={styles.colHalf}>
                        <Text style={styles.subLabel}>Payment Due Day (1-31)</Text>
                        <TextInput
                          style={styles.subInput}
                          keyboardType="numeric"
                          placeholder="5"
                          placeholderTextColor={COLORS.textLight}
                          value={paymentDueDay}
                          onChangeText={setPaymentDueDay}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Opening Balance */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Opening Balance
                    {type === 'Credit Card' ? ' (Use negative for existing debt, e.g. -5000)' : ''}
                  </Text>
                  <TextInput
                    style={[styles.input, formErrors.openingBalance && styles.inputError]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textLight}
                    value={openingBalance}
                    onChangeText={(text) => {
                      setOpeningBalance(text);
                      if (formErrors.openingBalance) {
                        setFormErrors((prev) => ({ ...prev, openingBalance: null }));
                      }
                    }}
                  />
                  {formErrors.openingBalance && (
                    <Text style={styles.errorText}>{formErrors.openingBalance}</Text>
                  )}
                </View>

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={2}
                    placeholder="Additional details..."
                    placeholderTextColor={COLORS.textLight}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
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
                      {account ? 'Update Account' : 'Create Account'}
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
    maxWidth: 440,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 440,
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
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  textArea: {
    minHeight: 55,
    textAlignVertical: 'top',
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
  currencyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  currencyBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
  },
  currencyBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  currencyTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  creditCardBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 14,
    gap: 10,
  },
  creditCardHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B21A8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  subFieldGroup: {
    gap: 4,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  subInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: COLORS.textMain,
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
    paddingHorizontal: 20,
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

export default AccountFormModal;
