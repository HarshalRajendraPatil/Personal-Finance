import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../ui/chart';
import { formatCurrency } from '../../utils/formatCurrency';
import { BarChart3, TrendingUp, Inbox } from 'lucide-react';

const chartConfig = {
  Income: {
    label: 'Income',
    color: '#10b981',
  },
  Expense: {
    label: 'Expense',
    color: '#ef4444',
  },
  Net: {
    label: 'Net Flow',
    color: '#6366f1',
  },
};

export default function CashFlowChart({ cashFlow = [], className = '' }) {
  const [chartType, setChartType] = useState('bars'); // 'bars' | 'netArea'

  // Format and sanitize incoming data
  const processedData = useMemo(() => {
    if (!Array.isArray(cashFlow) || cashFlow.length === 0) return [];

    return cashFlow.map((item) => {
      const income = Number(item.Income || item.income || 0);
      const expense = Number(item.Expense || item.expense || 0);
      const net = income - expense;

      // Extract short date display (e.g. "15 Oct" or "10-15")
      let dateLabel = item.date || '';
      try {
        if (dateLabel.includes('-')) {
          const parts = dateLabel.split('-');
          if (parts.length === 3) {
            dateLabel = `${parts[2]}/${parts[1]}`;
          } else if (parts.length === 2) {
            dateLabel = `${parts[1]}`;
          }
        }
      } catch {
        // fallback
      }

      return {
        ...item,
        dateLabel,
        Income: income,
        Expense: expense,
        Net: net,
      };
    });
  }, [cashFlow]);

  // Totals for quick badge summary
  const totals = useMemo(() => {
    return processedData.reduce(
      (acc, curr) => ({
        income: acc.income + curr.Income,
        expense: acc.expense + curr.Expense,
        net: acc.net + curr.Net,
      }),
      { income: 0, expense: 0, net: 0 }
    );
  }, [processedData]);

  // Edge Case: Empty or zero data
  if (processedData.length === 0 || (totals.income === 0 && totals.expense === 0)) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[220px] bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-5 text-center ${className}`}>
        <div className="p-2.5 bg-white rounded-xl shadow-2xs border border-gray-100 text-gray-400 mb-2">
          <Inbox className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-gray-700">No Cash Flow Data Available</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Transactions recorded for this selected time window will dynamically plot your inflow, outflow, and net balance.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Controls & Mini Metrics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setChartType('bars')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              chartType === 'bars'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Income vs Outflow
          </button>
          <button
            onClick={() => setChartType('netArea')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              chartType === 'netArea'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Net Flow Area
          </button>
        </div>

        {/* Aggregate Net Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Period Net:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded-full text-xs ${
              totals.net >= 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {totals.net >= 0 ? '+' : ''}
            {formatCurrency(totals.net)}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <ChartContainer config={chartConfig} className="h-[250px] w-full aspect-auto">
        {chartType === 'bars' ? (
          <BarChart data={processedData} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(v) => formatCurrency(v).replace('₹', '₹')}
              tick={{ fill: '#64748b', fontSize: 11 }}
              width={65}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="text-gray-500 font-medium capitalize">{name}</span>
                      <span className="font-mono font-bold text-gray-900">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="Income"
              fill="url(#incomeGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="Expense"
              fill="url(#expenseGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        ) : (
          <AreaChart data={processedData} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(v) => formatCurrency(v)}
              tick={{ fill: '#64748b', fontSize: 11 }}
              width={65}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value) => (
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="text-gray-500 font-medium">Net Flow</span>
                      <span
                        className={`font-mono font-bold ${
                          Number(value) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {Number(value) >= 0 ? '+' : ''}
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="Net"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#netFill)"
            />
          </AreaChart>
        )}
      </ChartContainer>
    </div>
  );
}
