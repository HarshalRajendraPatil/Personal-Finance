import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeSalaryModal,
  executeSalaryPlan,
  dismissSalaryPlan,
  fetchSafeToSpend,
  fetchProactiveNudges,
} from '../store/proactiveSlice';
import { fetchDashboardData } from '../store/dashboardSlice';
import { fetchBudgets } from '../store/budgetSlice';
import { fetchAccounts } from '../store/accountSlice';
import { fetchInvestments } from '../store/investmentSlice';
import { fetchGoals } from '../store/goalSlice';
import {
  Sparkles,
  X,
  CheckCircle2,
  ShieldCheck,
  PiggyBank,
  Zap,
  TrendingUp,
  Lock,
  ArrowRight,
  RefreshCw,
  Sliders,
} from 'lucide-react';

const SalaryDistributorModal = () => {
  const dispatch = useDispatch();
  const { salaryPlan, isSalaryModalOpen, isExecutingSalaryPlan } = useSelector((state) => state.proactive);

  // Split Percentages State (Default: 50/20/30)
  const [needsPct, setNeedsPct] = useState(50);
  const [goalsPct, setGoalsPct] = useState(20);
  const [discretionaryPct, setDiscretionaryPct] = useState(30);

  // Editable Goals Allocations
  const [customGoals, setCustomGoals] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (salaryPlan?.allocations?.goals?.items) {
      setCustomGoals(
        salaryPlan.allocations.goals.items.map((item) => ({
          ...item,
          amount: item.proposedAmount,
          isSelected: item.isSelected !== false,
        }))
      );
    }
    if (salaryPlan?.splitPercentages) {
      setNeedsPct(salaryPlan.splitPercentages.needsPct || 50);
      setGoalsPct(salaryPlan.splitPercentages.goalsPct || 20);
      setDiscretionaryPct(salaryPlan.splitPercentages.discretionaryPct || 30);
    }
  }, [salaryPlan]);

  if (!isSalaryModalOpen || !salaryPlan) return null;

  const totalIncome = salaryPlan.totalIncome || 100000;
  const needsTotal = Math.round((totalIncome * needsPct) / 100);
  const goalsTotal = Math.round((totalIncome * goalsPct) / 100);
  const discretionaryTotal = Math.max(0, totalIncome - (needsTotal + goalsTotal));
  const remainingDays = salaryPlan.allocations?.discretionary?.remainingDays || 30;
  const calculatedDailySafeToSpend = Math.max(0, Math.round(discretionaryTotal / remainingDays));

  // Handle Percentage Preset Clicks
  const handlePreset = (n, g, d) => {
    setNeedsPct(n);
    setGoalsPct(g);
    setDiscretionaryPct(d);

    const newGoalsTotal = Math.round((totalIncome * g) / 100);
    if (customGoals.length > 0) {
      const perGoal = Math.round(newGoalsTotal / customGoals.length);
      setCustomGoals((prev) =>
        prev.map((item) => ({
          ...item,
          amount: perGoal,
        }))
      );
    }
  };

  // Toggle Goal Selection
  const toggleGoal = (index) => {
    setCustomGoals((prev) =>
      prev.map((g, idx) => (idx === index ? { ...g, isSelected: !g.isSelected } : g))
    );
  };

  // Update Goal Amount
  const updateGoalAmount = (index, val) => {
    const num = Number(val) || 0;
    setCustomGoals((prev) =>
      prev.map((g, idx) => (idx === index ? { ...g, amount: num } : g))
    );
  };

  // Execute 1-Click Distribution
  const handleExecute = async () => {
    const customizedAllocations = {
      needsTotal,
      goalsTotal,
      discretionaryTotal,
      goals: customGoals.filter((g) => g.isSelected),
    };

    const res = await dispatch(
      executeSalaryPlan({
        planId: salaryPlan._id,
        customizedAllocations,
      })
    );

    if (executeSalaryPlan.fulfilled.match(res)) {
      setIsSuccess(true);
      setSuccessMessage(res.payload.message || 'Salary successfully distributed!');

      dispatch(fetchDashboardData());
      dispatch(fetchGoals());
      dispatch(fetchInvestments());
      dispatch(fetchAccounts());
      dispatch(fetchBudgets());
      dispatch(fetchSafeToSpend());
      dispatch(fetchProactiveNudges());
    }
  };

  // Dismiss Plan
  const handleDismiss = () => {
    if (salaryPlan._id) {
      dispatch(dismissSalaryPlan(salaryPlan._id));
    }
    dispatch(closeSalaryModal());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Ribbon */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-indigo-900 to-slate-900 text-white flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Autonomous "Salary Day" Smart Distributor
              </h2>
              <span className="text-[11px] font-bold bg-white/10 text-emerald-300 border border-white/20 px-2.5 py-0.5 rounded-full">
                50/30/20 Framework
              </span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-200">
              Detected income inflow of <strong className="text-white font-mono text-sm">₹{totalIncome.toLocaleString('en-IN')}</strong> for <span className="font-semibold text-white">{salaryPlan.month}</span>. Review your 1-click allocation plan:
            </p>
          </div>

          <button
            onClick={() => dispatch(closeSalaryModal())}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/50">
          
          {isSuccess ? (
            /* Success Celebration State */
            <div className="text-center py-10 px-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-md animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Salary Distributed Successfully!</h3>
              <p className="text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">{successMessage}</p>
              
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl max-w-md mx-auto text-xs text-emerald-900 font-medium space-y-1.5">
                <div className="flex justify-between">
                  <span>Pre-Locked Needs & Obligations:</span>
                  <strong className="font-mono">₹{needsTotal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Deployed into Goals & SIPs:</span>
                  <strong className="font-mono">₹{goalsTotal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-1.5 font-bold">
                  <span>New Daily Safe-to-Spend:</span>
                  <strong className="font-mono text-emerald-700">₹{calculatedDailySafeToSpend.toLocaleString('en-IN')}/day</strong>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSuccess(false);
                  dispatch(closeSalaryModal());
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors"
              >
                Done & Return to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Presets & Split Customizer */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Allocation Split Model
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePreset(50, 20, 30)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        needsPct === 50 && goalsPct === 20
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      50/20/30 (Classic)
                    </button>
                    <button
                      onClick={() => handlePreset(60, 20, 20)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        needsPct === 60 && goalsPct === 20
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      60/20/20 (High Needs)
                    </button>
                    <button
                      onClick={() => handlePreset(40, 35, 25)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        needsPct === 40 && goalsPct === 35
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      40/35/25 (FIRE Wealth)
                    </button>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="w-full h-3 rounded-full bg-gray-100 flex overflow-hidden">
                  <div style={{ width: `${needsPct}%` }} className="bg-amber-500 h-full transition-all" title={`Needs: ${needsPct}%`} />
                  <div style={{ width: `${goalsPct}%` }} className="bg-emerald-500 h-full transition-all" title={`Goals: ${goalsPct}%`} />
                  <div style={{ width: `${discretionaryPct}%` }} className="bg-indigo-600 h-full transition-all" title={`Discretionary: ${discretionaryPct}%`} />
                </div>

                <div className="flex justify-between text-[11px] font-bold text-gray-600 pt-1">
                  <span className="text-amber-700">● Needs ({needsPct}% = ₹{needsTotal.toLocaleString('en-IN')})</span>
                  <span className="text-emerald-700">● Goals & SIPs ({goalsPct}% = ₹{goalsTotal.toLocaleString('en-IN')})</span>
                  <span className="text-indigo-700">● Safe-to-Spend ({discretionaryPct}% = ₹{discretionaryTotal.toLocaleString('en-IN')})</span>
                </div>
              </div>

              {/* 3 Interactive Allocation Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. NEEDS BUCKET */}
                <div className="bg-white rounded-2xl p-4 border border-amber-200/90 shadow-2xs flex flex-col">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                        <Lock className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 uppercase">1. Pre-Locked Needs</h3>
                        <p className="text-[11px] text-gray-500">Rent, EMIs & Fixed Bills</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-amber-900">
                      ₹{needsTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto max-h-56 pr-1 text-xs">
                    {(salaryPlan.allocations?.needs?.items || []).map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                          <p className="text-[10px] text-gray-500">{item.dueDate}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-gray-900">₹{item.amount.toLocaleString('en-IN')}</span>
                          <span className="block text-[9px] font-bold text-amber-700 uppercase">Locked 🔒</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Auto-reserved to avoid late EMI / Rent penalties.</span>
                  </div>
                </div>

                {/* 2. GOALS & WEALTH BUILDING */}
                <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-2xs flex flex-col">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                        <PiggyBank className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 uppercase">2. Wealth & Goals</h3>
                        <p className="text-[11px] text-gray-500">Emergency Buffer & SIPs</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-emerald-900">
                      ₹{goalsTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto max-h-56 pr-1 text-xs">
                    {customGoals.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleGoal(idx)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          item.isSelected
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-gray-50/60 border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={item.isSelected}
                              onChange={() => toggleGoal(idx)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                            />
                            <span className="font-bold text-gray-900 truncate">{item.title}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-gray-500">Allocation:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 font-mono text-xs">₹</span>
                            <input
                              type="number"
                              value={item.amount || ''}
                              onChange={(e) => updateGoalAmount(idx, e.target.value)}
                              className="w-20 px-2 py-0.5 bg-white border border-gray-300 rounded font-mono text-xs font-bold text-gray-900 text-right focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Auto-transfers into savings goals & index SIPs.</span>
                  </div>
                </div>

                {/* 3. DISCRETIONARY SAFE-TO-SPEND */}
                <div className="bg-white rounded-2xl p-4 border border-indigo-200/90 shadow-2xs flex flex-col">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Zap className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 uppercase">3. Safe-to-Spend</h3>
                        <p className="text-[11px] text-gray-500">Discretionary Living</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-indigo-900">
                      ₹{discretionaryTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center items-center p-4 bg-gradient-to-b from-indigo-50/50 to-white rounded-xl border border-indigo-100 text-center space-y-2">
                    <span className="text-xs font-semibold text-gray-500">Computed Daily Allowance:</span>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-700">
                      ₹{calculatedDailySafeToSpend.toLocaleString('en-IN')}
                      <span className="text-xs font-semibold text-gray-500 font-sans">/day</span>
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Calculated for the remaining <strong>{remainingDays} days</strong> of this month.
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Spends within this dynamic daily cap guarantee monthly savings!</span>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        {!isSuccess && (
          <div className="p-4 sm:p-5 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleDismiss}
              className="text-xs font-bold text-gray-500 hover:text-gray-700 py-2 transition-colors order-2 sm:order-1"
            >
              Dismiss / Allocate Later
            </button>

            <button
              onClick={handleExecute}
              disabled={isExecutingSalaryPlan}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 via-indigo-600 to-indigo-700 hover:from-emerald-700 hover:to-indigo-800 active:scale-98 text-white font-extrabold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 order-1 sm:order-2"
            >
              {isExecutingSalaryPlan ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing 1-Click Monthly Distribution...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Execute 1-Click Monthly Distribution (₹{totalIncome.toLocaleString('en-IN')})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default SalaryDistributorModal;
