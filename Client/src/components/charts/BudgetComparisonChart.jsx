import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import { formatCurrency } from '../../utils/formatCurrency';
import { ShieldAlert, AlertTriangle, CheckCircle2, Inbox, List, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const chartConfig = {
  spent: {
    label: 'Spent',
    color: '#6366f1',
  },
  limit: {
    label: 'Budget Limit',
    color: '#e2e8f0',
  },
};

export default function BudgetComparisonChart({
  budgetPerformance = [],
  className = '',
}) {
  const [viewMode, setViewMode] = useState('progress'); // 'progress' | 'chart'

  const processedData = useMemo(() => {
    if (!Array.isArray(budgetPerformance) || budgetPerformance.length === 0) return [];

    return budgetPerformance.map((b) => {
      const rawName = b.name || b.category?.name || 'Budget';
      const cleanName = rawName.replace(/ Budget$/i, '');
      const limit = Number(b.limit || 0);
      const spent = Number(b.spent || 0);
      const percentage = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;
      const headroom = limit - spent;

      let status = b.status;
      if (!status) {
        if (percentage >= 100) status = 'exceeded';
        else if (percentage >= 80) status = 'near_limit';
        else status = 'safe';
      }

      let barColor = '#10b981'; // emerald
      if (status === 'exceeded') barColor = '#ef4444'; // rose
      else if (status === 'near_limit') barColor = '#f59e0b'; // amber

      return {
        id: b._id || cleanName,
        name: cleanName,
        fullName: rawName,
        categoryName: b.category?.name || '',
        categoryColor: b.category?.color || barColor,
        spent,
        limit,
        percentage,
        headroom,
        status,
        barColor,
      };
    });
  }, [budgetPerformance]);

  // Edge Case: 0 budgets
  if (processedData.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[220px] bg-gray-50/60 rounded-xl border border-dashed border-gray-200 p-5 text-center ${className}`}
      >
        <div className="p-2.5 bg-white rounded-xl shadow-2xs border border-gray-100 text-gray-400 mb-2">
          <Inbox className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-gray-800">No Active Budgets</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">
          Set up budget limits to track expenditures and prevent overspending.
        </p>
        <Link
          to="/budgets"
          className="mt-3 inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
        >
          + Create Budget
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* View Toggle */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 font-medium">
          {processedData.length} {processedData.length === 1 ? 'Budget' : 'Budgets'} Monitored
        </span>
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
          <button
            onClick={() => setViewMode('progress')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all ${
              viewMode === 'progress'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <List className="w-3 h-3" />
            Headroom
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all ${
              viewMode === 'chart'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            Bars
          </button>
        </div>
      </div>

      {viewMode === 'progress' ? (
        /* Highly Legible Headroom Progress View */
        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
          {processedData.map((b) => (
            <div
              key={b.id}
              className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-white hover:shadow-2xs transition-all space-y-1.5"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate" title={b.fullName}>
                    {b.name}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    <span className="font-semibold text-gray-800">{formatCurrency(b.spent)}</span>
                    <span className="text-gray-400"> of </span>
                    <span>{formatCurrency(b.limit)}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      b.status === 'exceeded'
                        ? 'bg-rose-100 text-rose-800'
                        : b.status === 'near_limit'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {b.percentage}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {b.headroom >= 0
                      ? `${formatCurrency(b.headroom)} left`
                      : `Over by ${formatCurrency(Math.abs(b.headroom))}`}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200/70 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, b.percentage)}%`,
                    backgroundColor: b.barColor,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Recharts Horizontal Comparison Bar View */
        <div className="h-[240px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
            <BarChart
              data={processedData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 600 }}
                width={85}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value, name, item) => {
                      const dataObj = item?.payload || {};
                      return (
                        <div className="space-y-1 w-full text-xs">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-gray-500 font-medium capitalize">{name}:</span>
                            <span className="font-mono font-bold text-gray-900">
                              {formatCurrency(Number(value))}
                            </span>
                          </div>
                          {name === 'spent' && (
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-100 text-[11px]">
                              <span className="text-gray-400">Utilization:</span>
                              <span
                                className={`font-bold ${
                                  dataObj.status === 'exceeded'
                                    ? 'text-rose-600'
                                    : dataObj.status === 'near_limit'
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {dataObj.percentage}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar dataKey="limit" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="spent" radius={[0, 4, 4, 0]} barSize={12}>
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.barColor} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
