import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSpendingInsights } from '../../store/intelligenceSlice';
import {
  Loader2, TrendingUp, TrendingDown, Zap, Store, AlertTriangle,
  Calendar, RefreshCw, BarChart2, ArrowUpRight, ArrowDownRight, Minus,
  PieChart as PieChartIcon, Clock, Target, AlertCircle
} from 'lucide-react';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';

import { formatCurrency } from '../../utils/formatCurrency';

const SpendingInsightsTab = () => {
  const dispatch = useDispatch();
  const { spendingInsights: data, isLoadingInsights } = useSelector(state => state.intelligence);

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
    dayOfWeekBreakdown, weekendVsWeekday, topMerchants,
    categoryTrends, transactionSizeMetrics, anomalousTransactions,
    subscriptionCandidates, burnRate, insights,
    timeOfDayBreakdown, essentialVsDiscretionary, spendingProjection,
    topTransactions, categoryConcentration
  } = data;

  const maxDaySpend = Math.max(...dayOfWeekBreakdown.map(d => d.total), 1);
  const insightIcons = {
    'calendar': Calendar,
    'trending-up': TrendingUp,
    'trending-down': TrendingDown,
    'store': Store,
    'arrow-up': ArrowUpRight,
    'alert': AlertCircle,
    'pie': PieChartIcon
  };

  return (
    <div className="space-y-6">

      {/* Behavioral Insight Cards */}
      {insights && insights.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6">
          <h3 className="flex items-center gap-2 font-bold text-indigo-900 mb-4 text-base">
            <Zap className="w-4 h-4 text-yellow-500" /> Behavioral Observations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((insight, idx) => {
              const Icon = insightIcons[insight.icon] || Zap;
              return (
                <div key={idx} className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-indigo-50">
                  <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                    <Icon className="w-4 h-4 text-indigo-500" />
                  </div>
                  <p
                    className="text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: insight.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {spendingProjection && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Projected Spend</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(spendingProjection.projectedTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">Spent so far: {formatCurrency(spendingProjection.spentSoFar)}</p>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Avg Transaction</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(transactionSizeMetrics.currentAvg)}</p>
          {transactionSizeMetrics.changePct !== null && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${parseFloat(transactionSizeMetrics.changePct) >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {parseFloat(transactionSizeMetrics.changePct) >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(transactionSizeMetrics.changePct)}% vs last month
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Weekend Avg/Day</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(weekendVsWeekday.weekendDailyAvg)}</p>
          <p className="text-xs text-gray-400 mt-1">Weekday: {formatCurrency(weekendVsWeekday.weekdayDailyAvg)}/day</p>
        </div>
        {categoryConcentration && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Concentration Index</p>
            <p className={`text-xl font-bold ${categoryConcentration.isDiversified ? 'text-emerald-600' : 'text-rose-600'}`}>
              {categoryConcentration.hhi.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {categoryConcentration.top2SharePct}% in top 2 categories
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Essential vs Discretionary Split */}
        {essentialVsDiscretionary && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-500" /> Essential vs Discretionary
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="h-48 w-48">
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
                  height={200} width={200}
                  margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                  slotProps={{ legend: { hidden: true } }}
                />
              </div>
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-medium text-emerald-700 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Essential</span>
                    <span className="font-bold text-emerald-900">{formatCurrency(essentialVsDiscretionary.essential)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${essentialVsDiscretionary.essentialPct}%` }}></div></div>
                  <p className="text-xs text-gray-500 mt-1">{essentialVsDiscretionary.essentialPct}% of total</p>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-medium text-amber-700 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Discretionary</span>
                    <span className="font-bold text-amber-900">{formatCurrency(essentialVsDiscretionary.discretionary)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${essentialVsDiscretionary.discretionaryPct}%` }}></div></div>
                  <p className="text-xs text-gray-500 mt-1">{essentialVsDiscretionary.discretionaryPct}% of total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time of Day Analysis */}
        {timeOfDayBreakdown && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Spending by Time of Day
            </h3>
            <div className="h-48 w-full">
              <BarChart
                series={[{ data: timeOfDayBreakdown.map(t => t.total), color: '#3b82f6', label: 'Amount' }]}
                xAxis={[{ scaleType: 'band', data: timeOfDayBreakdown.map(t => t.label) }]}
                height={200}
                margin={{ top: 10, bottom: 20, left: 60, right: 10 }}
              />
            </div>
            <div className="flex justify-between mt-4">
              {timeOfDayBreakdown.map(t => (
                <div key={t.slot} className="text-center">
                  <p className="text-xs text-gray-500">{t.label}</p>
                  <p className="text-sm font-bold text-gray-900">{t.count} txns</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day-of-Week Heatmap */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" /> Spending by Day of Week
          </h3>
          <div className="space-y-3">
            {dayOfWeekBreakdown.map((d) => {
              const pct = maxDaySpend > 0 ? (d.total / maxDaySpend) * 100 : 0;
              const isWeekend = d.day === 'Sat' || d.day === 'Sun';
              return (
                <div key={d.day} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold w-8 ${isWeekend ? 'text-orange-500' : 'text-gray-500'}`}>{d.day}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-5 rounded-full flex items-center justify-end pr-2 transition-all duration-700 ${isWeekend ? 'bg-orange-400' : 'bg-indigo-400'}`}
                      style={{ width: `${pct}%`, minWidth: pct > 0 ? '1rem' : 0 }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-24 text-right">{formatCurrency(d.total)}</span>
                  <span className="text-xs text-gray-400 w-12 text-right">{d.count} txns</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Merchant Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
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
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800 truncate">{m.name === 'Unknown' ? '(No merchant)' : m.name}</span>
                        <span className="font-bold text-gray-900 ml-2 flex-shrink-0">{formatCurrency(m.total)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{m.count} txns · avg {formatCurrency(m.avg)}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Trends */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" /> Category Trends (vs Last Month)
          </h3>
          <div className="space-y-3">
            {categoryTrends.length > 0 ? categoryTrends.map((cat) => {
              const change = cat.changePct !== null ? parseFloat(cat.changePct) : null;
              return (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{cat.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(cat.current)} this month</p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${
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
          {/* Top 5 Transactions (New) */}
          {topTransactions && topTransactions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-500" /> Largest Transactions
              </h3>
              <div className="space-y-3">
                {topTransactions.map((t, i) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-300">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.merchant}</p>
                        <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()} · {t.category}</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anomalous Transactions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Anomalies Detected
            </h3>
            <p className="text-xs text-gray-400 mb-3">Transactions &gt;2× your average transaction size this month</p>
            {anomalousTransactions.length > 0 ? (
              <div className="space-y-2">
                {anomalousTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg">
                    <div>
                      <p className="text-sm font-bold text-orange-900">{formatCurrency(t.amount)}</p>
                      <p className="text-xs text-orange-600">{t.merchant === 'Unknown' ? t.category : t.merchant} · {new Date(t.date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className="text-xs bg-white text-orange-600 font-bold border border-orange-200 px-2 py-1 rounded-full">{t.ratio}× avg</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-emerald-500 text-xl">✓</span>
                <p className="text-sm text-emerald-700 font-medium">No unusually large transactions detected.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default SpendingInsightsTab;
