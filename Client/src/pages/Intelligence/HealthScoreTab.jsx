import { useSelector } from 'react-redux';
import { Loader2, TrendingUp, AlertTriangle, ShieldCheck, PieChart } from 'lucide-react';

import { formatCurrency } from '../../utils/formatCurrency';

const HealthScoreTab = () => {
  const { healthScore, isLoading } = useSelector(state => state.intelligence);

  if (isLoading || !healthScore) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const { score, pillars, metrics } = healthScore;
  console.log("healt", healthScore)

  // Determine score color and status
  let scoreColor = 'text-green-500';
  let strokeColor = '#22c55e'; // green-500
  let statusText = 'Excellent';
  let statusDesc = 'Your finances are in great shape!';

  if (score < 50) {
    scoreColor = 'text-red-500';
    strokeColor = '#ef4444'; // red-500
    statusText = 'Needs Attention';
    statusDesc = 'You have significant areas for improvement.';
  } else if (score < 80) {
    scoreColor = 'text-yellow-500';
    strokeColor = '#eab308'; // yellow-500
    statusText = 'Fair';
    statusDesc = 'You are doing okay, but can optimize further.';
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getPillarIcon = (key) => {
    switch (key) {
      case 'savings': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'debt': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'cash': return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'budget': return <PieChart className="w-5 h-5 text-purple-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Score & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Main Score Widget */}
        <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center">
          <h2 className="text-lg font-bold text-gray-700 mb-6">Overall Health Score</h2>

          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96" cy="96" r={radius}
                stroke="currentColor" strokeWidth="12" fill="transparent"
                className="text-gray-100"
              />
              {/* Progress Circle */}
              <circle
                cx="96" cy="96" r={radius}
                stroke={strokeColor} strokeWidth="12" fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Score Text */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-5xl font-black ${scoreColor}`}>{score}</span>
              <span className="text-sm font-medium text-gray-400 mt-1">out of 100</span>
            </div>
          </div>

          <div className="mt-6">
            <h3 className={`text-xl font-bold ${scoreColor}`}>{statusText}</h3>
            <p className="text-sm text-gray-500 mt-1">{statusDesc}</p>
          </div>
        </div>

        {/* Pillars Grid */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(pillars).map(([key, pillar]) => (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    {getPillarIcon(key)}
                  </div>
                  <h3 className="font-semibold text-gray-800">{pillar.label}</h3>
                </div>
                <span className="text-2xl font-bold text-gray-900">{pillar.value}</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-500">Pillar Score</span>
                  <span className="font-bold text-gray-700">{pillar.score} / {pillar.max}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${pillar.score === pillar.max ? 'bg-green-500' : pillar.score > pillar.max / 2 ? 'bg-blue-500' : 'bg-red-500'}`}
                    style={{ width: `${(pillar.score / pillar.max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Underlying Metrics Summary */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 sm:p-6">
        <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4">Underlying Metrics (Last 6 Months Avg)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Avg Monthly Income</p>
            <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(metrics.monthlyIncome)}</p>
          </div>
          <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Avg Monthly Expense</p>
            <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(metrics.monthlyExpense)}</p>
          </div>
          <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Liquid Cash</p>
            <p className="text-base sm:text-lg font-bold text-blue-600">{formatCurrency(metrics.liquidCash)}</p>
          </div>
          <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl">
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Debt Remaining</p>
            <p className="text-base sm:text-lg font-bold text-rose-600">{formatCurrency(metrics.totalDebtRemaining)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthScoreTab;
