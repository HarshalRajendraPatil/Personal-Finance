import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAccounts, deleteAccount } from '../../store/accountSlice';
import AccountFormModal from './AccountFormModal';
import accountService from '../../services/accountService';
import {
  Plus,
  Building2,
  CreditCard,
  Wallet,
  IndianRupee,
  Trash2,
  Edit2,
  Archive,
  CreditCard as CardIcon,
  Calendar,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

const getAccountIcon = (type) => {
  switch (type) {
    case 'Bank':
      return <Building2 className="w-5 h-5 text-blue-500" />;
    case 'Credit Card':
      return <CreditCard className="w-5 h-5 text-purple-500" />;
    case 'Cash':
      return <IndianRupee className="w-5 h-5 text-green-500" />;
    default:
      return <Wallet className="w-5 h-5 text-gray-500" />;
  }
};

// ── Credit Card Pay Bill Modal ───────────────────────────────────────
const CreditCardPayModal = ({ isOpen, onClose, card, onSuccess }) => {
  const { accounts } = useSelector((s) => s.accounts);
  const [fromAccountId, setFromAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const bankAccounts = accounts.filter(
    (a) => !a.isArchived && a.type !== 'Credit Card'
  );
  const outstanding = card ? Math.abs(Math.min(0, card.currentBalance)) : 0;
  const minDue = outstanding > 0 ? Math.min(outstanding, Math.max(500, Math.round(outstanding * 0.05))) : 0;

  useEffect(() => {
    if (card) {
      setFromAccountId(bankAccounts.length > 0 ? bankAccounts[0]._id : '');
      setAmount(outstanding > 0 ? String(outstanding) : '');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes(`Bill payment for ${card.name}`);
      setError('');
    }
  }, [card, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromAccountId || !amount || parseFloat(amount) <= 0) {
      setError('Please provide a valid source account and amount');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await accountService.payBill(card._id, {
        fromAccountId,
        amount: parseFloat(amount),
        date,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to pay credit card bill'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <CardIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pay Credit Card Bill</h2>
              <p className="text-xs text-gray-500">{card.name} {card.last4Digits ? `(•••• ${card.last4Digits})` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Outstanding Summary */}
        <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-100 flex justify-between items-center">
          <div>
            <p className="text-xs text-purple-700 font-medium">Total Outstanding</p>
            <p className="text-xl font-bold text-purple-900">{formatCurrency(outstanding, card.currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-purple-700 font-medium">Min Amount Due</p>
            <p className="text-sm font-bold text-purple-800">{formatCurrency(minDue, card.currency)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Pay From (Bank Account)</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Bank Account</option>
              {bankAccounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} (Balance: {formatCurrency(a.currentBalance, a.currency)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Amount (₹)</label>
            <div className="flex gap-2 my-1.5">
              <button
                type="button"
                onClick={() => setAmount(String(outstanding))}
                className="px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200"
              >
                Full ({formatCurrency(outstanding)})
              </button>
              {minDue > 0 && minDue < outstanding && (
                <button
                  type="button"
                  onClick={() => setAmount(String(minDue))}
                  className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Min Due ({formatCurrency(minDue)})
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg">
            ℹ️ This payment creates a <strong>Transfer</strong> from your bank account to your credit card, settling your card balance without double-counting expenses.
          </p>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-2.5 rounded-md">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {isLoading && <Loader2 className="animate-spin mr-1.5 h-4 w-4" />}
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Credit Card Statement Modal ──────────────────────────────────────
const CreditCardStatementModal = ({ isOpen, onClose, card, onPayClick }) => {
  const [statement, setStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (card && isOpen) {
      setIsLoading(true);
      setError('');
      accountService
        .getStatement(card._id)
        .then((data) => setStatement(data))
        .catch((err) => setError(err.message || 'Failed to load statement'))
        .finally(() => setIsLoading(false));
    }
  }, [card, isOpen]);

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{card.name} Statement</h2>
              <p className="text-xs text-gray-500">
                {card.issuer || 'Credit Card'} {card.last4Digits ? `•••• ${card.last4Digits}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="animate-spin h-8 w-8 text-purple-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Generating statement details...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl mb-4">{error}</div>
        ) : statement ? (
          <div className="space-y-6">
            {/* Cycle Header Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Billing Period</p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {new Date(statement.cycleStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} –{' '}
                  {new Date(statement.cycleEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-100">
                <p className="text-xs text-purple-700 font-medium">Statement Balance</p>
                <p className="text-base font-bold text-purple-900 mt-1">
                  {formatCurrency(statement.statementBalance, card.currency)}
                </p>
              </div>

              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-700 font-medium">Payment Due</p>
                <p className="text-sm font-bold text-amber-900 mt-1">
                  {new Date(statement.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-amber-600 mt-0.5 font-semibold">
                  {statement.daysLeft > 0 ? `In ${statement.daysLeft} days` : 'Due today'}
                </p>
              </div>

              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 font-medium">Credit Utilization</p>
                <p className="text-base font-bold text-blue-900 mt-1">{statement.utilization}%</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Avail: {formatCurrency(statement.availableCredit)}
                </p>
              </div>
            </div>

            {/* Transactions in cycle */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Transactions in Current Statement Cycle ({statement.transactions.length})
              </h3>
              {statement.transactions.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-6 text-center bg-gray-50 rounded-xl border border-gray-100">
                  No transactions recorded in this billing cycle yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left font-semibold text-gray-600">Date</th>
                        <th className="px-3.5 py-2.5 text-left font-semibold text-gray-600">Merchant / Description</th>
                        <th className="px-3.5 py-2.5 text-left font-semibold text-gray-600">Category</th>
                        <th className="px-3.5 py-2.5 text-right font-semibold text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {statement.transactions.map((t) => (
                        <tr key={t._id} className="hover:bg-gray-50">
                          <td className="px-3.5 py-2 text-gray-600">
                            {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-3.5 py-2 font-medium text-gray-900">{t.merchant || t.notes || '—'}</td>
                          <td className="px-3.5 py-2 text-gray-500">{t.category?.name || 'Transfer / Other'}</td>
                          <td
                            className={`px-3.5 py-2 text-right font-bold ${
                              t.type === 'Expense' ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {t.type === 'Expense' ? '-' : '+'}
                            {formatCurrency(t.amount, card.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPayClick(card);
                }}
                className="px-4 py-2 text-sm bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700"
              >
                Pay Bill Now
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ── Main Accounts Page ───────────────────────────────────────────────
const Accounts = () => {
  const dispatch = useDispatch();
  const { accounts, isLoading, error } = useSelector((state) => state.accounts);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Credit Card Modals
  const [payModalCard, setPayModalCard] = useState(null);
  const [statementModalCard, setStatementModalCard] = useState(null);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleEdit = (account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      dispatch(deleteAccount(id));
    }
  };

  const activeAccounts = accounts.filter((acc) => !acc.isArchived);
  const archivedAccounts = accounts.filter((acc) => acc.isArchived);

  // Quick Stats
  const totalAssets = activeAccounts
    .filter((acc) => acc.type !== 'Credit Card' && acc.currentBalance >= 0)
    .reduce((sum, acc) => sum + acc.currentBalance, 0);

  const totalLiabilities = activeAccounts
    .filter((acc) => acc.type === 'Credit Card' || acc.currentBalance < 0)
    .reduce((sum, acc) => sum + Math.abs(acc.currentBalance), 0);

  const netBalance = totalAssets - totalLiabilities;

  const creditCardAccounts = activeAccounts.filter((a) => a.type === 'Credit Card');
  const otherAccounts = activeAccounts.filter((a) => a.type !== 'Credit Card');

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts & Wallets</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your bank accounts, credit cards, and cash.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="mt-4 sm:mt-0 flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Net Balance</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(netBalance)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Assets</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Liabilities</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Credit Cards Special Section */}
      {creditCardAccounts.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CardIcon className="w-5 h-5 text-purple-600" />
              Credit Cards ({creditCardAccounts.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {creditCardAccounts.map((card) => {
              const outstanding = Math.abs(Math.min(0, card.currentBalance));
              const limit = card.creditLimit || 0;
              const available = limit > 0 ? Math.max(0, limit - outstanding) : 0;
              const utilization = limit > 0 ? Math.round((outstanding / limit) * 100) : 0;
              const utilColor =
                utilization > 70
                  ? 'bg-red-500'
                  : utilization > 30
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              return (
                <div
                  key={card._id}
                  className="bg-white rounded-xl shadow-sm border border-purple-100 p-5 hover:border-purple-300 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{card.name}</h3>
                        <p className="text-xs text-gray-500">
                          {card.issuer || 'Credit Card'} {card.last4Digits ? `•••• ${card.last4Digits}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-1.5">
                      <button
                        onClick={() => handleEdit(card)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(card._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Outstanding & Limit */}
                  <div className="flex items-baseline justify-between mt-3 mb-2">
                    <div>
                      <span className="text-xs font-medium text-gray-500">Outstanding: </span>
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(outstanding, card.currency)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">
                        Limit: {limit > 0 ? formatCurrency(limit, card.currency) : 'No Limit'}
                      </span>
                    </div>
                  </div>

                  {/* Utilization Bar */}
                  {limit > 0 && (
                    <div className="mb-4">
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${utilColor}`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{utilization}% used</span>
                        <span>Avail: {formatCurrency(available, card.currency)}</span>
                      </div>
                    </div>
                  )}

                  {/* Billing Dates & Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {card.billingCycleDay ? (
                        <span>Stmt: {card.billingCycleDay}th | Due: {card.paymentDueDay || '—'}th</span>
                      ) : (
                        <span>Regular Cycle</span>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => setStatementModalCard(card)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                      >
                        Statement
                      </button>
                      <button
                        onClick={() => setPayModalCard(card)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition"
                      >
                        Pay Bill
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Accounts List */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Bank & Cash Accounts ({otherAccounts.length})
        </h2>

        {isLoading && accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-500">Loading accounts...</p>
          </div>
        ) : otherAccounts.length === 0 ? (
          <div className="text-center bg-white rounded-xl border border-gray-200 border-dashed py-12">
            <Wallet className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bank or cash accounts</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your primary bank account.</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
            <ul className="divide-y divide-gray-100">
              {otherAccounts.map((account) => (
                <li key={account._id} className="p-6 hover:bg-gray-50 transition duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {getAccountIcon(account.type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                        <div className="flex items-center mt-1 space-x-2 text-sm text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-xs font-medium">
                            {account.type}
                          </span>
                          {account.notes && (
                            <span className="truncate max-w-[200px] hidden sm:inline-block">
                              • {account.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-lg font-bold ${
                          account.currentBalance < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {formatCurrency(account.currentBalance, account.currency)}
                      </span>
                      <div className="flex space-x-3 mt-2">
                        <button
                          onClick={() => handleEdit(account)}
                          className="text-gray-400 hover:text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(account._id)}
                          className="text-gray-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Render archived accounts section if any exist */}
      {archivedAccounts.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Archive className="w-5 h-5 mr-2 text-gray-500" />
            Archived Accounts
          </h3>
          <div className="bg-gray-50 shadow-sm rounded-xl overflow-hidden border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {archivedAccounts.map((account) => (
                <li key={account._id} className="p-4 opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 text-gray-400">
                        {getAccountIcon(account.type)}
                      </div>
                      <div>
                        <h3 className="text-md font-medium text-gray-700">{account.name}</h3>
                        <p className="text-xs text-gray-500">{account.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(account.currentBalance, account.currency)}
                      </span>
                      <button
                        onClick={() => handleEdit(account)}
                        className="text-xs text-blue-600 mt-1 hover:underline"
                      >
                        Restore/Edit
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modals */}
      <AccountFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        account={editingAccount}
      />

      <CreditCardPayModal
        isOpen={!!payModalCard}
        onClose={() => setPayModalCard(null)}
        card={payModalCard}
        onSuccess={() => dispatch(fetchAccounts())}
      />

      <CreditCardStatementModal
        isOpen={!!statementModalCard}
        onClose={() => setStatementModalCard(null)}
        card={statementModalCard}
        onPayClick={(card) => setPayModalCard(card)}
      />
    </div>
  );
};

export default Accounts;
