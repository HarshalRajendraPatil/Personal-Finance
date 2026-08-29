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
import { createCategory, updateCategory, clearCategoryError } from '../store/categorySlice';
import CategoryIcon, { AVAILABLE_ICONS } from './CategoryIcon';
import { X, Check } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../styles/theme';

const COLOR_OPTIONS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#64748b',
];

const CategoryFormModal = ({
  isOpen,
  onClose,
  category = null,
  parentId = null,
  prefilledType = 'Expense',
}) => {
  const dispatch = useDispatch();
  const { categories, isLoading, error } = useSelector((state) => state.categories);

  const [name, setName] = useState('');
  const [type, setType] = useState(prefilledType);
  const [parent, setParent] = useState(parentId || '');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#3b82f6');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setType(category.type || 'Expense');
      setParent(category.parent || '');
      setIcon(category.icon || 'Tag');
      setColor(category.color || '#3b82f6');
    } else {
      setName('');
      setType(prefilledType);
      setParent(parentId || '');
      setIcon('Tag');
      setColor('#3b82f6');
    }
    setFormErrors({});
    dispatch(clearCategoryError());
  }, [category, parentId, prefilledType, isOpen, dispatch]);

  const validate = () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      errs.color = 'Must be a valid hex color (e.g. #3b82f6)';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const data = {
      name: name.trim(),
      type,
      icon,
      color,
      parent: parent || null,
    };

    try {
      if (category) {
        await dispatch(updateCategory({ id: category._id, data })).unwrap();
      } else {
        await dispatch(createCategory(data)).unwrap();
      }
      onClose();
    } catch {
      // Handled in Redux error
    }
  };

  // Filter parents to only show main categories of the selected type
  const parentOptions = categories.filter(
    (c) =>
      !c.parent &&
      c.type === type &&
      (!category || c._id !== category._id)
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
                  {category ? 'Edit Category' : 'Add Category'}
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
                {/* Type Selection */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.typeRow}>
                    <TouchableOpacity
                      disabled={!!category || !!parentId}
                      onPress={() => {
                        setType('Expense');
                        setParent('');
                      }}
                      style={[
                        styles.typeBtn,
                        type === 'Expense' && styles.typeBtnExpenseActive,
                        (!!category || !!parentId) && styles.disabledBtn,
                      ]}
                    >
                      <View
                        style={[
                          styles.typeDot,
                          { backgroundColor: COLORS.danger },
                        ]}
                      />
                      <Text
                        style={[
                          styles.typeBtnText,
                          type === 'Expense' && styles.typeBtnTextActive,
                        ]}
                      >
                        Expense
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={!!category || !!parentId}
                      onPress={() => {
                        setType('Income');
                        setParent('');
                      }}
                      style={[
                        styles.typeBtn,
                        type === 'Income' && styles.typeBtnIncomeActive,
                        (!!category || !!parentId) && styles.disabledBtn,
                      ]}
                    >
                      <View
                        style={[
                          styles.typeDot,
                          { backgroundColor: COLORS.success },
                        ]}
                      />
                      <Text
                        style={[
                          styles.typeBtnText,
                          type === 'Income' && styles.typeBtnTextActive,
                        ]}
                      >
                        Income
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Parent Category */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Parent Category (Optional)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.parentChipRow}
                  >
                    <TouchableOpacity
                      disabled={!!category && !category.parent}
                      onPress={() => setParent('')}
                      style={[
                        styles.parentChip,
                        !parent && styles.parentChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.parentChipText,
                          !parent && styles.parentChipTextActive,
                        ]}
                      >
                        None (Top Level)
                      </Text>
                    </TouchableOpacity>

                    {parentOptions.map((p) => {
                      const isSelected = parent === p._id;
                      return (
                        <TouchableOpacity
                          key={p._id}
                          disabled={!!category && !category.parent}
                          onPress={() => setParent(p._id)}
                          style={[
                            styles.parentChip,
                            isSelected && styles.parentChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.parentChipText,
                              isSelected && styles.parentChipTextActive,
                            ]}
                          >
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <Text style={styles.hintText}>
                    Select a parent to make this a subcategory.
                  </Text>
                </View>

                {/* Category Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    placeholder="e.g. Groceries, Salary"
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

                {/* Icon Grid Picker */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Icon</Text>
                  <View style={styles.iconGrid}>
                    {AVAILABLE_ICONS.map((iconName) => {
                      const isSelected = icon === iconName;
                      return (
                        <TouchableOpacity
                          key={iconName}
                          onPress={() => setIcon(iconName)}
                          style={[
                            styles.iconItem,
                            isSelected && styles.iconItemActive,
                          ]}
                        >
                          <CategoryIcon
                            name={iconName}
                            color={isSelected ? COLORS.primary : COLORS.textSecondary}
                            size={20}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Color Picker */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Color</Text>
                  <View style={styles.colorRow}>
                    {COLOR_OPTIONS.map((hex) => {
                      const isSelected = color.toLowerCase() === hex.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={hex}
                          onPress={() => setColor(hex)}
                          style={[
                            styles.colorDot,
                            { backgroundColor: hex },
                            isSelected && styles.colorDotActive,
                          ]}
                        >
                          {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom Hex input */}
                  <View style={styles.customColorRow}>
                    <View
                      style={[
                        styles.colorPreview,
                        { backgroundColor: color || '#3b82f6' },
                      ]}
                    />
                    <TextInput
                      style={[styles.input, styles.hexInput, formErrors.color && styles.inputError]}
                      placeholder="#3b82f6"
                      placeholderTextColor={COLORS.textLight}
                      value={color}
                      autoCapitalize="none"
                      onChangeText={(val) => {
                        setColor(val);
                        if (formErrors.color) setFormErrors((prev) => ({ ...prev, color: null }));
                      }}
                    />
                  </View>
                  {formErrors.color && (
                    <Text style={styles.errorText}>{formErrors.color}</Text>
                  )}
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
                      {category ? 'Update' : 'Create'}
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
    maxHeight: '90%',
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
    maxHeight: 460,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
  },
  typeBtnExpenseActive: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  typeBtnIncomeActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successBg,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeBtnTextActive: {
    color: COLORS.textMain,
  },
  parentChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  parentChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
  },
  parentChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  parentChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  parentChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxHeight: 130,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceAlt,
  },
  iconItem: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconItemActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: COLORS.textMain,
    transform: [{ scale: 1.1 }],
  },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  colorPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  hexInput: {
    flex: 1,
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
    paddingTop: 16,
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

export default CategoryFormModal;
