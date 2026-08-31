import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLoans, createLoan, updateLoan, deleteLoan, addPayment } from '../../store/loanSlice';
import { fetchAccounts } from '../../store/accountSlice';
import * as loanSvc from '../../services/loanService';
import { Plus, Building2, ChevronDown, ChevronUp, Edit2, Trash2, CreditCard, Calendar, IndianRupee, X } from 'lucide-react';

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
  const [form, setForm] = useState({ name: '', type: 'Personal Loan', lender: '', principal: '', interestRate: '', tenureMonths: '', startDate: '', account: '', notes: '' });
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
      setForm({ name: loan.name, type: loan.type, lender: loan.lender || '', principal: loan.principal, interestRate: loan.interestRate, tenureMonths: loan.tenureMonths, startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : '', account: loan.account?._id || '', notes: loan.notes || '' });
    } else {
      setForm({ name: '', type: 'Personal Loan', lender: '', principal: '', interestRate: '', tenureMonths: '', startDate: new Date().toISOString().split('T')[0], account: '', notes: '' });
    }
  }, [loan, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      const payload = { ...form, principal: parseFloat(form.principal), interestRate: parseFloat(form.interestRate), tenureMonths: parseInt(form.tenureMonths), account: form.account || null };
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

  useEffect(() => {
    if (isOpen && loan) {
      setLoading(true);
      loanSvc.getLoanSchedule(loan._id).then(r => { setSchedule(r.data.schedule); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [isOpen, loan]);

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
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
          ) : (
            <table className="w-full text-sm">
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
              <tbody>
                {schedule.map((row, idx) => (
                  <tr key={row.installment} className={`border-t ${idx < paidCount ? 'opacity-50 bg-gray-50' : ''}`}>
                    <td className="px-3 py-2 text-gray-500">{row.installment}</td>
                    <td className="px-3 py-2 text-gray-700">{fmtDate(row.dueDate)}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-800">{fmt(row.emi)}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-700">{fmt(row.principal)}</td>
                    <td className="px-3 py-2 text-right font-mono text-orange-600">{fmt(row.interest)}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-900 font-medium">{fmt(row.balance)}</td>
                    {idx < paidCount && <td className="px-3 py-2"><span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Paid</span></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────
const Loans = () => {
  const dispatch = useDispatch();
  const { loans, isLoading } = useSelector(s => s.loans);
  const [modalOpen, setModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [activeLoan, setActiveLoan] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { dispatch(fetchLoans()); dispatch(fetchAccounts()); }, [dispatch]);

  const totalPrincipal = loans.reduce((s, l) => s + (l.principal || 0), 0);
  const totalRemaining = loans.filter(l => l.isActive).reduce((s, l) => {
    const pp = (l.payments || []).reduce((ps, p) => ps + (p.principal || 0), 0);
    return s + Math.max(0, l.principal - pp);
  }, 0);
  const totalEmi = loans.filter(l => l.isActive).reduce((s, l) => s + (l.emiAmount || 0), 0);

  const handleDelete = (id) => { if (window.confirm('Delete this loan?')) dispatch(deleteLoan(id)); };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Loans & EMIs</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Track all your loans, amortization schedules, and EMI payments.</p>
        </div>
        <button onClick={() => { setEditingLoan(null); setModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Add Loan
        </button>
      </div>

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
          <p className="mt-1 text-sm text-gray-500">Add a loan to start tracking EMIs and amortization.</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Loan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map(loan => {
            const paidP = (loan.payments || []).reduce((s, p) => s + (p.principal || 0), 0);
            const paidI = (loan.payments || []).reduce((s, p) => s + (p.interest || 0), 0);
            const remaining = Math.max(0, loan.principal - paidP);
            const paidPct = Math.min(100, Math.round((paidP / loan.principal) * 100));
            const isExpanded = expanded === loan._id;

            return (
              <div key={loan._id} className={`bg-white rounded-xl shadow-sm border ${!loan.isActive ? 'border-green-200 opacity-75' : 'border-gray-100'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${TYPE_COLORS[loan.type] || '#64748b'}15` }}>
                        <CreditCard className="w-5 h-5" style={{ color: TYPE_COLORS[loan.type] || '#64748b' }} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{loan.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TYPE_COLORS[loan.type]}15`, color: TYPE_COLORS[loan.type] }}>{loan.type}</span>
                          {!loan.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Paid Off</span>}
                        </div>
                        {loan.lender && <p className="text-xs text-gray-400">{loan.lender}</p>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {loan.isActive && (
                        <>
                          <button onClick={() => { setActiveLoan(loan); setPayModalOpen(true); }} className="px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100">Pay EMI</button>
                          <button onClick={() => { setActiveLoan(loan); setScheduleOpen(true); }} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Schedule</button>
                        </>
                      )}
                      <button onClick={() => { setEditingLoan(loan); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(loan._id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setExpanded(isExpanded ? null : loan._id)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-gray-400 text-xs">Principal</p><p className="font-semibold text-gray-900">{fmt(loan.principal)}</p></div>
                    <div><p className="text-gray-400 text-xs">Outstanding</p><p className="font-semibold text-orange-600">{fmt(remaining)}</p></div>
                    <div><p className="text-gray-400 text-xs">EMI</p><p className="font-semibold text-gray-900">{fmt(loan.emiAmount)}/mo</p></div>
                    <div><p className="text-gray-400 text-xs">Rate</p><p className="font-semibold text-gray-900">{loan.interestRate}% p.a.</p></div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{loan.payments?.length || 0} EMIs paid</span>
                      <span>{paidPct}% paid off</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-5 bg-gray-50 rounded-b-xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div><p className="text-gray-400 text-xs">Start Date</p><p className="font-medium text-gray-800">{fmtDate(loan.startDate)}</p></div>
                      <div><p className="text-gray-400 text-xs">Tenure</p><p className="font-medium text-gray-800">{loan.tenureMonths} months</p></div>
                      <div><p className="text-gray-400 text-xs">Principal Paid</p><p className="font-medium text-blue-700">{fmt(paidP)}</p></div>
                      <div><p className="text-gray-400 text-xs">Interest Paid</p><p className="font-medium text-orange-600">{fmt(paidI)}</p></div>
                    </div>
                    {loan.payments?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Recent Payments</p>
                        <div className="space-y-1">
                          {[...loan.payments].reverse().slice(0, 5).map((p, i) => (
                            <div key={i} className="flex justify-between text-xs text-gray-600 bg-white rounded px-3 py-1.5">
                              <span>{fmtDate(p.date)}</span>
                              <span>{fmt(p.amount)}</span>
                              <span className="text-blue-600">P: {fmt(p.principal)}</span>
                              <span className="text-orange-500">I: {fmt(p.interest)}</span>
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
        </div>
      )}

      <LoanFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} loan={editingLoan} />
      <PayEmiModal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} loan={activeLoan} />
      <ScheduleModal isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)} loan={activeLoan} />
    </div>
  );
};

export default Loans;
