import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeWhatIfModal,
  runWhatIfSimulation,
  clearWhatIfResult,
} from '../store/proactiveSlice';
import {
  Sparkles,
  X,
  Send,
  Compass,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Target,
  Clock,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
  PiggyBank,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

const PRESET_SCENARIOS = [
  {
    icon: '🏍️',
    label: 'Buy ₹1.8L Bike',
    prompt: 'What happens if I buy a ₹1,80,000 motorcycle next month with 20% down payment and ₹5,000 EMI for 2 years?',
  },
  {
    icon: '✈️',
    label: 'Europe Vacation (₹2.5L)',
    prompt: 'How does taking a 10-day Europe vacation costing ₹2,50,000 affect my 6-month emergency runway and net worth?',
  },
  {
    icon: '📈',
    label: '+₹10k/mo SIP Boost',
    prompt: 'If I increase my monthly index fund SIP by ₹10,000, how will my net worth grow over the next 5 years?',
  },
  {
    icon: '💼',
    label: '+₹40k Salary Hike',
    prompt: 'What if I switch jobs and receive a salary hike of ₹40,000 per month starting next month?',
  },
  {
    icon: '🏠',
    label: 'Prepay ₹1L Loan Principal',
    prompt: 'What happens if I deploy a ₹1,00,000 annual bonus towards my loan principal next month?',
  },
];

const WhatIfSimulatorModal = () => {
  const dispatch = useDispatch();
  const { whatIfResult, isWhatIfModalOpen, isLoadingWhatIf } = useSelector((state) => state.proactive);

  const [promptText, setPromptText] = useState('');
  const [showManualTuner, setShowManualTuner] = useState(false);

  // Manual Fine-Tuner State
  const [title, setTitle] = useState('');
  const [lumpsumOutflow, setLumpsumOutflow] = useState('');
  const [monthlyExpenseDelta, setMonthlyExpenseDelta] = useState('');
  const [monthlyIncomeDelta, setMonthlyIncomeDelta] = useState('');
  const [monthlyInvestmentDelta, setMonthlyInvestmentDelta] = useState('');
  const [durationMonths, setDurationMonths] = useState(36);
  const [horizonYears, setHorizonYears] = useState(3);

  useEffect(() => {
    if (isWhatIfModalOpen && !whatIfResult && !promptText) {
      setPromptText('What happens if I buy a ₹1,80,000 motorcycle next month with 20% down payment and ₹5,000 EMI for 2 years?');
    }
  }, [isWhatIfModalOpen, whatIfResult]);

  // Synchronize manual fine-tuner fields whenever an AI simulation result arrives
  useEffect(() => {
    if (whatIfResult?.scenarioParams) {
      const p = whatIfResult.scenarioParams;
      setTitle(p.title || '');
      setLumpsumOutflow(p.lumpsumOutflow ? String(p.lumpsumOutflow) : '');
      setMonthlyExpenseDelta(p.monthlyExpenseDelta ? String(p.monthlyExpenseDelta) : '');
      setMonthlyIncomeDelta(p.monthlyIncomeDelta ? String(p.monthlyIncomeDelta) : '');
      setMonthlyInvestmentDelta(p.monthlyInvestmentDelta ? String(p.monthlyInvestmentDelta) : '');
      setDurationMonths(p.durationMonths || 36);
      if (p.horizonYears) {
        setHorizonYears(p.horizonYears);
      }
    }
  }, [whatIfResult]);

  if (!isWhatIfModalOpen) return null;

  const handleRunSimulation = (overridePrompt = null) => {
    const query = overridePrompt || promptText;
    if (showManualTuner) {
      dispatch(
        runWhatIfSimulation({
          scenario: {
            title: title || 'Custom What-If Scenario',
            lumpsumOutflow: Number(lumpsumOutflow) || 0,
            monthlyExpenseDelta: Number(monthlyExpenseDelta) || 0,
            monthlyIncomeDelta: Number(monthlyIncomeDelta) || 0,
            monthlyInvestmentDelta: Number(monthlyInvestmentDelta) || 0,
            durationMonths: Number(durationMonths) || 36,
            horizonYears: Number(horizonYears) || 3,
          },
          horizonYears: Number(horizonYears) || 3,
        })
      );
    } else {
      if (!query.trim()) return;
      dispatch(
        runWhatIfSimulation({
          prompt: query,
          horizonYears: Number(horizonYears) || 3,
        })
      );
    }
  };

  const handleSelectPreset = (preset) => {
    setPromptText(preset.prompt);
    setShowManualTuner(false);
    handleRunSimulation(preset.prompt);
  };

  const summary = whatIfResult?.simulationSummary;
  const baseline = whatIfResult?.baselineSummary;
  const params = whatIfResult?.scenarioParams;
  const goalsImpact = whatIfResult?.goalsImpact || [];
  const trajectories = whatIfResult?.trajectories;
  const actionProposals = whatIfResult?.actionProposals || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

        {/* Header Ribbon */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="p-2 bg-purple-500/20 border border-purple-400/30 rounded-xl text-purple-300">
                <Compass className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                🔮 Predictive "What-If" Financial Time-Machine
              </h2>
              <span className="text-[11px] font-bold bg-white/10 text-purple-300 border border-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-300" />
                Grounded Gemini AI Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-200">
              Simulate life decisions in a multi-year mathematical sandbox. Grounded in your real database accounts, salary, loan EMIs & active goals.
            </p>
          </div>

          <button
            onClick={() => dispatch(closeWhatIfModal())}
            className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/50">

          {/* Natural Language Prompt Bar & Presets */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
              Ask AI or Describe Scenario:
            </label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunSimulation()}
                  placeholder="e.g. What happens if I buy a ₹1,80,000 motorcycle next month with 20% down payment?"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-xs sm:text-sm text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all pr-10"
                />
                <Sparkles className="w-4 h-4 text-purple-600 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>

              <button
                onClick={() => handleRunSimulation()}
                disabled={isLoadingWhatIf || !promptText.trim()}
                className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                {isLoadingWhatIf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Simulating...</span>
                  </>
                ) : (
                  <>
                    <span>Simulate</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                Try:
              </span>
              {PRESET_SCENARIOS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(p)}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95 flex items-center gap-1"
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Manual Parameter Tuner Toggle */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setShowManualTuner(!showManualTuner)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showManualTuner ? 'Hide Manual Fine-Tuner' : 'Open Manual Parameter Fine-Tuner'}</span>
                {showManualTuner ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <span>Simulation Horizon:</span>
                <select
                  value={horizonYears}
                  onChange={(e) => {
                    setHorizonYears(Number(e.target.value));
                    if (whatIfResult) handleRunSimulation();
                  }}
                  className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-0.5 font-bold text-gray-900 focus:outline-none"
                >
                  <option value={1}>1 Year (12m)</option>
                  <option value={2}>2 Years (24m)</option>
                  <option value={3}>3 Years (36m)</option>
                  <option value={5}>5 Years (60m)</option>
                </select>
              </div>
            </div>

            {/* Manual Fine-Tuner Drawer */}
            {showManualTuner && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in-50">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Scenario Title:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Buying Car"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Lumpsum Outflow (₹):</label>
                  <input
                    type="number"
                    value={lumpsumOutflow}
                    onChange={(e) => setLumpsumOutflow(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Monthly EMI / Outflow (₹):</label>
                  <input
                    type="number"
                    value={monthlyExpenseDelta}
                    onChange={(e) => setMonthlyExpenseDelta(e.target.value)}
                    placeholder="e.g. 6000"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Monthly Income Delta (₹):</label>
                  <input
                    type="number"
                    value={monthlyIncomeDelta}
                    onChange={(e) => setMonthlyIncomeDelta(e.target.value)}
                    placeholder="e.g. 30000"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Monthly SIP Delta (₹):</label>
                  <input
                    type="number"
                    value={monthlyInvestmentDelta}
                    onChange={(e) => setMonthlyInvestmentDelta(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Duration (Months):</label>
                  <input
                    type="number"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Loading Animation */}
          {isLoadingWhatIf && (
            <div className="py-16 text-center bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-3">
              <Compass className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-extrabold text-gray-900">
                Simulating Multi-Year Financial Trajectory...
              </p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Analyzing dual-universe cash flows, compounding returns, emergency buffer runway, and goal timelines across {horizonYears} years.
              </p>
            </div>
          )}

          {/* Simulation Output Dashboard */}
          {whatIfResult && !isLoadingWhatIf && (
            <div className="space-y-4 animate-in fade-in-50">

              {/* 1. Verdict Banner */}
              <div className={`p-4 sm:p-5 rounded-3xl border text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${summary?.verdict === 'HIGHLY_SAFE'
                ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-emerald-500/30'
                : summary?.verdict === 'MODERATE_RISK'
                  ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-amber-500/30'
                  : 'bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 border-rose-500/30'
                }`}>
                <div className="flex items-center gap-3">
                  <span className={`p-3 rounded-2xl border shrink-0 ${summary?.verdict === 'HIGHLY_SAFE'
                    ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                    : summary?.verdict === 'MODERATE_RISK'
                      ? 'bg-amber-500/20 border-amber-400/30 text-amber-300'
                      : 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                    }`}>
                    {summary?.verdict === 'HIGHLY_SAFE' ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : summary?.verdict === 'MODERATE_RISK' ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <ShieldAlert className="w-6 h-6" />
                    )}
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black">{summary?.verdictTitle}</h3>
                    <p className="text-xs sm:text-sm text-gray-200 mt-0.5 leading-relaxed">
                      {summary?.verdictDescription}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/20">
                  <span className="text-[10px] uppercase font-bold text-gray-300 block">Scenario Evaluated</span>
                  <span className="text-xs sm:text-sm font-extrabold text-white">{params?.title}</span>
                  {params?.rationale && (
                    <p className="text-[10px] text-purple-200 max-w-xs text-right mt-0.5 truncate" title={params.rationale}>
                      💡 {params.rationale}
                    </p>
                  )}
                </div>
              </div>

              {/* 2. Key Comparison Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                {/* Net Worth at Horizon */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    Year {whatIfResult.horizonYears} Net Worth
                  </span>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-black font-mono text-gray-900">
                      ₹{summary?.simulatedEndingNetWorth?.toLocaleString('en-IN')}
                    </span>
                    <span className={`block text-[10px] font-bold font-mono ${summary?.netWorthDifference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {summary?.netWorthDifference >= 0 ? '+' : ''}₹{summary?.netWorthDifference?.toLocaleString('en-IN')} vs baseline
                    </span>
                  </div>
                </div>

                {/* Emergency Safety Runway */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Safety Runway
                  </span>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-black font-mono text-gray-900">
                      {summary?.minRunwayMonths} mo
                    </span>
                    <span className="block text-[10px] text-gray-500 font-semibold">
                      from {baseline?.emergencyRunwayMonths} mo baseline
                    </span>
                  </div>
                </div>

                {/* Lowest Liquid Reserve */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <PiggyBank className="w-3.5 h-3.5 text-amber-600" />
                    Lowest Liquid Bal
                  </span>
                  <div className="mt-2">
                    <span className={`text-lg sm:text-xl font-black font-mono ${summary?.minProjectedLiquidSavings < 20000 ? 'text-rose-600' : 'text-gray-900'}`}>
                      ₹{summary?.minProjectedLiquidSavings?.toLocaleString('en-IN')}
                    </span>
                    <span className="block text-[10px] text-gray-500 font-semibold">
                      {summary?.bottleneckMonth ? `in ${summary.bottleneckMonth}` : 'well cushioned'}
                    </span>
                  </div>
                </div>

                {/* Monthly Burn Delta */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-purple-600" />
                    Monthly Delta
                  </span>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-black font-mono text-gray-900">
                      ₹{((params?.monthlyExpenseDelta || 0) + (params?.monthlyInvestmentDelta || 0)).toLocaleString('en-IN')}
                    </span>
                    <span className="block text-[10px] text-gray-500 font-semibold">
                      for {params?.durationMonths || 36} months
                    </span>
                  </div>
                </div>

              </div>

              {/* 3. Goals Impact Table */}
              {goalsImpact.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-600" />
                    Financial Goals Timeline Impact
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {goalsImpact.map((g) => (
                      <div
                        key={g.goalId}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${g.status === 'DELAY_WARNING'
                          ? 'bg-amber-50/50 border-amber-200'
                          : g.status === 'ACCELERATED'
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-gray-50/60 border-gray-100'
                          }`}
                      >
                        <div>
                          <p className="font-extrabold text-gray-900">{g.title}</p>
                          <p className="text-[11px] text-gray-500">
                            Target: ₹{g.targetAmount?.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${g.status === 'DELAY_WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : g.status === 'ACCELERATED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                            }`}>
                            {g.shiftLabel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Strategic AI Insights & Recommendations */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-4 sm:p-5 rounded-2xl border border-indigo-500/30 shadow-md space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Copilot Strategic Optimization Advice:</span>
                </div>
                <div className="space-y-1.5 text-xs text-gray-200">
                  {(summary?.strategicAdvice || []).map((advice, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{advice}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Action Proposals */}
              {actionProposals.length > 0 && (
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>AI-Recommended Proactive Safeguards:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {actionProposals.map((prop) => (
                      <div
                        key={prop.id}
                        className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-xl flex flex-col justify-between"
                      >
                        <div>
                          <h5 className="text-xs font-bold text-gray-900">{prop.title}</h5>
                          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                            {prop.description}
                          </p>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold">
                            {prop.actionLabel || 'Recommended'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => {
              dispatch(clearWhatIfResult());
              setPromptText('');
            }}
            className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            Reset Simulator
          </button>

          <button
            onClick={() => dispatch(closeWhatIfModal())}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95"
          >
            Close Simulator
          </button>
        </div>

      </div>
    </div>
  );
};

export default WhatIfSimulatorModal;
