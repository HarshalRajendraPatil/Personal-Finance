import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInvestments, createInvestment, updateInvestment, deleteInvestment, updateCurrentValue, syncAllInvestments, syncInvestmentPrice, clearSyncMessage } from '../../store/investmentSlice';
import { fetchAccounts } from '../../store/accountSlice';
import Pagination from '../../components/Pagination';
import { Plus, TrendingUp, TrendingDown, Edit2, Trash2, RefreshCw, IndianRupee, Zap, CheckCircle2, Globe, Sparkles } from 'lucide-react';


const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(n || 0).toFixed(2)}%`;

const TYPES = ['Stocks', 'Mutual Fund', 'ETF', 'Fixed Deposit', 'PPF', 'EPF', 'NPS', 'Gold', 'Crypto', 'Bonds', 'Other'];
const TYPE_COLORS = {
  'Stocks': '#3b82f6', 'Mutual Fund': '#10b981', 'ETF': '#8b5cf6', 'Fixed Deposit': '#f59e0b',
  'PPF': '#ec4899', 'EPF': '#06b6d4', 'NPS': '#84cc16', 'Gold': '#f97316',
  'Crypto': '#ef4444', 'Bonds': '#6366f1', 'Other': '#64748b',
};

// ── Investment Form Modal ──────────────────────────────────────────────
const InvestmentFormModal = ({ isOpen, onClose, investment = null }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector(s => s.accounts);
  const { isLoading } = useSelector(s => s.investments);
  const [form, setForm] = useState({
    name: '', type: 'Mutual Fund', platform: '', investedAmount: '', currentValue: '',
    quantity: '', buyPrice: '', purchaseDate: '', maturityDate: '', notes: '',
    isSip: false, sipAmount: '', sipFrequency: 'monthly', sipDay: 1, sipAccount: '',
    symbol: '', autoSyncPrice: false
  });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError('');
    if (investment) {
      setForm({
        name: investment.name, type: investment.type, platform: investment.platform || '',
        investedAmount: investment.investedAmount, currentValue: investment.currentValue,
        quantity: investment.quantity || '', buyPrice: investment.buyPrice || '',
        purchaseDate: investment.purchaseDate ? new Date(investment.purchaseDate).toISOString().split('T')[0] : '',
        maturityDate: investment.maturityDate ? new Date(investment.maturityDate).toISOString().split('T')[0] : '',
        notes: investment.notes || '',
        isSip: investment.isSip || false,
        sipAmount: investment.sipAmount || '',
        sipFrequency: investment.sipFrequency || 'monthly',
        sipDay: investment.sipDay || 1,
        sipAccount: investment.sipAccount?._id || investment.sipAccount || '',
        symbol: investment.symbol || '',
        autoSyncPrice: investment.autoSyncPrice || false,
      });
    } else {
      setForm({
        name: '', type: 'Mutual Fund', platform: '', investedAmount: '', currentValue: '',
        quantity: '', buyPrice: '', purchaseDate: new Date().toISOString().split('T')[0],
        maturityDate: '', notes: '', isSip: false, sipAmount: '', sipFrequency: 'monthly',
        sipDay: 1, sipAccount: '', symbol: '', autoSyncPrice: false
      });
    }
  }, [investment, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      const payload = {
        ...form,
        investedAmount: parseFloat(form.investedAmount),
        currentValue: parseFloat(form.currentValue),
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        buyPrice: form.buyPrice ? parseFloat(form.buyPrice) : null,
        purchaseDate: form.purchaseDate || null,
        maturityDate: form.maturityDate || null,
        isSip: Boolean(form.isSip),
        sipAmount: form.isSip ? parseFloat(form.sipAmount || 0) : 0,
        sipFrequency: form.sipFrequency || 'monthly',
        sipDay: parseInt(form.sipDay || 1),
        sipAccount: form.isSip ? (form.sipAccount || null) : null,
        symbol: form.symbol ? form.symbol.trim() : '',
        autoSyncPrice: Boolean(form.autoSyncPrice),
      };
      if (investment) await dispatch(updateInvestment({ id: investment._id, data: payload })).unwrap();
      else await dispatch(createInvestment(payload)).unwrap();
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-5">{investment ? 'Edit Investment' : 'Add Investment'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Investment Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Parag Parikh Flexi Cap, Reliance, Bitcoin" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Platform / Institution</label>
              <input value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} placeholder="Zerodha, Groww, Kuvera, SBI..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Invested Amount (₹)</label>
              <input required type="number" step="0.01" min="0" value={form.investedAmount} onChange={e => setForm(f => ({ ...f, investedAmount: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Value (₹)</label>
              <input required type="number" step="0.01" min="0" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity / Units (optional)</label>
              <input type="number" step="any" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Buy Price / Unit (optional)</label>
              <input type="number" step="0.01" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>

          {/* Automated SIP Section */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-3.5 space-y-3">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isSip}
                onChange={e => setForm(f => ({ ...f, isSip: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-sm font-semibold text-emerald-950">⚡ Enable Automated Recurring SIP</span>
            </label>
            <p className="text-xs text-emerald-700/90 leading-relaxed">
              When enabled, Capise will automatically post your scheduled SIP investment on the due date, deduct from your bank account, and update your invested amount.
            </p>
            {form.isSip && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-emerald-900">SIP Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required={form.isSip}
                    value={form.sipAmount}
                    onChange={e => setForm(f => ({ ...f, sipAmount: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-emerald-900">Frequency</label>
                  <select
                    value={form.sipFrequency}
                    onChange={e => setForm(f => ({ ...f, sipFrequency: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-emerald-900">Debit Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.sipDay}
                    onChange={e => setForm(f => ({ ...f, sipDay: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-xs font-medium text-emerald-900">Debit Bank Account</label>
                  <select
                    value={form.sipAccount}
                    onChange={e => setForm(f => ({ ...f, sipAccount: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.filter(a => !a.isArchived).map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Live Market Price Sync Section */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3.5 space-y-3">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoSyncPrice}
                onChange={e => setForm(f => ({ ...f, autoSyncPrice: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-blue-950">⚡ Auto-Sync Market Price / NAV</span>
            </label>
            <p className="text-xs text-blue-700/90 leading-relaxed">
              Automatically fetches daily closing NAVs for Indian Mutual Funds (via AMFI scheme code) or Crypto prices (via CoinGecko ID) and updates your current value.
            </p>
            {form.autoSyncPrice && (
              <div className="pt-1">
                <label className="block text-xs font-medium text-blue-900">
                  Symbol / AMFI Scheme Code / Crypto ID
                </label>
                <input
                  type="text"
                  value={form.symbol}
                  onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                  placeholder="e.g. 120503 (AMFI Code) or bitcoin, ethereum"
                  className="mt-1 block w-full px-3 py-1.5 bg-white border border-blue-200 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-[11px] text-blue-600 mt-1 block">
                  Tip: For Indian Mutual Funds, find the 6-digit scheme code on AMFI (e.g., Parag Parikh Flexi Cap = <code>122639</code>).
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Maturity Date (optional)</label>
              <input type="date" value={form.maturityDate} onChange={e => setForm(f => ({ ...f, maturityDate: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : investment ? 'Update' : 'Add Investment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Update Value Modal ─────────────────────────────────────────────────
const UpdateValueModal = ({ isOpen, onClose, investment }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector(s => s.investments);
  const [value, setValue] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isOpen && investment) setValue(investment.currentValue?.toString() || '');
    setLocalError('');
  }, [isOpen, investment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const v = parseFloat(value);
    if (!v || v < 0) { setLocalError('Enter a valid positive value.'); return; }
    try {
      await dispatch(updateCurrentValue({ id: investment._id, data: { currentValue: v } })).unwrap();
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  };

  if (!isOpen || !investment) return null;
  const pl = parseFloat(value || 0) - investment.investedAmount;
  const plPct = investment.investedAmount ? (pl / investment.investedAmount) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Update Value</h2>
        <p className="text-sm text-gray-500 mb-4">{investment.name} · Invested: {fmt(investment.investedAmount)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Value (₹)</label>
            <input required type="number" step="0.01" min="0" value={value}
              onChange={e => { setLocalError(''); setValue(e.target.value); }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg font-mono" />
            {value && (
              <p className={`mt-2 text-sm font-medium ${pl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {pl >= 0 ? '▲' : '▼'} {fmt(Math.abs(pl))} ({fmtPct(plPct)})
              </p>
            )}
          </div>
          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Update Value'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────
const Investments = () => {
  const dispatch = useDispatch();
  const { investments, isLoading, isSyncing, syncMessage } = useSelector(s => s.investments);
  const [modalOpen, setModalOpen] = useState(false);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState(null);
  const [activeInv, setActiveInv] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    dispatch(fetchInvestments());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleSyncAll = async () => {
    await dispatch(syncAllInvestments());
    dispatch(fetchAccounts());
    setTimeout(() => { dispatch(clearSyncMessage()); }, 5000);
  };

  const handleSyncSinglePrice = async (invId) => {
    setSyncingId(invId);
    try {
      await dispatch(syncInvestmentPrice(invId)).unwrap();
      setTimeout(() => { dispatch(clearSyncMessage()); }, 4000);
    } catch (err) {
      // Handled in slice
    }
    setSyncingId(null);
  };

  const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);
  const totalCurrent = investments.reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalPL = totalCurrent - totalInvested;
  const totalPLPct = totalInvested ? (totalPL / totalInvested) * 100 : 0;

  // Asset allocation breakdown
  const byType = investments.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + (i.currentValue || 0);
    return acc;
  }, {});

  const pagedInvestments = useMemo(() => {
    if (pageSize === 'all') return investments;
    const start = (currentPage - 1) * pageSize;
    return investments.slice(start, start + pageSize);
  }, [investments, currentPage, pageSize]);

  const handleDelete = async (id) => {
    if (window.confirm('Archive this investment?')) dispatch(deleteInvestment(id));
  };


  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Investments</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Autonomous SIP tracking, live market NAV revaluation, and portfolio analytics.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex-1 sm:flex-none flex items-center justify-center px-3.5 py-2 text-xs sm:text-sm font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            title="Execute due SIPs and fetch live market prices/NAVs"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 mr-1.5 animate-spin text-emerald-600" />
            ) : (
              <Zap className="w-4 h-4 mr-1.5 text-emerald-600 fill-emerald-600" />
            )}
            {isSyncing ? 'Syncing Portfolio...' : 'Sync Live Prices & SIPs'}
          </button>
          <button onClick={() => { setEditingInv(null); setModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors">
            <Plus className="w-4 h-4 mr-1.5" /> Add Investment
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="mb-6 flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => dispatch(clearSyncMessage())} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs uppercase ml-4">Dismiss</button>
        </div>
      )}

      {/* Summary Banner */}
      {investments.length > 0 && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-4 sm:p-6 text-white mb-6 sm:mb-8 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-violet-200 text-xs uppercase tracking-wider">Total Invested</p>
              <p className="text-2xl font-bold mt-1">{fmt(totalInvested)}</p>
            </div>
            <div>
              <p className="text-violet-200 text-xs uppercase tracking-wider">Current Value</p>
              <p className="text-2xl font-bold mt-1">{fmt(totalCurrent)}</p>
            </div>
            <div>
              <p className="text-violet-200 text-xs uppercase tracking-wider">Total P&amp;L</p>
              <p className={`text-2xl font-bold mt-1 ${totalPL >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
              </p>
            </div>
            <div>
              <p className="text-violet-200 text-xs uppercase tracking-wider">Overall Return</p>
              <p className={`text-2xl font-bold mt-1 ${totalPLPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {fmtPct(totalPLPct)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Asset Allocation */}
      {Object.keys(byType).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Asset Allocation</h3>
          <div className="space-y-2">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, value]) => {
              const pct = totalCurrent ? (value / totalCurrent) * 100 : 0;
              return (
                <div key={type} className="flex items-center space-x-3">
                  <div className="w-24 text-xs text-gray-500 truncate">{type}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[type] }} />
                  </div>
                  <div className="w-20 text-xs text-right text-gray-600 font-medium">{fmt(value)}</div>
                  <div className="w-10 text-xs text-right text-gray-400">{pct.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Investment Cards */}
      {isLoading && investments.length === 0 ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
      ) : investments.length === 0 ? (
        <div className="text-center bg-white rounded-xl border border-dashed border-gray-200 py-16">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No investments yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add mutual funds, stocks, or crypto to track automated SIPs and live NAVs.</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Investment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedInvestments.map(inv => {
              const pl = (inv.currentValue || 0) - (inv.investedAmount || 0);
              const plPct = inv.investedAmount ? (pl / inv.investedAmount) * 100 : 0;
              const isPositive = pl >= 0;
              const isItemSyncing = syncingId === inv._id;

              return (
                <div key={inv._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[inv.type] || '#64748b' }} />
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TYPE_COLORS[inv.type]}15`, color: TYPE_COLORS[inv.type] }}>
                        {inv.type}
                      </span>
                      {inv.isSip && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Zap className="w-2.5 h-2.5 mr-0.5 fill-emerald-600 text-emerald-600" />
                          SIP: {fmt(inv.sipAmount)}/{inv.sipFrequency ? inv.sipFrequency.slice(0, 2) : 'mo'}
                        </span>
                      )}
                      {inv.autoSyncPrice && inv.symbol && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          <Globe className="w-2.5 h-2.5 mr-0.5 text-blue-600" />
                          Live
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {inv.autoSyncPrice && inv.symbol && (
                        <button
                          onClick={() => handleSyncSinglePrice(inv._id)}
                          disabled={isItemSyncing}
                          title={`Fetch latest price for ${inv.symbol}`}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isItemSyncing ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      <button onClick={() => { setActiveInv(inv); setValueModalOpen(true); }} title="Update value manually" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditingInv(inv); setModalOpen(true); }} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(inv._id)} title="Archive" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-0.5">{inv.name}</h3>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span>{inv.platform || 'Direct'}</span>
                    {inv.symbol && <span className="font-mono text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{inv.symbol}</span>}
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-400">Invested</p>
                      <p className="text-sm font-medium text-gray-700">{fmt(inv.investedAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Current</p>
                      <p className="text-lg font-bold text-gray-900">{fmt(inv.currentValue)}</p>
                    </div>
                  </div>

                  <div className={`mt-3 flex items-center justify-between p-2 rounded-lg ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                    <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                      {isPositive ? '+' : ''}{fmt(pl)}
                    </span>
                    <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtPct(plPct)}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                    {inv.isSip ? (
                      <span>Next SIP: {inv.nextSipDate ? new Date(inv.nextSipDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Scheduled'}</span>
                    ) : (
                      <span>{inv.quantity && inv.buyPrice ? `${inv.quantity} units @ ₹${inv.buyPrice}` : ''}</span>
                    )}
                    {inv.lastPriceSync && (
                      <span className="text-[10px]">Synced: {new Date(inv.lastPriceSync).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            className="rounded-xl border border-gray-100"
            currentPage={currentPage}
            totalItems={investments.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[3, 6, 12, 24, 'all']}
            itemLabel="investments"
          />
        </div>
      )}


      <InvestmentFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} investment={editingInv} />
      <UpdateValueModal isOpen={valueModalOpen} onClose={() => setValueModalOpen(false)} investment={activeInv} />
    </div>
  );
};

export default Investments;
