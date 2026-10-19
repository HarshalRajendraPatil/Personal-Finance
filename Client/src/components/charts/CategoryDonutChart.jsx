import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Label } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import { formatCurrency } from '../../utils/formatCurrency';
import { PieChart as PieIcon, Tag } from 'lucide-react';

const FALLBACK_COLORS = [
  '#4f46e5', '#06b6d4', '#f59e0b', '#10b981', '#ec4899',
  '#8b5cf6', '#f97316', '#64748b', '#ef4444', '#14b8a6'
];

export default function CategoryDonutChart({
  categories = [],
  title = 'Top Expenses',
  centerSublabel = 'Total Spent',
  className = '',
}) {
  const [activeCategory, setActiveCategory] = useState(null);

  // Compute normalized data and total
  const { data, total, chartConfig } = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) {
      return { data: [], total: 0, chartConfig: {} };
    }

    let sum = 0;
    const formatted = categories.map((cat, idx) => {
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
    }).filter(c => c.value > 0);

    const config = {};
    formatted.forEach((item) => {
      config[item.name] = {
        label: item.name,
        color: item.color,
      };
    });

    return { data: formatted, total: sum, chartConfig: config };
  }, [categories]);

  // Handle Edge Case: No expense records
  if (data.length === 0 || total === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-80 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-6 text-center ${className}`}>
        <div className="p-3 bg-white rounded-xl shadow-xs border border-gray-100 text-gray-400 mb-2">
          <PieIcon className="w-8 h-8" />
        </div>
        <h4 className="text-sm font-bold text-gray-700">No Expenses Recorded</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Categorized expenses will render a clean donut breakdown with proportions and center totals.
        </p>
      </div>
    );
  }

  // Active slice or overall summary for center display
  const activeItem = activeCategory ? data.find((d) => d.name === activeCategory) : null;
  const centerDisplayValue = activeItem ? formatCurrency(activeItem.value) : formatCurrency(total);
  const centerDisplayText = activeItem ? activeItem.name : centerSublabel;

  return (
    <div className={`flex flex-col justify-between ${className}`}>
      {/* Chart Canvas */}
      <div className="relative">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px] w-full">
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
              innerRadius={65}
              outerRadius={92}
              strokeWidth={3}
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
                          y={(viewBox.cy || 0) - 5}
                          className="fill-gray-900 text-lg sm:text-xl font-extrabold tracking-tight"
                        >
                          {centerDisplayValue}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 15}
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

      {/* Modern Category Legend Breakdown List */}
      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
        {data.map((item) => {
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          const isSelected = activeCategory === item.name;

          return (
            <div
              key={item.name}
              onMouseEnter={() => setActiveCategory(item.name)}
              onMouseLeave={() => setActiveCategory(null)}
              className={`flex items-center justify-between text-xs p-2 rounded-xl transition-all cursor-pointer ${
                isSelected ? 'bg-gray-100/80 shadow-2xs' : 'hover:bg-gray-50'
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
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
