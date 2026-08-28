import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { createRecurringRule, updateRecurringRule } from '../../store/recurringSlice';
import { X, Loader2 } from 'lucide-react';

const ruleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['Income', 'Expense', 'Transfer']),
  amount: z.coerce.number().min(0.01, 'Amount must be > 0'),
  account: z.string().min(1, 'Account is required'),
  toAccount: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  merchant: z.string().optional(),
  notes: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  nextRunDate: z.string().min(1, 'Next due date is required'),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  autoPost: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.type === 'Transfer' && !data.toAccount) {
    ctx.addIssue({ path: ['toAccount'], message: 'Destination account required for transfers', code: z.ZodIssueCode.custom });
  }
});

const RecurringFormModal = ({ isOpen, onClose, rule = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.recurring);
  const { accounts } = useSelector((state) => state.accounts);
  const { categories } = useSelector((state) => state.categories);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: '',
      type: 'Expense',
      amount: '',
      account: '',
      toAccount: '',
      category: '',
      merchant: '',
      notes: '',
      frequency: 'monthly',
      nextRunDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true,
      autoPost: false,
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (rule) {
      reset({
        name: rule.name,
        type: rule.type,
        amount: rule.amount,
        account: rule.account?._id || rule.account,
        toAccount: rule.toAccount?._id || rule.toAccount || '',
        category: rule.category?._id || rule.category || '',
        merchant: rule.merchant || '',
        notes: rule.notes || '',
        frequency: rule.frequency,
        nextRunDate: new Date(rule.nextRunDate).toISOString().split('T')[0],
        endDate: rule.endDate ? new Date(rule.endDate).toISOString().split('T')[0] : '',
        isActive: rule.isActive,
        autoPost: rule.autoPost,
      });
    } else {
      reset({
        name: '',
        type: 'Expense',
        amount: '',
        account: accounts.length > 0 ? accounts[0]._id : '',
        toAccount: '',
        category: '',
        merchant: '',
        notes: '',
        frequency: 'monthly',
        nextRunDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isActive: true,
        autoPost: false,
      });
    }
  }, [rule, reset, isOpen, accounts]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        toAccount: data.type === 'Transfer' ? data.toAccount : null,
        category: data.type !== 'Transfer' ? data.category || null : null,
        endDate: data.endDate || null,
      };

      if (rule) {
        await dispatch(updateRecurringRule({ id: rule._id, data: payload })).unwrap();
      } else {
        await dispatch(createRecurringRule(payload)).unwrap();
      }
      onClose();
    } catch (e) {}
  };

  if (!isOpen) return null;

  const expenseCategories = categories.filter(c => c.type === 'Expense' && !c.parent);
  const incomeCategories = categories.filter(c => c.type === 'Income' && !c.parent);
  const visibleCategories = selectedType === 'Income' ? incomeCategories : expenseCategories;
  const activeAccounts = accounts.filter(a => !a.isArchived);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {rule ? 'Edit Recurring Rule' : 'New Recurring Rule'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Rule Name</label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Monthly Rent, Salary Credit"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {/* Type Tabs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {['Expense', 'Income', 'Transfer'].map((t) => (
                <label key={t} className={`flex-1 py-2 text-sm font-medium rounded-md text-center cursor-pointer transition ${selectedType === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                  <input type="radio" {...register('type')} value={t} className="hidden" />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
              <input
                {...register('amount')}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Frequency</label>
              <select
                {...register('frequency')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {selectedType === 'Transfer' ? 'From Account' : 'Account'}
              </label>
              <select
                {...register('account')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                {activeAccounts.map(a => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
              {errors.account && <p className="mt-1 text-sm text-red-600">{errors.account.message}</p>}
            </div>

            {selectedType === 'Transfer' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">To Account</label>
                <select
                  {...register('toAccount')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  {activeAccounts.map(a => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
                {errors.toAccount && <p className="mt-1 text-sm text-red-600">{errors.toAccount.message}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  {...register('category')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">None</option>
                  {visibleCategories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Merchant / Payee</label>
            <input
              {...register('merchant')}
              type="text"
              placeholder="e.g. Netflix, Landlord"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Next Due Date</label>
              <input
                {...register('nextRunDate')}
                type="date"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.nextRunDate && <p className="mt-1 text-sm text-red-600">{errors.nextRunDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
              <input
                {...register('endDate')}
                type="date"
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

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input type="checkbox" {...register('isActive')} className="mr-2 rounded" />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" {...register('autoPost')} className="mr-2 rounded" />
              <span className="text-sm text-gray-700">Auto-post on due date</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 space-x-3 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {rule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecurringFormModal;
