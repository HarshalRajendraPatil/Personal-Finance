import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTransactions, deleteTransaction, clearBudgetAlert } from '../../store/transactionSlice';
import { fetchAccounts } from '../../store/accountSlice';
import { fetchCategories } from '../../store/categorySlice';
import TransactionFormModal from './TransactionFormModal';
import CSVImporterModal from '../../components/CSVImporterModal';
import Pagination from '../../components/Pagination';


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
  ScanLine,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { formatCurrency } from '../../utils/formatCurrency';

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const Transactions = () => {
  const dispatch = useDispatch();
  const { transactions, isLoading, lastBudgetAlert } = useSelector((state) => state.transactions);
  const { accounts } = useSelector((state) => state.accounts);
  const { categories } = useSelector((state) => state.categories);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ⚡ Pagination & Windowing state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [filters, setFilters] = useState({
    search: '',
    type: 'All',
    account: '',
    category: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && v !== 'All').length;

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchAccounts());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this transaction? This will automatically update your account balances.')) {
      await dispatch(deleteTransaction(id));
      dispatch(fetchAccounts()); // Refresh accounts to get updated balances
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
  };

  // ⚡ Memoized Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const s = filters.search.toLowerCase().trim();
      const matchesSearch = !s || (
        t.merchant?.toLowerCase().includes(s) ||
        t.notes?.toLowerCase().includes(s) ||
        t.category?.name?.toLowerCase().includes(s) ||
        t.account?.name?.toLowerCase().includes(s) ||
        t.toAccount?.name?.toLowerCase().includes(s) ||
        t.type?.toLowerCase().includes(s) ||
        (Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(s)))
      );
      const matchesType = filters.type === 'All' || t.type === filters.type;
      const matchesAccount = !filters.account ||
        t.account?._id === filters.account || t.account === filters.account ||
        t.toAccount?._id === filters.account || t.toAccount === filters.account;
      const matchesCategory = !filters.category || t.category?._id === filters.category;
      const txDate = new Date(t.date);
      const matchesStartDate = !filters.startDate || txDate >= new Date(filters.startDate);
      const matchesEndDate = !filters.endDate || txDate <= new Date(filters.endDate + 'T23:59:59');
      const matchesMinAmount = !filters.minAmount || t.amount >= parseFloat(filters.minAmount);
      const matchesMaxAmount = !filters.maxAmount || t.amount <= parseFloat(filters.maxAmount);
      return matchesSearch && matchesType && matchesAccount && matchesCategory && matchesStartDate && matchesEndDate && matchesMinAmount && matchesMaxAmount;
    });
  }, [transactions, filters]);

  // ⚡ Paginated Slice
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / (pageSize === 'all' ? filteredTransactions.length || 1 : pageSize)));
  const paginatedTransactions = useMemo(() => {
    if (pageSize === 'all') return filteredTransactions;
    const startIdx = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIdx, startIdx + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const clearFilters = () => setFilters({ search: '', type: 'All', account: '', category: '', startDate: '', endDate: '', minAmount: '', maxAmount: '' });


  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Autonomous ledger with smart statement parsing &amp; budget guardrails.</p>
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
          className={`mb-4 p-4 rounded-xl border flex items-start justify-between shadow-2xs transition-all ${lastBudgetAlert.level === 'critical'
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
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center px-3 py-2 text-xs sm:text-sm border rounded-lg transition ${filtersOpen || activeFilterCount > 0 ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1.5" />
            Filters
            {activeFilterCount > 0 && <span className="ml-1.5 w-5 h-5 text-xs bg-indigo-600 text-white rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="All">All</option>
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Account</label>
                <select value={filters.account} onChange={e => setFilters(f => ({ ...f, account: e.target.value }))}
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Accounts</option>
                  {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Categories</option>
                  {categories.filter(c => !c.parent).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
                <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
                <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min Amount (₹)</label>
                <input type="number" value={filters.minAmount} onChange={e => setFilters(f => ({ ...f, minAmount: e.target.value }))} placeholder="0"
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Amount (₹)</label>
                <input type="number" value={filters.maxAmount} onChange={e => setFilters(f => ({ ...f, maxAmount: e.target.value }))} placeholder="∞"
                  className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="flex items-end">
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="flex items-center text-xs text-red-600 hover:text-red-800">
                    <X className="w-3.5 h-3.5 mr-1" />Clear all filters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-2">{filteredTransactions.length} of {transactions.length} transactions</p>

      {/* Transaction List */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
        {isLoading && transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.map((t) => (
                  <tr key={t._id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 ${t.type === 'Income' ? 'bg-green-50 border-green-100' : t.type === 'Expense' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                          {t.type === 'Income' && <ArrowDownRight className="h-5 w-5 text-green-600" />}
                          {t.type === 'Expense' && <ArrowUpRight className="h-5 w-5 text-red-600" />}
                          {t.type === 'Transfer' && <ArrowRightLeft className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {t.merchant || (t.type === 'Transfer' ? 'Transfer' : t.category?.name || 'Uncategorized')}
                          </div>
                          {t.notes && <div className="text-sm text-gray-500 truncate max-w-[200px] mt-0.5">{t.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {t.type === 'Transfer' ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.tags?.includes('investment')
                            ? 'bg-purple-100 text-purple-800'
                            : t.tags?.includes('goal')
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                          {t.tags?.includes('investment') ? '💼 Investment' : t.tags?.includes('goal') ? '🎯 Goal Savings' : '🔁 Transfer'}
                        </span>
                      ) : (
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {t.category?.name || 'None'}
                          </span>
                          {t.subcategory && (
                            <span className="ml-2 text-xs text-gray-500 hidden md:inline">
                              → {t.subcategory.name}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {t.type === 'Transfer' ? (
                        <span>
                          {t.account?.name} →{' '}
                          {t.toAccount ? (
                            t.toAccount.name
                          ) : t.tags?.includes('investment') ? (
                            <span className="font-semibold text-purple-700">{t.merchant || 'Investment'}</span>
                          ) : t.tags?.includes('goal') ? (
                            <span className="font-semibold text-indigo-700">{t.merchant || 'Goal Savings'}</span>
                          ) : (
                            t.merchant || 'External Transfer'
                          )}
                        </span>
                      ) : (
                        t.account?.name
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={t.type === 'Expense' ? 'text-red-600' : t.type === 'Income' ? 'text-green-600' : 'text-gray-900'}>
                        {t.type === 'Expense' ? '-' : t.type === 'Income' ? '+' : ''}
                        {formatCurrency(t.amount, t.account?.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {t.attachmentUrl && (
                          <a href={t.attachmentUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View Receipt">
                            <Paperclip className="h-4 w-4" />
                          </a>
                        )}
                        <button onClick={() => handleEdit(t)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(t._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ⚡ High-Performance Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTransactions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[25, 50, 100, 250, 'all']}
          itemLabel="transactions"
        />
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

