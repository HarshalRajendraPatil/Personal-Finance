import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { createTransaction, updateTransaction, scanReceipt } from '../../store/transactionSlice';
import { fetchBudgets } from '../../store/budgetSlice';
import { suggestCategoryForInput } from '../../utils/merchantCategorizer';
import { Loader2, X, Upload, Image as ImageIcon, Zap, AlertTriangle, AlertCircle, CheckCircle, Sparkles, ScanLine } from 'lucide-react';
import axios from 'axios';

// 3MB = 3 * 1024 * 1024
const MAX_FILE_SIZE = 3145728;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const transactionSchema = z.object({
  type: z.enum(['Income', 'Expense', 'Transfer']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  account: z.string().min(1, 'Account is required'),
  toAccount: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  merchant: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(), // Will split by comma on submit
}).superRefine((data, ctx) => {
  if (data.type === 'Transfer' && !data.toAccount) {
    ctx.addIssue({ path: ['toAccount'], message: 'Destination account is required for transfers', code: z.ZodIssueCode.custom });
  }
  if (data.type === 'Transfer' && data.account === data.toAccount) {
    ctx.addIssue({ path: ['toAccount'], message: 'Cannot transfer to the same account', code: z.ZodIssueCode.custom });
  }
  if (data.type !== 'Transfer' && !data.category) {
    ctx.addIssue({ path: ['category'], message: 'Category is required', code: z.ZodIssueCode.custom });
  }
});

const TransactionFormModal = ({ isOpen, onClose, transaction = null }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.transactions);
  const { accounts } = useSelector((state) => state.accounts);
  const { categories } = useSelector((state) => state.categories);
  const { budgets } = useSelector((state) => state.budgets);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrSuccessData, setOcrSuccessData] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [suggestion, setSuggestion] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'Expense',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      account: '',
      toAccount: '',
      category: '',
      subcategory: '',
      merchant: '',
      notes: '',
      tags: '',
    },
  });

  const selectedType = watch('type');
  const selectedCategory = watch('category');
  const watchedMerchant = watch('merchant');
  const watchedNotes = watch('notes');
  const watchedAmount = parseFloat(watch('amount') || 0);

  useEffect(() => {
    if (isOpen && budgets.length === 0) {
      dispatch(fetchBudgets());
    }
  }, [isOpen, budgets.length, dispatch]);

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        date: new Date(transaction.date).toISOString().split('T')[0],
        account: transaction.account?._id || transaction.account,
        toAccount: transaction.toAccount?._id || transaction.toAccount || '',
        category: transaction.category?._id || transaction.category || '',
        subcategory: transaction.subcategory?._id || transaction.subcategory || '',
        merchant: transaction.merchant || '',
        notes: transaction.notes || '',
        tags: transaction.tags ? transaction.tags.join(', ') : '',
      });
      setAttachmentUrl(transaction.attachmentUrl || '');
    } else {
      reset({
        type: 'Expense',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        account: accounts.length > 0 ? accounts[0]._id : '',
        toAccount: '',
        category: '',
        subcategory: '',
        merchant: '',
        notes: '',
        tags: '',
      });
      setAttachmentUrl('');
    }
    setUploadError('');
    setSuggestion(null);
    setOcrSuccessData(null);
  }, [transaction, reset, isOpen, accounts]);

  // ⚡ Live Heuristic Merchant Auto-Categorization Detection
  useEffect(() => {
    if (selectedType === 'Transfer') {
      setSuggestion(null);
      return;
    }
    const textToAnalyze = `${watchedMerchant || ''} ${watchedNotes || ''}`.trim();
    if (textToAnalyze.length >= 2) {
      const match = suggestCategoryForInput(textToAnalyze, categories);
      if (match && match.categoryId) {
        setSuggestion(match);
      } else {
        setSuggestion(null);
      }
    } else {
      setSuggestion(null);
    }
  }, [watchedMerchant, watchedNotes, categories, selectedType]);

  const applyCategorySuggestion = () => {
    if (!suggestion) return;
    if (suggestion.type && suggestion.type !== selectedType) {
      setValue('type', suggestion.type);
    }
    if (suggestion.categoryId) {
      setValue('category', suggestion.categoryId);
    }
    if (suggestion.subcategoryId) {
      setValue('subcategory', suggestion.subcategoryId);
    }
    setSuggestion(null);
  };

  // ⚡ Live Event-Driven Budget Guardrails Simulation
  const budgetGuardrail = useMemo(() => {
    if (selectedType !== 'Expense' || !selectedCategory || !watchedAmount || watchedAmount <= 0) {
      return null;
    }
    const budget = budgets.find((b) => {
      const bCatId = b.category?._id || b.category;
      return bCatId && bCatId.toString() === selectedCategory.toString() && b.isActive;
    });
    if (!budget) return null;

    const currentSpent = budget.spent || 0;
    const projectedTotal = currentSpent + watchedAmount;
    const limit = budget.limit || 1;
    const projectedPct = Math.round((projectedTotal / limit) * 100);
    const threshold = budget.alertThreshold || 80;

    if (projectedTotal > limit) {
      return {
        level: 'critical',
        budgetName: budget.name,
        limit,
        projectedTotal,
        overspentBy: projectedTotal - limit,
        projectedPct,
        message: `🚨 Critical: This ₹${watchedAmount.toLocaleString('en-IN')} expense will exceed your "${budget.name}" budget by ₹${(projectedTotal - limit).toLocaleString('en-IN')} (${projectedPct}% used)!`,
      };
    } else if (projectedPct >= threshold) {
      const remaining = limit - projectedTotal;
      return {
        level: 'warning',
        budgetName: budget.name,
        limit,
        projectedTotal,
        remaining,
        projectedPct,
        message: `⚠️ Budget Warning: This expense will push "${budget.name}" to ${projectedPct}% of its limit (₹${remaining.toLocaleString('en-IN')} headroom left).`,
      };
    }

    return {
      level: 'ok',
      budgetName: budget.name,
      projectedPct,
      remaining: limit - projectedTotal,
      message: `✓ Within Budget: ${projectedPct}% used after this transaction (₹${(limit - projectedTotal).toLocaleString('en-IN')} remaining).`,
    };
  }, [selectedType, selectedCategory, watchedAmount, budgets]);

  // ⚡ Image Upload with Autonomous AI Receipt & Invoice OCR Scanning
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size must be strictly less than 3MB');
      return;
    }

    setUploadingImage(true);
    setIsOcrScanning(true);
    setUploadError('');
    setOcrSuccessData(null);

    // Read base64 for immediate OCR processing
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;

      try {
        // Trigger AI OCR Scan
        const scanRes = await dispatch(
          scanReceipt({ imageBase64: base64Data, textContent: file.name })
        ).unwrap();

        if (scanRes && scanRes.success) {
          if (scanRes.merchant && !watch('merchant')) {
            setValue('merchant', scanRes.merchant);
          }
          if (scanRes.amount > 0 && (!watch('amount') || watch('amount') === '0')) {
            setValue('amount', scanRes.amount);
          }
          if (scanRes.date) {
            setValue('date', scanRes.date);
          }
          if (scanRes.categoryId && !watch('category')) {
            setValue('category', scanRes.categoryId);
            if (scanRes.subcategoryId) {
              setValue('subcategory', scanRes.subcategoryId);
            }
          }
          if (scanRes.notes && !watch('notes')) {
            setValue('notes', scanRes.notes);
          }
          setOcrSuccessData(scanRes);
        }
      } catch (ocrErr) {
        console.warn('AI OCR scan error:', ocrErr);
      } finally {
        setIsOcrScanning(false);
      }
    };
    reader.readAsDataURL(file);

    // Cloudinary Storage Upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await axios.post(CLOUDINARY_URL, formData);
      setAttachmentUrl(res.data.secure_url);
    } catch (err) {
      console.warn('Cloudinary upload warning:', err);
    } finally {
      setUploadingImage(false);
    }
  };


  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        attachmentUrl,
      };

      if (transaction) {
        await dispatch(updateTransaction({ id: transaction._id, data: payload })).unwrap();
      } else {
        await dispatch(createTransaction(payload)).unwrap();
      }
      onClose();
    } catch (err) {
      // Error handled globally
    }
  };

  if (!isOpen) return null;

  // Filter Categories
  const parentCategories = categories.filter((c) => !c.parent && c.type === selectedType);
  const subCategories = selectedCategory ? categories.filter((c) => (c.parent?._id || c.parent)?.toString() === selectedCategory) : [];

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {transaction ? 'Edit Transaction' : 'New Transaction'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Type Selector (Tabs) */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['Expense', 'Income', 'Transfer'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setValue('type', t);
                  setValue('category', '');
                  setValue('subcategory', '');
                  setValue('toAccount', '');
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${selectedType === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  {...register('amount')}
                  type="number"
                  step="0.01"
                  className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                {...register('date')}
                type="date"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {selectedType === 'Transfer' ? 'From Account' : 'Account'}
              </label>
              <select
                {...register('account')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Account</option>
                {activeAccounts.map((a) => (
                  <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>
                ))}
              </select>
              {errors.account && <p className="mt-1 text-sm text-red-600">{errors.account.message}</p>}
            </div>

            {selectedType === 'Transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">To Account</label>
                <select
                  {...register('toAccount')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Account</option>
                  {activeAccounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>
                  ))}
                </select>
                {errors.toAccount && <p className="mt-1 text-sm text-red-600">{errors.toAccount.message}</p>}
              </div>
            )}
          </div>

          {/* Category & Subcategory */}
          {selectedType !== 'Transfer' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    {suggestion && selectedCategory !== suggestion.categoryId && (
                      <button
                        type="button"
                        onClick={applyCategorySuggestion}
                        className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full transition-colors"
                      >
                        <Zap className="w-3 h-3 mr-1 fill-indigo-600" />
                        Auto-suggest: {suggestion.categoryName}
                      </button>
                    )}
                  </div>
                  <select
                    {...register('category')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {parentCategories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Subcategory</label>
                  <select
                    {...register('subcategory')}
                    disabled={!selectedCategory || subCategories.length === 0}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">None</option>
                    {subCategories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ⚡ Live Event-Driven Budget Guardrail Notification Preview */}
              {budgetGuardrail && (
                <div
                  className={`mt-2.5 p-3 rounded-lg border text-xs flex items-center space-x-2 transition-all ${
                    budgetGuardrail.level === 'critical'
                      ? 'bg-rose-50 border-rose-200 text-rose-800 font-medium'
                      : budgetGuardrail.level === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-800 font-medium'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {budgetGuardrail.level === 'critical' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  ) : budgetGuardrail.level === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  )}
                  <span>{budgetGuardrail.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Payee / Merchant & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payee / Merchant</label>
              <input
                {...register('merchant')}
                type="text"
                placeholder="e.g. Swiggy, Starbucks, Netflix, Amazon"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
              <input
                {...register('tags')}
                type="text"
                placeholder="e.g. vacation, tax-deductible"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Add optional description or memo"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Receipt Upload & AI OCR Scanning */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Receipt / Invoice Attachment (Max 3MB)
              </label>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                AI OCR Auto-Fill Enabled
              </span>
            </div>

            {/* AI OCR Extracted Banner */}
            {ocrSuccessData && (
              <div className="mb-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl text-xs flex items-center justify-between text-indigo-900 shadow-2xs">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>
                    <strong>AI OCR Auto-Filled:</strong> Extracted ₹{ocrSuccessData.amount?.toLocaleString('en-IN')} from <strong>{ocrSuccessData.merchant}</strong> on {ocrSuccessData.date} ({ocrSuccessData.categoryName || 'Expense'}).
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-200/60 px-2 py-0.5 rounded-full text-indigo-800">
                  {Math.round((ocrSuccessData.confidence || 0.9) * 100)}% Match
                </span>
              </div>
            )}

            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {attachmentUrl ? (
                  <div className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                    <img src={attachmentUrl} alt="Receipt" className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl('')}
                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-md border-2 border-dashed border-indigo-200 flex items-center justify-center bg-indigo-50/50">
                    {isOcrScanning ? (
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-indigo-400" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="flex items-center justify-center px-4 py-2 border border-indigo-200 shadow-2xs text-sm font-medium rounded-lg text-indigo-900 bg-indigo-50/40 hover:bg-indigo-50 cursor-pointer w-fit transition-all group">
                  {isOcrScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600" />
                      <span>Scanning receipt with AI...</span>
                    </>
                  ) : uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600" />
                      <span>Uploading receipt...</span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4 mr-2 text-indigo-600 group-hover:scale-110 transition-transform" />
                      <span>Upload &amp; Scan Receipt with AI</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage || isOcrScanning}
                  />
                </label>
                {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
                <p className="text-[11px] text-gray-400 mt-1">
                  Upload any photo or receipt to automatically extract merchant, date, amount, and category.
                </p>
              </div>
            </div>
          </div>


          <div className="flex justify-end pt-4 space-x-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || uploadingImage}
              className="flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> : (transaction ? 'Update Transaction' : 'Save Transaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionFormModal;

