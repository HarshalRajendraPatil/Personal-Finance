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
import { createLoan, updateLoan, clearLoanError } from '../store/loanSlice';
import { X, Calculator } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';

export const LOAN_TYPES = [
  'Home Loan',
  'Car Loan',
  'Personal Loan',
  'Education Loan',
  'Gold Loan',
  'Business Loan',
  'Other',
];

export const LOAN_TYPE_COLORS = {
  'Home Loan': '#3B82F6',
  'Car Loan': '#F97316',
  'Personal Loan': '#8B5CF6',
  'Education Loan': '#10B981',
  'Gold Loan': '#F59E0B',
  'Business Loan': '#EC4899',
  Other: '#64748B',
};

const LoanFormModal = ({ isOpen, onClose, loan = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.loans);
  const { accounts } = useSelector((state) => state.accounts);

  const [name, setName] = useState('');
  const [type, setType] = useState('Personal Loan');
  const [lender, setLender] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [startDate, setStartDate] = useState('');
  const [account, setAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  // Live EMI Calculation
  const estimatedEmi = (() => {
    const p = parseFloat(principal);
    const r = parseFloat(interestRate) / 100 / 12;
    const n = parseInt(tenureMonths, 10);
    if (!p || !n || isNaN(p) || isNaN(n)) return null;
    if (!r || isNaN(r)) return Math.round(p / n);
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(emi);
  })();

  useEffect(() => {
    if (loan) {
      setName(loan.name || '');
      setType(loan.type || 'Personal Loan');
      setLender(loan.lender || '');
      setPrincipal(
        loan.principal !== undefined ? String(loan.principal) : ''
      );
      setInterestRate(
        loan.interestRate !== undefined ? String(loan.interestRate) : ''
      );
      setTenureMonths(
        loan.tenureMonths !== undefined ? String(loan.tenureMonths) : ''
      );
      setStartDate(
        loan.startDate
          ? new Date(loan.startDate).toISOString().split('T')[0]
          : ''
      );
      setAccount(loan.account?._id || loan.account || '');
      setNotes(loan.notes || '');
    } else {
      setName('');
      setType('Personal Loan');
      setLender('');
      setPrincipal('');
      setInterestRate('');
      setTenureMonths('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setAccount(activeAccounts.length > 0 ? activeAccounts[0]._id : '');
      setNotes('');
    }
    setFormErrors({});
    dispatch(clearLoanError());
  }, [loan, isOpen, accounts, dispatch]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Loan name is required';
    const p = parseFloat(principal);
    if (isNaN(p) || p <= 0) errs.principal = 'Principal must be > 0';
    const r = parseFloat(interestRate);
    if (isNaN(r) || r < 0) errs.interestRate = 'Valid interest rate required';
    const t = parseInt(tenureMonths, 10);
    if (isNaN(t) || t <= 0) errs.tenureMonths = 'Tenure must be >= 1 month';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      type,
      lender: lender.trim(),
      principal: parseFloat(principal),
      interestRate: parseFloat(interestRate),
      tenureMonths: parseInt(tenureMonths, 10),
      startDate: startDate || new Date().toISOString().split('T')[0],
      account: account || null,
      notes: notes.trim(),
    };

    try {
      if (loan) {
        await dispatch(updateLoan({ id: loan._id, data: payload })).unwrap();
      } else {
        await dispatch(createLoan(payload)).unwrap();
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
              <View style={styles.header}>
                <Text style={styles.title}>
                  {loan ? 'Edit Loan' : 'Add Loan & EMI'}
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
                {/* Loan Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Loan Name</Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    placeholder="e.g. HDFC Home Loan, SBI Auto Loan"
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

                {/* Loan Type Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Loan Type</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {LOAN_TYPES.map((t) => {
                      const isSelected = type === t;
                      const c = LOAN_TYPE_COLORS[t] || COLORS.primary;
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setType(t)}
                          style={[
                            styles.chip,
                            isSelected && {
                              backgroundColor: `${c}15`,
                              borderColor: c,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && { color: c, fontWeight: '700' },
                            ]}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Lender / Bank */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Lender / Bank</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. HDFC Bank, ICICI, SBI..."
                    placeholderTextColor={COLORS.textLight}
                    value={lender}
                    onChangeText={setLender}
                  />
                </View>

                {/* Principal, Interest Rate, Tenure */}
                <View style={styles.rowThreeCols}>
                  <View style={styles.colThird}>
                    <Text style={styles.label}>Principal (₹)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.principal && styles.inputError,
                      ]}
                      keyboardType="numeric"
                      placeholder="500000"
                      placeholderTextColor={COLORS.textLight}
                      value={principal}
                      onChangeText={(val) => {
                        setPrincipal(val);
                        if (formErrors.principal)
                          setFormErrors((p) => ({ ...p, principal: null }));
                      }}
                    />
                  </View>

                  <View style={styles.colThird}>
                    <Text style={styles.label}>Rate (% p.a.)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.interestRate && styles.inputError,
                      ]}
                      keyboardType="numeric"
                      placeholder="8.5"
                      placeholderTextColor={COLORS.textLight}
                      value={interestRate}
                      onChangeText={(val) => {
                        setInterestRate(val);
                        if (formErrors.interestRate)
                          setFormErrors((p) => ({ ...p, interestRate: null }));
                      }}
                    />
                  </View>

                  <View style={styles.colThird}>
                    <Text style={styles.label}>Tenure (Mo)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.tenureMonths && styles.inputError,
                      ]}
                      keyboardType="numeric"
                      placeholder="60"
                      placeholderTextColor={COLORS.textLight}
                      value={tenureMonths}
                      onChangeText={(val) => {
                        setTenureMonths(val);
                        if (formErrors.tenureMonths)
                          setFormErrors((p) => ({ ...p, tenureMonths: null }));
                      }}
                    />
                  </View>
                </View>

                {/* Real-time Live EMI Calculator preview */}
                {estimatedEmi ? (
                  <View style={styles.emiBanner}>
                    <View style={styles.emiBannerLeft}>
                      <Calculator size={18} color={COLORS.primary} />
                      <Text style={styles.emiBannerLabel}>Estimated EMI</Text>
                    </View>
                    <Text style={styles.emiBannerValue}>
                      {formatCurrency(estimatedEmi)}/mo
                    </Text>
                  </View>
                ) : null}

                {/* Start Date */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Loan Start Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textLight}
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </View>

                {/* Linked Bank Account */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Linked Bank Account</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    <TouchableOpacity
                      onPress={() => setAccount('')}
                      style={[styles.chip, !account && styles.chipActive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          !account && styles.chipTextActive,
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {activeAccounts.map((a) => {
                      const isSelected = account === a._id;
                      return (
                        <TouchableOpacity
                          key={a._id}
                          onPress={() => setAccount(a._id)}
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

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={2}
                    placeholder="Loan account number, branch, terms..."
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
                      {loan ? 'Update Loan' : 'Save Loan'}
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
  rowThreeCols: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  colThird: {
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
  emiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  emiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emiBannerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emiBannerValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
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

export default LoanFormModal;
