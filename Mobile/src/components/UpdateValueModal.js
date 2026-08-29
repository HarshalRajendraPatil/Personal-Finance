import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { updateCurrentValue } from '../store/investmentSlice';
import { X, TrendingUp } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';

const UpdateValueModal = ({ isOpen, onClose, investment }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.investments);

  const [currentValue, setCurrentValue] = useState('');
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError('');
    if (investment) {
      setCurrentValue(
        investment.currentValue !== undefined
          ? String(investment.currentValue)
          : ''
      );
      setNote('');
    }
  }, [investment, isOpen]);

  const handleSubmit = async () => {
    setLocalError('');
    const val = parseFloat(currentValue);
    if (isNaN(val) || val < 0) {
      setLocalError('Please enter a valid non-negative current value.');
      return;
    }

    try {
      await dispatch(
        updateCurrentValue({
          id: investment._id,
          data: { currentValue: val, note: note.trim() },
        })
      ).unwrap();
      onClose();
    } catch (err) {
      setLocalError(
        typeof err === 'string' ? err : err?.message || 'Failed to update value'
      );
    }
  };

  if (!isOpen || !investment) return null;

  const currentValNum = parseFloat(currentValue) || 0;
  const investedNum = investment.investedAmount || 0;
  const pl = currentValNum - investedNum;
  const retPct = investedNum > 0 ? (pl / investedNum) * 100 : 0;
  const isProfit = pl >= 0;

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
                <View style={styles.headerLeft}>
                  <View style={styles.iconCircle}>
                    <TrendingUp size={18} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.title}>Update Market Value</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {investment.name}
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

              {/* Context Stats */}
              <View style={styles.contextBanner}>
                <View>
                  <Text style={styles.contextLabel}>Total Invested</Text>
                  <Text style={styles.contextValue}>
                    {formatCurrency(investedNum)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.contextLabel}>Est. Return</Text>
                  <Text
                    style={[
                      styles.contextReturn,
                      isProfit ? styles.textGreen : styles.textRed,
                    ]}
                  >
                    {isProfit ? '+' : ''}
                    {retPct.toFixed(2)}% ({formatCurrency(pl)})
                  </Text>
                </View>
              </View>

              {/* New Current Value Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>New Market Value (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textLight}
                  value={currentValue}
                  onChangeText={setCurrentValue}
                  autoFocus
                />
              </View>

              {/* Optional Note */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Note (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Month-end statement, price spike"
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
                    <Text style={styles.submitBtnText}>Update Value</Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  contextBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  contextValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 2,
  },
  contextReturn: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  textGreen: {
    color: COLORS.success,
  },
  textRed: {
    color: COLORS.danger,
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

export default UpdateValueModal;
