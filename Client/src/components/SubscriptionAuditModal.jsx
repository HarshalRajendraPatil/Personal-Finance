import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeSubscriptionAuditModal,
  fetchSubscriptionAudit,
  cancelSubscription,
  acknowledgePriceHike,
  fetchProactiveNudges,
} from '../store/proactiveSlice';
import { fetchRecurringRules } from '../store/recurringSlice';
import {
  Sparkles,
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
  PauseCircle,
  RefreshCw,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  ArrowRight,
  Clock,
  Skull,
} from 'lucide-react';

const SubscriptionAuditModal = () => {
  const dispatch = useDispatch();
  const { subscriptionAudit, isSubscriptionModalOpen, isLoadingSubscriptionAudit } = useSelector(
    (state) => state.proactive
  );

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'HIKES' | 'ZOMBIES' | 'HEALTHY'
  const [actionInProgressId, setActionInProgressId] = useState(null);

  useEffect(() => {
    if (isSubscriptionModalOpen) {
      dispatch(fetchSubscriptionAudit());
    }
  }, [isSubscriptionModalOpen, dispatch]);

  if (!isSubscriptionModalOpen) return null;

  const summary = subscriptionAudit?.summary || {
    totalSubscriptionsCount: 0,
    activeSubscriptionsCount: 0,
    totalMonthlyRunRate: 0,
    totalAnnualRunRate: 0,
    totalHikesCount: 0,
    totalExtraAnnualCostFromHikes: 0,
    totalZombiesCount: 0,
    totalPotentialAnnualSavings: 0,
    healthScore: 100,
  };

  const subscriptions = subscriptionAudit?.subscriptions || [];

  const filteredSubs = subscriptions.filter((s) => {
    if (activeTab === 'HIKES') return s.hasPriceHike;
    if (activeTab === 'ZOMBIES') return s.isZombie;
    if (activeTab === 'HEALTHY') return s.status === 'HEALTHY';
    return true;
  });

  const handleCancelSub = async (ruleId) => {
    setActionInProgressId(ruleId);
    try {
      await dispatch(cancelSubscription(ruleId)).unwrap();
      dispatch(fetchRecurringRules());
      dispatch(fetchProactiveNudges());
      dispatch(fetchSubscriptionAudit());
    } catch (e) {
      console.error(e);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleAcknowledgeHike = async (ruleId, currentPrice) => {
    setActionInProgressId(ruleId);
    try {
      await dispatch(acknowledgePriceHike({ ruleId, acknowledgedAmount: currentPrice })).unwrap();
      dispatch(fetchRecurringRules());
      dispatch(fetchProactiveNudges());
      dispatch(fetchSubscriptionAudit());
    } catch (e) {
      console.error(e);
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Ribbon */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="p-2 bg-purple-500/20 border border-purple-400/30 rounded-xl text-purple-300">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                🕵️ Subscription Clean-Up & Zombie Detector
              </h2>
              <span className="text-[11px] font-bold bg-white/10 text-purple-300 border border-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Health Score: {summary.healthScore}/100
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-200">
              Autonomous audit tracking hidden price hikes, forgotten recurring debits, and 60+ days dormant subscriptions.
            </p>
          </div>

          <button
            onClick={() => dispatch(closeSubscriptionAuditModal())}
            className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="p-4 sm:p-6 bg-gray-50 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Potential Annual Savings */}
          <div className="bg-emerald-500/10 border border-emerald-200 p-3.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              Potential Savings
            </span>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
                ₹{summary.totalPotentialAnnualSavings.toLocaleString('en-IN')}
              </span>
              <span className="block text-[10px] text-emerald-600 font-semibold">/year unlocked</span>
            </div>
          </div>

          {/* 2. Zombie Subscriptions */}
          <div className="bg-rose-500/10 border border-rose-200 p-3.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
              <Skull className="w-3.5 h-3.5 text-rose-600" />
              Zombie Subscriptions
            </span>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-rose-700">
                {summary.totalZombiesCount}
              </span>
              <span className="block text-[10px] text-rose-600 font-semibold">60+ days inactive</span>
            </div>
          </div>

          {/* 3. Price Hikes Detected */}
          <div className="bg-amber-500/10 border border-amber-200 p-3.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Price Hikes
            </span>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-700">
                {summary.totalHikesCount}
              </span>
              <span className="block text-[10px] text-amber-600 font-semibold">
                +₹{summary.totalExtraAnnualCostFromHikes.toLocaleString('en-IN')}/yr extra
              </span>
            </div>
          </div>

          {/* 4. Total Monthly Run Rate */}
          <div className="bg-indigo-500/10 border border-indigo-200 p-3.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Total Monthly Burn
            </span>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-indigo-700">
                ₹{summary.totalMonthlyRunRate.toLocaleString('en-IN')}
              </span>
              <span className="block text-[10px] text-indigo-600 font-semibold">
                {summary.activeSubscriptionsCount} active recurring rules
              </span>
            </div>
          </div>

        </div>

        {/* Filter Tabs */}
        <div className="px-4 sm:px-6 pt-4 bg-white flex items-center gap-2 border-b border-gray-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all shrink-0 px-2 ${
              activeTab === 'ALL'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            All Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('ZOMBIES')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all shrink-0 px-2 flex items-center gap-1.5 ${
              activeTab === 'ZOMBIES'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            Zombie Inactive ({summary.totalZombiesCount})
          </button>
          <button
            onClick={() => setActiveTab('HIKES')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all shrink-0 px-2 flex items-center gap-1.5 ${
              activeTab === 'HIKES'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Price Hikes ({summary.totalHikesCount})
          </button>
          <button
            onClick={() => setActiveTab('HEALTHY')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all shrink-0 px-2 flex items-center gap-1.5 ${
              activeTab === 'HEALTHY'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Healthy & Active ({subscriptions.filter((s) => s.status === 'HEALTHY').length})
          </button>
        </div>

        {/* Subscription List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-gray-50/50">
          {isLoadingSubscriptionAudit ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Auditing historical charges & analyzing activity...
              </p>
            </div>
          ) : filteredSubs.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-gray-800">No subscriptions found in this view.</p>
              <p className="text-xs text-gray-500 mt-0.5">Your subscriptions are running optimally!</p>
            </div>
          ) : (
            filteredSubs.map((sub) => (
              <div
                key={sub.ruleId}
                className={`p-4 bg-white rounded-2xl border transition-all shadow-2xs ${
                  sub.hasPriceHike
                    ? 'border-amber-300/80 bg-amber-50/20'
                    : sub.isZombie
                    ? 'border-rose-300/80 bg-rose-50/20'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Name & Badges */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-sm text-gray-900">{sub.name}</h4>
                      
                      {sub.hasPriceHike && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Price Hike (+{sub.priceHike.hikePercentage}%)
                        </span>
                      )}

                      {sub.isZombie && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                          <Skull className="w-3 h-3" />
                          Zombie Inactive ({sub.zombieDetails.daysInactive}d)
                        </span>
                      )}

                      {sub.status === 'HEALTHY' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Healthy
                        </span>
                      )}

                      {!sub.isActive && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-300 rounded-full text-[10px] font-bold">
                          Paused ⏸️
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                      <span>Category: <strong>{sub.category?.name || 'General'}</strong></span>
                      <span>·</span>
                      <span>Account: <strong>{sub.account?.name || 'Bank'}</strong></span>
                      <span>·</span>
                      <span>Frequency: <strong>{sub.frequency}</strong></span>
                    </p>

                    {/* Price Hike In-Depth Pill */}
                    {sub.hasPriceHike && (
                      <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-0.5">
                        <div className="flex items-center gap-2 font-semibold">
                          <span>Historical: <del className="text-gray-500">₹{sub.priceHike.previousPrice}</del></span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-amber-800 font-bold">Current: ₹{sub.priceHike.currentPrice}/mo</span>
                        </div>
                        <p className="text-[11px] text-amber-700">
                          Adding <strong>+₹{sub.priceHike.extraAnnualCost.toLocaleString('en-IN')}/year</strong> in hidden recurring cost.
                        </p>
                      </div>
                    )}

                    {/* Zombie Inactivity In-Depth Pill */}
                    {sub.isZombie && (
                      <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-0.5">
                        <p className="font-semibold text-rose-800">{sub.zombieDetails.reason}</p>
                        <p className="text-[11px] text-rose-700">
                          Cancelling this rule unlocks <strong>₹{sub.zombieDetails.potentialAnnualSavings.toLocaleString('en-IN')}/year</strong> in immediate savings.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Cost & Action Buttons */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-base sm:text-lg font-black font-mono text-gray-900">
                        ₹{sub.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] text-gray-400 font-semibold">
                        ₹{(sub.monthlyCost * 12).toLocaleString('en-IN')}/year
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sub.isActive && (
                        <button
                          onClick={() => handleCancelSub(sub.ruleId)}
                          disabled={actionInProgressId === sub.ruleId}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                          title="1-Click Cancel / Pause Auto-Debit"
                        >
                          <PauseCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>1-Click Cancel</span>
                        </button>
                      )}

                      {sub.hasPriceHike && (
                        <button
                          onClick={() => handleAcknowledgeHike(sub.ruleId, sub.priceHike.currentPrice)}
                          disabled={actionInProgressId === sub.ruleId}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                          title="Acknowledge & Accept Updated Price"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Accept Price</span>
                        </button>
                      )}

                      {sub.directCancelUrl && (
                        <a
                          href={sub.directCancelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                          title="Open official subscription account cancellation page"
                        >
                          <span>Portal</span>
                          <ExternalLink className="w-3 h-3 text-gray-500" />
                        </a>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => dispatch(fetchSubscriptionAudit())}
            disabled={isLoadingSubscriptionAudit}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubscriptionAudit ? 'animate-spin' : ''}`} />
            <span>Re-run Audit</span>
          </button>

          <button
            onClick={() => dispatch(closeSubscriptionAuditModal())}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};

export default SubscriptionAuditModal;
