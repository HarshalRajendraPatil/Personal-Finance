import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { createAccount, updateAccount } from '../../store/accountSlice';
import { Loader2, X } from 'lucide-react';

const accountSchema = z.object({
  name: z.string().min(2, 'Account name must be at least 2 characters'),
  type: z.enum(['Bank', 'Cash', 'Credit Card', 'UPI', 'FD', 'Other']),
  openingBalance: z.coerce.number({ invalid_type_error: "Must be a number" }),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
  creditLimit: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || isNaN(Number(val)) ? null : Number(val)),
    z.number().min(0, 'Credit limit cannot be negative').nullable().optional()
  ),
  issuer: z.string().optional(),
  last4Digits: z.string().optional(),
  billingCycleDay: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || isNaN(Number(val)) ? null : Number(val)),
    z.number().min(1).max(31).nullable().optional()
  ),
  paymentDueDay: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || isNaN(Number(val)) ? null : Number(val)),
    z.number().min(1).max(31).nullable().optional()
  ),
});

const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
];

const ACCOUNT_TYPES = ['Bank', 'Cash', 'Credit Card', 'UPI', 'FD', 'Other'];

const AccountFormModal = ({ isOpen, onClose, account = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.accounts);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'Bank',
      openingBalance: 0,
      currency: 'INR',
      notes: '',
      creditLimit: '',
      issuer: '',
      last4Digits: '',
      billingCycleDay: '',
      paymentDueDay: '',
    },
  });

  const selectedType = watch('type');

  // Reset form when modal opens or account changes
  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        type: account.type,
        openingBalance: account.openingBalance,
        currency: account.currency || 'INR',
        notes: account.notes || '',
        creditLimit: account.type === 'Credit Card' && account.creditLimit !== null && account.creditLimit !== undefined ? account.creditLimit : '',
        issuer: account.issuer || '',
        last4Digits: account.last4Digits || '',
        billingCycleDay: account.billingCycleDay || '',
        paymentDueDay: account.paymentDueDay || '',
      });
    } else {
      reset({
        name: '',
        type: 'Bank',
        openingBalance: 0,
        currency: 'INR',
        notes: '',
        creditLimit: '',
        issuer: '',
        last4Digits: '',
        billingCycleDay: '',
        paymentDueDay: '',
      });
    }
  }, [account, reset, isOpen]);

  const onSubmit = async (data) => {
    try {
      const isCreditCard = data.type === 'Credit Card';
      const cleanData = {
        name: data.name.trim(),
        type: data.type,
        openingBalance: Number(data.openingBalance) || 0,
        currency: data.currency || 'INR',
        notes: data.notes || '',
        creditLimit: isCreditCard && data.creditLimit !== null && data.creditLimit !== undefined && data.creditLimit !== '' && !isNaN(Number(data.creditLimit))
          ? Math.max(0, Number(data.creditLimit))
          : null,
        issuer: isCreditCard ? (data.issuer?.trim() || '') : '',
        last4Digits: isCreditCard ? (data.last4Digits?.trim() || '') : '',
        billingCycleDay: isCreditCard && data.billingCycleDay ? parseInt(data.billingCycleDay, 10) : null,
        paymentDueDay: isCreditCard && data.paymentDueDay ? parseInt(data.paymentDueDay, 10) : null,
      };

      if (account) {
        await dispatch(updateAccount({ id: account._id, accountData: cleanData })).unwrap();
      } else {
        await dispatch(createAccount(cleanData)).unwrap();
      }
      onClose();
    } catch (err) {
      // Error is handled by Redux state
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {account ? 'Edit Account' : 'Add New Account'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Account Name</label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. HDFC Salary, Regalia Credit Card"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Type</label>
              <select
                {...register('type')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {ACCOUNT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <select
                {...register('currency')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code}>{curr.label}</option>
                ))}
              </select>
              {errors.currency && <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>}
            </div>
          </div>

          {/* Credit Card Specific Fields */}
          {selectedType === 'Credit Card' && (
            <div className="p-4 bg-purple-50 rounded-xl space-y-3 border border-purple-100">
              <p className="text-xs font-bold text-purple-900 uppercase tracking-wider">Credit Card Details</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Card Issuer</label>
                  <input
                    {...register('issuer')}
                    type="text"
                    placeholder="e.g. HDFC, ICICI, SBI"
                    className="mt-1 block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Last 4 Digits</label>
                  <input
                    {...register('last4Digits')}
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4321"
                    className="mt-1 block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Total Credit Limit (₹)</label>
                <input
                  {...register('creditLimit')}
                  type="number"
                  placeholder="e.g. 100000"
                  className="mt-1 block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-purple-500 focus:border-purple-500"
                />
                {errors.creditLimit && <p className="mt-1 text-xs text-red-600">{errors.creditLimit.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Statement Day (1-31)</label>
                  <input
                    {...register('billingCycleDay')}
                    type="number"
                    min={1}
                    max={31}
                    placeholder="e.g. 15"
                    className="mt-1 block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Payment Due Day (1-31)</label>
                  <input
                    {...register('paymentDueDay')}
                    type="number"
                    min={1}
                    max={31}
                    placeholder="e.g. 5"
                    className="mt-1 block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Opening Balance
              {selectedType === 'Credit Card' ? ' (Negative for existing debt, e.g. -5000)' : ''}
            </label>
            <input
              {...register('openingBalance')}
              type="number"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.openingBalance && <p className="mt-1 text-sm text-red-600">{errors.openingBalance.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 space-x-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Saving...
                </>
              ) : (
                account ? 'Update Account' : 'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountFormModal;
