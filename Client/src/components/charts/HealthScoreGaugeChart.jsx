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
  className = '',
}) {
  const normalizedScore = Math.min(100, Math.max(0, Number(score) || 0));

  const { color, bgColor, icon: Icon } = useMemo(() => {
    if (normalizedScore >= 80) {
      return {
        color: '#10b981', // emerald-500
        bgColor: '#ecfdf5',
        icon: ShieldCheck,
      };
    } else if (normalizedScore >= 50) {
      return {
        color: '#f59e0b', // amber-500
        bgColor: '#fffbeb',
        icon: Award,
      };
    } else {
      return {
        color: '#ef4444', // rose-500
        bgColor: '#fef2f2',
        icon: AlertTriangle,
      };
    }
  }, [normalizedScore]);

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
      <div className="relative" style={{ width: size, height: size * 0.75 }}>
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
              background={{ fill: 'rgba(255, 255, 255, 0.15)' }}
              dataKey="value"
              cornerRadius={10}
              clockWise
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center Metric Text */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {normalizedScore}
            </span>
            <span className="text-xs font-semibold text-indigo-200">/100</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
              Grade {grade}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-indigo-200 text-center font-medium mt-1">
        {status} · AI-Audited
      </p>
    </div>
  );
}
