import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../ui/chart';
import { formatCurrency } from '../../utils/formatCurrency';
import { ShieldCheck, ShieldAlert, AlertTriangle, Inbox } from 'lucide-react';

const chartConfig = {
  spent: {
    label: 'Spent',
    color: '#6366f1',
  },
  limit: {
    label: 'Budget Limit',
    color: '#cbd5e1',
  },
};

export default function BudgetComparisonChart({
  budgetPerformance = [],
  className = '',
}) {
  const processedData = useMemo(() => {
    if (!Array.isArray(budgetPerformance) || budgetPerformance.length === 0) return [];

    return budgetPerformance.map((b) => {
      const limit = Number(b.limit || 0);
      const spent = Number(b.spent || 0);
      const percentage = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;

      let status = b.status;
      if (!status) {
        if (percentage >= 100) status = 'exceeded';
        else if (percentage >= 80) status = 'near_limit';
        else status = 'safe';
      }

      // Bar color
      let barColor = '#10b981'; // emerald
      if (status === 'exceeded') barColor = '#ef4444'; // rose
      else if (status === 'near_limit') barColor = '#f59e0b'; // amber

      return {
        name: b.name.replace(/ Budget$/i, ''),
        fullName: b.name,
        spent,
        limit,
        percentage,
        status,
        barColor,
      };
    });
  }, [budgetPerformance]);

  if (processedData.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-72 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-6 text-center ${className}`}>
        <div className="p-3 bg-white rounded-xl shadow-xs border border-gray-100 text-gray-400 mb-2">
          <Inbox className="w-8 h-8" />
        </div>
        <h4 className="text-sm font-bold text-gray-700">No Active Budgets Found</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Set up budget categories to track your monthly limit guardrails and expenditure variance.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Chart Canvas */}
      <ChartContainer config={chartConfig} className="h-72 w-full aspect-auto">
        <BarChart
          data={processedData}
          layout="vertical"
          margin={{ top: 10, right: 25, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
            width={110}
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
          <ChartLegend content={<ChartLegendContent />} />
          {/* Limit Bar (Background track) */}
          <Bar
            dataKey="limit"
            fill="#e2e8f0"
            radius={[0, 6, 6, 0]}
            barSize={14}
          />
          {/* Spent Bar */}
          <Bar
            dataKey="spent"
            radius={[0, 6, 6, 0]}
            barSize={14}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.barColor} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Status Badges Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
        {processedData.map((b) => (
          <div
            key={b.fullName}
            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
              b.status === 'exceeded'
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : b.status === 'near_limit'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="min-w-0 pr-2">
              <p className="font-semibold truncate">{b.name}</p>
              <p className="text-[10px] opacity-75">
                {formatCurrency(b.spent)} of {formatCurrency(b.limit)}
              </p>
            </div>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                b.status === 'exceeded'
                  ? 'bg-rose-200 text-rose-800'
                  : b.status === 'near_limit'
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-emerald-200 text-emerald-800'
              }`}
            >
              {b.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
