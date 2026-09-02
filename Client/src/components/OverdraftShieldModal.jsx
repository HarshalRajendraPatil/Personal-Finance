import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeOverdraftModal,
  fetchOverdraftForecast,
  executeAutoRebalance,
  fetchProactiveNudges,
  fetchSafeToSpend,
} from '../store/proactiveSlice';
import { fetchAccounts } from '../store/accountSlice';
import { fetchDashboardData } from '../store/dashboardSlice';
import { fetchTransactions } from '../store/transactionSlice';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Zap,
  CheckCircle2,
  Calendar,
  Wallet,
  TrendingDown,
  Lock,
  ArrowRightLeft,
  ChevronRight,
  Info,
  DollarSign,
} from 'lucide-react';

const OverdraftShieldModal = () => {
  const dispatch = useDispatch();
  const { overdraftForecast, isOverdraftModalOpen, isLoadingOverdraftForecast, isExecutingRebalance } =
    useSelector((state) => state.proactive);

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  useEffect(() => {
    if (isOverdraftModalOpen) {
      dispatch(fetchOverdraftForecast(5000));
      setSuccessReceipt(null);
    }
  }, [isOverdraftModalOpen, dispatch]);

  const summary = overdraftForecast?.summary || {
    totalAccounts: 0,
    breachedAccountsCount: 0,
    totalShortfall: 0,
    minimumBalanceBuffer: 5000,
    status: 'HEALTHY_BUFFER',
  };

  const accounts = overdraftForecast?.accounts || [];
  const proposals = overdraftForecast?.proposals || [];

  // Set default selected account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const breached = accounts.find((a) => a.isBreached);
      setSelectedAccountId(breached ? breached.accountId : accounts[0].accountId);
    }
  }, [accounts, selectedAccountId]);

  // Set default proposal values
  const activeProposal = proposals.find((p) => p.targetAccountId === selectedAccountId) || proposals[0];

  useEffect(() => {
    if (activeProposal) {
      if (activeProposal.donorAccount) {
        setSelectedDonorId(activeProposal.donorAccount.id);
      }
      setTransferAmount(activeProposal.recommendedTransferAmount || 10000);
    }
  }, [activeProposal]);

  if (!isOverdraftModalOpen) return null;

  const currentAccount = accounts.find((a) => a.accountId === selectedAccountId) || accounts[0];
  const donorAccounts = accounts.filter((a) => a.accountId !== selectedAccountId && a.currentBalance >= 5000);

  const handleExecuteRebalance = async () => {
    if (!selectedDonorId || !selectedAccountId || !transferAmount) return;

    try {
      const res = await dispatch(
        executeAutoRebalance({
          fromAccountId: selectedDonorId,
          toAccountId: selectedAccountId,
          amount: Number(transferAmount),
          reason: `Autonomous Overdraft Shield Rebalance: Protected ${currentAccount?.accountName} from low-balance breach.`,
        })
      ).unwrap();

      setSuccessReceipt(res);
      dispatch(fetchAccounts());
      dispatch(fetchTransactions());
      dispatch(fetchDashboardData());
      dispatch(fetchSafeToSpend());
      dispatch(fetchProactiveNudges());
      dispatch(fetchOverdraftForecast(5000));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Ribbon */}
        <div className={`p-5 sm:p-6 text-white flex items-start justify-between relative overflow-hidden ${
          summary.breachedAccountsCount > 0
            ? 'bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950'
            : 'bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950'
        }`}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`p-2 rounded-xl border ${
                summary.breachedAccountsCount > 0
                  ? 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                  : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
              }`}>
                {summary.breachedAccountsCount > 0 ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                🛡️ Autonomous Overdraft & Low-Balance Shield
              </h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                summary.breachedAccountsCount > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
              }`}>
                {summary.breachedAccountsCount > 0 ? '⚠️ Breach Risk Detected' : '✅ 14-Day Shield Active'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-200">
              14-day rolling cash-flow forecast monitoring upcoming Loan EMIs and recurring rules to prevent ECS/NACH bounce fees (₹450–₹590) and penalty charges.
            </p>
          </div>

          <button
            onClick={() => dispatch(closeOverdraftModal())}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="p-4 sm:p-6 bg-gray-50 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Shield Status */}
          <div className="bg-white border border-gray-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Minimum Buffer
            </span>
            <div className="mt-2">
              <span className="text-xl font-black font-mono text-gray-900">
                ₹{summary.minimumBalanceBuffer.toLocaleString('en-IN')}
              </span>
              <span className="block text-[10px] text-gray-500 font-semibold">safety threshold</span>
            </div>
          </div>

          {/* 2. Breach Risk Accounts */}
          <div className={`p-3.5 rounded-2xl border flex flex-col justify-between shadow-2xs ${
            summary.breachedAccountsCount > 0
              ? 'bg-rose-500/10 border-rose-200 text-rose-900'
              : 'bg-emerald-500/10 border-emerald-200 text-emerald-900'
          }`}>
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Breach Risk
            </span>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-rose-700">
                {summary.breachedAccountsCount}
              </span>
              <span className="block text-[10px] text-rose-600 font-semibold">of {summary.totalAccounts} accounts</span>
            </div>
          </div>

          {/* 3. Total Shortfall */}
          <div className="bg-white border border-gray-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
              Projected Shortfall
            </span>
            <div className="mt-2">
              <span className="text-xl font-black font-mono text-amber-700">
                ₹{summary.totalShortfall.toLocaleString('en-IN')}
              </span>
              <span className="block text-[10px] text-gray-500 font-semibold">next 14 days</span>
            </div>
          </div>

          {/* 4. Action Ready Proposals */}
          <div className="bg-white border border-gray-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              Rebalance Actions
            </span>
            <div className="mt-2">
              <span className="text-xl font-black font-mono text-indigo-700">
                {proposals.length} Ready
              </span>
              <span className="block text-[10px] text-gray-500 font-semibold">1-click auto-transfers</span>
            </div>
          </div>

        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/50">
          
          {/* Success Receipt State */}
          {successReceipt && (
            <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2 animate-in fade-in-50">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>1-Click Auto-Rebalance Executed Successfully!</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                {successReceipt.message}
              </p>
              <div className="pt-2 flex items-center gap-4 text-[11px] font-mono font-bold text-emerald-900 flex-wrap">
                <span>{successReceipt.balances?.fromAccount?.name}: ₹{successReceipt.balances?.fromAccount?.newBalance?.toLocaleString('en-IN')}</span>
                <span>➔</span>
                <span>{successReceipt.balances?.toAccount?.name}: ₹{successReceipt.balances?.toAccount?.newBalance?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* 1-Click Auto-Rebalance Proposal Card */}
          {activeProposal && !successReceipt && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-5 rounded-3xl border border-indigo-500/30 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-xl">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Action Required: {activeProposal.targetAccountName}
                    </h3>
                    <p className="text-xs text-rose-200">
                      Projected breach on <strong className="text-white">{activeProposal.breachDate}</strong> before <span className="underline font-semibold">{activeProposal.triggeringItem}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-gray-400 block">Shortfall Amount</span>
                  <span className="text-lg font-black font-mono text-rose-400">
                    -₹{activeProposal.shortfallAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Rebalance Transfer Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/10 text-xs">
                
                {/* Source / Donor Account */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    Transfer From (Surplus Liquidity):
                  </label>
                  <select
                    value={selectedDonorId}
                    onChange={(e) => setSelectedDonorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/20 rounded-xl text-white font-medium focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                  >
                    {donorAccounts.length === 0 ? (
                      <option value="">No other account with surplus</option>
                    ) : (
                      donorAccounts.map((acc) => (
                        <option key={acc.accountId} value={acc.accountId}>
                          {acc.accountName} (₹{acc.currentBalance.toLocaleString('en-IN')})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Target Account */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    Transfer To (Protected Account):
                  </label>
                  <div className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white font-bold flex items-center justify-between">
                    <span>{currentAccount?.accountName}</span>
                    <span className="text-rose-300 font-mono">₹{currentAccount?.currentBalance?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Rebalance Amount */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    Rebalance Amount (₹):
                  </label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/20 rounded-xl text-white font-mono font-bold focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>

              </div>

              {/* 1-Click Action Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-gray-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Atomically tops up checking balance and eliminates bounce risk.</span>
                </p>

                <button
                  onClick={handleExecuteRebalance}
                  disabled={isExecutingRebalance || !selectedDonorId}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExecutingRebalance ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Rebalancing Accounts...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-emerald-300" />
                      <span>Execute 1-Click Auto-Rebalance (₹{Number(transferAmount).toLocaleString('en-IN')})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* Account Selector Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                14-Day Rolling Cash-Flow Forecast by Account
              </h3>
              <span className="text-[11px] text-gray-500">
                Click an account to inspect daily balance trajectory
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {accounts.map((acc) => (
                <button
                  key={acc.accountId}
                  onClick={() => setSelectedAccountId(acc.accountId)}
                  className={`p-3 rounded-2xl border transition-all text-left shrink-0 min-w-44 ${
                    selectedAccountId === acc.accountId
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-2xs'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-extrabold text-xs text-gray-900 truncate">
                      {acc.accountName}
                    </span>
                    {acc.isBreached && (
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[9px] font-black uppercase">
                        Breach ⚠️
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-gray-500">Live Balance:</span>
                    <span className="font-mono font-bold text-xs text-gray-900">
                      ₹{acc.currentBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Day-by-Day Forecast Timeline for Selected Account */}
          {currentAccount && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">
                    Daily Trajectory: {currentAccount.accountName}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Projected lowest balance: <strong className={`font-mono ${currentAccount.minProjectedBalance < 5000 ? 'text-rose-600' : 'text-emerald-600'}`}>₹{currentAccount.minProjectedBalance.toLocaleString('en-IN')}</strong>
                  </p>
                </div>
                <span className="text-[11px] font-bold text-gray-500">
                  {currentAccount.accountType} Account
                </span>
              </div>

              {/* 14-Day Schedule Grid / Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {(currentAccount.dailySchedule || []).map((day) => (
                  <div
                    key={day.date}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                      day.projectedClosingBalance < 5000
                        ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                        : 'bg-gray-50/60 border-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                      <span>{day.dayName}</span>
                      <span className={`font-mono ${day.projectedClosingBalance < 5000 ? 'text-rose-700 font-extrabold' : 'text-gray-700'}`}>
                        ₹{day.projectedClosingBalance.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {day.outflows.length > 0 ? (
                      <div className="space-y-1 mt-1.5 pt-1.5 border-t border-gray-200/60">
                        {day.outflows.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px]">
                            <span className="truncate text-gray-600">{item.title}</span>
                            <span className="font-mono font-bold text-rose-600 shrink-0">
                              -₹{item.amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 block mt-1">No scheduled debits</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => dispatch(fetchOverdraftForecast(5000))}
            disabled={isLoadingOverdraftForecast}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOverdraftForecast ? 'animate-spin' : ''}`} />
            <span>Refresh 14-Day Forecast</span>
          </button>

          <button
            onClick={() => dispatch(closeOverdraftModal())}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95"
          >
            Close Shield
          </button>
        </div>

      </div>
    </div>
  );
};

export default OverdraftShieldModal;
