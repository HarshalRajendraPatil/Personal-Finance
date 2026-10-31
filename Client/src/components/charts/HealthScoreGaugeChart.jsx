import { useMemo } from 'react';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { Award, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function HealthScoreGaugeChart({
  score = 75,
  grade = 'B+',
  status = 'Good',
  size = 200,
  dark = false,
  className = '',
}) {
  const normalizedScore = Math.min(100, Math.max(0, Number(score) || 0));

  const { color, badgeClasses, icon: Icon } = useMemo(() => {
    if (normalizedScore >= 80) {
      return {
        color: '#10b981', // emerald-500
        badgeClasses: dark
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        icon: ShieldCheck,
      };
    } else if (normalizedScore >= 50) {
      return {
        color: '#f59e0b', // amber-500
        badgeClasses: dark
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          : 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: Award,
      };
    } else {
      return {
        color: '#ef4444', // rose-500
        badgeClasses: dark
          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          : 'bg-rose-50 text-rose-700 border border-rose-200',
        icon: AlertTriangle,
      };
    }
  }, [normalizedScore, dark]);

  const chartData = [
    {
      name: 'Score',
      value: normalizedScore,
      fill: color,
    },
  ];

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Gauge Canvas */}
      <div className="relative" style={{ width: size, height: size * 0.72 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="75%"
            innerRadius="72%"
            outerRadius="100%"
            barSize={14}
            data={chartData}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            {/* Background Track */}
            <RadialBar
              background={{ fill: dark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0' }}
              dataKey="value"
              cornerRadius={10}
              clockWise
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center Metric Text */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-4xl sm:text-5xl font-black tracking-tight ${
                dark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {normalizedScore}
            </span>
            <span className={`text-xs font-semibold ${dark ? 'text-indigo-200' : 'text-gray-400'}`}>
              /100
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClasses}`}
            >
              Grade {grade}
            </span>
          </div>
        </div>
      </div>

      <p className={`text-xs text-center font-medium mt-1 ${dark ? 'text-indigo-200' : 'text-gray-600'}`}>
        {status} · AI-Audited
      </p>
    </div>
  );
}
