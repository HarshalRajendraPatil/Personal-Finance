import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBudgets, deleteBudget } from '../../store/budgetSlice';
import { fetchCategories } from '../../store/categorySlice';
import BudgetFormModal from './BudgetFormModal';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, TrendingUp, Target } from 'lucide-react';
import * as Icons from 'lucide-react';

import { formatCurrency } from '../../utils/formatCurrency';

const PERIOD_LABELS = { monthly: 'This Month', weekly: 'This Week', yearly: 'This Year', custom: 'Custom' };

const ProgressBar = ({ percentage, isOverBudget, isNearLimit }) => {
  const clampedPct = Math.min(percentage, 100);
  const color = isOverBudget ? 'bg-red-500' : isNearLimit ? 'bg-orange-400' : 'bg-emerald-500';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clampedPct}%` }}
      />
    </div>
  );
};

const Budgets = () => {
  const dispatch = useDispatch();
  const { budgets, isLoading } = useSelector((state) => state.budgets);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  useEffect(() => {
    dispatch(fetchBudgets());
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this budget?')) {
      dispatch(deleteBudget(id));
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    dispatch(fetchBudgets()); // Re-fetch to get fresh spend data
  };

  // Summary numbers
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const overBudgetCount = budgets.filter(b => b.isOverBudget).length;

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Set category-level spending limits and track usage in real time.</p>
        </div>
        <button
          onClick={() => { setEditingBudget(null); setIsModalOpen(true); }}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Budget
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-xs p-5 sm:p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Budgeted</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalBudgeted)}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl"><Target className="w-6 h-6 text-blue-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Spent</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl"><TrendingUp className="w-6 h-6 text-purple-500" /></div>
          </div>
        </div>
        <div className={`rounded-xl shadow-sm p-6 border ${overBudgetCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Over Budget</p>
              <p className={`mt-1 text-2xl font-bold ${overBudgetCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${overBudgetCount > 0 ? 'bg-red-100' : 'bg-green-50'}`}>
              {overBudgetCount > 0 
                ? <AlertTriangle className="w-6 h-6 text-red-500" />
                : <CheckCircle className="w-6 h-6 text-green-500" />
              }
            </div>
          </div>
        </div>
      </div>

      {isLoading && budgets.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center bg-white rounded-xl border border-gray-200 border-dashed py-16">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No budgets yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create budgets to track your spending against limits.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {budgets.map((budget) => {
            const pct = budget.percentage || 0;
            const categoryIcon = budget.category?.icon || 'Tag';
            const IconComponent = Icons[categoryIcon] || Icons['Tag'];

            return (
              <div
                key={budget._id}
                className={`bg-white rounded-xl shadow-sm border p-5 transition ${budget.isOverBudget ? 'border-red-200' : budget.isNearLimit ? 'border-orange-200' : 'border-gray-100'}`}
              >
                {/* Budget Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="p-2.5 rounded-xl flex-shrink-0"
                      style={{ backgroundColor: `${budget.category?.color || '#3b82f6'}20` }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: budget.category?.color || '#3b82f6' }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{budget.name}</h3>
                      <p className="text-xs text-gray-500">{PERIOD_LABELS[budget.period]} · {budget.category?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {budget.isOverBudget && (
                      <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />Over
                      </span>
                    )}
                    {budget.isNearLimit && !budget.isOverBudget && (
                      <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                        {pct}% used
                      </span>
                    )}
                    <button onClick={() => handleEdit(budget)} className="p-1 text-gray-400 hover:text-blue-600 transition">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(budget._id)} className="p-1 text-gray-400 hover:text-red-600 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <ProgressBar percentage={pct} isOverBudget={budget.isOverBudget} isNearLimit={budget.isNearLimit} />

                {/* Spend Info */}
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className={`text-base font-bold ${budget.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(budget.spent || 0)}
                    </span>
                    <span className="text-sm text-gray-400"> / {formatCurrency(budget.limit)}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${budget.isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                      {budget.isOverBudget
                        ? `${formatCurrency((budget.spent || 0) - budget.limit)} over`
                        : `${formatCurrency(budget.remaining || 0)} left`
                      }
                    </span>
                    <p className="text-xs text-gray-400">{pct}% used</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BudgetFormModal isOpen={isModalOpen} onClose={handleModalClose} budget={editingBudget} />
    </div>
  );
};

export default Budgets;
