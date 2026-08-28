import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCashflowForecast, fetchLongtermProjection } from '../../store/intelligenceSlice';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { Loader2, AlertTriangle, CheckCircle, TrendingUp, Calendar, SlidersHorizontal, Info, Calculator, Target, Award, Clock } from 'lucide-react';

import { formatCurrency } from '../../utils/formatCurrency';



const SliderInput = ({ label, value, onChange, min, max, step, unit }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <span className="text-sm font-bold text-indigo-600">{value}{unit}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
    <div className="flex justify-between text-xs text-gray-400 mt-1">
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

const ForecastingTab = () => {
  const dispatch = useDispatch();
  const { cashflowForecast, longtermProjection, isLoadingForecast, isLoadingProjection } = useSelector(state => state.intelligence);

  // Assumption sliders
  const [salaryGrowth, setSalaryGrowth] = useState(10);
  const [investReturn, setInvestReturn] = useState(12);
  const [inflation, setInflation] = useState(6);
  
  // Affordability Calculator
  const [affordInput, setAffordInput] = useState('');

  useEffect(() => {
    dispatch(fetchCashflowForecast());
    dispatch(fetchLongtermProjection());
  }, [dispatch]);

  const handleRecalculate = () => {
    dispatch(fetchLongtermProjection({ salaryGrowthRate: salaryGrowth, investmentReturnRate: investReturn, inflationRate: inflation }));
  };

  const handleAffordCheck = () => {
    const amt = parseFloat(affordInput);
    if (!isNaN(amt) && amt > 0) {
      dispatch(fetchCashflowForecast(amt));
    } else {
      dispatch(fetchCashflowForecast());
    }
  };

  // Build chart data for 90-day forecast (sample every 3 days to reduce points)
  const forecastChartData = cashflowForecast?.dailyForecast
    ? cashflowForecast.dailyForecast
        .filter((_, i) => i % 3 === 0)
        .map(d => ({ date: d.date.slice(5), balance: d.balance }))
    : [];

  const forecastDates = forecastChartData.map(d => d.date);
  const forecastBalances = forecastChartData.map(d => d.balance);

  // Long-term chart data
  const ltLabels = longtermProjection?.projections?.map(p => p.label) || [];
  const ltNetWorth = longtermProjection?.projections?.map(p => p.netWorth) || [];
  const ltAssets = longtermProjection?.projections?.map(p => p.assets) || [];
  const ltLiabilities = longtermProjection?.projections?.map(p => p.liabilities) || [];

  return (
    <div className="space-y-8">

      {/* ── 90-Day Cash Flow Forecast ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold text-gray-900">90-Day Cash Flow Forecast</h2>
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" /> Based on recurring rules + historical avg daily spend
          </span>
        </div>

        {isLoadingForecast && !cashflowForecast ? (
          <div className="flex justify-center items-center h-48 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : cashflowForecast ? (
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-4">
                {/* Risk alert */}
                {cashflowForecast.riskMonths && cashflowForecast.riskMonths.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-800">⚠ Projected Cash Shortfall</p>
                      <p className="text-sm text-red-700 mt-1">
                        Your projected balance may go negative in:{' '}
                        <strong>{cashflowForecast.riskMonths.map(m => m.label).join(', ')}</strong>.
                        Consider reducing discretionary spending or deferring large expenses.
                      </p>
                    </div>
                  </div>
                )}
                {cashflowForecast.riskMonths && cashflowForecast.riskMonths.length === 0 && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm text-emerald-800 font-medium">Positive balance projected for the next 90 days. Keep it up!</p>
                  </div>
                )}

                {/* Chart */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 relative">
                  {isLoadingForecast && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-700">Projected Balance</p>
                    <p className="text-xs text-gray-400">Starting: <strong>{formatCurrency(cashflowForecast.startingBalance)}</strong></p>
                  </div>
                  {forecastChartData.length > 0 ? (
                    <LineChart
                      xAxis={[{ scaleType: 'point', data: forecastDates, tickLabelStyle: { fontSize: 10 } }]}
                      series={[{
                        data: forecastBalances,
                        label: 'Projected Balance',
                        color: '#6366f1',
                        area: true,
                        showMark: false,
                      }]}
                      height={250}
                      margin={{ top: 10, bottom: 30, left: 70, right: 10 }}
                      sx={{ '& .MuiAreaElement-root': { opacity: 0.15 } }}
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                      Not enough data to forecast.
                    </div>
                  )}
                </div>
              </div>

              {/* Affordability Calculator */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                  <Calculator className="w-4 h-4 text-indigo-500" /> Can I Afford This?
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Enter an upcoming large expense to see how it affects your 90-day cash flow.
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    value={affordInput}
                    onChange={(e) => setAffordInput(e.target.value)}
                    placeholder="Amount (e.g. 50000)"
                    className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                  />
                  <button
                    onClick={handleAffordCheck}
                    disabled={isLoadingForecast}
                    className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
                        <p className={`font-bold ${cashflowForecast.affordability.canAfford ? 'text-emerald-800' : 'text-red-800'}`}>
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

            {/* Monthly summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cashflowForecast.monthlyProjections.map((m) => {
                const isNegative = m.projectedEndBalance < 0;
                return (
                  <div key={m.label} className={`rounded-xl border shadow-sm p-5 ${isNegative ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                    <p className="text-sm font-semibold text-gray-500 mb-3">{m.label}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expected Income</span>
                        <span className="font-bold text-emerald-600">+{formatCurrency(m.income)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expected Spend</span>
                        <span className="font-bold text-rose-600">-{formatCurrency(m.expense)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between">
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

      {/* ── 5-Year Net Worth Projection ── */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-gray-900">5-Year Net Worth Projection</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assumption Sliders */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5 relative">
            {isLoadingProjection && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            )}
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" /> Assumptions
            </h3>
            <SliderInput label="Salary Growth" value={salaryGrowth} onChange={setSalaryGrowth} min={0} max={30} step={1} unit="%" />
            <SliderInput label="Investment Return" value={investReturn} onChange={setInvestReturn} min={5} max={25} step={0.5} unit="%" />
            <SliderInput label="Inflation Rate" value={inflation} onChange={setInflation} min={2} max={15} step={0.5} unit="%" />
            <button
              onClick={handleRecalculate}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Recalculate
            </button>
            {longtermProjection?.assumptions && (
              <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-100">
                <p>Base monthly income: <strong>{formatCurrency(longtermProjection.assumptions.baseMonthlyIncome)}</strong></p>
                <p>Base monthly savings: <strong>{formatCurrency(longtermProjection.assumptions.baseMonthlySavings)}</strong></p>
                <p className="pt-1 text-gray-300 italic">Savings split 50% invested / 50% cash. Debt modeled to reduce 25%/yr.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Projection Chart & Milestones */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 relative">
              {isLoadingProjection ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : longtermProjection ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-gray-700">Net Worth Growth Trajectory</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-emerald-500 rounded-full inline-block"/>Net Worth</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-blue-400 rounded-full inline-block"/>Assets</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-red-400 rounded-full inline-block"/>Liabilities</span>
                    </div>
                  </div>
                  
                  {/* Milestones Badges */}
                  {longtermProjection.milestones && longtermProjection.milestones.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {longtermProjection.milestones.map((ms, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full shadow-sm">
                          <Award className="w-3 h-3 text-yellow-600" /> Hit {ms.label} in {ms.year}
                        </div>
                      ))}
                    </div>
                  )}

                  <BarChart
                    xAxis={[{ scaleType: 'band', data: ltLabels }]}
                    series={[
                      { data: ltAssets, label: 'Assets', color: '#60a5fa', stack: 'a' },
                      { data: ltLiabilities.map(v => -v), label: 'Liabilities', color: '#f87171', stack: 'a' },
                    ]}
                    height={260}
                    margin={{ top: 10, bottom: 30, left: 70, right: 10 }}
                    valueFormatter={(v) => formatCurrency(Math.abs(v))}
                  />
                </>
              ) : null}
            </div>

            {/* Goal Timeline */}
            {longtermProjection && longtermProjection.goalTimeline && longtermProjection.goalTimeline.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" /> Goal Projections
                </h3>
                <div className="space-y-4">
                  {longtermProjection.goalTimeline.map(goal => (
                    <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-50 bg-gray-50">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{goal.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Need {formatCurrency(goal.remaining)} to reach {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        {goal.monthsToGoal !== null ? (
                          <>
                            <p className="text-sm font-bold text-indigo-600">{goal.monthsToGoal} months away</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Est. {new Date(goal.estimatedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-bold text-red-500">Not enough savings</p>
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
