import { useSelector } from 'react-redux';
import { TrendingUp, AlertTriangle, ShieldCheck, PieChart, Activity, Wallet, CreditCard } from 'lucide-react';
import HealthScoreGaugeChart from '../../components/charts/HealthScoreGaugeChart';
import { formatCurrency } from '../../utils/formatCurrency';
import CapiseLoader from '../../components/ui/CapiseLoader';

const HealthScoreTab = () => {
  const { healthScore, isLoading } = useSelector(state => state.intelligence);

  if (isLoading || !healthScore) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <CapiseLoader
          size="lg"
          text="Auditing Financial Health Score"
          subtext="Calculating multi-pillar solvency, liquidity cushion, and debt resilience..."
        />
      </div>
    );
  }

  const { score = 75, pillars = {}, metrics = {} } = healthScore;

  // Grade calculation
  let grade = 'B+';
  let statusText = 'Good Shape';
  if (score >= 90) {
    grade = 'A+';
    statusText = 'Superb Financial Fortress';
  } else if (score >= 80) {
    grade = 'A';
    statusText = 'Excellent Resilience';
  } else if (score >= 70) {
    grade = 'B+';
    statusText = 'Healthy & Stable';
  } else if (score >= 50) {
    grade = 'B';
    statusText = 'Fair with Optimization Gaps';
  } else {
    grade = 'C';
    statusText = 'Needs Immediate Attention';
  }

  const getPillarIcon = (key) => {
    switch (key) {
      case 'savings': return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'debt': return <CreditCard className="w-4 h-4 text-rose-500" />;
      case 'cash': return <Wallet className="w-4 h-4 text-indigo-600" />;
      case 'budget': return <PieChart className="w-4 h-4 text-purple-600" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Section: Score & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Main Score Widget using ChadCN Radial Gauge */}
        <div className="md:col-span-1 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="w-full flex justify-between items-center z-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Financial Health Audit
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
              Grade {grade}
            </span>
          </div>

          <div className="my-2 z-10 w-full flex justify-center">
            <HealthScoreGaugeChart
              score={score}
              grade={grade}
              status={statusText}
              size={220}
              dark={true}
            />
          </div>

          <p className="text-xs text-indigo-200/90 z-10 border-t border-indigo-700/50 pt-3 w-full">
            Weighted across savings velocity, debt obligations, liquidity buffer &amp; budget compliance.
          </p>

          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Pillars Grid */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(pillars).map(([key, pillar]) => {
            const pct = pillar.max > 0 ? Math.round((pillar.score / pillar.max) * 100) : 0;
            return (
              <div
                key={key}
                className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                      {getPillarIcon(key)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{pillar.label}</h3>
                      <p className="text-[11px] text-gray-400">Current: {pillar.value}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">
                    {pillar.score} / {pillar.max} pts
                  </span>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between text-[11px] font-medium text-gray-500 mb-1">
                    <span>Performance Efficiency</span>
                    <span className="font-bold text-gray-800">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-600' : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Underlying Metrics Summary */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Underlying Rolling Metrics (6-Month Average)</h3>
            <p className="text-xs text-gray-400 mt-0.5">Core baseline used to compute algorithmic resilience</p>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
            Live Telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Avg Monthly Income</p>
            <p className="text-lg font-black text-gray-900">{formatCurrency(metrics.monthlyIncome || 0)}</p>
          </div>
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Avg Monthly Expense</p>
            <p className="text-lg font-black text-gray-900">{formatCurrency(metrics.monthlyExpense || 0)}</p>
          </div>
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Liquid Cash Reserves</p>
            <p className="text-lg font-black text-emerald-600">{formatCurrency(metrics.liquidCash || 0)}</p>
          </div>
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Debt Obligations</p>
            <p className="text-lg font-black text-rose-600">{formatCurrency(metrics.totalDebtRemaining || 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthScoreTab;
