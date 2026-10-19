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
} from '../ui/chart';
import { formatCurrency } from '../../utils/formatCurrency';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

const chartConfig = {
  amount: {
    label: 'Amount',
    color: '#6366f1',
  },
};

export default function MonthlyCashFlowComparisonChart({
  totalIncome = 0,
  totalExpense = 0,
  netCashFlow = 0,
  savingsRate = 0,
  className = '',
}) {
  const chartData = useMemo(() => {
    return [
      {
        name: 'Total Inflow',
        amount: Math.max(0, Number(totalIncome) || 0),
        color: '#10b981', // emerald-500
        type: 'inflow',
      },
      {
        name: 'Total Outflow',
        amount: Math.max(0, Number(totalExpense) || 0),
        color: '#ef4444', // rose-500
        type: 'outflow',
      },
      {
        name: 'Net Retained',
        amount: Math.max(0, Number(netCashFlow) || 0),
        color: netCashFlow >= 0 ? '#6366f1' : '#f43f5e', // indigo / rose
        type: 'net',
      },
    ];
  }, [totalIncome, totalExpense, netCashFlow]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Visual Chart */}
      <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 15, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fill: '#64748b', fontSize: 11 }}
            width={65}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name, item) => (
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span className="text-gray-600 font-medium">{item?.payload?.name}:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {formatCurrency(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="amount"
            radius={[8, 8, 0, 0]}
            maxBarSize={48}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Mini KPI Cards below chart */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
          <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Inflow</p>
          <p className="text-xs sm:text-sm font-extrabold text-emerald-700 mt-0.5">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100">
          <p className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Outflow</p>
          <p className="text-xs sm:text-sm font-extrabold text-rose-700 mt-0.5">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
          <p className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">Saved ({savingsRate}%)</p>
          <p className="text-xs sm:text-sm font-extrabold text-indigo-700 mt-0.5">
            {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
          </p>
        </div>
      </div>
    </div>
  );
}
