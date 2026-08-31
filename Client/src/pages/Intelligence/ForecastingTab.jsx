import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCashflowForecast, fetchLongtermProjection } from '../../store/intelligenceSlice';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  Loader2, AlertTriangle, CheckCircle, TrendingUp, Calendar,
  SlidersHorizontal, Info, Calculator, Target, Award, Clock,
  Shield, Sparkles, ArrowRight, Layers, Flame, TrendingDown,
  Compass, DollarSign
} from 'lucide-react';

import { formatCurrency } from '../../utils/formatCurrency';

const SliderInput = ({ label, value, onChange, min, max, step, unit }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <label className="text-xs sm:text-sm font-medium text-gray-700">{label}</label>
      <span className="text-xs sm:text-sm font-bold text-indigo-600">{value}{unit}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
    <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 mt-1">
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

const ForecastingTab = () => {
  const dispatch = useDispatch();
  const { cashflowForecast, longtermProjection, isLoadingForecast, isLoadingProjection } = useSelector(state => state.intelligence);

  // Scenario state
  const [activeScenario, setActiveScenario] = useState('baseline'); // 'baseline' | 'optimistic' | 'pessimistic'

  // Assumption sliders
  const [salaryGrowth, setSalaryGrowth] = useState(10);
  const [investReturn, setInvestReturn] = useState(12);
  const [inflation, setInflation] = useState(6);
  const [monthlyBoost, setMonthlyBoost] = useState(5000); // default +5000/mo boost
  
  // Affordability Calculator
  const [affordInput, setAffordInput] = useState('');

  useEffect(() => {
    dispatch(fetchCashflowForecast());
    dispatch(fetchLongtermProjection({
      salaryGrowthRate: salaryGrowth,
      investmentReturnRate: investReturn,
      inflationRate: inflation,
      monthlySavingsBoost: monthlyBoost,
    }));
  }, [dispatch]);

  const handleRecalculate = () => {
    dispatch(fetchLongtermProjection({
      salaryGrowthRate: salaryGrowth,
      investmentReturnRate: investReturn,
      inflationRate: inflation,
      monthlySavingsBoost: monthlyBoost,
    }));
  };

  const handleBoostChange = (val) => {
    setMonthlyBoost(val);
    dispatch(fetchLongtermProjection({
      salaryGrowthRate: salaryGrowth,
      investmentReturnRate: investReturn,
      inflationRate: inflation,
      monthlySavingsBoost: val,
    }));
  };

  const handleAffordCheck = () => {
    const amt = parseFloat(affordInput);
    if (!isNaN(amt) && amt > 0) {
      dispatch(fetchCashflowForecast(amt));
    } else {
      dispatch(fetchCashflowForecast());
    }
  };

  // Get active scenario forecast
  const currentScenarioData = cashflowForecast?.scenarios?.[activeScenario] || {
    dailyForecast: cashflowForecast?.dailyForecast || [],
    monthlyProjections: cashflowForecast?.monthlyProjections || [],
    riskMonths: cashflowForecast?.riskMonths || [],
  };

  // Build chart data for 90-day forecast (sample every 3 days to reduce points)
  const forecastChartData = currentScenarioData.dailyForecast.length > 0
    ? currentScenarioData.dailyForecast
        .filter((_, i) => i % 3 === 0)
        .map(d => ({ date: d.date.slice(5), balance: d.balance }))
    : [];

  const forecastDates = forecastChartData.map(d => d.date);
  const forecastBalances = forecastChartData.map(d => d.balance);

  // Long-term chart data (Baseline vs Boosted)
  const activeProjections = (monthlyBoost > 0 && longtermProjection?.boostedProjections)
    ? longtermProjection.boostedProjections
    : (longtermProjection?.projections || []);

  const ltLabels = activeProjections.map(p => p.label);
  const ltNetWorth = activeProjections.map(p => p.netWorth);
  const ltAssets = activeProjections.map(p => p.assets);
  const ltLiabilities = activeProjections.map(p => p.liabilities);
  const ltMilestones = (monthlyBoost > 0 && longtermProjection?.boostedMilestones)
    ? longtermProjection.boostedMilestones
    : (longtermProjection?.milestones || []);

  const emergencyRunway = cashflowForecast?.emergencyRunway;
  const cashflowBridge = cashflowForecast?.cashflowBridge || [];

  return (
    <div className="space-y-8">

      {/* ── Emergency Survival Runway Meter (NEW) ── */}
      {emergencyRunway && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Emergency Survival Runway</h3>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  emergencyRunway.runwayStatus === 'Exceptional' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  emergencyRunway.runwayStatus === 'Healthy' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' :
                  emergencyRunway.runwayStatus === 'Moderate' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {emergencyRunway.runwayStatus} Health
                </span>
              </div>
              <p className="text-xs text-slate-300">
                How long your liquid cash buffer (<strong>{formatCurrency(emergencyRunway.liquidBalance)}</strong>) lasts if all income stops tomorrow.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-6 bg-white/10 p-3 sm:p-4 rounded-xl backdrop-blur-xs border border-white/10">
              <div className="text-center sm:text-left">
                <p className="text-[10px] sm:text-xs text-slate-300 uppercase tracking-wider">Essential Buffer</p>
                <p className="text-lg sm:text-2xl font-black text-emerald-400">{emergencyRunway.essentialRunwayMonths} <span className="text-xs font-semibold text-slate-300">months</span></p>
                <p className="text-[10px] text-slate-400 mt-0.5">at {formatCurrency(emergencyRunway.essentialMonthlyBurn)}/mo</p>
              </div>
              <div className="w-px h-10 bg-white/20 hidden sm:block"></div>
              <div className="text-center sm:text-left">
                <p className="text-[10px] sm:text-xs text-slate-300 uppercase tracking-wider">Full Lifestyle Buffer</p>
                <p className="text-lg sm:text-2xl font-black text-indigo-300">{emergencyRunway.totalRunwayMonths} <span className="text-xs font-semibold text-slate-300">months</span></p>
                <p className="text-[10px] text-slate-400 mt-0.5">at {formatCurrency(emergencyRunway.totalMonthlyBurn)}/mo</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 90-Day Cash Flow Forecast ── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900">90-Day Cash Flow Forecast</h2>
          </div>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> Scheduled rules + historical daily spend pace
          </span>
        </div>

        {isLoadingForecast && !cashflowForecast ? (
          <div className="flex justify-center items-center h-48 bg-white rounded-xl border border-gray-100 shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : cashflowForecast ? (
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-4">
                {/* Risk alert */}
                {currentScenarioData.riskMonths && currentScenarioData.riskMonths.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-800 text-xs sm:text-sm">⚠ Projected Cash Shortfall Under {activeScenario.toUpperCase()} Scenario</p>
                      <p className="text-xs sm:text-sm text-red-700 mt-1">
                        Your projected balance drops below zero in:{' '}
                        <strong>{currentScenarioData.riskMonths.map(m => m.label).join(', ')}</strong>.
                        Consider reducing discretionary spending or deferring large outlays.
                      </p>
                    </div>
                  </div>
                )}
                {currentScenarioData.riskMonths && currentScenarioData.riskMonths.length === 0 && (
                  <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-emerald-800 font-medium">Positive cash cushion projected for the next 90 days across this scenario.</p>
                  </div>
                )}

                {/* Chart with Interactive Scenario Selector */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6 relative">
                  {isLoadingForecast && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-xs z-10 flex items-center justify-center rounded-xl">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                  )}

                  {/* Scenario Switcher Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">Projected Balance Trajectory</p>
                      <p className="text-xs text-gray-400">Starting: <strong>{formatCurrency(cashflowForecast.startingBalance)}</strong></p>
                    </div>

                    {/* Scenario Mode Buttons */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
                      <button
                        onClick={() => setActiveScenario('baseline')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          activeScenario === 'baseline'
                            ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        🎯 Baseline
                      </button>
                      <button
                        onClick={() => setActiveScenario('optimistic')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          activeScenario === 'optimistic'
                            ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        🚀 Optimistic (-15%)
                      </button>
                      <button
                        onClick={() => setActiveScenario('pessimistic')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          activeScenario === 'pessimistic'
                            ? 'bg-rose-600 text-white shadow-2xs font-bold'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        🛡️ Conservative (+15%)
                      </button>
                    </div>
                  </div>

                  {forecastChartData.length > 0 ? (
                    <div className="w-full overflow-x-auto min-w-0">
                      <div className="min-w-[280px] w-full">
                        <LineChart
                          xAxis={[{ scaleType: 'point', data: forecastDates, tickLabelStyle: { fontSize: 10 } }]}
                          series={[{
                            data: forecastBalances,
                            label: `${activeScenario.charAt(0).toUpperCase() + activeScenario.slice(1)} Balance`,
                            color: activeScenario === 'optimistic' ? '#10b981' : activeScenario === 'pessimistic' ? '#f43f5e' : '#6366f1',
                            area: true,
                            showMark: false,
                          }]}
                          height={240}
                          margin={{ top: 10, bottom: 25, left: 50, right: 10 }}
                          sx={{ '& .MuiAreaElement-root': { opacity: 0.15 } }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed text-xs sm:text-sm">
                      Not enough data to forecast.
                    </div>
                  )}
                </div>
              </div>

              {/* Affordability Calculator */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2 sm:mb-4 text-sm sm:text-base">
                  <Calculator className="w-4 h-4 text-indigo-500" /> Can I Afford This?
                </h3>
                <p className="text-xs text-gray-500 mb-3 sm:mb-4">
                  Enter an upcoming large expense to see how it affects your 90-day cash flow.
                </p>
                <div className="flex flex-col xs:flex-row gap-2 mb-4">
                  <input
                    type="number"
                    value={affordInput}
                    onChange={(e) => setAffordInput(e.target.value)}
                    placeholder="Amount (e.g. 50000)"
                    className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                  />
                  <button
                    onClick={handleAffordCheck}
                    disabled={isLoadingForecast}
                    className="px-4 py-2.5 bg-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    Check
                  </button>
                </div>

                {cashflowForecast.affordability && (
                  <div className={`p-4 rounded-xl border mt-4 ${cashflowForecast.affordability.canAfford ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-start gap-2">
                      {cashflowForecast.affordability.canAfford ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className={`font-bold text-xs sm:text-sm ${cashflowForecast.affordability.canAfford ? 'text-emerald-800' : 'text-red-800'}`}>
                          {cashflowForecast.affordability.canAfford ? 'Yes, you can afford it.' : 'Warning: High Risk'}
                        </p>
                        <p className={`text-xs mt-1 ${cashflowForecast.affordability.canAfford ? 'text-emerald-700' : 'text-red-700'}`}>
                          {cashflowForecast.affordability.canAfford
                            ? `Your balance stays positive, lowest point is ${formatCurrency(cashflowForecast.affordability.lowestProjectedBalance)}.`
                            : `Your cash balance will drop below zero. You may need to use credit or dip into investments.`
                          }
                        </p>
                        {cashflowForecast.affordability.recoveryDate && !cashflowForecast.affordability.canAfford && (
                          <p className="text-xs font-medium text-orange-600 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Balance recovers by {new Date(cashflowForecast.affordability.recoveryDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Monthly summary cards for Active Scenario */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {currentScenarioData.monthlyProjections.map((m) => {
                const isNegative = m.projectedEndBalance < 0;
                return (
                  <div key={m.label} className={`rounded-xl border shadow-xs p-4 sm:p-5 ${isNegative ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                    <p className="text-xs sm:text-sm font-semibold text-gray-500 mb-2 sm:mb-3">{m.label}</p>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expected Income</span>
                        <span className="font-bold text-emerald-600">+{formatCurrency(m.income)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expected Spend</span>
                        <span className="font-bold text-rose-600">-{formatCurrency(m.expense)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-1.5 mt-1.5 flex justify-between">
                        <span className="font-medium text-gray-700">End Balance</span>
                        <span className={`font-black ${isNegative ? 'text-red-600' : 'text-indigo-600'}`}>{formatCurrency(m.projectedEndBalance)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
          </div>
        ) : null}
      </section>

      {/* ── 6-Month Cash Flow Bridge (Past 3 Months Actual + Next 3 Months Projected) (NEW) ── */}
      {cashflowBridge && cashflowBridge.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" /> Cash Flow Bridge (Past 3 Months &rarr; Next 3 Months)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Chronological transition from historical performance to forward projection</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"/> Historical Actual</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-400"/> Forward Projected</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto min-w-0">
            <div className="min-w-[320px] h-56 w-full">
              <BarChart
                xAxis={[{ scaleType: 'band', data: cashflowBridge.map(c => c.label) }]}
                series={[
                  {
                    data: cashflowBridge.map(c => c.net),
                    label: 'Net Cash Flow',
                    color: '#6366f1',
                  }
                ]}
                height={220}
                margin={{ top: 10, bottom: 25, left: 50, right: 10 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-4 border-t border-gray-100">
            {cashflowBridge.map(c => (
              <div key={c.label} className={`p-2.5 rounded-lg text-center ${c.type === 'actual' ? 'bg-gray-50' : 'bg-indigo-50/50 border border-indigo-100'}`}>
                <p className="text-[11px] font-semibold text-gray-500">{c.label}</p>
                <p className={`text-xs font-bold mt-0.5 ${c.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {c.net >= 0 ? '+' : ''}{formatCurrency(c.net)}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{c.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5-Year Net Worth Projection & Wealth Accelerator ── */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900">5-Year Net Worth Projection & Wealth Accelerator</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assumption & Accelerator Sliders */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-5 relative">
            {isLoadingProjection && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-xs z-10 flex items-center justify-center rounded-xl">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            )}
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" /> Growth Assumptions
            </h3>
            <SliderInput label="Salary Growth" value={salaryGrowth} onChange={setSalaryGrowth} min={0} max={30} step={1} unit="%" />
            <SliderInput label="Investment Return" value={investReturn} onChange={setInvestReturn} min={5} max={25} step={0.5} unit="%" />
            <SliderInput label="Inflation Rate" value={inflation} onChange={setInflation} min={2} max={15} step={0.5} unit="%" />

            {/* Savings Boost Simulator (NEW) */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Boost Monthly Savings
                </label>
                <span className="text-xs font-bold text-indigo-600">+{formatCurrency(monthlyBoost)}/mo</span>
              </div>
              <input
                type="range" min={0} max={30000} step={1000} value={monthlyBoost}
                onChange={e => handleBoostChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex gap-1.5 pt-1">
                {[2000, 5000, 10000, 15000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleBoostChange(amt)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors ${
                      monthlyBoost === amt ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    +{formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRecalculate}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <TrendingUp className="w-4 h-4" />
              Recalculate Projection
            </button>

            {longtermProjection?.assumptions && (
              <div className="text-[11px] sm:text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-100">
                <p>Base monthly income: <strong>{formatCurrency(longtermProjection.assumptions.baseMonthlyIncome)}</strong></p>
                <p>Base monthly savings: <strong>{formatCurrency(longtermProjection.assumptions.baseMonthlySavings)}</strong></p>
                <p className="pt-1 text-gray-400 italic">Savings split 50% invested / 50% cash. Debt modeled to reduce 25%/yr.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">

            {/* Savings Boost Impact Summary Badge (NEW) */}
            {longtermProjection?.boostComparison && monthlyBoost > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Compound Wealth Accelerator Impact</p>
                  <p className="text-sm text-emerald-950 mt-0.5">
                    Saving an extra <strong>{formatCurrency(monthlyBoost)}/month</strong> ({formatCurrency(longtermProjection.boostComparison.totalExtraDeposited)} total) yields:
                  </p>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-lg sm:text-xl font-black text-emerald-700">+{formatCurrency(longtermProjection.boostComparison.extraWealthCreated)}</p>
                  <p className="text-[11px] font-bold text-emerald-600">
                    Includes +{formatCurrency(longtermProjection.boostComparison.compoundGain)} in pure compound interest
                  </p>
                </div>
              </div>
            )}

            {/* Projection Chart & Milestones */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6 relative">
              {isLoadingProjection ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : activeProjections.length > 0 ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <p className="text-xs sm:text-sm font-semibold text-gray-700">
                      Net Worth Growth Trajectory {monthlyBoost > 0 && <span className="text-emerald-600 font-bold">(Boosted)</span>}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] sm:text-xs">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 bg-emerald-500 rounded-full inline-block"/>Net Worth</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 bg-blue-400 rounded-full inline-block"/>Assets</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 bg-red-400 rounded-full inline-block"/>Liabilities</span>
                    </div>
                  </div>
                  
                  {/* Milestones Badges */}
                  {ltMilestones && ltMilestones.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                      {ltMilestones.map((ms, i) => (
                        <div key={i} className="flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full shadow-2xs">
                          <Award className="w-3 h-3 text-yellow-600" /> Hit {ms.label} in {ms.year}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="w-full overflow-x-auto min-w-0">
                    <div className="min-w-[280px] w-full">
                      <BarChart
                        xAxis={[{ scaleType: 'band', data: ltLabels }]}
                        series={[
                          { data: ltAssets, label: 'Assets', color: '#60a5fa', stack: 'a' },
                          { data: ltLiabilities.map(v => -v), label: 'Liabilities', color: '#f87171', stack: 'a' },
                        ]}
                        height={250}
                        margin={{ top: 10, bottom: 25, left: 50, right: 10 }}
                        valueFormatter={(v) => formatCurrency(Math.abs(v))}
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Goal Timeline */}
            {longtermProjection && longtermProjection.goalTimeline && longtermProjection.goalTimeline.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
                <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <Target className="w-4 h-4 text-blue-500" /> Financial Goal Timeline
                </h3>
                <div className="space-y-3">
                  {longtermProjection.goalTimeline.map(goal => (
                    <div key={goal.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/70 gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-gray-800">{goal.name}</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                          Need {formatCurrency(goal.remaining)} to reach {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        {goal.monthsToGoal !== null ? (
                          <>
                            <p className="text-xs sm:text-sm font-bold text-indigo-600">{goal.monthsToGoal} months away</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Est. {new Date(goal.estimatedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs sm:text-sm font-bold text-red-500">Not enough savings</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ForecastingTab;
