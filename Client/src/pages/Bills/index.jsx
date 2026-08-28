import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRecurringRules, deleteRecurringRule, payBill, updateRecurringRule } from '../../store/recurringSlice';
import { fetchAccounts } from '../../store/accountSlice';
import { fetchCategories } from '../../store/categorySlice';
import RecurringFormModal from './RecurringFormModal';
import {
  Plus, Edit2, Trash2, CheckCircle2, Pause, Play,
  ArrowRightLeft, TrendingDown, TrendingUp, Calendar, AlertCircle
} from 'lucide-react';

import { formatCurrency } from '../../utils/formatCurrency';

const FREQ_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

const getDaysUntilDue = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const DueBadge = ({ daysLeft }) => {
  if (daysLeft < 0) return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</span>;
  if (daysLeft === 0) return <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">Due Today</span>;
  if (daysLeft <= 7) return <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">In {daysLeft}d</span>;
  return <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{new Date(new Date().setDate(new Date().getDate() + daysLeft)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>;
};

const Bills = () => {
  const dispatch = useDispatch();
  const { rules, isLoading } = useSelector((state) => state.recurring);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    dispatch(fetchRecurringRules());
    dispatch(fetchAccounts());
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this recurring rule?')) {
      dispatch(deleteRecurringRule(id));
    }
  };

  const handleToggleActive = (rule) => {
    dispatch(updateRecurringRule({ id: rule._id, data: { ...rule, account: rule.account?._id, category: rule.category?._id, isActive: !rule.isActive } }));
  };

  const handlePayNow = (rule) => {
    if (window.confirm(`Mark "${rule.name}" as paid now? This will create a transaction and advance the next due date.`)) {
      dispatch(payBill({ id: rule._id, data: {} })).then(() => {
        dispatch(fetchAccounts()); // Refresh balances
      });
    }
  };

  const filtered = filterType === 'All' ? rules : rules.filter(r => r.type === filterType);
  const active = filtered.filter(r => r.isActive);
  const paused = filtered.filter(r => !r.isActive);

  // Summary stats
  const totalMonthlyExpenses = rules
    .filter(r => r.isActive && r.type === 'Expense')
    .reduce((sum, r) => {
      if (r.frequency === 'monthly') return sum + r.amount;
      if (r.frequency === 'weekly') return sum + r.amount * 4.33;
      if (r.frequency === 'yearly') return sum + r.amount / 12;
      if (r.frequency === 'daily') return sum + r.amount * 30;
      return sum;
    }, 0);

  const totalMonthlyIncome = rules
    .filter(r => r.isActive && r.type === 'Income')
    .reduce((sum, r) => {
      if (r.frequency === 'monthly') return sum + r.amount;
      if (r.frequency === 'weekly') return sum + r.amount * 4.33;
      if (r.frequency === 'yearly') return sum + r.amount / 12;
      if (r.frequency === 'daily') return sum + r.amount * 30;
      return sum;
    }, 0);

  const upcomingThisWeek = rules.filter(r => r.isActive && getDaysUntilDue(r.nextRunDate) <= 7 && getDaysUntilDue(r.nextRunDate) >= 0);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bills & Recurring</h1>
          <p className="mt-1 text-sm text-gray-500">Track recurring income, expenses, subscriptions, and EMIs.</p>
        </div>
        <button
          onClick={() => { setEditingRule(null); setIsModalOpen(true); }}
          className="mt-4 sm:mt-0 flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Outflow</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(totalMonthlyExpenses)}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl"><TrendingDown className="w-6 h-6 text-red-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Inflow</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(totalMonthlyIncome)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl"><TrendingUp className="w-6 h-6 text-green-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Due This Week</p>
              <p className="mt-1 text-2xl font-bold text-orange-600">{upcomingThisWeek.length} bills</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl"><Calendar className="w-6 h-6 text-orange-500" /></div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex space-x-2 mb-6">
        {['All', 'Expense', 'Income', 'Transfer'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${filterType === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && rules.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : active.length === 0 && paused.length === 0 ? (
        <div className="text-center bg-white rounded-xl border border-gray-200 border-dashed py-16">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No recurring rules</h3>
          <p className="mt-1 text-sm text-gray-500">Add salary, rent, EMIs, or subscriptions to track them.</p>
        </div>
      ) : (
        <>
          {/* Active Rules */}
          {active.length > 0 && (
            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100 mb-6">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Active ({active.length})</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {active.sort((a, b) => getDaysUntilDue(a.nextRunDate) - getDaysUntilDue(b.nextRunDate)).map((rule) => {
                  const daysLeft = getDaysUntilDue(rule.nextRunDate);
                  return (
                    <li key={rule._id} className="p-5 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`flex-shrink-0 p-2.5 rounded-xl ${rule.type === 'Income' ? 'bg-green-50' : rule.type === 'Transfer' ? 'bg-blue-50' : 'bg-red-50'}`}>
                            {rule.type === 'Income' ? <TrendingUp className="w-5 h-5 text-green-500" /> : rule.type === 'Transfer' ? <ArrowRightLeft className="w-5 h-5 text-blue-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-gray-900">{rule.name}</span>
                              <DueBadge daysLeft={daysLeft} />
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5 text-xs text-gray-500">
                              <span>{FREQ_LABELS[rule.frequency]}</span>
                              {rule.category && <><span>·</span><span>{rule.category.name}</span></>}
                              {rule.merchant && <><span>·</span><span>{rule.merchant}</span></>}
                              {rule.account && <><span>·</span><span>{rule.account.name}</span></>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`text-base font-bold ${rule.type === 'Income' ? 'text-green-600' : rule.type === 'Expense' ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatCurrency(rule.amount)}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handlePayNow(rule)}
                              title="Mark as Paid"
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleToggleActive(rule)} title="Pause" className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition">
                              <Pause className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEdit(rule)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(rule._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Paused Rules */}
          {paused.length > 0 && (
            <div className="bg-gray-50 shadow-sm rounded-xl overflow-hidden border border-gray-200 opacity-75">
              <div className="px-6 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Paused ({paused.length})</h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {paused.map((rule) => (
                  <li key={rule._id} className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 p-2.5 rounded-xl bg-gray-100">
                          {rule.type === 'Income' ? <TrendingUp className="w-5 h-5 text-gray-400" /> : <TrendingDown className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">{rule.name}</span>
                          <p className="text-xs text-gray-400">{FREQ_LABELS[rule.frequency]} · {formatCurrency(rule.amount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleToggleActive(rule)} title="Resume" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition">
                          <Play className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(rule._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <RecurringFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} rule={editingRule} />
    </div>
  );
};

export default Bills;
