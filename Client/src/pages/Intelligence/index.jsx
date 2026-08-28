import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchHealthScore } from '../../store/intelligenceSlice';
import HealthScoreTab from './HealthScoreTab';
import MonthlyReviewTab from './MonthlyReviewTab';
import SpendingInsightsTab from './SpendingInsightsTab';
import ForecastingTab from './ForecastingTab';
import { Activity, FileText, BarChart2, TrendingUp } from 'lucide-react';

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intelligence & Analytics</h1>
          <p className="text-gray-500 text-sm">Advanced financial health tracking, anomaly detection, and forecasting</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 flex-shrink-0 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-2">
        {activeTab === 'health' && <HealthScoreTab />}
        {activeTab === 'insights' && <SpendingInsightsTab />}
        {activeTab === 'forecast' && <ForecastingTab />}
        {activeTab === 'review' && <MonthlyReviewTab />}
      </div>
    </div>
  );
};

export default Intelligence;
