import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { createTransaction, updateTransaction } from '../../store/transactionSlice';
import { Loader2, X, Upload, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

// 3MB = 3 * 1024 * 1024
const MAX_FILE_SIZE = 3145728;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
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

  const [uploadingImage, setUploadingImage] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadError, setUploadError] = useState('');

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
  }, [transaction, reset, isOpen, accounts]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size must be strictly less than 3MB');
      return;
    }

    setUploadingImage(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await axios.post(CLOUDINARY_URL, formData);
      setAttachmentUrl(res.data.secure_url);
    } catch (err) {
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
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
  const parentCategories = categories.filter(c => !c.parent && c.type === selectedType);
  const subCategories = selectedCategory ? categories.filter(c => c.parent === selectedCategory) : [];

  const activeAccounts = accounts.filter(a => !a.isArchived);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {transaction ? 'Edit Transaction' : 'New Transaction'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

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
                {activeAccounts.map(a => (
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
                  {activeAccounts.map(a => (
                    <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>
                  ))}
                </select>
                {errors.toAccount && <p className="mt-1 text-sm text-red-600">{errors.toAccount.message}</p>}
              </div>
            )}
          </div>

          {selectedType !== 'Transfer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  {...register('category')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Category</option>
                  {parentCategories.map(c => (
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
                  {subCategories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payee / Merchant</label>
              <input
                {...register('merchant')}
                type="text"
                placeholder="e.g. Amazon, Starbucks"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Receipt / Attachment (Max 3MB)</label>
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
                  <div className="w-16 h-16 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-fit">
                  {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
                {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
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
