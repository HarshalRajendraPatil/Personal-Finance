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
import {
  createLending,
  updateLending,
  clearLendingError,
} from '../store/lendingSlice';
import { X } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../styles/theme';

const LendingFormModal = ({ isOpen, onClose, entry = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.lending);
  const { accounts } = useSelector((state) => state.accounts);

  const [person, setPerson] = useState('');
  const [type, setType] = useState('lent');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [account, setAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const totalRepaid = entry
    ? (entry.repayments || []).reduce((s, r) => s + r.amount, 0)
    : 0;

  useEffect(() => {
    if (entry) {
      setPerson(entry.person || '');
      setType(entry.type || 'lent');
      setAmount(entry.amount !== undefined ? String(entry.amount) : '');
      setDueDate(
        entry.dueDate
          ? new Date(entry.dueDate).toISOString().split('T')[0]
          : ''
      );
      setAccount(entry.account?._id || entry.account || '');
      setNotes(entry.notes || '');
    } else {
      setPerson('');
      setType('lent');
      setAmount('');
      setDueDate('');
      setAccount(activeAccounts.length > 0 ? activeAccounts[0]._id : '');
      setNotes('');
    }
    setFormErrors({});
    dispatch(clearLendingError());
  }, [entry, isOpen, accounts, dispatch]);

  const validate = () => {
    const errs = {};
    if (!person.trim()) {
      errs.person = 'Person or contact name is required';
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      errs.amount = 'Amount must be greater than 0';
    } else if (entry && num < totalRepaid) {
      errs.amount = `Cannot set principal below ₹${totalRepaid} (already repaid)`;
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      person: person.trim(),
      type,
      amount: parseFloat(amount),
      dueDate: dueDate || null,
      account: account || null,
      notes: notes.trim(),
    };

    try {
      if (entry) {
        await dispatch(
          updateLending({ id: entry._id, data: payload })
        ).unwrap();
      } else {
        await dispatch(createLending(payload)).unwrap();
      }
      onClose();
    } catch {
      // Handled in Redux error state
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
                  {entry ? 'Edit Lending Entry' : 'New Lending / Borrowing'}
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
                {/* Lent vs Borrowed Type Switcher */}
                <View style={styles.typeSwitcher}>
                  <TouchableOpacity
                    onPress={() => setType('lent')}
                    style={[
                      styles.typeBtn,
                      type === 'lent' && styles.typeBtnActiveLent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        type === 'lent' && styles.typeBtnTextActiveLent,
                      ]}
                    >
                      💸 I Lent (Receivable)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setType('borrowed')}
                    style={[
                      styles.typeBtn,
                      type === 'borrowed' && styles.typeBtnActiveBorrowed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        type === 'borrowed' && styles.typeBtnTextActiveBorrowed,
                      ]}
                    >
                      🙏 I Borrowed (Payable)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Person Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Person / Contact</Text>
                  <TextInput
                    style={[
                      styles.input,
                      formErrors.person && styles.inputError,
                    ]}
                    placeholder="e.g. Rahul Sharma, Alice"
                    placeholderTextColor={COLORS.textLight}
                    value={person}
                    onChangeText={(val) => {
                      setPerson(val);
                      if (formErrors.person)
                        setFormErrors((prev) => ({ ...prev, person: null }));
                    }}
                  />
                  {formErrors.person && (
                    <Text style={styles.errorText}>{formErrors.person}</Text>
                  )}
                </View>

                {/* Amount & Due Date */}
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
                    <Text style={styles.label}>Due Date (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.textLight}
                      value={dueDate}
                      onChangeText={setDueDate}
                    />
                  </View>
                </View>

                {/* Linked Account */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Linked Account (Optional)</Text>
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

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={2}
                    placeholder="e.g. Dinner split, Trip expenses..."
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
                      {entry ? 'Update Entry' : 'Create Entry'}
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
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  typeBtnActiveLent: {
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  typeBtnActiveBorrowed: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  typeBtnTextActiveLent: {
    color: COLORS.successText,
    fontWeight: '700',
  },
  typeBtnTextActiveBorrowed: {
    color: COLORS.dangerText,
    fontWeight: '700',
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

export default LendingFormModal;
