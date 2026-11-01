import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import CSVImporterModal from '../../components/CSVImporterModal';
import {
  FileDown, TrendingUp, TrendingDown, Wallet, Percent, Filter,
  Printer, Activity, ShieldCheck, Calendar, CheckCircle2
} from 'lucide-react';

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
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(filters);
  }, []);

  const handleExportCSV = async () => {
    const params = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate });
    if (filters.account) params.set('account', filters.account);
    try {
      const response = await api.get(`/reports/export-csv?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${filters.startDate}-${filters.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedAccountName = accounts.find(a => a._id === filters.account)?.name || 'Consolidated (All Accounts)';
  const totalLiquidBalance = accounts.filter(a => !a.isArchived).reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  // Generate deterministic audit doc reference
  const docRef = useMemo(() => {
    const s = filters.startDate ? filters.startDate.replace(/-/g, '') : '2026';
    return `CPS-REP-${s}-${Math.abs((user?.email || 'demo').split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000 + 1000)}`;
  }, [filters.startDate, user?.email]);

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8" id="reports-page">
      
      {/* ══════════════════════════════════════════════════════════════════
          PRINT-ONLY CURATED LETTERHEAD & METADATA (Visible only on print/pdf)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="print-only mb-6 pb-6 border-b-2 border-indigo-900">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-700 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-xs">
              C
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">
                Capise Wealth &amp; Financial Intelligence
              </h1>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Official Comprehensive Financial Audit &amp; Ledger Report
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-gray-900 text-white">
              CONFIDENTIAL
            </span>
            <p className="text-[11px] font-mono text-gray-500 mt-1">Ref: {docRef}</p>
          </div>
        </div>

        {/* 4-Box Metadata Grid */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Client</span>
            <span className="font-bold text-gray-900 truncate block">{user?.name || 'Private Client'}</span>
            <span className="text-[10px] text-gray-500 truncate block">{user?.email || 'Authorized User'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Audit Period</span>
            <span className="font-bold text-gray-900 block">
              {new Date(filters.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-gray-500 block">
              to {new Date(filters.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Account Scope</span>
            <span className="font-bold text-gray-900 block truncate">{selectedAccountName}</span>
            <span className="text-[10px] text-gray-500 block">Currency: INR (₹)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Generated On</span>
            <span className="font-bold text-gray-900 block">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-gray-500 block">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST
            </span>
          </div>
        </div>
      </div>

      {/* ── Screen Header (Hidden on print) ── */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Financial velocity, category distribution, and printable statements.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setCsvImportOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center px-3.5 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs font-medium"
          >
            <FileDown className="w-4 h-4 mr-1.5 text-gray-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center px-3.5 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs font-medium"
          >
            <FileDown className="w-4 h-4 mr-1.5 text-gray-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs font-semibold"
            title="Export / Print Professional PDF Report"
          >
            <Printer className="w-4 h-4 mr-2" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* ── Screen Filters (Hidden on print) ── */}
      <div className="no-print bg-white rounded-xl shadow-xs border border-gray-100 p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Filter by Account</label>
            <select
              value={filters.account}
              onChange={e => setFilters(f => ({ ...f, account: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            >
              <option value="">All Accounts</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => fetchReports(filters)}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center transition-colors font-semibold"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            <span>{isLoading ? 'Loading...' : 'Apply Filters'}</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards (Curated for print & screen) ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 print-avoid-break">
          {[
            { label: 'Total Inflow (Income)', value: fmt(summary.income), icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { label: 'Total Outflow (Expense)', value: fmt(summary.expenses), icon: TrendingDown, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
            { label: 'Net Retained Savings', value: fmt(summary.net), icon: Wallet, color: summary.net >= 0 ? 'text-indigo-700' : 'text-rose-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
            { label: 'Capital Retention Rate', value: `${summary.savingsRate}%`, icon: Percent, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`bg-white rounded-xl shadow-2xs border ${border} p-4 print-card flex flex-col justify-between`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                <div className={`p-1.5 rounded-lg ${bg} no-print`}><Icon className={`w-4 h-4 ${color}`} /></div>
              </div>
              <p className={`text-lg sm:text-2xl font-black font-mono tracking-tight ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Category Breakdown (Paginated on screen, FULL TABLE on print) ── */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-5 sm:p-6 mb-6 print-card print-avoid-break">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Category Allocation Breakdown ({filters.type})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive distribution across all recorded financial transactions
            </p>
          </div>
          <div className="flex space-x-1 no-print">
            {['Expense', 'Income'].map(t => (
              <button
                key={t}
                onClick={() => {
                  const newFilters = { ...filters, type: t };
                  setFilters(newFilters);
                  fetchReports(newFilters);
                }}
                className={`px-3 py-1 text-xs rounded-full font-semibold transition ${filters.type === t ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {byCategory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No {filters.type.toLowerCase()} data recorded for this period.</p>
        ) : (
          <>
            {/* 1. Screen View: Visual Paginated Bars */}
            <div className="no-print space-y-4">
              <div className="space-y-3">
                {pagedByCategory.map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-700">{item.category?.name || 'Uncategorized'}</span>
                        <span className="text-xs text-gray-400">({item.count} txns)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-900 font-mono">{fmt(item.total)}</span>
                        <span className="text-xs text-gray-400 font-mono">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${(item.total / maxCat) * 100}%`, backgroundColor: item.category?.color || '#4f46e5' }}
                      />
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

            {/* 2. Print View: Complete Full Tabular Matrix */}
            <div className="print-only">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-900 bg-gray-50 text-gray-700">
                    <th className="text-left py-2 px-2 font-bold uppercase tracking-wider">#</th>
                    <th className="text-left py-2 px-2 font-bold uppercase tracking-wider">Category</th>
                    <th className="text-center py-2 px-2 font-bold uppercase tracking-wider">Transactions</th>
                    <th className="text-right py-2 px-2 font-bold uppercase tracking-wider">Total Amount</th>
                    <th className="text-right py-2 px-2 font-bold uppercase tracking-wider">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {byCategory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-1.5 px-2 font-mono text-gray-400">{idx + 1}</td>
                      <td className="py-1.5 px-2 font-semibold text-gray-900 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.category?.color || '#4f46e5' }}
                        />
                        <span>{item.category?.name || 'Uncategorized'}</span>
                      </td>
                      <td className="py-1.5 px-2 text-center text-gray-600 font-mono">{item.count}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-gray-900 font-mono">{fmt(item.total)}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-semibold text-gray-700">{item.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-900 font-bold bg-gray-50 text-gray-900">
                    <td colSpan={2} className="py-2 px-2 uppercase tracking-wide">Category Total</td>
                    <td className="py-2 px-2 text-center font-mono">{byCategory.reduce((s, c) => s + c.count, 0)}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmt(byCategory.reduce((s, c) => s + c.total, 0))}</td>
                    <td className="py-2 px-2 text-right font-mono">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Monthly Trend Trajectory ── */}
      {trend.length > 0 && (
        <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-5 sm:p-6 mb-6 print-card print-avoid-break">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Multi-Month Historical Trajectory</h2>
              <p className="text-xs text-gray-500 mt-0.5">Rolling 6-month financial performance and capital accumulation</p>
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              6-Month Audit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900 bg-gray-50 text-gray-700">
                  <th className="text-left py-2 px-3 font-bold uppercase tracking-wider text-xs">Calendar Month</th>
                  <th className="text-right py-2 px-3 font-bold uppercase tracking-wider text-xs text-emerald-700">Gross Income</th>
                  <th className="text-right py-2 px-3 font-bold uppercase tracking-wider text-xs text-rose-700">Expenditures</th>
                  <th className="text-right py-2 px-3 font-bold uppercase tracking-wider text-xs text-indigo-700">Net Surplus / Deficit</th>
                  <th className="text-right py-2 px-3 font-bold uppercase tracking-wider text-xs">Savings %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {trend.map((row) => {
                  const net = row.income - row.expenses;
                  const rate = row.income > 0 ? Math.round((net / row.income) * 100) : 0;
                  return (
                    <tr key={row.month} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-gray-900 font-sans font-bold">{row.month}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{fmt(row.income)}</td>
                      <td className="py-2.5 px-3 text-right text-rose-700 font-semibold">{fmt(row.expenses)}</td>
                      <td className={`py-2.5 px-3 text-right font-black ${net >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                        {net >= 0 ? '+' : ''}{fmt(net)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-gray-700">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${rate >= 20 ? 'bg-emerald-100 text-emerald-800' : rate > 0 ? 'bg-indigo-50 text-indigo-800' : 'bg-rose-100 text-rose-800'}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-900 bg-gray-50 font-bold font-mono text-gray-900">
                  <td className="py-2.5 px-3 font-sans uppercase tracking-wide">Period Aggregate</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700">{fmt(trend.reduce((s, r) => s + r.income, 0))}</td>
                  <td className="py-2.5 px-3 text-right text-rose-700">{fmt(trend.reduce((s, r) => s + r.expenses, 0))}</td>
                  <td className="py-2.5 px-3 text-right text-indigo-700">
                    {fmt(trend.reduce((s, r) => s + (r.income - r.expenses), 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {Math.round(
                      (trend.reduce((s, r) => s + (r.income - r.expenses), 0) /
                        Math.max(trend.reduce((s, r) => s + r.income, 0), 1)) *
                        100
                    )}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Print-Only: Liquid Reserves & Account Balances Snapshot ── */}
      <div className="print-only bg-white rounded-xl border border-gray-200 p-5 mb-6 print-card print-avoid-break">
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Verified Liquid Reserves &amp; Account Balances
          </h2>
          <span className="text-xs font-mono font-bold text-indigo-700">
            Total Liquid Cash: {fmt(totalLiquidBalance)}
          </span>
        </div>
        <table className="min-w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase">
              <th className="text-left py-1.5 font-bold">Account Name</th>
              <th className="text-left py-1.5 font-bold">Type</th>
              <th className="text-right py-1.5 font-bold">Current Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {accounts.filter(a => !a.isArchived).map((acc) => (
              <tr key={acc._id}>
                <td className="py-1.5 font-sans font-semibold text-gray-900">{acc.name}</td>
                <td className="py-1.5 text-gray-500 font-sans">{acc.type}</td>
                <td className="py-1.5 text-right font-bold text-gray-900">{fmt(acc.currentBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Print-Only: Executive Verification & Disclaimer ── */}
      <div className="print-only mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 space-y-3 print-avoid-break">
        <div className="flex justify-between items-end">
          <div className="max-w-md">
            <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
              Institutional Audit Certificate
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
              This financial ledger dossier was compiled autonomously by the Capise Financial Intelligence Engine.
              Balances and transactions reflect double-entry verified ledger state. For personal wealth management and tax compliance.
            </p>
          </div>
          <div className="text-right border-t border-gray-400 pt-1 w-48">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Authorized Officer</span>
            <span className="font-serif italic text-gray-800 text-sm">Capise Autonomous AI</span>
          </div>
        </div>
        <p className="text-[9px] text-gray-400 text-center pt-2">
          Capise Autonomous Wealth Platform (https://capise.app) · Document Verification Ref: {docRef} · Confidential Client Record
        </p>
      </div>

      <CSVImporterModal isOpen={csvImportOpen} onClose={() => { setCsvImportOpen(false); fetchReports(filters); }} />
    </div>
  );
};

export default Reports;
