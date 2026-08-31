import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentNetWorth, fetchHistory, takeSnapshot } from '../../store/netWorthSlice';
import { TrendingUp, TrendingDown, RefreshCw, Camera, ChevronRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtShort = (n) => {
  const abs = Math.abs(n || 0);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return `${n?.toFixed(0)}`;
};

const StatCard = ({ label, value, sub, color = 'text-gray-900', bgClass = 'bg-white border-gray-100' }) => (
  <div className={`rounded-xl shadow-sm border p-5 ${bgClass}`}>
    <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${color}`}>{fmt(value)}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const BreakdownRow = ({ name, value, type, pct }) => (
  <div className="flex items-center py-2 space-x-3">
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-800 truncate">{name}</p>
      {type && <p className="text-xs text-gray-400">{type}</p>}
    </div>
    <div className="w-24 bg-gray-100 rounded-full h-1.5">
      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(100, pct || 0)}%` }} />
    </div>
    <p className="text-sm font-medium text-gray-900 text-right w-28 flex-shrink-0">{fmt(value)}</p>
  </div>
);

const NetWorth = () => {
  const dispatch = useDispatch();
  const { current, history, isLoading } = useSelector(s => s.netWorth);
  const [snapping, setSnapping] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const load = () => { dispatch(fetchCurrentNetWorth()); dispatch(fetchHistory()); };
  useEffect(() => { load(); }, []);

  const handleSnapshot = async () => {
    setSnapping(true);
    try { await dispatch(takeSnapshot({})).unwrap(); } catch (e) { /* */ }
    setSnapping(false);
  };

  if (isLoading && !current) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" /></div>;
  }

  const nw = current?.netWorth || 0;
  const nwPositive = nw >= 0;

  // History chart helpers
  const historyMax = history.length ? Math.max(...history.map(h => Math.abs(h.netWorth || 0))) : 1;

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Net Worth</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Total Assets − Total Liabilities — your financial snapshot.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={load} className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </button>
          <button onClick={handleSnapshot} disabled={snapping} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs">
            <Camera className="w-4 h-4 mr-1.5" /> {snapping ? 'Saving...' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {/* Hero Net Worth Card */}
      <div className={`rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8 text-white shadow-sm ${nwPositive ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
        <p className="text-white/80 text-xs sm:text-sm uppercase tracking-wider">Net Worth</p>
        <div className="flex items-baseline space-x-3 mt-1 sm:mt-2">
          <p className="text-3xl sm:text-5xl font-black">{fmt(nw)}</p>
          {nwPositive ? <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white/70" /> : <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-white/70" />}
        </div>
        <div className="mt-4 flex space-x-6">
          <div>
            <p className="text-white/70 text-xs">Total Assets</p>
            <p className="text-xl font-bold">{fmt(current?.totalAssets)}</p>
          </div>
          <div className="border-l border-white/30 pl-6">
            <p className="text-white/70 text-xs">Total Liabilities</p>
            <p className="text-xl font-bold">{fmt(current?.totalLiabilities)}</p>
          </div>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Cash & Bank" value={current?.cashAndBankBalances} />
        <StatCard label="Investments" value={current?.investmentValue} />
        <StatCard label="Loan Balances" value={current?.loanBalances} color="text-orange-600" bgClass="bg-white border-orange-100" />
        <StatCard label="CC Outstanding" value={current?.creditCardBalances} color="text-red-600" bgClass="bg-white border-red-100" />
      </div>

      {/* Assets vs Liabilities Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Assets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Assets Breakdown</h3>
          {current?.breakdown?.accounts?.filter(a => a.balance > 0)?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 uppercase mb-2">Cash & Bank</p>
              {current.breakdown.accounts.filter(a => a.type !== 'Credit Card' && a.balance > 0).map((a, i) => (
                <BreakdownRow key={i} name={a.name} type={a.type} value={a.balance} pct={current.totalAssets ? (a.balance / current.totalAssets) * 100 : 0} />
              ))}
            </div>
          )}
          {current?.breakdown?.investments?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-2">Investments</p>
              {current.breakdown.investments.map((inv, i) => (
                <BreakdownRow key={i} name={inv.name} type={inv.type} value={inv.value} pct={current.totalAssets ? (inv.value / current.totalAssets) * 100 : 0} />
              ))}
            </div>
          )}
          {!current?.totalAssets && <p className="text-sm text-gray-400">No assets tracked yet.</p>}
        </div>

        {/* Liabilities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Liabilities Breakdown</h3>
          {current?.breakdown?.loans?.length > 0 ? (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-2">Loans</p>
              {current.breakdown.loans.map((l, i) => (
                <BreakdownRow key={i} name={l.name} type={l.type} value={l.remaining} pct={current.totalLiabilities ? (l.remaining / current.totalLiabilities) * 100 : 0} />
              ))}
            </div>
          ) : null}
          {!current?.totalLiabilities && <p className="text-sm text-gray-400">No liabilities tracked yet. 🎉</p>}
        </div>
      </div>

      {/* Net Worth History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Net Worth History (Snapshots)</h3>
          {/* Simple bar visualization */}
          <div className="flex items-end space-x-2 h-24 mb-3">
            {history.slice(-12).map((snap, i) => {
              const h = historyMax ? (Math.abs(snap.netWorth || 0) / historyMax) * 80 : 4;
              const positive = (snap.netWorth || 0) >= 0;
              return (
                <div key={snap._id || i} className="flex-1 flex flex-col items-center" title={`${fmtDate(snap.date)}: ${fmt(snap.netWorth)}`}>
                  <div className={`w-full rounded-t transition-all ${positive ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ height: `${h}px` }} />
                  <p className="text-xs text-gray-400 mt-1 truncate w-full text-center">{new Date(snap.date).toLocaleDateString('en-IN', { month: 'short' })}</p>
                </div>
              );
            })}
          </div>
          {/* History table */}
          <div className="border-t mt-2">
            {[...history].reverse().slice(0, 6).map((snap, i) => {
              const delta = i < history.length - 1 ? snap.netWorth - history[history.length - 2 - i]?.netWorth : null;
              return (
                <div key={snap._id || i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <p className="text-sm text-gray-600">{fmtDate(snap.date)}</p>
                  <div className="flex items-center space-x-3">
                    {delta != null && <span className={`text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{delta >= 0 ? '+' : ''}{fmt(delta)}</span>}
                    <p className="text-sm font-bold text-gray-900">{fmt(snap.netWorth)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {history.length === 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5 text-center">
          <p className="text-sm text-blue-700">No snapshots saved yet. Click <strong>Save Snapshot</strong> to record your current net worth. Do this monthly to track your progress over time!</p>
        </div>
      )}
    </div>
  );
};

export default NetWorth;
