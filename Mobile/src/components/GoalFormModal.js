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
import { createGoal, updateGoal, clearGoalError } from '../store/goalSlice';
import CategoryIcon from './CategoryIcon';
import { X } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../styles/theme';

const GOAL_ICONS = [
  'Target',
  'Home',
  'Car',
  'Plane',
  'Laptop',
  'ShoppingBag',
  'GraduationCap',
  'Heart',
  'Baby',
  'Palmtree',
  'Umbrella',
  'PiggyBank',
];

const GOAL_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

const GoalFormModal = ({ isOpen, onClose, goal = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.goals);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('Target');
  const [color, setColor] = useState('#3B82F6');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const alreadySaved = goal ? goal.currentAmount || 0 : 0;

  useEffect(() => {
    if (goal) {
      setName(goal.name || '');
      setTargetAmount(
        goal.targetAmount !== undefined ? String(goal.targetAmount) : ''
      );
      setCurrentAmount(
        goal.currentAmount !== undefined ? String(goal.currentAmount) : '0'
      );
      setDeadline(
        goal.deadline
          ? new Date(goal.deadline).toISOString().split('T')[0]
          : ''
      );
      setIcon(goal.icon || 'Target');
      setColor(goal.color || '#3B82F6');
      setNotes(goal.notes || '');
    } else {
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setDeadline('');
      setIcon('Target');
      setColor('#3B82F6');
      setNotes('');
    }
    setFormErrors({});
    dispatch(clearGoalError());
  }, [goal, isOpen, dispatch]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Goal name is required';
    }
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      errs.targetAmount = 'Target amount must be greater than 0';
    } else if (goal && target < alreadySaved) {
      errs.targetAmount = `Cannot set target below ₹${alreadySaved} (already saved)`;
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || 0),
      deadline: deadline || null,
      icon,
      color,
      notes: notes.trim(),
    };

    try {
      if (goal) {
        await dispatch(updateGoal({ id: goal._id, data: payload })).unwrap();
      } else {
        await dispatch(createGoal(payload)).unwrap();
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
                  {goal ? 'Edit Savings Goal' : 'New Savings Goal'}
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
                {/* Goal Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Goal Name</Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    placeholder="e.g. Emergency Fund, Europe Trip, MacBook"
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

                {/* Target Amount & Already Saved */}
                <View style={styles.rowTwoCols}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Target Amount (₹)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.targetAmount && styles.inputError,
                      ]}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textLight}
                      value={targetAmount}
                      onChangeText={(val) => {
                        setTargetAmount(val);
                        if (formErrors.targetAmount)
                          setFormErrors((prev) => ({
                            ...prev,
                            targetAmount: null,
                          }));
                      }}
                    />
                    {formErrors.targetAmount && (
                      <Text style={styles.errorText}>
                        {formErrors.targetAmount}
                      </Text>
                    )}
                  </View>

                  <View style={styles.colHalf}>
                    <Text style={styles.label}>Already Saved (₹)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={COLORS.textLight}
                      value={currentAmount}
                      onChangeText={setCurrentAmount}
                    />
                  </View>
                </View>

                {/* Target Deadline */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Target Deadline (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textLight}
                    value={deadline}
                    onChangeText={setDeadline}
                  />
                </View>

                {/* Icon Selection */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Icon</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.iconScroll}
                  >
                    {GOAL_ICONS.map((ic) => {
                      const isSelected = icon === ic;
                      return (
                        <TouchableOpacity
                          key={ic}
                          onPress={() => setIcon(ic)}
                          style={[
                            styles.iconChip,
                            isSelected && {
                              backgroundColor: `${color}25`,
                              borderColor: color,
                            },
                          ]}
                        >
                          <CategoryIcon
                            name={ic}
                            color={isSelected ? color : COLORS.textMuted}
                            size={20}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Color Selection */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Color</Text>
                  <View style={styles.colorRow}>
                    {GOAL_COLORS.map((c) => {
                      const isSelected = color === c;
                      return (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setColor(c)}
                          style={[
                            styles.colorDot,
                            { backgroundColor: c },
                            isSelected && styles.colorDotSelected,
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={2}
                    placeholder="Additional motivation or planning notes..."
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
                      {goal ? 'Update Goal' : 'Create Goal'}
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
    maxHeight: 450,
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
  iconScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...SHADOWS.md,
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

export default GoalFormModal;
