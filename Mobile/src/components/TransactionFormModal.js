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
  Image,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { createTransaction, updateTransaction, clearTransactionError } from '../store/transactionSlice';
import authService from '../services/authService';
import { X, Upload, Image as ImageIcon, Camera, Trash2 } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../styles/theme';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

const TransactionFormModal = ({ isOpen, onClose, transaction = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.transactions);
  const { accounts } = useSelector((state) => state.accounts);
  const { categories } = useSelector((state) => state.categories);

  const [type, setType] = useState('Expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type || 'Expense');
      setAmount(transaction.amount !== undefined ? String(transaction.amount) : '');
      setDate(
        transaction.date
          ? new Date(transaction.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setAccount(transaction.account?._id || transaction.account || '');
      setToAccount(transaction.toAccount?._id || transaction.toAccount || '');
      setCategory(transaction.category?._id || transaction.category || '');
      setSubcategory(transaction.subcategory?._id || transaction.subcategory || '');
      setMerchant(transaction.merchant || '');
      setNotes(transaction.notes || '');
      setTags(transaction.tags ? transaction.tags.join(', ') : '');
      setAttachmentUrl(transaction.attachmentUrl || '');
    } else {
      setType('Expense');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setAccount(activeAccounts.length > 0 ? activeAccounts[0]._id : '');
      setToAccount('');
      setCategory('');
      setSubcategory('');
      setMerchant('');
      setNotes('');
      setTags('');
      setAttachmentUrl('');
    }
    setFormErrors({});
    setUploadError('');
    dispatch(clearTransactionError());
  }, [transaction, isOpen, accounts, dispatch]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Permission to access gallery is required to upload receipt.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
          setUploadError('File size must be strictly less than 3MB');
          return;
        }

        setUploadingImage(true);
        setUploadError('');
        const url = await authService.uploadToCloudinary(asset);
        setAttachmentUrl(url);
        setUploadingImage(false);
      }
    } catch (err) {
      setUploadingImage(false);
      setUploadError('Failed to upload image. Please try again.');
    }
  };

  const validate = () => {
    const errs = {};
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      errs.amount = 'Amount must be greater than 0';
    }
    if (!date) {
      errs.date = 'Date is required';
    }
    if (!account) {
      errs.account = 'Account is required';
    }
    if (type === 'Transfer') {
      if (!toAccount) {
        errs.toAccount = 'Destination account is required for transfers';
      } else if (toAccount === account) {
        errs.toAccount = 'Cannot transfer to the same account';
      }
    } else {
      if (!category) {
        errs.category = 'Category is required';
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      type,
      amount: parseFloat(amount),
      date,
      account,
      toAccount: type === 'Transfer' ? toAccount : null,
      category: type !== 'Transfer' ? category || null : null,
      subcategory: type !== 'Transfer' ? subcategory || null : null,
      merchant: merchant.trim(),
      notes: notes.trim(),
      tags: tags
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      attachmentUrl,
    };

    try {
      if (transaction) {
        await dispatch(
          updateTransaction({ id: transaction._id, data: payload })
        ).unwrap();
      } else {
        await dispatch(createTransaction(payload)).unwrap();
      }
      onClose();
    } catch {
      // Handled in Redux error state
    }
  };

  if (!isOpen) return null;

  const parentCategories = categories.filter(
    (c) => !c.parent && c.type === type
  );
  const subCategories = category
    ? categories.filter((c) => c.parent === category)
    : [];

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
                  {transaction ? 'Edit Transaction' : 'New Transaction'}
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
                          setSubcategory('');
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

                {/* Amount and Date */}
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
                    <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        formErrors.date && styles.inputError,
                      ]}
                      placeholder="2026-08-29"
                      placeholderTextColor={COLORS.textLight}
                      value={date}
                      onChangeText={(val) => {
                        setDate(val);
                        if (formErrors.date)
                          setFormErrors((prev) => ({ ...prev, date: null }));
                      }}
                    />
                    {formErrors.date && (
                      <Text style={styles.errorText}>{formErrors.date}</Text>
                    )}
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
                            {a.name} ({a.currency})
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
                              {a.name} ({a.currency})
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

                {/* Category Selection (if Expense or Income) */}
                {type !== 'Transfer' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Category</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}
                    >
                      {parentCategories.map((c) => {
                        const isSelected = category === c._id;
                        return (
                          <TouchableOpacity
                            key={c._id}
                            onPress={() => {
                              setCategory(c._id);
                              setSubcategory('');
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
                      <Text style={styles.errorText}>
                        {formErrors.category}
                      </Text>
                    )}
                  </View>
                )}

                {/* Subcategory Selection */}
                {type !== 'Transfer' && subCategories.length > 0 && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Subcategory (Optional)</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}
                    >
                      <TouchableOpacity
                        onPress={() => setSubcategory('')}
                        style={[
                          styles.chip,
                          !subcategory && styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            !subcategory && styles.chipTextActive,
                          ]}
                        >
                          None
                        </Text>
                      </TouchableOpacity>
                      {subCategories.map((sub) => {
                        const isSelected = subcategory === sub._id;
                        return (
                          <TouchableOpacity
                            key={sub._id}
                            onPress={() => setSubcategory(sub._id)}
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
                              {sub.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Merchant / Payee */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Payee / Merchant</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Amazon, Starbucks, Client Ltd."
                    placeholderTextColor={COLORS.textLight}
                    value={merchant}
                    onChangeText={setMerchant}
                  />
                </View>

                {/* Tags */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Tags (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. vacation, tax-deductible, groceries"
                    placeholderTextColor={COLORS.textLight}
                    value={tags}
                    onChangeText={setTags}
                  />
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

                {/* Receipt Upload */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    Receipt / Attachment (Max 3MB)
                  </Text>
                  <View style={styles.receiptRow}>
                    {attachmentUrl ? (
                      <View style={styles.receiptPreview}>
                        <Image
                          source={{ uri: attachmentUrl }}
                          style={styles.receiptImg}
                        />
                        <TouchableOpacity
                          onPress={() => setAttachmentUrl('')}
                          style={styles.removeReceiptBtn}
                        >
                          <X size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.receiptPlaceholder}>
                        <ImageIcon size={24} color={COLORS.textLight} />
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.uploadBtn,
                        uploadingImage && styles.btnDisabled,
                      ]}
                      onPress={handlePickImage}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <ActivityIndicator
                          size="small"
                          color={COLORS.textSecondary}
                        />
                      ) : (
                        <>
                          <Upload size={16} color={COLORS.textSecondary} />
                          <Text style={styles.uploadBtnText}>Upload Image</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  {uploadError ? (
                    <Text style={styles.errorText}>{uploadError}</Text>
                  ) : null}
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
                  style={[
                    styles.submitBtn,
                    (isLoading || uploadingImage) && styles.btnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isLoading || uploadingImage}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {transaction ? 'Update Transaction' : 'Save Transaction'}
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
  typeTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
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
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  receiptPreview: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  receiptImg: {
    width: '100%',
    height: '100%',
  },
  removeReceiptBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surface,
  },
  uploadBtnText: {
    fontSize: 13,
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

export default TransactionFormModal;
