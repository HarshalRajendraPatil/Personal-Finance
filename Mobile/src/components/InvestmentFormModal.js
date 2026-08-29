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
  createInvestment,
  updateInvestment,
  clearInvestmentError,
} from '../store/investmentSlice';
import { X } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../styles/theme';

export const INVESTMENT_TYPES = [
  'Stocks',
  'Mutual Fund',
  'ETF',
  'Fixed Deposit',
  'PPF',
  'EPF',
  'NPS',
  'Gold',
  'Crypto',
  'Bonds',
  'Other',
];

export const TYPE_COLORS = {
  Stocks: '#3B82F6',
  'Mutual Fund': '#10B981',
  ETF: '#8B5CF6',
  'Fixed Deposit': '#F59E0B',
  PPF: '#EC4899',
  EPF: '#06B6D4',
  NPS: '#84CC16',
  Gold: '#F97316',
  Crypto: '#EF4444',
  Bonds: '#6366F1',
  Other: '#64748B',
};

const InvestmentFormModal = ({ isOpen, onClose, investment = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.investments);

  const [name, setName] = useState('');
  const [type, setType] = useState('Stocks');
  const [platform, setPlatform] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (investment) {
      setName(investment.name || '');
      setType(investment.type || 'Stocks');
      setPlatform(investment.platform || '');
      setInvestedAmount(
        investment.investedAmount !== undefined
          ? String(investment.investedAmount)
          : ''
      );
      setCurrentValue(
        investment.currentValue !== undefined
          ? String(investment.currentValue)
          : ''
      );
      setQuantity(
        investment.quantity !== null && investment.quantity !== undefined
          ? String(investment.quantity)
          : ''
      );
      setBuyPrice(
        investment.buyPrice !== null && investment.buyPrice !== undefined
          ? String(investment.buyPrice)
          : ''
      );
      setPurchaseDate(
        investment.purchaseDate
          ? new Date(investment.purchaseDate).toISOString().split('T')[0]
          : ''
      );
      setMaturityDate(
        investment.maturityDate
          ? new Date(investment.maturityDate).toISOString().split('T')[0]
          : ''
      );
      setNotes(investment.notes || '');
    } else {
      setName('');
      setType('Stocks');
      setPlatform('');
      setInvestedAmount('');
      setCurrentValue('');
      setQuantity('');
      setBuyPrice('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setMaturityDate('');
      setNotes('');
    }
    setFormErrors({});
    dispatch(clearInvestmentError());
  }, [investment, isOpen, dispatch]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Investment name is required';
    const inv = parseFloat(investedAmount);
    if (isNaN(inv) || inv < 0) errs.investedAmount = 'Valid invested amount required';
    const cur = parseFloat(currentValue);
    if (isNaN(cur) || cur < 0) errs.currentValue = 'Valid current value required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      type,
      platform: platform.trim(),
      investedAmount: parseFloat(investedAmount),
      currentValue: parseFloat(currentValue),
      quantity: quantity ? parseFloat(quantity) : null,
      buyPrice: buyPrice ? parseFloat(buyPrice) : null,
      purchaseDate: purchaseDate || null,
      maturityDate: maturityDate || null,
      notes: notes.trim(),
      color: TYPE_COLORS[type] || '#3B82F6',
    };

    try {
      if (investment) {
        await dispatch(
          updateInvestment({ id: investment._id, data: payload })
        ).unwrap();
      } else {
        await dispatch(createInvestment(payload)).unwrap();
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
                  {investment ? 'Edit Investment' : 'Add Investment'}
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
                {/* Investment Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Asset / Holding Name</Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    placeholder="e.g. Reliance Industries, HDFC Midcap, SGB Gold"
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

                {/* Asset Type Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Asset Type</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {INVESTMENT_TYPES.map((t) => {
                      const isSelected = type === t;
                      const c = TYPE_COLORS[t] || COLORS.primary;
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

                {/* Platform / Broker */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Platform / Institution</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Zerodha, Groww, Kuvera, SBI..."
                    placeholderTextColor={COLORS.textLight}
                    value={platform}
                    onChangeText={setPlatform}
                  />
                </View>

                {/* Invested Amount & Current Value */}
                <View style={styles.rowTwoCols}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Invested Amount (₹)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.investedAmount && styles.inputError,
                      ]}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textLight}
                      value={investedAmount}
                      onChangeText={(val) => {
                        setInvestedAmount(val);
                        if (!currentValue || !investment) setCurrentValue(val);
                        if (formErrors.investedAmount)
                          setFormErrors((p) => ({ ...p, investedAmount: null }));
                      }}
                    />
                    {formErrors.investedAmount && (
                      <Text style={styles.errorText}>
                        {formErrors.investedAmount}
                      </Text>
                    )}
                  </View>

                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Current Value (₹)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.currentValue && styles.inputError,
                      ]}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textLight}
                      value={currentValue}
                      onChangeText={(val) => {
                        setCurrentValue(val);
                        if (formErrors.currentValue)
                          setFormErrors((p) => ({ ...p, currentValue: null }));
                      }}
                    />
                    {formErrors.currentValue && (
                      <Text style={styles.errorText}>
                        {formErrors.currentValue}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Quantity & Buy Price (Optional) */}
                <View style={styles.rowTwoCols}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Units / Qty (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="e.g. 50"
                      placeholderTextColor={COLORS.textLight}
                      value={quantity}
                      onChangeText={setQuantity}
                    />
                  </View>

                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Buy Price / Unit</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="e.g. 2400"
                      placeholderTextColor={COLORS.textLight}
                      value={buyPrice}
                      onChangeText={setBuyPrice}
                    />
                  </View>
                </View>

                {/* Purchase Date & Maturity Date */}
                <View style={styles.rowTwoCols}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Purchase Date</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.textLight}
                      value={purchaseDate}
                      onChangeText={setPurchaseDate}
                    />
                  </View>

                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Maturity Date (Opt)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.textLight}
                      value={maturityDate}
                      onChangeText={setMaturityDate}
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
                    placeholder="Investment thesis, strategy, folio number..."
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
                      {investment ? 'Update Investment' : 'Save Investment'}
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
  chipText: {
    fontSize: 12,
    fontWeight: '500',
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

export default InvestmentFormModal;
