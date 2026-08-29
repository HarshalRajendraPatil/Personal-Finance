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
  createBudget,
  updateBudget,
  clearBudgetError,
} from '../store/budgetSlice';
import { X } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../styles/theme';

const PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

const THRESHOLD_OPTIONS = [50, 70, 80, 90, 100];

const BudgetFormModal = ({ isOpen, onClose, budget = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.budgets);
  const { categories } = useSelector((state) => state.categories);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [rollover, setRollover] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const expenseCategories = categories.filter(
    (c) => c.type === 'Expense' && !c.parent
  );

  useEffect(() => {
    if (budget) {
      setName(budget.name || '');
      setCategory(budget.category?._id || budget.category || '');
      setPeriod(budget.period || 'monthly');
      setStartDate(
        budget.startDate
          ? new Date(budget.startDate).toISOString().split('T')[0]
          : ''
      );
      setEndDate(
        budget.endDate
          ? new Date(budget.endDate).toISOString().split('T')[0]
          : ''
      );
      setLimit(budget.limit !== undefined ? String(budget.limit) : '');
      setAlertThreshold(
        budget.alertThreshold !== undefined ? budget.alertThreshold : 80
      );
      setRollover(budget.rollover || false);
    } else {
      setName('');
      setCategory(expenseCategories.length > 0 ? expenseCategories[0]._id : '');
      setPeriod('monthly');
      setStartDate('');
      setEndDate('');
      setLimit('');
      setAlertThreshold(80);
      setRollover(false);
    }
    setFormErrors({});
    dispatch(clearBudgetError());
  }, [budget, isOpen, categories, dispatch]);

  const validate = () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Budget name must be at least 2 characters';
    }
    if (!category) {
      errs.category = 'Category is required';
    }
    const num = parseFloat(limit);
    if (isNaN(num) || num <= 0) {
      errs.limit = 'Budget limit must be greater than 0';
    }
    if (period === 'custom') {
      if (!startDate) errs.startDate = 'Start date required for custom period';
      if (!endDate) errs.endDate = 'End date required for custom period';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      category,
      period,
      limit: parseFloat(limit),
      startDate: period === 'custom' ? startDate : null,
      endDate: period === 'custom' ? endDate : null,
      alertThreshold: parseInt(alertThreshold, 10),
      rollover,
    };

    try {
      if (budget) {
        await dispatch(
          updateBudget({ id: budget._id, data: payload })
        ).unwrap();
      } else {
        await dispatch(createBudget(payload)).unwrap();
      }
      onClose();
    } catch {
      // Handled in Redux error
    }
  };

  if (!isOpen) return null;

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
                  {budget ? 'Edit Budget' : 'New Budget'}
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
                {/* Budget Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Budget Name</Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    placeholder="e.g. Monthly Groceries, Dining Out"
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

                {/* Category Selection */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Expense Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {expenseCategories.map((c) => {
                      const isSelected = category === c._id;
                      return (
                        <TouchableOpacity
                          key={c._id}
                          onPress={() => {
                            setCategory(c._id);
                            if (formErrors.category)
                              setFormErrors((prev) => ({
                                ...prev,
                                category: null,
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
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {formErrors.category && (
                    <Text style={styles.errorText}>{formErrors.category}</Text>
                  )}
                </View>

                {/* Period & Limit */}
                <View style={styles.rowTwoCols}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Period</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}
                    >
                      {PERIODS.map((p) => {
                        const isSelected = period === p.value;
                        return (
                          <TouchableOpacity
                            key={p.value}
                            onPress={() => setPeriod(p.value)}
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
                              {p.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Budget Limit (₹)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.limit && styles.inputError,
                      ]}
                      keyboardType="numeric"
                      placeholder="e.g. 5000"
                      placeholderTextColor={COLORS.textLight}
                      value={limit}
                      onChangeText={(val) => {
                        setLimit(val);
                        if (formErrors.limit)
                          setFormErrors((prev) => ({ ...prev, limit: null }));
                      }}
                    />
                    {formErrors.limit && (
                      <Text style={styles.errorText}>{formErrors.limit}</Text>
                    )}
                  </View>
                </View>

                {/* Custom Period Dates */}
                {period === 'custom' && (
                  <View style={styles.rowTwoCols}>
                    <View style={styles.colHalf}>
                      <Text style={styles.label}>Start Date</Text>
                      <TextInput
                        style={[
                          styles.input,
                          formErrors.startDate && styles.inputError,
                        ]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={COLORS.textLight}
                        value={startDate}
                        onChangeText={setStartDate}
                      />
                      {formErrors.startDate && (
                        <Text style={styles.errorText}>
                          {formErrors.startDate}
                        </Text>
                      )}
                    </View>
                    <View style={styles.colHalf}>
                      <Text style={styles.label}>End Date</Text>
                      <TextInput
                        style={[
                          styles.input,
                          formErrors.endDate && styles.inputError,
                        ]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={COLORS.textLight}
                        value={endDate}
                        onChangeText={setEndDate}
                      />
                      {formErrors.endDate && (
                        <Text style={styles.errorText}>
                          {formErrors.endDate}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Alert Threshold Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Alert Threshold:{' '}
                    <Text style={styles.thresholdValue}>{alertThreshold}%</Text>
                  </Text>
                  <View style={styles.thresholdRow}>
                    {THRESHOLD_OPTIONS.map((pct) => {
                      const isSelected = alertThreshold === pct;
                      return (
                        <TouchableOpacity
                          key={pct}
                          onPress={() => setAlertThreshold(pct)}
                          style={[
                            styles.thresholdBtn,
                            isSelected && styles.thresholdBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.thresholdText,
                              isSelected && styles.thresholdTextActive,
                            ]}
                          >
                            {pct}%
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Rollover switch */}
                <View style={styles.switchSection}>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.switchTitle}>Rollover Budget</Text>
                      <Text style={styles.switchSubtitle}>
                        Roll unused budget over to the next period
                      </Text>
                    </View>
                    <Switch
                      value={rollover}
                      onValueChange={setRollover}
                      trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                      thumbColor={rollover ? COLORS.primary : '#FFFFFF'}
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
                      {budget ? 'Update Budget' : 'Create Budget'}
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
  thresholdValue: {
    color: COLORS.primary,
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
  thresholdRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thresholdBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
  },
  thresholdBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  thresholdText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  thresholdTextActive: {
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
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  switchSubtitle: {
    fontSize: 12,
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

export default BudgetFormModal;
