import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardData } from '../../store/dashboardSlice';
import { fetchHealthScore } from '../../store/intelligenceSlice';
import { fetchSafeToSpend, fetchProactiveNudges } from '../../store/proactiveSlice';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, TrendingDown, Landmark,
  PiggyBank, CreditCard, Receipt, Building2, Target,
  ArrowUpRight, ArrowDownRight, Clock, Plus, Calendar as CalendarIcon, ArrowRight,
  Zap, Sparkles, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';

import { formatCurrency } from '../../utils/formatCurrency';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { data, isLoading, isError, message } = useSelector(state => state.dashboard);
  const { healthScore } = useSelector(state => state.intelligence);
  const { safeToSpendData, nudges } = useSelector(state => state.proactive);
  const [timeRange, setTimeRange] = useState('thisMonth');

  useEffect(() => {
    dispatch(fetchHealthScore());
    dispatch(fetchSafeToSpend());
    dispatch(fetchProactiveNudges());
    const now = new Date();
    let startDate, endDate;

    if (timeRange === 'thisWeek') {
      startDate = startOfWeek(now);
      endDate = endOfWeek(now);
    } else if (timeRange === 'thisMonth') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (timeRange === 'lastMonth') {
      const lm = subMonths(now, 1);
      startDate = startOfMonth(lm);
      endDate = endOfMonth(lm);
    } else if (timeRange === 'thisYear') {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    } else if (timeRange === 'allTime') {
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2100, 0, 1);
    }

    dispatch(fetchDashboardData({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }));
  }, [dispatch, timeRange]);

  const {
    snapshot = {},
    period = {},
    charts = { cashFlow: [], expenseCategories: [] },
    upcoming = [],
    budgets = [],
    goals = [],
    recentTransactions = []
  } = data || {};

  // ⚡ Memoize Expensive MUI Chart Datasets
  const barChartSeries = useMemo(() => {
    if (!charts?.cashFlow) return [];
    return [
      { data: charts.cashFlow.map(c => c.Income), label: 'Income', color: '#10b981' },
      { data: charts.cashFlow.map(c => c.Expense), label: 'Expense', color: '#ef4444' }
    ];
  }, [charts?.cashFlow]);

  const barChartXAxis = useMemo(() => {
    if (!charts?.cashFlow) return [{ scaleType: 'band', data: [] }];
    return [{
      scaleType: 'band',
      data: charts.cashFlow.map(c => c.date.slice(5))
    }];
  }, [charts?.cashFlow]);

  const pieChartData = useMemo(() => {
    if (!charts?.expenseCategories) return [];
    return charts.expenseCategories.map((c, i) => ({
      id: i, value: c.total, label: c.name, color: c.color || '#94a3b8'
    }));
  }, [charts?.expenseCategories]);

  const sparklineData = useMemo(() => {
    if (!snapshot?.netWorthTrend) return [];
    return snapshot.netWorthTrend.map(t => t.value);
  }, [snapshot?.netWorthTrend]);

  if (isLoading && !data) {
    return <div className="p-8 text-center text-gray-500 flex justify-center items-center h-64">Loading Dashboard...</div>;
  }
  if (isError) {
    return <div className="p-8 text-center text-red-500">Error loading dashboard: {message}</div>;
  }
  if (!data) return null;


  const KpiCard = ({ title, amount, icon: Icon, colorClass, subtitle, trend, sparkline }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(amount)}</h3>
        </div>
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 group-hover:scale-110 transition-transform`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-').replace('-100', '-600')}`} />
        </div>
      </div>

      {trend !== undefined && trend !== null && (
        <div className="flex items-center mt-2">
          {trend > 0 ? (
            <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
              <ArrowUpRight className="w-3 h-3 mr-1" /> {trend}%
            </span>
          ) : trend < 0 ? (
            <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
              <ArrowDownRight className="w-3 h-3 mr-1" /> {Math.abs(trend)}%
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">0%</span>
          )}
          <span className="text-xs text-gray-400 ml-2">vs prev period</span>
        </div>
      )}

      {subtitle && !trend && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}

      {sparkline && sparkline.length > 0 && (
        <div className="absolute -bottom-4 -left-2 -right-2 h-20 opacity-20 pointer-events-none">
          <LineChart
            series={[{ data: sparkline, showMark: false, color: '#4f46e5', area: true }]}
            xAxis={[{ data: sparkline.map((_, i) => i), scaleType: 'point', disableTicks: true, disableLine: true }]}
            leftAxis={null} bottomAxis={null} tooltip={{ trigger: 'none' }}
            margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Financial Command Center</h1>
          <p className="text-xs sm:text-sm text-gray-500">Your autonomous wealth snapshot & live guardrails.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to="/transactions" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-xs">
            <Plus className="w-4 h-4" /> <span>Add Transaction</span>
          </Link>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="flex-1 sm:flex-none bg-white border border-gray-300 text-gray-900 text-xs sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 sm:p-2.5 shadow-xs"
          >
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisYear">This Year</option>
            <option value="allTime">All Time</option>
          </select>
        </div>
      </div>

      {/* Proactive Intelligence Banner (If Critical Warnings Exist) */}
      {nudges && nudges.length > 0 && nudges.some(n => n.severity === 'CRITICAL' || n.severity === 'WARNING') && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/20 text-amber-800 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Proactive Intelligence Alert
              </p>
              <p className="text-xs sm:text-sm font-medium text-gray-800 mt-0.5">
                {nudges.find(n => n.severity === 'CRITICAL')?.title || nudges[0].title}
              </p>
            </div>
          </div>
          <Link
            to="/intelligence"
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs whitespace-nowrap"
          >
            Review Nudges &rarr;
          </Link>
        </div>
      )}

      {/* Point-in-Time Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard title="Net Worth" amount={snapshot?.netWorth || 0} icon={Landmark} colorClass="bg-indigo-100" />
        <KpiCard title="Cash Available" amount={snapshot?.cashAvailable || 0} icon={Wallet} colorClass="bg-emerald-100" />
        <KpiCard title="Total Debt" amount={snapshot?.totalDebt || 0} icon={CreditCard} colorClass="bg-rose-100" />
        <KpiCard title="Total Investments" amount={snapshot?.totalInvestments || 0} icon={TrendingUp} colorClass="bg-blue-100" />
      </div>

      {/* Period Flow Metrics + Dynamic Safe-to-Spend Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dynamic Safe-to-Spend Today Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 rounded-xl shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-300/30 px-2 py-0.5 rounded-full">
                Live Dynamic Guardrail
              </span>
              <p className="text-xs text-indigo-200 mt-2 font-medium">Safe-to-Spend Today</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white font-mono mt-0.5">
                {formatCurrency(safeToSpendData?.safeToSpendDaily || 0)}
                <span className="text-xs font-normal text-indigo-200">/day</span>
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
          </div>
          <p className="text-[11px] text-indigo-200/90 mt-2">
            After reserving for upcoming bills, EMIs, and monthly savings targets.
          </p>
        </div>

        <KpiCard title="Period Income" amount={period?.income || 0} icon={TrendingUp} colorClass="bg-emerald-100" trend={period?.comparison?.incomeChange} />
        <KpiCard title="Period Expenses" amount={period?.expense || 0} icon={TrendingDown} colorClass="bg-rose-100" trend={period?.comparison?.expenseChange} />

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Savings Rate</p>
              <h3 className="text-2xl font-bold text-blue-600">{period?.savingsRate || 0}%</h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 bg-opacity-10">
              <PiggyBank className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          {period.comparison?.savingsRateChange !== null && period.comparison?.savingsRateChange !== undefined && (
            <div className="flex items-center mt-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${period.comparison.savingsRateChange >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {period.comparison.savingsRateChange >= 0 ? '+' : ''}{period.comparison.savingsRateChange}%
              </span>
              <span className="text-xs text-gray-400 ml-2">vs prev period</span>
            </div>
          )}
        </div>
      </div>

      {/* Spending Velocity (New) */}
      {period.spendingVelocity && period.spendingVelocity.daysElapsed > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Spending Velocity</p>
              <p className="text-xs text-gray-500">Day {period.spendingVelocity.daysElapsed} of period</p>
            </div>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-gray-500 mb-1">Daily Burn Rate</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(period.spendingVelocity.dailyRate)}/day</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Projected Period Total</p>
              <p className="text-sm font-bold text-rose-600">{formatCurrency(period.spendingVelocity.projectedTotal)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Cash Flow</h3>
          {charts?.cashFlow?.length > 0 ? (
            <div className="h-80 w-full">
              <BarChart
                series={barChartSeries}
                xAxis={barChartXAxis}
                height={300}
                margin={{ top: 20, bottom: 30, left: 60, right: 10 }}
              />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              No cash flow data for this period.
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Expenses</h3>
          {pieChartData.length > 0 ? (
            <div className="h-80 w-full flex justify-center">
              <PieChart
                series={[{ data: pieChartData, innerRadius: 40, outerRadius: 100, paddingAngle: 2, cornerRadius: 4 }]}
                height={300}
                margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
                slotProps={{ legend: { hidden: true } }}
              />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              No expenses recorded.
            </div>
          )}
          <div className="mt-4 space-y-2">
            {pieChartData.map((d) => (
              <div key={d.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span className="text-gray-600">{d.label}</span>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions & Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Transactions (New) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
            <Link to="/transactions" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          {recentTransactions && recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(t => (
                    <tr key={t._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{t.merchant || 'Transfer'}</td>
                      <td className="px-4 py-3">
                        {t.category ? (
                          <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: `${t.category.color}20`, color: t.category.color }}>
                            {t.category.name}
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${t.type === 'Income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">No recent transactions found.</div>
          )}
        </div>

        {/* Right side widgets column */}
        <div className="space-y-6">
          {/* Upcoming Obligations */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" /> Upcoming (30 Days)
            </h3>
            {upcoming && upcoming.length > 0 ? (
              <div className="space-y-4">
                {upcoming.map(u => (
                  <div key={u.id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{u.title}</p>
                      <p className="text-xs text-gray-500">{new Date(u.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-bold ${u.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {u.type === 'Income' ? '+' : '-'}{formatCurrency(u.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">No upcoming bills.</div>
            )}
          </div>

          {/* Active Goals */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-400" /> Active Goals
            </h3>
            {goals && goals.length > 0 ? (
              <div className="space-y-4">
                {goals.map(g => {
                  const progress = g.targetAmount ? Math.min(100, Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)) : 0;
                  return (
                    <div key={g._id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800 truncate pr-2">{g.name}</span>
                        <span className="text-gray-500 flex-shrink-0">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">No active goals.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
