import { useMemo } from 'react';
import {
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
} from '../ui/chart';
import { formatCurrency } from '../../utils/formatCurrency';
import { Landmark, ArrowUpRight, ArrowDownRight, Inbox } from 'lucide-react';

const chartConfig = {
  netWorth: {
    label: 'Net Worth',
    color: '#6366f1',
  },
};

export default function NetWorthTrendChart({
  trendData = [],
  currentNetWorth = 0,
  className = '',
}) {
  const processedData = useMemo(() => {
    if (!Array.isArray(trendData) || trendData.length === 0) return [];

    return trendData.map((item) => {
      let dateLabel = item.date || '';
      try {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) {
          dateLabel = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }
      } catch {
        // fallback
      }

      return {
        dateLabel,
        rawDate: item.date,
        netWorth: Number(item.value || item.netWorth || 0),
      };
    });
  }, [trendData]);

  // Delta calculation from first to last point
  const delta = useMemo(() => {
    if (processedData.length < 2) return null;
    const first = processedData[0].netWorth;
    const last = processedData[processedData.length - 1].netWorth;
    const diff = last - first;
    const pct = first !== 0 ? ((diff / Math.abs(first)) * 100).toFixed(1) : 0;
    return { diff, pct: Number(pct) };
  }, [processedData]);

  if (processedData.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[220px] bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-5 text-center ${className}`}>
        <div className="p-2.5 bg-white rounded-xl shadow-2xs border border-gray-100 text-gray-400 mb-2">
          <Landmark className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-gray-700">No Net Worth History Yet</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Monthly automated balance snapshots will populate your historical wealth curve.
        </p>
      </div>
    );
  }

  const isNetPositive = currentNetWorth >= 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with KPI and Delta */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Current Net Worth Position
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {formatCurrency(currentNetWorth)}
            </h3>
            {delta && (
              <span
                className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                  delta.diff >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {delta.diff >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                )}
                {delta.diff >= 0 ? '+' : ''}
                {formatCurrency(delta.diff)} ({delta.pct}%)
              </span>
            )}
          </div>
        </div>
        <span className="text-[11px] text-gray-400 font-medium">
          6-Month Progression Timeline
        </span>
      </div>

      {/* Chart Canvas */}
      <ChartContainer config={chartConfig} className="h-[250px] w-full aspect-auto">
        <AreaChart data={processedData} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isNetPositive ? '#10b981' : '#6366f1'} stopOpacity={0.4} />
              <stop offset="95%" stopColor={isNetPositive ? '#10b981' : '#6366f1'} stopOpacity={0.0} />
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
            width={70}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value) => (
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span className="text-gray-500 font-medium">Net Worth:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {formatCurrency(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke={isNetPositive ? '#10b981' : '#6366f1'}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#netWorthGrad)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
