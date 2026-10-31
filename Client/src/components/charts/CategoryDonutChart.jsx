import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Label, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import { formatCurrency } from '../../utils/formatCurrency';
import { PieChart as PieIcon, ArrowDownRight, ArrowUpRight } from 'lucide-react';

const FALLBACK_COLORS = [
  '#4f46e5', '#06b6d4', '#f59e0b', '#10b981', '#ec4899',
  '#8b5cf6', '#f97316', '#64748b', '#ef4444', '#14b8a6'
];

export default function CategoryDonutChart({
  categories = [],
  incomeCategories = [],
  title = 'Expense Allocation',
  centerSublabel = 'Total Spent',
  className = '',
}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeMode, setActiveMode] = useState('expense'); // 'expense' | 'income'

  const activeCategories = useMemo(() => {
    if (activeMode === 'income' && incomeCategories && incomeCategories.length > 0) {
      return incomeCategories;
    }
    return categories || [];
  }, [activeMode, categories, incomeCategories]);

  // Compute normalized data and total
  const { data, total, chartConfig } = useMemo(() => {
    if (!Array.isArray(activeCategories) || activeCategories.length === 0) {
      return { data: [], total: 0, chartConfig: {} };
    }

    let sum = 0;
    const formatted = activeCategories
      .map((cat, idx) => {
        const val = Number(cat.total || cat.amount || cat.value || 0);
        sum += val;
        const color = cat.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
        const name = cat.name || cat.label || 'Other';

        return {
          name,
          value: val,
          color,
          icon: cat.icon,
        };
      })
      .filter((c) => c.value > 0);

    const config = {};
    formatted.forEach((item) => {
      config[item.name] = {
        label: item.name,
        color: item.color,
      };
    });

    return { data: formatted, total: sum, chartConfig: config };
  }, [activeCategories]);

  // Active slice or overall summary for center display
  const activeItem = activeCategory ? data.find((d) => d.name === activeCategory) : null;
  const centerDisplayValue = activeItem ? formatCurrency(activeItem.value) : formatCurrency(total);
  const centerDisplayText = activeItem
    ? activeItem.name
    : activeMode === 'income'
    ? 'Total Inflow'
    : centerSublabel;

  const hasIncomeData = incomeCategories && incomeCategories.length > 0;

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      {/* Header with Mode Toggle if incomeCategories is provided */}
      {hasIncomeData && (
        <div className="flex justify-between items-center text-xs pb-1 border-b border-gray-100">
          <span className="text-gray-500 font-medium">Distribution Flow</span>
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
            <button
              onClick={() => {
                setActiveMode('expense');
                setActiveCategory(null);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all ${
                activeMode === 'expense'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ArrowDownRight className="w-3 h-3 text-rose-500" />
              Expenses
            </button>
            <button
              onClick={() => {
                setActiveMode('income');
                setActiveCategory(null);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all ${
                activeMode === 'income'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              Income
            </button>
          </div>
        </div>
      )}

      {/* Handle Edge Case: No expense/income records */}
      {data.length === 0 || total === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[220px] bg-gray-50/60 rounded-xl border border-dashed border-gray-200 p-5 text-center">
          <div className="p-2.5 bg-white rounded-xl shadow-2xs border border-gray-100 text-gray-400 mb-2">
            <PieIcon className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-800">
            No {activeMode === 'income' ? 'Income' : 'Expense'} Categories
          </h4>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            Transactions with categories will automatically plot proportions and totals here.
          </p>
        </div>
      ) : (
        <>
          {/* Chart Canvas */}
          <div className="relative">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[190px] w-full">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => {
                        const percentage = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0;
                        return (
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="text-gray-600 font-medium">{name}:</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-gray-900">
                              <span>{formatCurrency(Number(value))}</span>
                              <span className="text-[10px] text-gray-400 font-normal">({percentage}%)</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={75}
                  strokeWidth={2}
                  stroke="#ffffff"
                  onMouseEnter={(_, index) => setActiveCategory(data[index]?.name)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer outline-hidden"
                    />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 4}
                              className="fill-gray-900 text-base sm:text-lg font-black tracking-tight"
                            >
                              {centerDisplayValue}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 14}
                              className="fill-gray-400 text-[10px] uppercase font-semibold tracking-wider"
                            >
                              {centerDisplayText}
                            </tspan>
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          {/* Compact Category Legend Breakdown List */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {data.map((item) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
              const isSelected = activeCategory === item.name;

              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setActiveCategory(item.name)}
                  onMouseLeave={() => setActiveCategory(null)}
                  className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isSelected ? 'bg-gray-100 shadow-2xs' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700 font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
