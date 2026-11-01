import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMonthlyReview } from '../../store/intelligenceSlice';
import CapiseLoader from '../../components/ui/CapiseLoader';
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
  PieChart as PieChartIcon,
  Activity,
  Layers,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

import HealthScoreGaugeChart from '../../components/charts/HealthScoreGaugeChart';
import CategoryDonutChart from '../../components/charts/CategoryDonutChart';
import BudgetComparisonChart from '../../components/charts/BudgetComparisonChart';
import MonthlyCashFlowComparisonChart from '../../components/charts/MonthlyCashFlowComparisonChart';

const MonthlyReviewTab = () => {
  const dispatch = useDispatch();
  const { monthlyReview, isLoading } = useSelector((state) => state.intelligence);
  const { user } = useSelector((state) => state.auth);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const [selectedYear, setSelectedYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const docRef = useMemo(() => {
    const s = `${selectedYear}${String(selectedMonth + 1).padStart(2, '0')}`;
    const hash = Math.abs((user?.email || 'demo').split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000 + 1000);
    return `CPS-INT-${s}-${hash}`;
  }, [selectedYear, selectedMonth, user?.email]);

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
      <div className="flex flex-col items-center justify-center py-24">
        <CapiseLoader
          size="lg"
          text="Synthesizing Monthly Executive Review"
          subtext="Compiling category spending breakdowns, budget adherence, and anomalous spikes..."
        />
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

  const score = financialHealthScore?.score ?? 75;
  const grade = financialHealthScore?.grade || 'B+';
  const status = financialHealthScore?.status || 'Good';

  return (
    <div className="space-y-6 pb-12" id="monthly-review-digest">
      
      {/* ══════════════════════════════════════════════════════════════════
          PRINT-ONLY CURATED LETTERHEAD & METADATA (Visible only on print/pdf)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="print-only mb-6 pb-6 border-b-2 border-indigo-900">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-700 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-xs">
              C
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">
                Capise Autonomous Intelligence Engine
              </h1>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Executive Monthly Financial Dossier · Performance, Risk &amp; Wealth Audit
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-gray-900 text-white">
              CONFIDENTIAL DOSSIER
            </span>
            <p className="text-[11px] font-mono text-gray-500 mt-1">Ref: {docRef}</p>
          </div>
        </div>

        {/* 4-Column Metadata Block */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Account Holder</span>
            <span className="font-bold text-gray-900 truncate block">{user?.name || 'Private Client'}</span>
            <span className="text-[10px] text-gray-500 truncate block">{user?.email || 'Authorized User'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Review Cycle</span>
            <span className="font-bold text-gray-900 block">{period.name || 'Current Period'}</span>
            <span className="text-[10px] text-gray-500 block">{transactionCount} Ledger Transactions</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Health Assessment</span>
            <span className="font-bold text-gray-900 block">Grade {grade} ({score}/100)</span>
            <span className="text-[10px] text-emerald-700 font-semibold block">{status} Standing</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Generated On</span>
            <span className="font-bold text-gray-900 block">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-gray-500 block">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST
            </span>
          </div>
        </div>
      </div>

      {/* Header & Controls (Hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                Monthly Review Digest: {period.name || 'Current Period'}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                ⚡ ChadCN Audited
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Comprehensive health metrics, budget audit, anomalies, and wealth trajectory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={currentValue}
            onChange={handleMonthChange}
            className="flex-1 sm:flex-none border-gray-300 rounded-xl shadow-2xs text-xs sm:text-sm py-2 px-3 bg-gray-50 font-semibold focus:ring-indigo-500 focus:border-indigo-500"
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
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-xs transition shadow-2xs"
            title="Print / Export Executive Dossier (PDF)"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Top Banner: Financial Health Radial Gauge & Net Worth Shift */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scorecard Radial Gauge Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between print-card-dark print-avoid-break">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Financial Health Score
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
              Grade {grade}
            </span>
          </div>

          {/* ChadCN Semi-Circle Radial Speedometer Gauge */}
          <div className="my-2 z-10 flex justify-center">
            <HealthScoreGaugeChart
              score={score}
              grade={grade}
              status={status}
              size={210}
              dark={true}
            />
          </div>

          <div className="pt-3 border-t border-indigo-700/50 flex items-center justify-between text-xs text-indigo-200 relative z-10">
            <span>{transactionCount} ledger txns</span>
            <span>Savings Rate: <strong className="text-white">{summary.savingsRate || 0}%</strong></span>
          </div>

          {/* Decorative blur circle */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl pointer-events-none no-print" />
        </div>

        {/* Cashflow & Savings Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between print-card print-avoid-break">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Net Savings &amp; Cashflow
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
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
            <p
              className={`text-2xl font-black tracking-tight mt-2 ${
                (summary.netCashFlow || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {(summary.netCashFlow || 0) >= 0 ? '+' : ''}
              {formatCurrency(summary.netCashFlow || 0)}
            </p>
          </div>

          {/* ChadCN Mini Inflow vs Outflow Bar Chart */}
          <div className="my-2">
            <MonthlyCashFlowComparisonChart
              totalIncome={summary.totalIncome || 0}
              totalExpense={summary.totalExpense || 0}
              netCashFlow={summary.netCashFlow || 0}
              savingsRate={summary.savingsRate || 0}
            />
          </div>
        </div>

        {/* Net Worth Trajectory Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between print-card print-avoid-break">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Wealth Trajectory
              </span>
              <Scale className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-2xl font-black text-gray-900 tracking-tight">
                {formatCurrency(netWorthChange.endNetWorth || 0)}
              </p>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (netWorthChange.delta || 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {(netWorthChange.delta || 0) >= 0 ? '+' : ''}
                {formatCurrency(netWorthChange.delta || 0)}
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2 text-xs my-3">
            <div className="flex justify-between text-gray-500">
              <span>Start of Month:</span>
              <span className="font-semibold text-gray-800">{formatCurrency(netWorthChange.startNetWorth || 0)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Period Net Delta:</span>
              <span className={`font-bold ${(netWorthChange.delta || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {(netWorthChange.delta || 0) >= 0 ? '+' : ''}{formatCurrency(netWorthChange.delta || 0)}
              </span>
            </div>
            <div className="flex justify-between text-gray-500 pt-1 border-t border-gray-200">
              <span>End of Month:</span>
              <span className="font-extrabold text-gray-900">{formatCurrency(netWorthChange.endNetWorth || 0)}</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 text-center">
            Computed from active loans, investments, cash reserves &amp; cards.
          </p>
        </div>
      </div>

      {/* AI Key Insights & Recommendations */}
      {(insights.length > 0 || recommendations.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print-avoid-break">
          {/* Insights */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 border border-indigo-100 rounded-2xl p-5 shadow-xs print-card print-avoid-break">
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
          <div className="bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/60 border border-purple-100 rounded-2xl p-5 shadow-xs print-card print-avoid-break">
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

      {/* Top Spending Categories & Budget Guardrail Audit with ChadCN Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-avoid-break">
        {/* Top Categories: Donut Chart with Center Metric */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between print-card print-avoid-break">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
                Top Spending Categories
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Share of total monthly expenditure</p>
            </div>
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              {topCategories.length} Categories
            </span>
          </div>

          <CategoryDonutChart
            categories={topCategories}
            title="Monthly Expense Split"
            centerSublabel="Month Outflow"
          />
        </div>

        {/* Budget Guardrail Performance: ChadCN Horizontal Bar Chart (Rendered for screen; replaced by full unpaginated audit matrix on print) */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between print-card print-avoid-break no-print">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Budget Guardrails Audit
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Monthly limit versus actual expenditure</p>
            </div>
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              Limit Compliance
            </span>
          </div>

          <BudgetComparisonChart budgetPerformance={budgetPerformance} />
        </div>
      </div>

      {/* ── Print-Only: Full Category Allocation & Budget Compliance Audit Table ── */}
      {budgetPerformance.length > 0 && (
        <div className="print-only bg-white rounded-xl border border-gray-200 p-5 mb-6 print-card print-avoid-break">
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Category Allocation &amp; Budget Compliance Audit
            </h3>
            <span className="text-xs font-semibold text-gray-500">
              Audit Period: {period.name || 'Current Month'}
            </span>
          </div>
          <table className="min-w-full text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-gray-900 bg-gray-50 text-gray-700">
                <th className="text-left py-2 px-2 font-bold uppercase tracking-wider">Category</th>
                <th className="text-right py-2 px-2 font-bold uppercase tracking-wider">Budget Ceiling</th>
                <th className="text-right py-2 px-2 font-bold uppercase tracking-wider">Actual Spend</th>
                <th className="text-right py-2 px-2 font-bold uppercase tracking-wider">Variance / Headroom</th>
                <th className="text-center py-2 px-2 font-bold uppercase tracking-wider">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {budgetPerformance.map((bp, idx) => {
                const variance = bp.limit - bp.spent;
                return (
                  <tr key={idx}>
                    <td className="py-2 px-2 font-sans font-semibold text-gray-900">{bp.categoryName}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{formatCurrency(bp.limit)}</td>
                    <td className="py-2 px-2 text-right font-bold text-gray-900">{formatCurrency(bp.spent)}</td>
                    <td className={`py-2 px-2 text-right font-bold ${variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                    </td>
                    <td className="py-2 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${variance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {variance >= 0 ? 'Compliant ✓' : 'Exceeded ⚠'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Anomalies & Largest Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-avoid-break">
        {/* Anomalies */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 print-card print-avoid-break">
          <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
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
            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-xl border border-gray-100 border-dashed">
              <ShieldCheck className="w-6 h-6 text-emerald-500 mb-1" />
              <p className="text-xs font-semibold text-gray-700">No Anomalies Detected</p>
              <p className="text-[11px] text-gray-400">Spending remained aligned with your past rolling averages.</p>
            </div>
          )}
        </div>

        {/* Largest Transactions */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 print-card print-avoid-break">
          <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Top Largest Outflows
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
                  <span className="font-bold text-gray-900 shrink-0 font-mono">{formatCurrency(tx.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">No expenses found for this month.</p>
          )}
        </div>
      </div>

      {/* ── Print-Only: Institutional Certification Footer ── */}
      <div className="print-only mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 space-y-3 print-avoid-break">
        <div className="flex justify-between items-end">
          <div className="max-w-md">
            <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
              Autonomous Intelligence Audit Endorsement
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
              This dossier was synthesized autonomously by the Capise Financial Intelligence Core for period {period.name || 'Current Cycle'}.
              Financial health assessment reflects liquidity coverage, debt service ratios, savings rate velocity, and budget compliance.
            </p>
          </div>
          <div className="text-right border-t border-gray-400 pt-1 w-48">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Certified Audit Seal</span>
            <span className="font-serif italic text-gray-800 text-sm">Capise Intelligence</span>
          </div>
        </div>
        <p className="text-[9px] text-gray-400 text-center pt-2">
          Capise Autonomous Wealth Platform (https://capise.app) · Executive Dossier Reference: {docRef} · Confidential Client Record
        </p>
      </div>
    </div>
  );
};

export default MonthlyReviewTab;
