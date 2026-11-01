import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchHealthScore } from '../../store/intelligenceSlice';
import HealthScoreTab from './HealthScoreTab';
import MonthlyReviewTab from './MonthlyReviewTab';
import SpendingInsightsTab from './SpendingInsightsTab';
import ForecastingTab from './ForecastingTab';
import { Activity, FileText, BarChart2, TrendingUp, Printer } from 'lucide-react';

const Intelligence = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('health');

  useEffect(() => {
    dispatch(fetchHealthScore());
  }, [dispatch]);

  const tabs = [
    { id: 'health', label: 'Health Score', icon: Activity },
    { id: 'insights', label: 'Spending Insights', icon: BarChart2 },
    { id: 'forecast', label: 'Forecasting', icon: TrendingUp },
    { id: 'review', label: 'Monthly Review', icon: FileText },
  ];

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Intelligence &amp; Analytics</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-slate-400">Advanced financial health tracking, anomaly detection, and forecasting</p>
        </div>
        <div className="no-print flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              if (activeTab !== 'review') setActiveTab('review');
              setTimeout(() => window.print(), 200);
            }}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Export / Print Executive Monthly Dossier"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-800 no-print">
        <nav className="-mb-px flex space-x-3 sm:space-x-6 overflow-x-auto pb-1 -mx-1 px-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 flex-shrink-0 transition-colors cursor-pointer ${
                activeTab === id
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === 'health' && <HealthScoreTab />}
        {activeTab === 'insights' && <SpendingInsightsTab />}
        {activeTab === 'forecast' && <ForecastingTab />}
        {activeTab === 'review' && <MonthlyReviewTab />}
      </div>
    </div>
  );
};

export default Intelligence;
