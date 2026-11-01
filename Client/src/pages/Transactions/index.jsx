import { useEffect, useState, useMemo, Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTransactions, deleteTransaction, clearBudgetAlert } from '../../store/transactionSlice';
import { fetchAccounts } from '../../store/accountSlice';
import { fetchCategories } from '../../store/categorySlice';
import { fetchLendings } from '../../store/lendingSlice';
import TransactionFormModal from './TransactionFormModal';
import CSVImporterModal from '../../components/CSVImporterModal';
import Pagination from '../../components/Pagination';
import CapiseLoader from '../../components/ui/CapiseLoader';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';

import {
  Plus,
  Search,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  SlidersHorizontal,
  X,
  Paperclip,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Layers,
  Clock,
  RotateCcw,
} from 'lucide-react';

import { formatCurrency } from '../../utils/formatCurrency';
import { useTheme } from '../../context/ThemeContext';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const Transactions = () => {
  const { isDark } = useTheme();
  const dispatch = useDispatch();
  const { transactions, isLoading, lastBudgetAlert } = useSelector((state) => state.transactions);
  const { accounts } = useSelector((state) => state.accounts);
  const { categories } = useSelector((state) => state.categories);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ⚡ Default Sorting: Descending by Time of Creation
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  // ⚡ Grouping State: 'none' | 'category' | 'account' | 'type' | 'month' | 'date'
  const [groupBy, setGroupBy] = useState('none');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // ⚡ Pagination & Windowing state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [filters, setFilters] = useState({
    search: '',
    type: 'All',
    account: '',
    category: '',
    subcategory: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });

  // ⚡ Available subcategories for the currently selected parent category
  const subcategories = useMemo(() => {
    if (!filters.category) return [];
    return categories.filter(
      (c) => (c.parent?._id || c.parent)?.toString() === filters.category
    );
  }, [categories, filters.category]);

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && v !== 'All').length;

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchAccounts());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Reset to page 1 whenever filters or grouping changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize, groupBy]);

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this transaction? This will automatically update your account balances.')) {
      await dispatch(deleteTransaction(id));
      dispatch(fetchAccounts()); // Refresh accounts to get updated balances
      dispatch(fetchLendings()); // Refresh lendings in case this was linked to a lending or repayment
    }
  };

  const handleAddNew = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  // Close modal and refresh accounts to reflect balance changes
  const handleModalClose = () => {
    setIsModalOpen(false);
    dispatch(fetchAccounts());
    dispatch(fetchLendings());
  };

  // ⚡ Sorting handler
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // ⚡ Group collapse toggling
  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAllGroups = () => setCollapsedGroups({});
  const collapseAllGroups = () => {
    if (!groupedData) return;
    const all = {};
    for (const g of groupedData) {
      all[g.key] = true;
    }
    setCollapsedGroups(all);
  };

  // ⚡ Memoized Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const s = filters.search.toLowerCase().trim();
      const matchesSearch =
        !s ||
        t.merchant?.toLowerCase().includes(s) ||
        t.notes?.toLowerCase().includes(s) ||
        t.category?.name?.toLowerCase().includes(s) ||
        t.account?.name?.toLowerCase().includes(s) ||
        t.toAccount?.name?.toLowerCase().includes(s) ||
        t.type?.toLowerCase().includes(s) ||
        (Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(s)));

      const matchesType = filters.type === 'All' || t.type === filters.type;
      const matchesAccount =
        !filters.account ||
        t.account?._id === filters.account ||
        t.account === filters.account ||
        t.toAccount?._id === filters.account ||
        t.toAccount === filters.account;

      const matchesCategory = !filters.category || t.category?._id === filters.category || t.category === filters.category;
      const matchesSubcategory = !filters.subcategory || t.subcategory?._id === filters.subcategory || t.subcategory === filters.subcategory;
      const txDate = new Date(t.date);
      const matchesStartDate = !filters.startDate || txDate >= new Date(filters.startDate);
      const matchesEndDate = !filters.endDate || txDate <= new Date(filters.endDate + 'T23:59:59');
      const matchesMinAmount = !filters.minAmount || t.amount >= parseFloat(filters.minAmount);
      const matchesMaxAmount = !filters.maxAmount || t.amount <= parseFloat(filters.maxAmount);

      return (
        matchesSearch &&
        matchesType &&
        matchesAccount &&
        matchesCategory &&
        matchesSubcategory &&
        matchesStartDate &&
        matchesEndDate &&
        matchesMinAmount &&
        matchesMaxAmount
      );
    });
  }, [transactions, filters]);

  // ⚡ Memoized Sorted Transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      switch (orderBy) {
        case 'createdAt': {
          const timeA = new Date(a.createdAt || a.date).getTime();
          const timeB = new Date(b.createdAt || b.date).getTime();
          comparison = timeA - timeB;
          break;
        }
        case 'date': {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          comparison = timeA - timeB;
          break;
        }
        case 'merchant': {
          const valA = (a.merchant || a.notes || (a.type === 'Transfer' ? 'Transfer' : a.category?.name || '')).toLowerCase();
          const valB = (b.merchant || b.notes || (b.type === 'Transfer' ? 'Transfer' : b.category?.name || '')).toLowerCase();
          comparison = valA.localeCompare(valB);
          break;
        }
        case 'category': {
          const valA = (a.type === 'Transfer' ? 'Transfer' : a.category?.name || '').toLowerCase();
          const valB = (b.type === 'Transfer' ? 'Transfer' : b.category?.name || '').toLowerCase();
          comparison = valA.localeCompare(valB);
          break;
        }
        case 'account': {
          const valA = (a.account?.name || '').toLowerCase();
          const valB = (b.account?.name || '').toLowerCase();
          comparison = valA.localeCompare(valB);
          break;
        }
        case 'type': {
          const valA = (a.type || '').toLowerCase();
          const valB = (b.type || '').toLowerCase();
          comparison = valA.localeCompare(valB);
          break;
        }
        case 'amount': {
          comparison = a.amount - b.amount;
          break;
        }
        default: {
          const timeA = new Date(a.createdAt || a.date).getTime();
          const timeB = new Date(b.createdAt || b.date).getTime();
          comparison = timeA - timeB;
          break;
        }
      }
      return order === 'desc' ? -comparison : comparison;
    });
  }, [filteredTransactions, orderBy, order]);

  // ⚡ Grouped Transactions (when grouping is active)
  const groupedData = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups = {};

    for (const tx of sortedTransactions) {
      let key = 'Other';
      let label = 'Other';

      if (groupBy === 'category') {
        if (tx.type === 'Transfer') {
          key = 'transfer';
          label = '🔁 Transfers';
        } else if (tx.category?.name) {
          key = tx.category._id || tx.category.name;
          label = tx.category.name;
        } else {
          key = 'uncategorized';
          label = 'Uncategorized';
        }
      } else if (groupBy === 'account') {
        if (tx.account?.name) {
          key = tx.account._id || tx.account.name;
          label = tx.account.name;
        } else {
          key = 'no-account';
          label = 'No Account';
        }
      } else if (groupBy === 'type') {
        key = tx.type || 'Other';
        label = tx.type === 'Income' ? '🟢 Income' : tx.type === 'Expense' ? '🔴 Expense' : '🔵 Transfer';
      } else if (groupBy === 'date') {
        key = new Date(tx.date).toISOString().split('T')[0];
        label = formatDate(tx.date);
      } else if (groupBy === 'month') {
        const d = new Date(tx.date);
        key = isNaN(d.getTime()) ? 'unknown' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          label,
          items: [],
          incomeTotal: 0,
          expenseTotal: 0,
          netTotal: 0,
        };
      }

      groups[key].items.push(tx);
      if (tx.type === 'Income') {
        groups[key].incomeTotal += tx.amount;
        groups[key].netTotal += tx.amount;
      } else if (tx.type === 'Expense') {
        groups[key].expenseTotal += tx.amount;
        groups[key].netTotal -= tx.amount;
      }
    }

    return Object.values(groups);
  }, [sortedTransactions, groupBy]);

  // ⚡ Paginated Slice for Flat View
  const paginatedTransactions = useMemo(() => {
    if (pageSize === 'all' || groupBy !== 'none') return sortedTransactions;
    const startIdx = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(startIdx, startIdx + pageSize);
  }, [sortedTransactions, currentPage, pageSize, groupBy]);

  const clearFilters = () =>
    setFilters({
      search: '',
      type: 'All',
      account: '',
      category: '',
      subcategory: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
    });

  const resetSorting = () => {
    setOrderBy('createdAt');
    setOrder('desc');
  };

  // Helper row renderer
  const renderTransactionRow = (t, isGrouped = false) => (
    <TableRow
      hover
      key={t._id}
      sx={{
        '&:hover': { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(59, 130, 246, 0.04)' },
        transition: 'background-color 0.15s ease',
      }}
    >
      {/* Date */}
      <TableCell sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#1e293b', fontSize: '0.85rem' }}>
          {formatDate(t.date)}
        </Typography>
        {t.createdAt && (
          <Tooltip title={`Created at: ${new Date(t.createdAt).toLocaleString()}`}>
            <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#94a3b8', display: 'flex', alignItems: 'center', fontSize: '0.7rem', mt: 0.25 }}>
              <Clock className="w-2.5 h-2.5 mr-1 text-gray-400 dark:text-slate-500" />
              {formatTime(t.createdAt)}
            </Typography>
          </Tooltip>
        )}
      </TableCell>

      {/* Type */}
      <TableCell sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            t.type === 'Income'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60'
              : t.type === 'Expense'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60'
              : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60'
          }`}
        >
          {t.type === 'Income' && <ArrowDownRight className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />}
          {t.type === 'Expense' && <ArrowUpRight className="w-3 h-3 mr-1 text-rose-600 dark:text-rose-400" />}
          {t.type === 'Transfer' && <ArrowRightLeft className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />}
          {t.type}
        </span>
      </TableCell>

      {/* Details */}
      <TableCell sx={{ py: 1.5, px: 2 }}>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {t.merchant || (t.type === 'Transfer' ? 'Transfer' : t.category?.name || 'Uncategorized')}
        </div>
        {t.notes && (
          <div className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[200px] mt-0.5" title={t.notes}>
            {t.notes}
          </div>
        )}
      </TableCell>

      {/* Category */}
      <TableCell sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
        {t.type === 'Transfer' ? (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              t.tags?.includes('investment')
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 dark:border dark:border-purple-800/60'
                : t.tags?.includes('goal')
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border dark:border-indigo-800/60'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 dark:border dark:border-blue-800/60'
            }`}
          >
            {t.tags?.includes('investment') ? '💼 Investment' : t.tags?.includes('goal') ? '🎯 Goal Savings' : '🔁 Transfer'}
          </span>
        ) : (
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200 dark:border dark:border-slate-700">
              {t.category?.name || 'None'}
            </span>
            {t.subcategory && (
              <span className="ml-1.5 text-xs text-gray-500 dark:text-slate-400 hidden md:inline">
                → {t.subcategory.name}
              </span>
            )}
          </div>
        )}
      </TableCell>

      {/* Account */}
      <TableCell sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap', color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.85rem' }}>
        {t.type === 'Transfer' ? (
          <span>
            {t.account?.name} →{' '}
            {t.toAccount ? (
              t.toAccount.name
            ) : t.tags?.includes('investment') ? (
              <span className="font-semibold text-purple-700 dark:text-purple-300">{t.merchant || 'Investment'}</span>
            ) : t.tags?.includes('goal') ? (
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">{t.merchant || 'Goal Savings'}</span>
            ) : (
              t.merchant || 'External Transfer'
            )}
          </span>
        ) : (
          t.account?.name || '—'
        )}
      </TableCell>

      {/* Amount */}
      <TableCell align="right" sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
        <span
          className={`font-semibold text-sm ${
            t.type === 'Expense' ? 'text-rose-600 dark:text-rose-400' : t.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-slate-100'
          }`}
        >
          {t.type === 'Expense' ? '-' : t.type === 'Income' ? '+' : ''}
          {formatCurrency(t.amount, t.account?.currency)}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell align="right" sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
        <div className="flex justify-end space-x-1.5">
          {t.attachmentUrl && (
            <a
              href={t.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="View Receipt"
            >
              <Paperclip className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={() => handleEdit(t)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(t._id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
            Autonomous ledger with smart statement parsing &amp; budget guardrails.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center px-3.5 py-2 text-xs sm:text-sm font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg shadow-2xs transition-colors"
            title="Upload and auto-deduplicate bank statement CSV"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-indigo-600" />
            Import Statement
          </button>
          <button
            onClick={handleAddNew}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* ⚡ Budget Guardrail Trigger Notification Banner */}
      {lastBudgetAlert && (
        <div
          className={`mb-4 p-4 rounded-xl border flex items-start justify-between shadow-2xs transition-all ${
            lastBudgetAlert.level === 'critical'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start space-x-3">
            {lastBudgetAlert.level === 'critical' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-bold">{lastBudgetAlert.message}</p>
              <p className="text-xs mt-0.5 opacity-90">
                Budget: <strong>{lastBudgetAlert.budgetName}</strong> · Spent: ₹{lastBudgetAlert.spent?.toLocaleString('en-IN')} of ₹{lastBudgetAlert.limit?.toLocaleString('en-IN')} ({lastBudgetAlert.percentage}%)
              </p>
            </div>
          </div>
          <button
            onClick={() => dispatch(clearBudgetAlert())}
            className="text-xs font-bold uppercase tracking-wider px-2 py-1 hover:bg-black/5 rounded transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xs border border-gray-100 mb-4">
        <div className="flex space-x-2 sm:space-x-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search merchants, notes..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center px-3 py-2 text-xs sm:text-sm border rounded-lg transition ${
              filtersOpen || activeFilterCount > 0
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 w-5 h-5 text-xs bg-indigo-600 text-white rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="All">All</option>
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Account</label>
                <select
                  value={filters.account}
                  onChange={(e) => setFilters((f) => ({ ...f, account: e.target.value }))}
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      category: e.target.value,
                      subcategory: '', // Reset subcategory when parent category changes
                    }))
                  }
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories
                    .filter((c) => !c.parent)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              {/* ⚡ Subcategory Filter: Rendered ONLY when a parent category is selected */}
              {filters.category && subcategories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1 flex items-center">
                    Subcategory
                    <span className="ml-1 text-3xs font-normal bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full">
                      {subcategories.length}
                    </span>
                  </label>
                  <select
                    value={filters.subcategory}
                    onChange={(e) => setFilters((f) => ({ ...f, subcategory: e.target.value }))}
                    className="block w-full px-2 py-1.5 border border-indigo-300 bg-indigo-50/20 text-indigo-900 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Subcategories</option>
                    {subcategories.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min Amount (₹)</label>
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters((f) => ({ ...f, minAmount: e.target.value }))}
                  placeholder="0"
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Amount (₹)</label>
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters((f) => ({ ...f, maxAmount: e.target.value }))}
                  placeholder="∞"
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="flex items-center text-xs text-red-600 hover:text-red-800">
                    <X className="w-3.5 h-3.5 mr-1" />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ⚡ Toolbar: Grouping, Sort Indicator, and Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2 flex-wrap">
          <p className="text-xs text-gray-500 font-medium">
            {filteredTransactions.length} of {transactions.length} transactions
          </p>
          {orderBy === 'createdAt' && order === 'desc' ? (
            <span className="text-3xs sm:text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-medium flex items-center">
              <Clock className="w-3 h-3 mr-1 text-indigo-500" />
              Creation Time (Newest First)
            </span>
          ) : (
            <button
              onClick={resetSorting}
              className="text-3xs sm:text-xs text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full font-medium flex items-center transition"
              title="Reset to default sorting (Creation Time Descending)"
            >
              <RotateCcw className="w-2.5 h-2.5 mr-1" />
              Sorted by {orderBy} ({order}) · Reset
            </button>
          )}
        </div>

        {/* Group By selector */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
            <span className="text-xs font-semibold text-gray-600 mr-1.5">Group By:</span>
            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value);
                setCollapsedGroups({});
              }}
              className="text-xs bg-transparent border-none text-gray-800 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="none">None (Flat)</option>
              <option value="category">Category</option>
              <option value="account">Account</option>
              <option value="type">Type</option>
              <option value="month">Month</option>
              <option value="date">Date</option>
            </select>
          </div>

          {groupBy !== 'none' && (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={expandAllGroups}
                className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                title="Expand All Groups"
              >
                Expand
              </button>
              <button
                type="button"
                onClick={collapseAllGroups}
                className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                title="Collapse All Groups"
              >
                Collapse
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ⚡ MUI Table Container */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
        {isLoading && transactions.length === 0 ? (
          <div className="py-12">
            <CapiseLoader
              size="md"
              text="Loading Financial Transactions"
              subtext="Aggregating accounts and grouping categorized flows..."
            />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No transactions found.</p>
          </div>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: 'none', borderRadius: '0.75rem', overflowX: 'auto', backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
            <Table sx={{ minWidth: 700 }} aria-label="transactions table">
              <TableHead sx={{ backgroundColor: isDark ? '#131c31' : '#f8fafc', borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
                <TableRow>
                  {/* Date Column */}
                  <TableCell sx={{ py: 1.5, px: 2, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <TableSortLabel
                      active={orderBy === 'date' || orderBy === 'createdAt'}
                      direction={orderBy === 'date' || orderBy === 'createdAt' ? order : 'desc'}
                      onClick={() => handleRequestSort(orderBy === 'createdAt' ? 'createdAt' : 'date')}
                    >
                      Date
                      {orderBy === 'createdAt' && (
                        <span className="ml-1 text-2xs font-normal lowercase text-indigo-600 dark:text-indigo-400 font-sans">(created)</span>
                      )}
                    </TableSortLabel>
                  </TableCell>

                  {/* Type Column */}
                  <TableCell sx={{ py: 1.5, px: 2, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <TableSortLabel
                      active={orderBy === 'type'}
                      direction={orderBy === 'type' ? order : 'asc'}
                      onClick={() => handleRequestSort('type')}
                    >
                      Type
                    </TableSortLabel>
                  </TableCell>

                  {/* Details Column */}
                  <TableCell sx={{ py: 1.5, px: 2, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <TableSortLabel
                      active={orderBy === 'merchant'}
                      direction={orderBy === 'merchant' ? order : 'asc'}
                      onClick={() => handleRequestSort('merchant')}
                    >
                      Details
                    </TableSortLabel>
                  </TableCell>

                  {/* Category Column */}
                  <TableCell sx={{ py: 1.5, px: 2, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <TableSortLabel
                      active={orderBy === 'category'}
                      direction={orderBy === 'category' ? order : 'asc'}
                      onClick={() => handleRequestSort('category')}
                    >
                      Category
                    </TableSortLabel>
                  </TableCell>

                  {/* Account Column */}
                  <TableCell sx={{ py: 1.5, px: 2, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <TableSortLabel
                      active={orderBy === 'account'}
                      direction={orderBy === 'account' ? order : 'asc'}
                      onClick={() => handleRequestSort('account')}
                    >
                      Account
                    </TableSortLabel>
                  </TableCell>

                  {/* Amount Column */}
                  <TableCell align="right" sx={{ py: 1.5, px: 2, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <TableSortLabel
                      active={orderBy === 'amount'}
                      direction={orderBy === 'amount' ? order : 'desc'}
                      onClick={() => handleRequestSort('amount')}
                    >
                      Amount
                    </TableSortLabel>
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell align="right" sx={{ py: 1.5, px: 2, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody sx={{ divideY: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9' }}>
                {groupBy === 'none' ? (
                  paginatedTransactions.map((t) => renderTransactionRow(t, false))
                ) : (
                  groupedData.map((group) => {
                    const isCollapsed = !!collapsedGroups[group.key];
                    return (
                      <Fragment key={group.key}>
                        {/* Group Header Row */}
                        <TableRow
                          onClick={() => toggleGroup(group.key)}
                          sx={{
                            backgroundColor: isDark ? '#162036' : '#f8fafc',
                            cursor: 'pointer',
                            borderTop: isDark ? '2px solid #1e293b' : '2px solid #e2e8f0',
                            borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                            '&:hover': { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
                          }}
                        >
                          <TableCell colSpan={7} sx={{ py: 1.5, px: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <span className="p-1 text-gray-500 dark:text-slate-400">
                                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-500 dark:text-slate-400" /> : <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400" />}
                                </span>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', fontSize: '0.875rem' }}>
                                  {group.label}
                                </Typography>
                                <Chip
                                  label={`${group.items.length} ${group.items.length === 1 ? 'transaction' : 'transactions'}`}
                                  size="small"
                                  sx={{ height: 22, fontSize: '0.725rem', backgroundColor: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#334155', fontWeight: 600 }}
                                />
                              </Box>

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                                {group.incomeTotal > 0 && (
                                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600, fontSize: '0.75rem' }}>
                                    +{formatCurrency(group.incomeTotal)}
                                  </Typography>
                                )}
                                {group.expenseTotal > 0 && (
                                  <Typography variant="caption" sx={{ color: '#f43f5e', fontWeight: 600, fontSize: '0.75rem' }}>
                                    -{formatCurrency(group.expenseTotal)}
                                  </Typography>
                                )}
                                <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#334155', fontWeight: 700, fontSize: '0.75rem' }}>
                                  Net: {group.netTotal >= 0 ? '+' : ''}{formatCurrency(group.netTotal)}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>

                        {/* Group Member Rows */}
                        {!isCollapsed && group.items.map((t) => renderTransactionRow(t, true))}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ⚡ Pagination Bar (Flat View) */}
        {groupBy === 'none' && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredTransactions.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[25, 50, 100, 250, 'all']}
            itemLabel="transactions"
          />
        )}
      </div>

      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        transaction={editingTransaction}
      />

      <CSVImporterModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
      />
    </div>
  );
};

export default Transactions;
