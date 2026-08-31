import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import CSVImporterModal from '../../components/CSVImporterModal';
import { FileDown, TrendingUp, TrendingDown, Wallet, Percent, Filter } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const getDefaultRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = now.toISOString().split('T')[0];
  return { start, end };
};

// ── Main Reports Page ─────────────────────────────────────────────────
const Reports = () => {
  const { accounts } = useSelector(s => s.accounts);
  const { user } = useSelector(s => s.auth);
  const defaultRange = getDefaultRange();
  const [filters, setFilters] = useState({ startDate: defaultRange.start, endDate: defaultRange.end, type: 'Expense', account: '' });
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [trend, setTrend] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [catPage, setCatPage] = useState(1);
  const [catPageSize, setCatPageSize] = useState(8);

  const maxCat = useMemo(() => Math.max(...byCategory.map(c => c.total), 1), [byCategory]);

  const pagedByCategory = useMemo(() => {
    if (catPageSize === 'all') return byCategory;
    const start = (catPage - 1) * catPageSize;
    return byCategory.slice(start, start + catPageSize);
  }, [byCategory, catPage, catPageSize]);


  const fetchReports = async (activeFilters = filters) => {
    setIsLoading(true);
    try {
      const [s, c, t] = await Promise.all([
        api.get('/reports/summary', { params: { startDate: activeFilters.startDate, endDate: activeFilters.endDate } }),
        api.get('/reports/by-category', { params: { startDate: activeFilters.startDate, endDate: activeFilters.endDate, type: activeFilters.type } }),
        api.get('/reports/monthly-trend', { params: { months: 6 } }),
      ]);
      setSummary(s.data);
      setByCategory(c.data);
      setTrend(t.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchReports(filters); }, []);

  const handleExportCSV = async () => {
    const params = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate });
    if (filters.account) params.set('account', filters.account);
    try {
      const response = await api.get(`/reports/export-csv?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `transactions-${filters.startDate}-${filters.endDate}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const handlePrint = () => window.print();

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8" id="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Financial summaries and data export.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={() => setCsvImportOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs">
            <FileDown className="w-4 h-4 mr-1.5" />Import CSV
          </button>
          <button onClick={handleExportCSV} className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs">
            <FileDown className="w-4 h-4 mr-1.5" />Export CSV
          </button>
          <button onClick={handlePrint} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-xs">
            🖨 Print / PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Account</label>
            <select value={filters.account} onChange={e => setFilters(f => ({ ...f, account: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">All Accounts</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={() => fetchReports(filters)} disabled={isLoading} className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center transition-colors">
            <Filter className="w-4 h-4 mr-1.5" />{isLoading ? 'Loading...' : 'Apply'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            { label: 'Total Income', value: fmt(summary.income), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Expenses', value: fmt(summary.expenses), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Net Savings', value: fmt(summary.net), icon: Wallet, color: summary.net >= 0 ? 'text-blue-600' : 'text-red-600', bg: 'bg-blue-50' },
            { label: 'Savings Rate', value: `${summary.savingsRate}%`, icon: Percent, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <div className={`p-1.5 rounded-lg ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Category Breakdown</h2>
          <div className="flex space-x-1">
            {['Expense', 'Income'].map(t => (
              <button key={t} onClick={() => { 
                const newFilters = { ...filters, type: t }; 
                setFilters(newFilters); 
                fetchReports(newFilters); 
              }}
                className={`px-3 py-1 text-xs rounded-full font-medium transition ${filters.type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
            ))}
          </div>
        </div>
        {byCategory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No {filters.type.toLowerCase()} data for this period.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {pagedByCategory.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-700">{item.category?.name || 'Uncategorized'}</span>
                      <span className="text-xs text-gray-400">({item.count} txns)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-gray-900">{fmt(item.total)}</span>
                      <span className="text-xs text-gray-400">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${(item.total / maxCat) * 100}%`, backgroundColor: item.category?.color || '#3b82f6' }} />
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              currentPage={catPage}
              totalItems={byCategory.length}
              pageSize={catPageSize}
              onPageChange={setCatPage}
              onPageSizeChange={setCatPageSize}
              pageSizeOptions={[5, 8, 12, 'all']}
              itemLabel="categories"
            />
          </div>
        )}
      </div>

      {/* Monthly Trend Table */}
      {trend.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Monthly Trend (Last 6 Months)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Month</th>
                <th className="text-right py-2 text-xs font-semibold text-green-600 uppercase">Income</th>
                <th className="text-right py-2 text-xs font-semibold text-red-600 uppercase">Expenses</th>
                <th className="text-right py-2 text-xs font-semibold text-blue-600 uppercase">Net</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {trend.map((row) => {
                  const net = row.income - row.expenses;
                  return (
                    <tr key={row.month} className="hover:bg-gray-50">
                      <td className="py-3 text-gray-700 font-medium">{row.month}</td>
                      <td className="py-3 text-right text-green-600">{fmt(row.income)}</td>
                      <td className="py-3 text-right text-red-600">{fmt(row.expenses)}</td>
                      <td className={`py-3 text-right font-semibold ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`@media print { button, .no-print { display: none !important; } }`}</style>

      <CSVImporterModal isOpen={csvImportOpen} onClose={() => { setCsvImportOpen(false); fetchReports(filters); }} />
    </div>
  );
};


export default Reports;
