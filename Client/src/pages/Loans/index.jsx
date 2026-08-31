import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLoans, createLoan, updateLoan, deleteLoan, addPayment, syncLoanEmis, clearSyncMessage } from '../../store/loanSlice';
import { fetchAccounts } from '../../store/accountSlice';
import * as loanSvc from '../../services/loanService';
import Pagination from '../../components/Pagination';
import { Plus, Building2, ChevronDown, ChevronUp, Edit2, Trash2, CreditCard, Calendar, IndianRupee, X, Zap, CheckCircle2, RefreshCw } from 'lucide-react';


const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const LOAN_TYPES = ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Gold Loan', 'Business Loan', 'Other'];
const TYPE_COLORS = {
  'Home Loan': '#3b82f6', 'Car Loan': '#f97316', 'Personal Loan': '#8b5cf6',
  'Education Loan': '#10b981', 'Gold Loan': '#f59e0b', 'Business Loan': '#ec4899', 'Other': '#64748b',
};

// ── Loan Form Modal ───────────────────────────────────────────────────
const LoanFormModal = ({ isOpen, onClose, loan = null }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector(s => s.accounts);
  const { isLoading } = useSelector(s => s.loans);
  const [form, setForm] = useState({
    name: '', type: 'Personal Loan', lender: '', principal: '', interestRate: '',
    tenureMonths: '', startDate: '', account: '', debitAccount: '', autoDebit: false,
    debitDay: 1, notes: ''
  });
  const [localError, setLocalError] = useState('');

  // Live EMI preview
  const emi = (() => {
    const p = parseFloat(form.principal);
    const r = parseFloat(form.interestRate) / 100 / 12;
    const n = parseInt(form.tenureMonths);
    if (!p || !n) return null;
    if (!r) return (p / n).toFixed(2);
    return ((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)).toFixed(2);
  })();

  useEffect(() => {
    setLocalError('');
    if (loan) {
      setForm({
        name: loan.name, type: loan.type, lender: loan.lender || '',
        principal: loan.principal, interestRate: loan.interestRate, tenureMonths: loan.tenureMonths,
        startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : '',
        account: loan.account?._id || loan.account || '',
        debitAccount: loan.debitAccount?._id || loan.debitAccount || loan.account?._id || '',
        autoDebit: loan.autoDebit || false,
        debitDay: loan.debitDay || 1,
        notes: loan.notes || '',
      });
    } else {
      setForm({
        name: '', type: 'Personal Loan', lender: '', principal: '', interestRate: '',
        tenureMonths: '', startDate: new Date().toISOString().split('T')[0],
        account: '', debitAccount: '', autoDebit: false, debitDay: 1, notes: ''
      });
    }
  }, [loan, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      const payload = {
        ...form,
        principal: parseFloat(form.principal),
        interestRate: parseFloat(form.interestRate),
        tenureMonths: parseInt(form.tenureMonths),
        account: form.account || null,
        debitAccount: form.autoDebit ? (form.debitAccount || form.account || null) : null,
        autoDebit: Boolean(form.autoDebit),
        debitDay: parseInt(form.debitDay || 1),
      };
      if (loan) await dispatch(updateLoan({ id: loan._id, data: payload })).unwrap();
      else await dispatch(createLoan(payload)).unwrap();
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-5">{loan ? 'Edit Loan' : 'Add Loan'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Loan Name</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. HDFC Home Loan, SBI Car Loan" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Loan Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                {LOAN_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lender / Bank</label>
              <input value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))} placeholder="HDFC Bank, SBI..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Principal (₹)</label>
              <input required type="number" step="1" min="1" value={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Interest Rate (% p.a.)</label>
              <input required type="number" step="0.01" min="0" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tenure (months)</label>
              <input required type="number" step="1" min="1" value={form.tenureMonths} onChange={e => setForm(f => ({ ...f, tenureMonths: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          {emi && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-blue-700">Estimated EMI</span>
              <span className="text-lg font-bold text-blue-800">₹{parseFloat(emi).toLocaleString('en-IN')}/month</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" value={form.startDate} required onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Linked Account (optional)</label>
              <select value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                <option value="">None</option>
                {accounts.filter(a => !a.isArchived).map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Automated EMI Section */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3.5 space-y-3">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoDebit}
                onChange={e => setForm(f => ({ ...f, autoDebit: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-semibold text-indigo-950">⚡ Enable Automated EMI Auto-Debit</span>
            </label>
            <p className="text-xs text-indigo-700/90 leading-relaxed">
              When enabled, Capise's daemon automatically posts your EMI expense on the scheduled day, calculates reducing-balance interest vs principal split, and debits your bank account.
            </p>
            {form.autoDebit && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-indigo-900">Debit Day of Month (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.debitDay}
                    onChange={e => setForm(f => ({ ...f, debitDay: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-indigo-900">Debit Bank Account</label>
                  <select
                    value={form.debitAccount || form.account}
                    onChange={e => setForm(f => ({ ...f, debitAccount: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.filter(a => !a.isArchived).map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : loan ? 'Update' : 'Add Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Pay EMI Modal ──────────────────────────────────────────────────────
const PayEmiModal = ({ isOpen, onClose, loan }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector(s => s.accounts);
  const { isLoading } = useSelector(s => s.loans);
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '', accountId: '', bookTransaction: true });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError('');
    if (loan) setForm(f => ({ ...f, amount: loan.emiAmount?.toString() || '', date: new Date().toISOString().split('T')[0], accountId: loan.account?._id || '' }));
  }, [isOpen, loan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (form.bookTransaction && !form.accountId) { setLocalError('Please select an account.'); return; }
    try {
      await dispatch(addPayment({ id: loan._id, data: { ...form, amount: parseFloat(form.amount), accountId: form.accountId || null } })).unwrap();
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  };

  if (!isOpen || !loan) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Pay EMI</h2>
        <p className="text-sm text-gray-500 mb-4">{loan.name} · EMI: {fmt(loan.emiAmount)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={e => { setLocalError(''); setForm(f => ({ ...f, amount: e.target.value })); }} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Note (optional)</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-2">
              <input type="checkbox" checked={form.bookTransaction} onChange={e => { setLocalError(''); setForm(f => ({ ...f, bookTransaction: e.target.checked, accountId: '' })); }} className="rounded" />
              <span className="text-sm text-gray-700">Deduct from account</span>
            </label>
            {form.bookTransaction && (
              <select value={form.accountId} onChange={e => { setLocalError(''); setForm(f => ({ ...f, accountId: e.target.value })); }} className={`block w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${!form.accountId ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}`}>
                <option value="">Select Account *</option>
                {accounts.filter(a => !a.isArchived).map(a => <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>)}
              </select>
            )}
          </div>
          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Amortization Schedule Modal ───────────────────────────────────────
const ScheduleModal = ({ isOpen, onClose, loan }) => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    if (isOpen && loan) {
      setLoading(true);
      setPage(1);
      loanSvc.getLoanSchedule(loan._id).then(r => { setSchedule(r.data.schedule); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [isOpen, loan]);

  const pagedSchedule = useMemo(() => {
    if (pageSize === 'all') return schedule;
    const start = (page - 1) * pageSize;
    return schedule.slice(start, start + pageSize);
  }, [schedule, page, pageSize]);

  if (!isOpen || !loan) return null;
  const paidCount = loan.payments?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Amortization Schedule</h2>
            <p className="text-sm text-gray-500">{loan.name} · ₹{loan.emiAmount?.toLocaleString('en-IN')}/month</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" /></div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[520px]">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">#</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Due Date</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">EMI</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Principal</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Interest</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedSchedule.map((row) => {
                      const actualIdx = row.installment - 1;
                      return (
                        <tr key={row.installment} className={`border-t border-gray-100 ${actualIdx < paidCount ? 'opacity-50 bg-gray-50' : ''}`}>
                          <td className="px-3 py-2 text-gray-500">{row.installment}</td>
                          <td className="px-3 py-2 text-gray-700">{fmtDate(row.dueDate)}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-800">{fmt(row.emi)}</td>
                          <td className="px-3 py-2 text-right font-mono text-blue-700">{fmt(row.principal)}</td>
                          <td className="px-3 py-2 text-right font-mono text-orange-600">{fmt(row.interest)}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-900 font-medium">{fmt(row.balance)}</td>
                          {actualIdx < paidCount && <td className="px-3 py-2"><span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Paid</span></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={page}
                totalItems={schedule.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[12, 24, 36, 'all']}
                itemLabel="installments"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ── Main Page ─────────────────────────────────────────────────────────
const Loans = () => {
  const dispatch = useDispatch();
  const { loans, isLoading, isSyncing, syncMessage } = useSelector(s => s.loans);
  const [modalOpen, setModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [activeLoan, setActiveLoan] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    dispatch(fetchLoans());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleSyncEmis = async () => {
    await dispatch(syncLoanEmis());
    dispatch(fetchAccounts());
    setTimeout(() => { dispatch(clearSyncMessage()); }, 5000);
  };

  const totalPrincipal = loans.reduce((s, l) => s + (l.principal || 0), 0);
  const totalRemaining = loans.filter(l => l.isActive).reduce((s, l) => {
    const pp = (l.payments || []).reduce((ps, p) => ps + (p.principal || 0), 0);
    return s + Math.max(0, l.principal - pp);
  }, 0);
  const totalEmi = loans.filter(l => l.isActive).reduce((s, l) => s + (l.emiAmount || 0), 0);

  const pagedLoans = useMemo(() => {
    if (pageSize === 'all') return loans;
    const start = (currentPage - 1) * pageSize;
    return loans.slice(start, start + pageSize);
  }, [loans, currentPage, pageSize]);

  const handleDelete = (id) => { if (window.confirm('Delete this loan?')) dispatch(deleteLoan(id)); };


  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Loans & EMIs</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Automated amortization schedules, reducing-balance engine, and auto-debit payments.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleSyncEmis}
            disabled={isSyncing}
            className="flex-1 sm:flex-none flex items-center justify-center px-3.5 py-2 text-xs sm:text-sm font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            title="Execute due auto-debits right now"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 mr-1.5 animate-spin text-indigo-600" />
            ) : (
              <Zap className="w-4 h-4 mr-1.5 text-indigo-600 fill-indigo-600" />
            )}
            {isSyncing ? 'Syncing EMIs...' : 'Sync EMIs Now'}
          </button>
          <button onClick={() => { setEditingLoan(null); setModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4 mr-1.5" /> Add Loan
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="mb-6 flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => dispatch(clearSyncMessage())} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs uppercase ml-4">Dismiss</button>
        </div>
      )}

      {loans.filter(l => l.isActive).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Borrowed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalPrincipal)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Outstanding Debt</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{fmt(totalRemaining)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Monthly EMI Outflow</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalEmi)}</p>
          </div>
        </div>
      )}

      {isLoading && loans.length === 0 ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
      ) : loans.length === 0 ? (
        <div className="text-center bg-white rounded-xl border border-dashed border-gray-200 py-16">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No loans tracked</h3>
          <p className="mt-1 text-sm text-gray-500">Add a loan with automated EMI auto-debits and live amortization schedules.</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Loan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pagedLoans.map(loan => {
            const paidP = (loan.payments || []).reduce((s, p) => s + (p.principal || 0), 0);
            const paidI = (loan.payments || []).reduce((s, p) => s + (p.interest || 0), 0);
            const remaining = Math.max(0, loan.principal - paidP);
            const paidPct = Math.min(100, Math.round((paidP / loan.principal) * 100));
            const isExpanded = expanded === loan._id;

            return (
              <div key={loan._id} className={`bg-white rounded-xl shadow-xs border ${!loan.isActive ? 'border-green-200 opacity-75' : 'border-gray-100'}`}>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${TYPE_COLORS[loan.type] || '#64748b'}15` }}>
                        <CreditCard className="w-5 h-5" style={{ color: TYPE_COLORS[loan.type] || '#64748b' }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{loan.name}</h3>
                          <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${TYPE_COLORS[loan.type]}15`, color: TYPE_COLORS[loan.type] }}>{loan.type}</span>
                          {loan.autoDebit && loan.isActive && (
                            <span className="inline-flex items-center text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                              <Zap className="w-3 h-3 mr-1 fill-indigo-600 text-indigo-600" />
                              Auto-Debit (Day {loan.debitDay || 1})
                            </span>
                          )}
                          {!loan.isActive && <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Paid Off</span>}
                        </div>
                        {loan.lender && <p className="text-xs text-gray-400 mt-0.5">{loan.lender}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {loan.isActive && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setActiveLoan(loan); setPayModalOpen(true); }} className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">Pay EMI</button>
                          <button onClick={() => { setActiveLoan(loan); setScheduleOpen(true); }} className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">Schedule</button>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingLoan(loan); setModalOpen(true); }} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(loan._id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        <button onClick={() => setExpanded(isExpanded ? null : loan._id)} title={isExpanded ? "Collapse" : "Expand"} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div className="bg-gray-50 p-2.5 rounded-lg sm:bg-transparent sm:p-0"><p className="text-gray-400 text-xs">Principal</p><p className="font-bold sm:font-semibold text-gray-900 mt-0.5">{fmt(loan.principal)}</p></div>
                    <div className="bg-orange-50/50 p-2.5 rounded-lg sm:bg-transparent sm:p-0"><p className="text-gray-400 text-xs">Outstanding</p><p className="font-bold sm:font-semibold text-orange-600 mt-0.5">{fmt(remaining)}</p></div>
                    <div className="bg-gray-50 p-2.5 rounded-lg sm:bg-transparent sm:p-0"><p className="text-gray-400 text-xs">EMI</p><p className="font-bold sm:font-semibold text-gray-900 mt-0.5">{fmt(loan.emiAmount)}/mo</p></div>
                    <div className="bg-gray-50 p-2.5 rounded-lg sm:bg-transparent sm:p-0"><p className="text-gray-400 text-xs">Rate</p><p className="font-bold sm:font-semibold text-gray-900 mt-0.5">{loan.interestRate}% p.a.</p></div>
                  </div>

                  <div className="mt-3.5">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{loan.payments?.length || 0} EMIs paid</span>
                      <span className="font-semibold text-gray-700">{paidPct}% paid off</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${paidPct}%` }} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 sm:p-5 bg-gray-50/80 rounded-b-xl">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm mb-4">
                      <div><p className="text-gray-400 text-xs">Start Date</p><p className="font-medium text-gray-800 mt-0.5">{fmtDate(loan.startDate)}</p></div>
                      <div><p className="text-gray-400 text-xs">Next Auto-Debit</p><p className="font-medium text-indigo-700 mt-0.5">{loan.autoDebit ? fmtDate(loan.nextEmiDate) : 'Manual'}</p></div>
                      <div><p className="text-gray-400 text-xs">Principal Paid</p><p className="font-medium text-blue-700 mt-0.5">{fmt(paidP)}</p></div>
                      <div><p className="text-gray-400 text-xs">Interest Paid</p><p className="font-medium text-orange-600 mt-0.5">{fmt(paidI)}</p></div>
                    </div>
                    {loan.payments?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Recent Payments</p>
                        <div className="space-y-1.5 overflow-x-auto">
                          {[...loan.payments].reverse().slice(0, 5).map((p, i) => (
                            <div key={i} className="flex items-center justify-between text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100 shadow-2xs min-w-[280px]">
                              <span className="font-medium text-gray-800">{fmtDate(p.date)}</span>
                              <span className="font-bold">{fmt(p.amount)}</span>
                              <span className="text-blue-600 font-medium">P: {fmt(p.principal)}</span>
                              <span className="text-orange-500 font-medium">I: {fmt(p.interest)}</span>
                              {p.note && <span className="text-gray-400 text-[11px] truncate max-w-[120px]">{p.note}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <Pagination
            className="rounded-xl border border-gray-100"
            currentPage={currentPage}
            totalItems={loans.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[3, 5, 10, 'all']}
            itemLabel="loans"
          />
        </div>
      )}


      <LoanFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} loan={editingLoan} />
      <PayEmiModal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} loan={activeLoan} />
      <ScheduleModal isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)} loan={activeLoan} />
    </div>
  );
};

export default Loans;
