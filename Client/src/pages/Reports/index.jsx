import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { FileDown, TrendingUp, TrendingDown, Wallet, Percent, Filter } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const getDefaultRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = now.toISOString().split('T')[0];
  return { start, end };
};

// ── CSV Column Mapper ─────────────────────────────────────────────────
const CSVImporter = ({ onClose }) => {
  const { accounts } = useSelector(s => s.accounts);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({ date: '', amount: '', description: '', type: '' });
  const [defaultAccount, setDefaultAccount] = useState('');
  const [defaultType, setDefaultType] = useState('Expense');
  const [step, setStep] = useState(1); // 1=upload, 2=map, 3=preview

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(l => l.trim());
      const hdrs = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map(l => l.split(',').map(c => c.trim().replace(/"/g, '')));
      setHeaders(hdrs);
      setRows(data.slice(0, 5)); // preview first 5
      setStep(2);
    };
    reader.readAsText(f);
  };

  const buildPreviewRows = () => {
    return rows.map(row => ({
      date: mapping.date ? row[headers.indexOf(mapping.date)] : '',
      amount: mapping.amount ? parseFloat(row[headers.indexOf(mapping.amount)]) || 0 : 0,
      description: mapping.description ? row[headers.indexOf(mapping.description)] : '',
      type: mapping.type ? row[headers.indexOf(mapping.type)] : defaultType,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Import from CSV</h2>
        <p className="text-sm text-gray-500 mb-5">Upload any bank statement CSV and map the columns.</p>

        {step === 1 && (
          <div>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
              <FileDown className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload CSV file</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">Detected columns: <span className="font-medium">{headers.join(', ')}</span></p>
            <div className="grid grid-cols-2 gap-3">
              {[['date', 'Date Column'], ['amount', 'Amount Column'], ['description', 'Description Column']].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700">{label}</label>
                  <select value={mapping[key]} onChange={e => setMapping(m => ({ ...m, [key]: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm">
                    <option value="">— Skip —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Account</label>
                <select value={defaultAccount} onChange={e => setDefaultAccount(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="">— None —</option>
                  {accounts.filter(a => !a.isArchived).map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Type</label>
                <select value={defaultType} onChange={e => setDefaultType(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Preview (first 5 rows)</p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-3 py-2 text-left text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left text-gray-600">Amount</th>
                    <th className="px-3 py-2 text-left text-gray-600">Description</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {buildPreviewRows().map((r, i) => (
                      <tr key={i}><td className="px-3 py-2 text-gray-700">{r.date}</td><td className="px-3 py-2 text-gray-700">{r.amount}</td><td className="px-3 py-2 text-gray-500 truncate max-w-xs">{r.description}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg">
              ⚠️ CSV import creates <strong>draft review entries</strong>. Full bulk-import backend integration requires manual review per transaction for accuracy.
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-5 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          {step === 2 && (
            <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Import (Coming Soon)
            </button>
          )}
        </div>
      </div>
    </div>
  );
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

  const maxCat = byCategory.length > 0 ? byCategory[0].total : 1;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8" id="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Financial summaries and data export.</p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button onClick={() => setCsvImportOpen(true)} className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            <FileDown className="w-4 h-4 mr-1.5" />Import CSV
          </button>
          <button onClick={handleExportCSV} className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            <FileDown className="w-4 h-4 mr-1.5" />Export CSV
          </button>
          <button onClick={handlePrint} className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
            🖨 Print / PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Account</label>
            <select value={filters.account} onChange={e => setFilters(f => ({ ...f, account: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Accounts</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={() => fetchReports(filters)} disabled={isLoading} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center">
            <Filter className="w-4 h-4 mr-1.5" />{isLoading ? 'Loading...' : 'Apply'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
          <div className="space-y-3">
            {byCategory.slice(0, 10).map((item, i) => (
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

      {csvImportOpen && <CSVImporter onClose={() => setCsvImportOpen(false)} />}
    </div>
  );
};

export default Reports;
