import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMonthlyReview } from '../../store/intelligenceSlice';
import {
  Loader2,
  Calendar as CalendarIcon,
  Lightbulb,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Zap,
  ShieldCheck,
  TrendingUp,
  Award,
  Scale,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const MonthlyReviewTab = () => {
  const dispatch = useDispatch();
  const { monthlyReview, isLoading } = useSelector((state) => state.intelligence);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const [selectedYear, setSelectedYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchMonthlyReview({ month: selectedMonth, year: selectedYear }));
  }, [dispatch, selectedMonth, selectedYear]);

  const handleMonthChange = (e) => {
    const [year, month] = e.target.value.split('-');
    setSelectedYear(parseInt(year, 10));
    setSelectedMonth(parseInt(month, 10));
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dispatch(fetchMonthlyReview({ month: selectedMonth, year: selectedYear, refresh: true })).unwrap();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const value = `${y}-${m}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label, m, y });
  }

  const currentValue = `${selectedYear}-${selectedMonth}`;

  if (isLoading && !monthlyReview) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-gray-500">Generating Monthly Financial Review Digest...</p>
      </div>
    );
  }

  const {
    summary = {},
    topCategories = [],
    anomalies = [],
    insights = [],
    recommendations = [],
    budgetPerformance = [],
    netWorthChange = {},
    financialHealthScore = { score: 75, grade: 'B+', status: 'Good' },
    largestTransactions = [],
    transactionCount = 0,
    period = {},
  } = monthlyReview || {};

  const score = financialHealthScore.score || 75;
  const grade = financialHealthScore.grade || 'B+';
  const status = financialHealthScore.status || 'Good';

  return (
    <div className="space-y-6" id="monthly-review-digest">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Monthly Review Digest: {period.name || 'Current Period'}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                ⚡ Auto-Digested
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Comprehensive performance score, budget audit, anomalies, and wealth trajectory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={currentValue}
            onChange={handleMonthChange}
            className="flex-1 sm:flex-none border-gray-300 rounded-xl shadow-2xs text-xs sm:text-sm py-2 px-3 bg-gray-50 font-medium focus:ring-indigo-500 focus:border-indigo-500"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleForceRefresh}
            disabled={isRefreshing}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition"
            title="Re-compute Digest"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition"
            title="Print / Export PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Banner: Financial Health Scorecard & Net Worth Shift */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scorecard Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                Financial Health Score
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
                Grade {grade}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight">{score}</span>
              <span className="text-indigo-300 text-lg font-medium">/ 100</span>
            </div>
            <p className="text-xs text-indigo-200 mt-1 font-medium">{status} · Based on savings &amp; budget adherence</p>
          </div>

          <div className="mt-5 pt-4 border-t border-indigo-700/50 flex items-center justify-between text-xs text-indigo-200 relative z-10">
            <span>{transactionCount} ledger txns</span>
            <span>Savings Rate: <strong>{summary.savingsRate || 0}%</strong></span>
          </div>

          {/* Decorative blur circle */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Cashflow & Savings Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Net Savings &amp; Cashflow
            </span>
            <div className="mt-3 flex items-baseline justify-between">
              <p
                className={`text-3xl font-extrabold ${
                  (summary.netCashFlow || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {(summary.netCashFlow || 0) >= 0 ? '+' : ''}
                {formatCurrency(summary.netCashFlow || 0)}
              </p>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${
                  (summary.savingsRate || 0) >= 20
                    ? 'bg-emerald-100 text-emerald-800'
                    : (summary.savingsRate || 0) > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {summary.savingsRate || 0}% Savings Rate
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100 text-xs">
            <div>
              <p className="text-gray-400">Total Inflow</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{formatCurrency(summary.totalIncome || 0)}</p>
            </div>
            <div>
              <p className="text-gray-400">Total Outflow</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{formatCurrency(summary.totalExpense || 0)}</p>
            </div>
          </div>
        </div>

        {/* Net Worth Trajectory Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Wealth Trajectory
              </span>
              <Scale className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-3xl font-extrabold text-gray-900">
                {formatCurrency(netWorthChange.endNetWorth || 0)}
              </p>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${
                  (netWorthChange.delta || 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {(netWorthChange.delta || 0) >= 0 ? '+' : ''}
                {formatCurrency(netWorthChange.delta || 0)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <span>
              Start of Month:{' '}
              <strong className="text-gray-800">{formatCurrency(netWorthChange.startNetWorth || 0)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* AI Key Insights & Recommendations */}
      {(insights.length > 0 || recommendations.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Insights */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 border border-indigo-100 rounded-2xl p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-950 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500" />
              Key AI Financial Insights
            </h3>
            <ul className="space-y-2.5 text-xs text-indigo-900">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-600 fill-indigo-600" />
                  <span
                    dangerouslySetInnerHTML={{
                      __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-indigo-950">$1</strong>'),
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/60 border border-purple-100 rounded-2xl p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-sm font-bold text-purple-950 mb-3">
              <Award className="w-4 h-4 text-purple-600" />
              Actionable Recommendations
            </h3>
            <ul className="space-y-2.5 text-xs text-purple-900">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-purple-600" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Top Spending Categories & Budget Guardrail Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Top Spending Categories
            </h3>
            <span className="text-xs text-gray-400">Share of Total Outflow</span>
          </div>

          {topCategories.length > 0 ? (
            <div className="space-y-4">
              {topCategories.map((cat, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-800 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color || '#4f46e5' }}
                      />
                      {cat.name}
                    </span>
                    <span className="text-gray-900">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor: cat.color || '#4f46e5',
                      }}
                    />
                  </div>
                  <p className="text-right text-[10px] text-gray-400 mt-0.5">{cat.percentage}% of expenses</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">No expenses recorded for this month.</p>
          )}
        </div>

        {/* Budget Guardrail Performance Audit */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Budget Guardrails Audit
            </h3>
            <span className="text-xs text-gray-400">Limit Compliance</span>
          </div>

          {budgetPerformance.length > 0 ? (
            <div className="space-y-3">
              {budgetPerformance.map((b, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    b.status === 'exceeded'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : b.status === 'near_limit'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {formatCurrency(b.spent)} of {formatCurrency(b.limit)} ({b.percentage}%)
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      b.status === 'exceeded'
                        ? 'bg-rose-200 text-rose-800'
                        : b.status === 'near_limit'
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {b.status === 'exceeded' ? 'Exceeded' : b.status === 'near_limit' ? 'Near Limit' : 'Within Limit'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">No active budgets were configured for this month.</p>
          )}
        </div>
      </div>

      {/* Anomalies & Largest Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomalies */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Spending Spikes &amp; Anomalies
          </h3>
          <p className="text-xs text-gray-500 mb-4">Categories exceeding your 3-month rolling baseline by &gt;50%.</p>

          {anomalies.length > 0 ? (
            <div className="space-y-2.5">
              {anomalies.map((anom, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-amber-200 bg-amber-50 rounded-xl flex justify-between items-center text-xs text-amber-900"
                >
                  <div>
                    <h4 className="font-bold">{anom.category}</h4>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      3-Mo Avg: {formatCurrency(anom.average)} → Spent: {formatCurrency(anom.current)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                    +{anom.increase}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-50 rounded-xl border border-gray-100 border-dashed">
              <ShieldCheck className="w-6 h-6 text-emerald-500 mb-1" />
              <p className="text-xs font-semibold text-gray-700">No Anomalies Detected</p>
              <p className="text-[11px] text-gray-400">Spending remained aligned with your past rolling averages.</p>
            </div>
          )}
        </div>

        {/* Largest Transactions */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Top 5 Largest Outflows
          </h3>
          <p className="text-xs text-gray-500 mb-4">Single largest expense items recorded during this review cycle.</p>

          {largestTransactions.length > 0 ? (
            <div className="divide-y divide-gray-100 text-xs">
              {largestTransactions.map((tx, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-gray-800 truncate">{tx.merchant}</p>
                    <p className="text-[11px] text-gray-400">
                      {tx.categoryName} · {new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="font-bold text-gray-900 flex-shrink-0">{formatCurrency(tx.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">No expenses found for this month.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyReviewTab;
