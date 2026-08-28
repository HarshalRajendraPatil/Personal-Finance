import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { createBudget, updateBudget } from '../../store/budgetSlice';
import { X, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const budgetSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  period: z.enum(['monthly', 'weekly', 'yearly', 'custom']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(0.01, 'Limit must be > 0'),
  alertThreshold: z.coerce.number().min(1).max(100).default(80),
  rollover: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.period === 'custom' && !data.startDate) {
    ctx.addIssue({ path: ['startDate'], message: 'Start date required for custom period', code: z.ZodIssueCode.custom });
  }
  if (data.period === 'custom' && !data.endDate) {
    ctx.addIssue({ path: ['endDate'], message: 'End date required for custom period', code: z.ZodIssueCode.custom });
  }
});

const BudgetFormModal = ({ isOpen, onClose, budget = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.budgets);
  const { categories } = useSelector((state) => state.categories);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      category: '',
      period: 'monthly',
      startDate: '',
      endDate: '',
      limit: '',
      alertThreshold: 80,
      rollover: false,
    }
  });

  const selectedPeriod = watch('period');

  useEffect(() => {
    if (budget) {
      reset({
        name: budget.name,
        category: budget.category?._id || budget.category,
        period: budget.period,
        startDate: budget.startDate ? new Date(budget.startDate).toISOString().split('T')[0] : '',
        endDate: budget.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : '',
        limit: budget.limit,
        alertThreshold: budget.alertThreshold,
        rollover: budget.rollover,
      });
    } else {
      reset({ name: '', category: '', period: 'monthly', startDate: '', endDate: '', limit: '', alertThreshold: 80, rollover: false });
    }
  }, [budget, reset, isOpen]);

  const onSubmit = async (data) => {
    try {
      if (budget) {
        await dispatch(updateBudget({ id: budget._id, data })).unwrap();
      } else {
        await dispatch(createBudget(data)).unwrap();
      }
      onClose();
    } catch (e) {}
  };

  if (!isOpen) return null;

  const expenseCategories = categories.filter(c => c.type === 'Expense' && !c.parent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {budget ? 'Edit Budget' : 'New Budget'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Budget Name</label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Monthly Groceries"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              {...register('category')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Expense Category</option>
              {expenseCategories.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Period</label>
              <select
                {...register('period')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Budget Limit (₹)</label>
              <input
                {...register('limit')}
                type="number"
                step="0.01"
                placeholder="e.g. 5000"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.limit && <p className="mt-1 text-sm text-red-600">{errors.limit.message}</p>}
            </div>
          </div>

          {selectedPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input type="date" {...register('startDate')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input type="date" {...register('endDate')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alert Threshold: <span className="font-bold text-blue-600">{watch('alertThreshold')}%</span>
            </label>
            <input
              {...register('alertThreshold')}
              type="range"
              min="10"
              max="100"
              step="5"
              className="mt-2 block w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" {...register('rollover')} className="rounded" />
            <span className="text-sm text-gray-700">Rollover unused budget to next period</span>
          </label>

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
              {budget ? 'Update Budget' : 'Create Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetFormModal;
