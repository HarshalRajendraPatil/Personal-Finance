import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import { formatCurrency } from '../../utils/formatCurrency';
import { Flame, CheckCircle2, AlertTriangle, Inbox } from 'lucide-react';

const chartConfig = {
  actual: {
    label: 'Actual Spend',
    color: '#6366f1',
  },
  budgetPace: {
    label: 'Expected Pace',
    color: '#94a3b8',
  },
};

export default function SpendingBurnChart({
  cashFlow = [],
  totalDays = 30,
  daysElapsed = 15,
  projectedBudget = 0,
  className = '',
}) {
  const { chartData, currentActual, currentExpected, diff, isOnTrack } = useMemo(() => {
    if (!Array.isArray(cashFlow) || cashFlow.length === 0) {
      return {
        chartData: [],
        currentActual: 0,
        currentExpected: 0,
        diff: 0,
        isOnTrack: true,
      };
    }

    const totalPeriodDays = Math.max(1, totalDays || 30);
    const validCashFlow = [...cashFlow].sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalSpentPeriod = validCashFlow.reduce((acc, c) => acc + Number(c.Expense || 0), 0);
    const targetBudget = projectedBudget > 0 ? projectedBudget : totalSpentPeriod || 1;
    const dailyPace = targetBudget / totalPeriodDays;

    let cumulative = 0;
    const data = validCashFlow.map((dayItem, idx) => {
      cumulative += Number(dayItem.Expense || 0);
      const dayNum = idx + 1;
      const expected = Math.round(dailyPace * dayNum);

      let shortLabel = dayItem.date || `D${dayNum}`;
      if (shortLabel.includes('-')) {
        const parts = shortLabel.split('-');
        if (parts.length === 3) shortLabel = `${parts[2]}/${parts[1]}`;
      }

      return {
        date: shortLabel,
        actual: cumulative,
        budgetPace: expected,
      };
    });

    const currActual = cumulative;
    const currExpected = Math.round(dailyPace * Math.min(daysElapsed, totalPeriodDays));
    const variance = currActual - currExpected;
    const onTrack = variance <= 0;

    return {
      chartData: data,
      currentActual: currActual,
      currentExpected: currExpected,
      diff: variance,
      isOnTrack: onTrack,
    };
  }, [cashFlow, totalDays, daysElapsed, projectedBudget]);

  if (chartData.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[220px] bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-5 text-center ${className}`}
      >
        <div className="p-2.5 bg-white rounded-xl shadow-2xs border border-gray-100 text-gray-400 mb-2">
          <Inbox className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-gray-700">No Spending Activity Recorded</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Daily expense transactions will map your cumulative burn rate trajectory against the expected pace line.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* KPI Header & On-Track Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Cumulative Expense Velocity
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-gray-900">
                {formatCurrency(currentActual)}
              </span>
              <span className="text-xs text-gray-400">
                vs {formatCurrency(currentExpected)} expected pace
              </span>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isOnTrack
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
          >
            {isOnTrack ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Under Pace by {formatCurrency(Math.abs(diff))}
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                Over Pace by {formatCurrency(diff)}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <ChartContainer config={chartConfig} className="h-[250px] w-full aspect-auto">
        <AreaChart data={chartData} margin={{ top: 15, right: 15, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="spendBurnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fill: '#64748b', fontSize: 10 }}
            width={65}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value, name) => {
                  const isActual = name === 'actual';
                  return (
                    <div className="flex items-center justify-between gap-3 w-full text-xs">
                      <span className="text-gray-500 font-medium">
                        {isActual ? 'Cumulative Spent' : 'Ideal Pace'}:
                      </span>
                      <span className="font-mono font-bold text-gray-900">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="budgetPace"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#spendBurnGrad)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

