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
import {
  createRecurringRule,
  updateRecurringRule,
  clearRecurringError,
} from '../store/recurringSlice';
import { X, Check } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../styles/theme';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const RecurringFormModal = ({ isOpen, onClose, rule = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.recurring);
  const { accounts } = useSelector((state) => state.accounts);
  const { categories } = useSelector((state) => state.categories);

  const [name, setName] = useState('');
  const [type, setType] = useState('Expense');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [account, setAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [nextRunDate, setNextRunDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [autoPost, setAutoPost] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  useEffect(() => {
    if (rule) {
      setName(rule.name || '');
      setType(rule.type || 'Expense');
      setAmount(rule.amount !== undefined ? String(rule.amount) : '');
      setFrequency(rule.frequency || 'monthly');
      setAccount(rule.account?._id || rule.account || '');
      setToAccount(rule.toAccount?._id || rule.toAccount || '');
      setCategory(rule.category?._id || rule.category || '');
      setMerchant(rule.merchant || '');
      setNextRunDate(
        rule.nextRunDate
          ? new Date(rule.nextRunDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setEndDate(
        rule.endDate
          ? new Date(rule.endDate).toISOString().split('T')[0]
          : ''
      );
      setNotes(rule.notes || '');
      setIsActive(rule.isActive !== undefined ? rule.isActive : true);
      setAutoPost(rule.autoPost || false);
    } else {
      setName('');
      setType('Expense');
      setAmount('');
      setFrequency('monthly');
      setAccount(activeAccounts.length > 0 ? activeAccounts[0]._id : '');
      setToAccount('');
      setCategory('');
      setMerchant('');
      setNextRunDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setNotes('');
      setIsActive(true);
      setAutoPost(false);
    }
    setFormErrors({});
    dispatch(clearRecurringError());
  }, [rule, isOpen, accounts, dispatch]);

  const validate = () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Rule name must be at least 2 characters';
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      errs.amount = 'Amount must be greater than 0';
    }
    if (!account) {
      errs.account = 'Account is required';
    }
    if (type === 'Transfer' && !toAccount) {
      errs.toAccount = 'Destination account is required for transfers';
    }
    if (!nextRunDate) {
      errs.nextRunDate = 'Next due date is required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      type,
      amount: parseFloat(amount),
      frequency,
      account,
      toAccount: type === 'Transfer' ? toAccount : null,
      category: type !== 'Transfer' ? category || null : null,
      merchant: merchant.trim(),
      nextRunDate,
      endDate: endDate || null,
      notes: notes.trim(),
      isActive,
      autoPost,
    };

    try {
      if (rule) {
        await dispatch(
          updateRecurringRule({ id: rule._id, data: payload })
        ).unwrap();
      } else {
        await dispatch(createRecurringRule(payload)).unwrap();
      }
      onClose();
    } catch {
      // Handled in Redux error
    }
  };

  if (!isOpen) return null;

  const visibleCategories = categories.filter(
    (c) => !c.parent && c.type === (type === 'Income' ? 'Income' : 'Expense')
  );

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
                  {rule ? 'Edit Recurring Rule' : 'New Recurring Rule'}
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
                {/* Rule Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Rule Name</Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    placeholder="e.g. Monthly Rent, Salary Credit, Netflix"
                    placeholderTextColor={COLORS.textLight}
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (formErrors.name)
                        setFormErrors((prev) => ({ ...prev, name: null }));
                    }}
                  />
                  {formErrors.name && (
                    <Text style={styles.errorText}>{formErrors.name}</Text>
                  )}
                </View>

                {/* Type Tabs */}
                <View style={styles.typeTabContainer}>
                  {['Expense', 'Income', 'Transfer'].map((t) => {
                    const isSelected = type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => {
                          setType(t);
                          setCategory('');
                          setToAccount('');
                        }}
                        style={[
                          styles.typeTabBtn,
                          isSelected && styles.typeTabBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeTabText,
                            isSelected && styles.typeTabTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Amount and Frequency */}
                <View style={styles.rowTwoCols}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Amount (₹)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.amount && styles.inputError,
                      ]}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textLight}
                      value={amount}
                      onChangeText={(val) => {
                        setAmount(val);
                        if (formErrors.amount)
                          setFormErrors((prev) => ({ ...prev, amount: null }));
                      }}
                    />
                    {formErrors.amount && (
                      <Text style={styles.errorText}>{formErrors.amount}</Text>
                    )}
                  </View>

                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Frequency</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}
                    >
                      {FREQUENCIES.map((f) => {
                        const isSelected = frequency === f.value;
                        return (
                          <TouchableOpacity
                            key={f.value}
                            onPress={() => setFrequency(f.value)}
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
                              {f.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Account Selection */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    {type === 'Transfer' ? 'From Account' : 'Account'}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {activeAccounts.map((a) => {
                      const isSelected = account === a._id;
                      return (
                        <TouchableOpacity
                          key={a._id}
                          onPress={() => {
                            setAccount(a._id);
                            if (formErrors.account)
                              setFormErrors((prev) => ({
                                ...prev,
                                account: null,
                              }));
                          }}
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
                  {formErrors.account && (
                    <Text style={styles.errorText}>{formErrors.account}</Text>
                  )}
                </View>

                {/* To Account (if Transfer) */}
                {type === 'Transfer' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>To Account</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}
                    >
                      {activeAccounts.map((a) => {
                        const isSelected = toAccount === a._id;
                        return (
                          <TouchableOpacity
                            key={a._id}
                            onPress={() => {
                              setToAccount(a._id);
                              if (formErrors.toAccount)
                                setFormErrors((prev) => ({
                                  ...prev,
                                  toAccount: null,
                                }));
                            }}
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
                    {formErrors.toAccount && (
                      <Text style={styles.errorText}>
                        {formErrors.toAccount}
                      </Text>
                    )}
                  </View>
                )}

                {/* Category (if Expense/Income) */}
                {type !== 'Transfer' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Category</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}
                    >
                      <TouchableOpacity
                        onPress={() => setCategory('')}
                        style={[
                          styles.chip,
                          !category && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            !category && styles.chipTextActive,
                          ]}
                        >
                          None
                        </Text>
                      </TouchableOpacity>
                      {visibleCategories.map((c) => {
                        const isSelected = category === c._id;
                        return (
                          <TouchableOpacity
                            key={c._id}
                            onPress={() => setCategory(c._id)}
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
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Merchant / Payee */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Merchant / Payee</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Landlord, Netflix, Gym"
                    placeholderTextColor={COLORS.textLight}
                    value={merchant}
                    onChangeText={setMerchant}
                  />
                </View>

                {/* Next Due Date & End Date */}
                <View style={styles.rowTwoCols}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Next Due Date</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.nextRunDate && styles.inputError,
                      ]}
                      placeholder="2026-08-29"
                      placeholderTextColor={COLORS.textLight}
                      value={nextRunDate}
                      onChangeText={(val) => {
                        setNextRunDate(val);
                        if (formErrors.nextRunDate)
                          setFormErrors((prev) => ({
                            ...prev,
                            nextRunDate: null,
                          }));
                      }}
                    />
                    {formErrors.nextRunDate && (
                      <Text style={styles.errorText}>
                        {formErrors.nextRunDate}
                      </Text>
                    )}
                  </View>

                  <View style={styles.colHalf}>
                    <Text style={styles.label}>End Date (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.textLight}
                      value={endDate}
                      onChangeText={setEndDate}
                    />
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Notes</Text>
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

                {/* Toggles */}
                <View style={styles.switchSection}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Active Rule</Text>
                    <Switch
                      value={isActive}
                      onValueChange={setIsActive}
                      trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                      thumbColor={isActive ? COLORS.primary : '#FFFFFF'}
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Auto-post on due date</Text>
                    <Switch
                      value={autoPost}
                      onValueChange={setAutoPost}
                      trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                      thumbColor={autoPost ? COLORS.primary : '#FFFFFF'}
                    />
                  </View>
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
                      {rule ? 'Update Rule' : 'Create Rule'}
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 460,
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
  typeTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  typeTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  typeTabBtnActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  typeTabTextActive: {
    color: COLORS.textMain,
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  colHalf: {
    flex: 1,
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
  switchSection: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
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

export default RecurringFormModal;
