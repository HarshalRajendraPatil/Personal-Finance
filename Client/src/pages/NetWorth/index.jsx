import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentNetWorth, fetchHistory, takeSnapshot, triggerAutoSnapshot } from '../../store/netWorthSlice';
import Pagination from '../../components/Pagination';
import { TrendingUp, TrendingDown, RefreshCw, Camera, ChevronRight, Zap, CheckCircle2, Clock, Sparkles } from 'lucide-react';


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
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState(null);

  const load = () => { dispatch(fetchCurrentNetWorth()); dispatch(fetchHistory()); };
  useEffect(() => { load(); }, []);

  const handleSnapshot = async () => {
    setSnapping(true);
    try {
      await dispatch(takeSnapshot({ notes: 'Manual Snapshot' })).unwrap();
      setNotifyMsg('Manual snapshot recorded successfully.');
      setTimeout(() => setNotifyMsg(null), 4000);
    } catch (e) { /* */ }
    setSnapping(false);
  };

  const handleAutoCapture = async () => {
    setAutoCapturing(true);
    try {
      await dispatch(triggerAutoSnapshot({ notes: '[Auto-Sync] Wealth Snapshot' })).unwrap();
      dispatch(fetchHistory());
      setNotifyMsg('Autonomous snapshot synced for current cycle.');
      setTimeout(() => setNotifyMsg(null), 4000);
    } catch (e) { /* */ }
    setAutoCapturing(false);
  };

  const nw = current?.netWorth || 0;
  const nwPositive = nw >= 0;

  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(8);

  const reversedHistory = useMemo(() => [...history].reverse(), [history]);

  const pagedHistory = useMemo(() => {
    if (historyPageSize === 'all') return reversedHistory;
    const start = (historyPage - 1) * historyPageSize;
    return reversedHistory.slice(start, start + historyPageSize);
  }, [reversedHistory, historyPage, historyPageSize]);

  // ⚡ Memoize history chart helpers
  const historyMax = useMemo(() => {
    return history.length ? Math.max(...history.map(h => Math.abs(h.netWorth || 0))) : 1;
  }, [history]);

  if (isLoading && !current) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" /></div>;
  }



  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Net Worth</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Autonomous timeline tracking: Total Assets − Total Liabilities.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={load} className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </button>
          <button
            onClick={handleAutoCapture}
            disabled={autoCapturing}
            className="flex-1 sm:flex-none flex items-center justify-center px-3.5 py-2 text-xs sm:text-sm font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            title="Auto-capture current wealth milestone"
          >
            <Zap className="w-4 h-4 mr-1.5 text-indigo-600 fill-indigo-600" />
            {autoCapturing ? 'Capturing...' : 'Auto-Capture'}
          </button>
          <button onClick={handleSnapshot} disabled={snapping} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs">
            <Camera className="w-4 h-4 mr-1.5" /> {snapping ? 'Saving...' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {notifyMsg && (
        <div className="mb-6 flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{notifyMsg}</span>
          </div>
          <button onClick={() => setNotifyMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs uppercase ml-4">Dismiss</button>
        </div>
      )}

      {/* Autonomous Tracking Status Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Zap className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="text-sm font-bold text-indigo-950">Autonomous Net Worth Tracking Active</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Daemon Running</span>
            </div>
            <p className="text-xs text-indigo-800/80 mt-0.5">
              Capise automatically captures a permanent monthly snapshot on the 1st of every month at midnight, building your lifelong wealth graph effortlessly.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-indigo-700 font-medium whitespace-nowrap bg-white/80 px-3 py-1.5 rounded-lg border border-indigo-100/80">
          <Clock className="w-3.5 h-3.5" />
          <span>Next Auto-Capture: 1st of next month</span>
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


      {/* Breakdown grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Assets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Assets Breakdown</h3>
          {current?.breakdown?.accounts?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase mb-2">Liquid Accounts</p>
              {current.breakdown.accounts.map((acc, i) => (
                <BreakdownRow key={i} name={acc.name} type={acc.type} value={acc.balance} pct={current.totalAssets ? (acc.balance / current.totalAssets) * 100 : 0} />
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Net Worth History &amp; Milestones</h3>
            <span className="text-xs text-gray-400">{history.length} snapshots recorded</span>
          </div>
          {/* Simple bar visualization */}
          <div className="flex items-end space-x-2 h-24 mb-3">
            {history.slice(-12).map((snap, i) => {
              const h = historyMax ? (Math.abs(snap.netWorth || 0) / historyMax) * 80 : 4;
              const positive = (snap.netWorth || 0) >= 0;
              return (
                <div key={snap._id || i} className="flex-1 flex flex-col items-center" title={`${fmtDate(snap.date)}: ${fmt(snap.netWorth)} (${snap.isAutomated ? 'Auto' : 'Manual'})`}>
                  <div className={`w-full rounded-t transition-all ${positive ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ height: `${h}px` }} />
                  <p className="text-xs text-gray-400 mt-1 truncate w-full text-center">{new Date(snap.date).toLocaleDateString('en-IN', { month: 'short' })}</p>
                </div>
              );
            })}
          </div>
          {/* History table */}
          <div className="border-t mt-2">
            {pagedHistory.map((snap, i) => {
              const originalIndex = history.findIndex(h => h._id === snap._id);
              const delta = originalIndex > 0 ? snap.netWorth - history[originalIndex - 1]?.netWorth : null;
              const isAuto = snap.isAutomated || snap.notes?.includes('Auto');
              return (
                <div key={snap._id || i} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-700 font-medium">{fmtDate(snap.date)}</p>
                    {isAuto ? (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Zap className="w-2.5 h-2.5 mr-0.5 fill-indigo-600 text-indigo-600" />
                        Auto-Captured
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Manual
                      </span>
                    )}
                    {snap.notes && !isAuto && (
                      <span className="text-xs text-gray-400 italic truncate max-w-[150px]">({snap.notes})</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {delta != null && <span className={`text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{delta >= 0 ? '+' : ''}{fmt(delta)}</span>}
                    <p className="text-sm font-bold text-gray-900">{fmt(snap.netWorth)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            currentPage={historyPage}
            totalItems={history.length}
            pageSize={historyPageSize}
            onPageChange={setHistoryPage}
            onPageSizeChange={setHistoryPageSize}
            pageSizeOptions={[5, 8, 12, 24, 'all']}
            itemLabel="snapshots"
          />
        </div>
      )}

      {history.length === 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5 text-center">
          <p className="text-sm text-blue-700">Autonomous Net Worth tracking is active. As time progresses, snapshots will be automatically recorded on the 1st of every month, or click <strong>Save Snapshot</strong> / <strong>Auto-Capture</strong> now to create your initial baseline!</p>
        </div>
      )}
    </div>
  );
};

export default NetWorth;
