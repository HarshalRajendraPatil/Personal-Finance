import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMonthlyReview } from '../../store/intelligenceSlice';
import { Loader2, Calendar as CalendarIcon, Lightbulb, AlertCircle, ArrowDown, ArrowUp, Zap, ShieldCheck, TrendingUp } from 'lucide-react';

import { formatCurrency } from '../../utils/formatCurrency';

const MonthlyReviewTab = () => {
  const dispatch = useDispatch();
  const { monthlyReview, isLoading } = useSelector(state => state.intelligence);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1); // default to last month
  const [selectedYear, setSelectedYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  useEffect(() => {
    dispatch(fetchMonthlyReview({ month: selectedMonth, year: selectedYear }));
  }, [dispatch, selectedMonth, selectedYear]);

  const handleMonthChange = (e) => {
    const [year, month] = e.target.value.split('-');
    setSelectedYear(parseInt(year));
    setSelectedMonth(parseInt(month));
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

  if (isLoading || !monthlyReview) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full flex justify-end mb-4">
          <select
            value={currentValue}
            onChange={handleMonthChange}
            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="flex justify-center items-center h-64 w-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  const { summary, topCategories, anomalies, insights, transactionCount, period } = monthlyReview;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Review for {period.name}</h2>
            <p className="text-sm text-gray-500">{transactionCount} transactions analyzed</p>
          </div>
        </div>
        <div>
          <select
            value={currentValue}
            onChange={handleMonthChange}
            className="border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 bg-gray-50 font-medium"
          >
            {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Highlights / Insights */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-blue-900 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" /> Key Insights
          </h3>
          <ul className="space-y-3">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-3 text-blue-800">
                <Zap className="w-4 h-4 mt-1 flex-shrink-0 text-blue-400" />
                <span dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
            <ArrowDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalIncome)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-full">
            <ArrowUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalExpense)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Net Flow</p>
            <p className={`text-xl font-bold ${summary.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {summary.netCashFlow > 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Spending Categories */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Spending Categories</h3>
          {topCategories.length > 0 ? (
            <div className="space-y-4">
              {topCategories.map((cat, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#3b82f6' }}></span>
                      {cat.name}
                    </span>
                    <span className="font-bold text-gray-900">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color || '#3b82f6' }}
                    ></div>
                  </div>
                  <p className="text-right text-xs text-gray-500 mt-1">{cat.percentage}% of expenses</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No expenses recorded for this month.</p>
          )}
        </div>

        {/* Anomalies */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" /> Spending Anomalies
          </h3>
          <p className="text-sm text-gray-500 mb-4">Categories where you spent &gt;50% more than your 3-month average.</p>

          {anomalies.length > 0 ? (
            <div className="space-y-3">
              {anomalies.map((anom, idx) => (
                <div key={idx} className="p-4 border border-orange-100 bg-orange-50 rounded-lg flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-orange-900">{anom.category}</h4>
                    <p className="text-xs text-orange-700 mt-1">
                      Avg: {formatCurrency(anom.average)} → Now: {formatCurrency(anom.current)}
                    </p>
                  </div>
                  <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-orange-100">
                    <span className="text-sm font-bold text-orange-600">+{anom.increase}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg border border-gray-100 border-dashed">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">No anomalies detected</p>
              <p className="text-xs text-gray-400">Your spending was consistent with past months.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
};
export default MonthlyReviewTab;
