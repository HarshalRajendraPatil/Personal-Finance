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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'Bank',
      openingBalance: 0,
      currency: 'INR',
      notes: '',
    },
  });

  // Reset form when modal opens or account changes
  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        type: account.type,
        openingBalance: account.openingBalance,
        currency: account.currency || 'INR',
        notes: account.notes || '',
      });
    } else {
      reset({
        name: '',
        type: 'Bank',
        openingBalance: 0,
        currency: 'INR',
        notes: '',
      });
    }
  }, [account, reset, isOpen]);

  const onSubmit = async (data) => {
    try {
      if (account) {
        await dispatch(updateAccount({ id: account._id, accountData: data })).unwrap();
      } else {
        await dispatch(createAccount(data)).unwrap();
      }
      onClose(); // Close modal on success
    } catch (err) {
      // Error is handled by Redux state and displayed below
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-lg p-6">
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
              placeholder="e.g. HDFC Salary, Travel Credit Card"
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

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Opening Balance
              {register('type').value === 'Credit Card' && ' (Use negative for debt)'}
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

          <div className="flex justify-end pt-4 space-x-3">
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
