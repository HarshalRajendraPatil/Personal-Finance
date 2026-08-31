import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSpendingInsights } from '../../store/intelligenceSlice';
import {
  Loader2, TrendingUp, TrendingDown, Zap, Store, AlertTriangle,
  Calendar, RefreshCw, BarChart2, ArrowUpRight, ArrowDownRight, Minus,
  PieChart as PieChartIcon, Clock, Target, AlertCircle, CreditCard,
  Wallet, Coffee, CheckCircle2, Sparkles, Layers, ArrowRight, ShieldAlert,
  Repeat, DollarSign
} from 'lucide-react';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';

import { formatCurrency } from '../../utils/formatCurrency';

const SpendingInsightsTab = () => {
  const dispatch = useDispatch();
  const { spendingInsights: data, isLoadingInsights } = useSelector(state => state.intelligence);
  const [historyView, setHistoryView] = useState('expense'); // 'expense' | 'net'

  useEffect(() => {
    dispatch(fetchSpendingInsights());
  }, [dispatch]);

  if (isLoadingInsights || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const {
    dayOfWeekBreakdown = [], weekendVsWeekday = {}, topMerchants = [],
    categoryTrends = [], transactionSizeMetrics = {}, anomalousTransactions = [],
    subscriptionCandidates = [], burnRate = {}, insights = [],
    timeOfDayBreakdown = [], essentialVsDiscretionary = {}, spendingProjection = {},
    topTransactions = [], categoryConcentration = {}, monthlySpendingHistory = [],
    sixMonthAvgExpense = 0, weekOfMonthBreakdown = [], paymentMethodBreakdown = [],
    microTransactions = {}, recommendations = []
  } = data;

  const maxDaySpend = Math.max(...dayOfWeekBreakdown.map(d => d.total), 1);
  const insightIcons = {
    'calendar': Calendar,
    'trending-up': TrendingUp,
    'trending-down': TrendingDown,
    'store': Store,
    'arrow-up': ArrowUpRight,
    'alert': AlertCircle,
    'pie': PieChartIcon,
    'coffee': Coffee,
    'repeat': Repeat,
    'credit-card': CreditCard,
    'clock': Clock,
  };

  // 6-month chart data
  const historyLabels = monthlySpendingHistory.map(m => m.label);
  const historyExpenses = monthlySpendingHistory.map(m => m.expense);
  const historyIncomes = monthlySpendingHistory.map(m => m.income);
  const historyNets = monthlySpendingHistory.map(m => m.net);

  return (
    <div className="space-y-6">

      {/* Behavioral Insight Cards */}
      {insights && insights.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 font-bold text-indigo-900 text-sm sm:text-base">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Behavioral Observations
            </h3>
            <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-white text-indigo-700 rounded-full border border-indigo-200">
              Live Analysis
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((insight, idx) => {
              const Icon = insightIcons[insight.icon] || Zap;
              return (
                <div key={idx} className="flex items-start gap-3 bg-white rounded-xl p-3.5 sm:p-4 shadow-xs border border-indigo-50 hover:shadow-sm transition-shadow">
                  <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p
                    className="text-xs sm:text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: insight.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {spendingProjection && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Projected Month Spend</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(spendingProjection.projectedTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">Spent so far: {formatCurrency(spendingProjection.spentSoFar)}</p>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Avg Transaction</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(transactionSizeMetrics.currentAvg)}</p>
          {transactionSizeMetrics.changePct !== null && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${parseFloat(transactionSizeMetrics.changePct) >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {parseFloat(transactionSizeMetrics.changePct) >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(transactionSizeMetrics.changePct)}% vs last month
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Weekend Avg / Day</p>
          <p className="text-lg sm:text-xl font-bold text-orange-600">{formatCurrency(weekendVsWeekday.weekendDailyAvg)}</p>
          <p className="text-xs text-gray-400 mt-1">Weekday: {formatCurrency(weekendVsWeekday.weekdayDailyAvg)}/day</p>
        </div>
        {categoryConcentration && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Concentration Index</p>
            <p className={`text-lg sm:text-xl font-bold ${categoryConcentration.isDiversified ? 'text-emerald-600' : 'text-rose-600'}`}>
              {categoryConcentration.hhi.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {categoryConcentration.top2SharePct}% in top 2 categories
            </p>
          </div>
        )}
      </div>

      {/* ── Actionable Smart Recommendations (NEW) ── */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Smart Savings Action Plan</h3>
            </div>
            <span className="text-xs text-gray-500">Tailored from your recent spending behavior</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(rec => (
              <div key={rec.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-white hover:border-indigo-100 hover:shadow-xs transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {rec.category}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      rec.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                      rec.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {rec.difficulty}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1.5">{rec.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed mb-3">{rec.description}</p>
                </div>
                {rec.potentialAnnualSavings > 0 && (
                  <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-medium">Potential Impact</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      Save ~{formatCurrency(rec.potentialAnnualSavings)}/yr
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6-Month Multi-Month Trend (NEW) ── */}
      {monthlySpendingHistory && monthlySpendingHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-500" /> 6-Month Spending & Income Trajectory
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                6-Month Avg Spend: <strong className="text-gray-700">{formatCurrency(sixMonthAvgExpense)}/mo</strong>
              </p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
              <button
                onClick={() => setHistoryView('expense')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  historyView === 'expense' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Income vs Expense
              </button>
              <button
                onClick={() => setHistoryView('net')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  historyView === 'net' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Net Savings
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto min-w-0">
            <div className="min-w-[320px] h-56 w-full">
              {historyView === 'expense' ? (
                <BarChart
                  xAxis={[{ scaleType: 'band', data: historyLabels }]}
                  series={[
                    { data: historyIncomes, label: 'Income', color: '#10b981' },
                    { data: historyExpenses, label: 'Expense', color: '#f43f5e' },
                  ]}
                  height={220}
                  margin={{ top: 10, bottom: 25, left: 50, right: 10 }}
                />
              ) : (
                <BarChart
                  xAxis={[{ scaleType: 'band', data: historyLabels }]}
                  series={[
                    { data: historyNets, label: 'Net Savings', color: '#6366f1' },
                  ]}
                  height={220}
                  margin={{ top: 10, bottom: 25, left: 50, right: 10 }}
                />
              )}
            </div>
          </div>

          {/* Month Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-4 border-t border-gray-100">
            {monthlySpendingHistory.map(m => (
              <div key={m.key} className="bg-gray-50/80 p-2.5 rounded-lg text-center">
                <p className="text-[11px] font-semibold text-gray-500">{m.label}</p>
                <p className="text-xs font-bold text-gray-900 mt-0.5">{formatCurrency(m.expense)}</p>
                {m.momPct !== null ? (
                  <p className={`text-[10px] font-semibold mt-0.5 flex items-center justify-center gap-0.5 ${
                    m.momPct > 0 ? 'text-red-500' : 'text-emerald-500'
                  }`}>
                    {m.momPct > 0 ? '↑' : '↓'} {Math.abs(m.momPct)}% MoM
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 mt-0.5">—</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Week-of-Month Velocity & Payment Outflow Distribution (NEW) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Week of Month Payday Cycle */}
        {weekOfMonthBreakdown && weekOfMonthBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> Payday Cycle (Week-of-Month)
              </h3>
              <span className="text-[11px] font-semibold text-gray-500">
                {weekOfMonthBreakdown[0].pct >= 38 ? '⚠️ Front-Loaded Rush' : '✓ Balanced Outflow'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">How spending velocity evolves throughout the 4 weeks of the month</p>
            <div className="space-y-3.5">
              {weekOfMonthBreakdown.map(wb => (
                <div key={wb.week} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">{wb.week}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-[11px]">{wb.count} txns</span>
                      <span className="font-bold text-gray-900">{formatCurrency(wb.spend)}</span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                        {wb.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${wb.pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">{wb.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Channel Outflow */}
        {paymentMethodBreakdown && paymentMethodBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-500" /> Outflow Channels & Payment Modes
              </h3>
              <span className="text-[11px] font-semibold text-gray-500">Distribution</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Where money is spent from this month</p>
            <div className="space-y-3">
              {paymentMethodBreakdown.map(pm => (
                <div key={pm.type} className="p-3 bg-gray-50/70 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pm.color }} />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-800">{pm.type}</p>
                      <p className="text-[11px] text-gray-400">{pm.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold text-gray-900">{formatCurrency(pm.total)}</p>
                    <p className="text-[11px] font-semibold text-indigo-600">{pm.pct}% of total</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Micro-Transactions (< ₹500) Tracker (NEW) ── */}
      {microTransactions && microTransactions.micro && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">Transaction Size Spectrum (Micro vs Big Taps)</h3>
                <p className="text-xs text-gray-400">Track small recurring impulse purchases (&lt; ₹500)</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Annual Micro Spend: ~{formatCurrency(microTransactions.estimatedAnnualMicro)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-amber-800">Micro (&lt; ₹500)</span>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{microTransactions.micro.pct}%</span>
              </div>
              <p className="text-base sm:text-lg font-black text-amber-900">{formatCurrency(microTransactions.micro.total)}</p>
              <p className="text-xs text-amber-700 mt-1">{microTransactions.micro.count} frequent small taps</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-blue-800">Medium (₹500 - ₹5,000)</span>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{microTransactions.medium.pct}%</span>
              </div>
              <p className="text-base sm:text-lg font-black text-blue-900">{formatCurrency(microTransactions.medium.total)}</p>
              <p className="text-xs text-blue-700 mt-1">{microTransactions.medium.count} regular purchases</p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-purple-800">Major (&gt; ₹5,000)</span>
                <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">{microTransactions.large.pct}%</span>
              </div>
              <p className="text-base sm:text-lg font-black text-purple-900">{formatCurrency(microTransactions.large.total)}</p>
              <p className="text-xs text-purple-700 mt-1">{microTransactions.large.count} big-ticket transactions</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Essential vs Discretionary & Time of Day ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Essential vs Discretionary Split */}
        {essentialVsDiscretionary && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2 text-sm sm:text-base">
              <PieChartIcon className="w-4 h-4 text-emerald-500" /> Essential vs Discretionary Split
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="h-48 w-48 flex items-center justify-center flex-shrink-0">
                <PieChart
                  series={[{
                    data: [
                      { id: 0, value: essentialVsDiscretionary.essential, label: 'Essential', color: '#10b981' },
                      { id: 1, value: essentialVsDiscretionary.discretionary, label: 'Discretionary', color: '#f59e0b' }
                    ],
                    innerRadius: 30,
                    outerRadius: 80,
                    paddingAngle: 2,
                    cornerRadius: 4,
                  }]}
                  height={190} width={190}
                  margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                  slotProps={{ legend: { hidden: true } }}
                />
              </div>
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs sm:text-sm font-medium text-emerald-700 flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Essential (Fixed)</span>
                    <span className="font-bold text-xs sm:text-sm text-emerald-900">{formatCurrency(essentialVsDiscretionary.essential)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${essentialVsDiscretionary.essentialPct}%` }}></div></div>
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-1">{essentialVsDiscretionary.essentialPct}% of total</p>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs sm:text-sm font-medium text-amber-700 flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Discretionary (Variable)</span>
                    <span className="font-bold text-xs sm:text-sm text-amber-900">{formatCurrency(essentialVsDiscretionary.discretionary)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${essentialVsDiscretionary.discretionaryPct}%` }}></div></div>
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-1">{essentialVsDiscretionary.discretionaryPct}% of total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time of Day Analysis */}
        {timeOfDayBreakdown && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-4 h-4 text-blue-500" /> Spending by Time of Day
            </h3>
            <div className="w-full overflow-x-auto min-w-0">
              <div className="min-w-[280px] h-48 w-full">
                <BarChart
                  series={[{ data: timeOfDayBreakdown.map(t => t.total), color: '#3b82f6', label: 'Amount' }]}
                  xAxis={[{ scaleType: 'band', data: timeOfDayBreakdown.map(t => t.label) }]}
                  height={200}
                  margin={{ top: 10, bottom: 20, left: 50, right: 10 }}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-4 border-t border-gray-100 pt-3">
              {timeOfDayBreakdown.map(t => (
                <div key={t.slot} className="text-center">
                  <p className="text-[11px] sm:text-xs text-gray-500">{t.label}</p>
                  <p className="text-xs sm:text-sm font-bold text-gray-900">{t.count} txns</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Day of Week & Merchant Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day-of-Week Heatmap */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <h3 className="font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2 text-sm sm:text-base">
            <Calendar className="w-4 h-4 text-indigo-500" /> Spending by Day of Week
          </h3>
          <div className="space-y-3">
            {dayOfWeekBreakdown.map((d) => {
              const pct = maxDaySpend > 0 ? (d.total / maxDaySpend) * 100 : 0;
              const isWeekend = d.day === 'Sat' || d.day === 'Sun';
              return (
                <div key={d.day} className="flex items-center gap-2 sm:gap-3">
                  <span className={`text-xs font-semibold w-7 sm:w-8 ${isWeekend ? 'text-orange-500' : 'text-gray-500'}`}>{d.day}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 sm:h-5 overflow-hidden">
                    <div
                      className={`h-4 sm:h-5 rounded-full flex items-center justify-end pr-2 transition-all duration-700 ${isWeekend ? 'bg-orange-400' : 'bg-indigo-400'}`}
                      style={{ width: `${pct}%`, minWidth: pct > 0 ? '0.75rem' : 0 }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-16 sm:w-24 text-right">{formatCurrency(d.total)}</span>
                  <span className="text-[11px] sm:text-xs text-gray-400 w-10 sm:w-12 text-right hidden xs:inline">{d.count} txns</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Merchant Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <h3 className="font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2 text-sm sm:text-base">
            <Store className="w-4 h-4 text-emerald-500" /> Top Merchants
          </h3>
          {topMerchants.length > 0 ? (
            <div className="space-y-3">
              {topMerchants.map((m, idx) => {
                const maxMerchant = topMerchants[0].total;
                const pct = (m.total / maxMerchant) * 100;
                return (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs sm:text-sm mb-1">
                        <span className="font-medium text-gray-800 truncate">{m.name === 'Unknown' ? '(No merchant)' : m.name}</span>
                        <span className="font-bold text-gray-900 ml-2 flex-shrink-0">{formatCurrency(m.total)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{m.count} txns · avg {formatCurrency(m.avg)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No merchant data available.</p>
          )}
        </div>
      </div>

      {/* ── Category Trends & Anomalies ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Trends */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
            <BarChart2 className="w-4 h-4 text-blue-500" /> Category Trends (vs Last Month)
          </h3>
          <div className="space-y-3">
            {categoryTrends.length > 0 ? categoryTrends.map((cat) => {
              const change = cat.changePct !== null ? parseFloat(cat.changePct) : null;
              return (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{cat.name}</p>
                    <p className="text-[11px] text-gray-500">{formatCurrency(cat.current)} this month</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs sm:text-sm font-bold px-2 py-1 rounded-full ${
                    change === null ? 'bg-gray-100 text-gray-500' :
                    change > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {change === null ? <Minus className="w-3 h-3" /> :
                     change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {change !== null ? `${Math.abs(change)}%` : 'New'}
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-gray-500 text-center py-4">No category data available.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Top 5 Transactions */}
          {topTransactions && topTransactions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Target className="w-4 h-4 text-rose-500" /> Largest Transactions This Month
              </h3>
              <div className="space-y-3">
                {topTransactions.map((t, i) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-300">{i + 1}</span>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{t.merchant}</p>
                        <p className="text-[11px] text-gray-500">{new Date(t.date).toLocaleDateString()} · {t.category}</p>
                      </div>
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-gray-900">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anomalous Transactions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Anomalies Detected
            </h3>
            <p className="text-xs text-gray-400 mb-3">Transactions &gt;2× your average transaction size this month</p>
            {anomalousTransactions.length > 0 ? (
              <div className="space-y-2">
                {anomalousTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-orange-900">{formatCurrency(t.amount)}</p>
                      <p className="text-[11px] text-orange-600">{t.merchant === 'Unknown' ? t.category : t.merchant} · {new Date(t.date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className="text-[11px] bg-white text-orange-600 font-bold border border-orange-200 px-2 py-1 rounded-full">{t.ratio}× avg</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-emerald-500 text-lg">✓</span>
                <p className="text-xs sm:text-sm text-emerald-700 font-medium">No unusually large transactions detected.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default SpendingInsightsTab;
