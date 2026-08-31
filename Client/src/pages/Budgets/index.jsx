import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBudgets, deleteBudget, fetchBudgetGuardrails } from '../../store/budgetSlice';
import { fetchCategories } from '../../store/categorySlice';
import BudgetFormModal from './BudgetFormModal';
import Pagination from '../../components/Pagination';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, TrendingUp, Target, Zap, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
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
  const { budgets, guardrails, isLoading } = useSelector((state) => state.budgets);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    dispatch(fetchBudgets());
    dispatch(fetchCategories());
    dispatch(fetchBudgetGuardrails());
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
    dispatch(fetchBudgets());
    dispatch(fetchBudgetGuardrails());
  };

  const pagedBudgets = useMemo(() => {
    if (pageSize === 'all') return budgets;
    const start = (currentPage - 1) * pageSize;
    return budgets.slice(start, start + pageSize);
  }, [budgets, currentPage, pageSize]);


  // Summary numbers
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const overBudgetCount = budgets.filter(b => b.isOverBudget).length;
  const criticalAlerts = guardrails?.alerts?.filter(a => a.status === 'exceeded') || [];
  const warningAlerts = guardrails?.alerts?.filter(a => a.status === 'near_limit') || [];

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Budgets &amp; Guardrails</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Event-driven threshold alerts, real-time overspend guards, and category limits.</p>
        </div>
        <button
          onClick={() => { setEditingBudget(null); setIsModalOpen(true); }}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Budget
        </button>
      </div>

      {/* ⚡ Autonomous Budget Guardrails Status Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Zap className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="text-sm font-bold text-indigo-950">Event-Driven Budget Guardrails Active</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Live Interceptor</span>
            </div>
            <p className="text-xs text-indigo-800/80 mt-0.5">
              Capise automatically intercepts every recorded transaction or bank import in real time, alerting you the instant you cross custom category thresholds.
            </p>
          </div>
        </div>
      </div>

      {/* Active Threshold Breaches List (if any) */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="mb-6 space-y-2">
          {criticalAlerts.map((a) => (
            <div key={a._id} className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs sm:text-sm text-rose-900 shadow-2xs">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>
                  <strong>{a.name}</strong> has exceeded limit by <strong>{formatCurrency(a.spent - a.limit)}</strong> ({a.percentage}% used).
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                Critical
              </span>
            </div>
          ))}
          {warningAlerts.map((a) => (
            <div key={a._id} className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs sm:text-sm text-amber-900 shadow-2xs">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>{a.name}</strong> reached <strong>{a.percentage}%</strong> of budget ({formatCurrency(a.remaining)} remaining).
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                Threshold {a.threshold}%
              </span>
            </div>
          ))}
        </div>
      )}

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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pagedBudgets.map((budget) => {
              const pct = budget.percentage || 0;
              const categoryIcon = budget.category?.icon || 'Tag';
              const IconComponent = Icons[categoryIcon] || Icons['Tag'];

              return (
                <div
                  key={budget._id}
                  className={`bg-white rounded-xl shadow-sm border p-5 transition ${budget.isOverBudget ? 'border-red-200' : budget.isNearLimit ? 'border-orange-200' : 'border-gray-100'}`}
                >
                  {/* Budget Header */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="p-2.5 rounded-xl flex-shrink-0"
                        style={{ backgroundColor: `${budget.category?.color || '#3b82f6'}20` }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: budget.category?.color || '#3b82f6' }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{budget.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{PERIOD_LABELS[budget.period]} · {budget.category?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {budget.isOverBudget && (
                        <span className="text-[11px] sm:text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />Over
                        </span>
                      )}
                      {budget.isNearLimit && !budget.isOverBudget && (
                        <span className="text-[11px] sm:text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                          {pct}% used
                        </span>
                      )}
                      <button onClick={() => handleEdit(budget)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(budget._id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <ProgressBar percentage={pct} isOverBudget={budget.isOverBudget} isNearLimit={budget.isNearLimit} />

                  {/* Spend Info */}
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`text-sm sm:text-base font-bold ${budget.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(budget.spent || 0)}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-400"> / {formatCurrency(budget.limit)}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs sm:text-sm font-semibold block ${budget.isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                        {budget.isOverBudget
                          ? `${formatCurrency((budget.spent || 0) - budget.limit)} over`
                          : `${formatCurrency(budget.remaining || 0)} left`
                        }
                      </span>
                      <p className="text-[11px] sm:text-xs text-gray-400">{pct}% used</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            className="rounded-xl border border-gray-100"
            currentPage={currentPage}
            totalItems={budgets.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[4, 6, 12, 'all']}
            itemLabel="budgets"
          />
        </div>
      )}


      <BudgetFormModal isOpen={isModalOpen} onClose={handleModalClose} budget={editingBudget} />
    </div>
  );
};

export default Budgets;
