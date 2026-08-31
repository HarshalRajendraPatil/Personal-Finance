import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLendings, createLending, updateLending, deleteLending, addRepayment, settleLending } from '../../store/lendingSlice';
import { fetchAccounts } from '../../store/accountSlice';
import { Plus, HandCoins, TrendingUp, TrendingDown, CheckCircle2, Edit2, Trash2, ChevronDown, ChevronUp, Clock } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Lending Form Modal ──────────────────────────────────────────────────
const LendingFormModal = ({ isOpen, onClose, entry = null }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector(s => s.accounts);
  const { isLoading, error } = useSelector(s => s.lending);
  const [form, setForm] = useState({ person: '', type: 'lent', amount: '', dueDate: '', notes: '', account: '' });
  const [localError, setLocalError] = useState('');

  // Total already repaid — used to enforce min amount on edit
  const totalRepaid = entry ? (entry.repayments || []).reduce((s, r) => s + r.amount, 0) : 0;

  useEffect(() => {
    setLocalError('');
    if (entry) setForm({ person: entry.person, type: entry.type, amount: entry.amount, dueDate: entry.dueDate ? new Date(entry.dueDate).toISOString().split('T')[0] : '', notes: entry.notes || '', account: entry.account?._id || '' });
    else setForm({ person: '', type: 'lent', amount: '', dueDate: '', notes: '', account: '' });
  }, [entry, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const newAmount = parseFloat(form.amount);

    // Client-side guard: cannot reduce amount below already-repaid total
    if (entry && newAmount < totalRepaid) {
      setLocalError(`Cannot set principal below ₹${totalRepaid.toFixed(0)} (already repaid).`);
      return;
    }

    try {
      const payload = { ...form, amount: newAmount, dueDate: form.dueDate || null, account: form.account || null };
      if (entry) await dispatch(updateLending({ id: entry._id, data: payload })).unwrap();
      else await dispatch(createLending(payload)).unwrap();
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-5">{entry ? 'Edit Entry' : 'New Lending / Borrowing'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['lent', 'borrowed'].map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition ${form.type === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                {t === 'lent' ? '💸 I Lent' : '🙏 I Borrowed'}
              </button>
            ))}
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Person / Contact</label>
            <input required value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))} placeholder="Name" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
              <input required type="number" step="0.01" min={entry ? totalRepaid : 0.01} value={form.amount}
                onChange={e => { setLocalError(''); setForm(f => ({ ...f, amount: e.target.value })); }}
                placeholder="0.00" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              {entry && totalRepaid > 0 && (
                <p className="mt-1 text-xs text-amber-600">Min: ₹{totalRepaid.toFixed(0)} (already repaid)</p>
              )}
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Account (optional)</label>
            <select value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              <option value="">None</option>
              {accounts.filter(a => !a.isArchived).map(a => <option key={a._id} value={a._id}>{a.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : entry ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Repay / Settle Modal ──────────────────────────────────────────────
const RepayModal = ({ isOpen, onClose, entry, isSettleMode = false }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector(s => s.accounts);
  const { isLoading } = useSelector(s => s.lending);
  const outstanding = entry ? Math.max(0, entry.amount - (entry.repayments || []).reduce((s, r) => s + r.amount, 0)) : 0;
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '', accountId: '', bookTransaction: true });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError('');
    setForm({
      amount: isSettleMode ? outstanding.toFixed(2) : '',
      date: new Date().toISOString().split('T')[0],
      note: '',
      accountId: '',
      bookTransaction: true,
    });
  }, [isOpen, outstanding, isSettleMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const amt = parseFloat(form.amount);

    // Client-side overpayment guard
    if (amt > outstanding + 0.001) {
      setLocalError(`Amount cannot exceed the outstanding balance of ₹${outstanding.toFixed(2)}.`);
      return;
    }
    if (amt <= 0) {
      setLocalError('Amount must be greater than zero.');
      return;
    }
    // Require account selection when booking
    if (form.bookTransaction && !form.accountId) {
      setLocalError('Please select an account to book the transaction against.');
      return;
    }

    try {
      const payload = { ...form, amount: amt, accountId: form.accountId || null };
      if (isSettleMode) await dispatch(settleLending({ id: entry._id, data: payload })).unwrap();
      else await dispatch(addRepayment({ id: entry._id, data: payload })).unwrap();
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  };

  if (!isOpen || !entry) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{isSettleMode ? 'Settle Up' : 'Log Repayment'}</h2>
        <p className="text-sm text-gray-500 mb-5">
          Outstanding: <span className="font-semibold text-gray-800">{fmt(outstanding)}</span> {entry.type === 'lent' ? 'from' : 'to'} <span className="font-semibold">{entry.person}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              max={outstanding}
              value={form.amount}
              onChange={e => { setLocalError(''); setForm(f => ({ ...f, amount: e.target.value })); }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">Max: ₹{outstanding.toFixed(2)}</p>
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700">Note (optional)</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Paid via UPI" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-2">
              <input type="checkbox" checked={form.bookTransaction} onChange={e => { setLocalError(''); setForm(f => ({ ...f, bookTransaction: e.target.checked, accountId: '' })); }} className="rounded" />
              <span className="text-sm text-gray-700">Book as transaction (updates account balance)</span>
            </label>
            {form.bookTransaction && (
              <div>
                <select
                  value={form.accountId}
                  onChange={e => { setLocalError(''); setForm(f => ({ ...f, accountId: e.target.value })); }}
                  className={`block w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${form.bookTransaction && !form.accountId ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}`}
                >
                  <option value="">Select Account *</option>
                  {accounts.filter(a => !a.isArchived).map(a => <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>)}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  {entry.type === 'lent'
                    ? 'Money received → will be booked as Income'
                    : 'Money paid → will be booked as Expense'}
                </p>
              </div>
            )}
          </div>
          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className={`px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 ${isSettleMode ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {isLoading ? 'Saving...' : isSettleMode ? '✓ Settle Up' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Lending Card ──────────────────────────────────────────────────────
const LendingCard = ({ entry, onEdit, onRepay, onSettle, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const repaid = (entry.repayments || []).reduce((s, r) => s + r.amount, 0);
  const outstanding = Math.max(0, entry.amount - repaid);
  const percentage = Math.min(100, Math.round((repaid / entry.amount) * 100));
  const isOverdue = entry.dueDate && !entry.isSettled && new Date(entry.dueDate) < new Date();

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 ${entry.isSettled ? 'border-green-200 opacity-75' : isOverdue ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${entry.type === 'lent' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
            {entry.person.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900">{entry.person}</h3>
              {entry.isSettled && <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Settled</span>}
              {isOverdue && !entry.isSettled && <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center"><Clock className="w-3 h-3 mr-1" />Overdue</span>}
            </div>
            <p className="text-xs text-gray-500">{entry.type === 'lent' ? '↗ I lent' : '↙ I borrowed'} · {entry.dueDate ? `Due ${fmtDate(entry.dueDate)}` : 'No due date'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${entry.type === 'lent' ? 'text-blue-600' : 'text-orange-600'}`}>{fmt(outstanding)}</p>
          <p className="text-xs text-gray-400">of {fmt(entry.amount)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${entry.isSettled ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{percentage}% repaid</p>

      {entry.notes && <p className="mt-2 text-xs text-gray-500 italic">"{entry.notes}"</p>}

      {/* Actions */}
      {!entry.isSettled && (
        <div className="mt-4 flex space-x-2">
          <button onClick={() => onRepay(entry)} className="flex-1 text-xs py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium">+ Repayment</button>
          <button onClick={() => onSettle(entry)} className="flex-1 text-xs py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Settle Up
          </button>
          <button onClick={() => onEdit(entry)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(entry._id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
        </div>
      )}

      {/* Repayment history */}
      {(entry.repayments || []).length > 0 && (
        <div className="mt-3">
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center">
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {entry.repayments.length} repayment{entry.repayments.length > 1 ? 's' : ''}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              {entry.repayments.map(r => (
                <li key={r._id} className="flex justify-between text-xs text-gray-500">
                  <span>{fmtDate(r.date)}{r.note ? ` — ${r.note}` : ''}</span>
                  <span className="font-medium text-gray-700">{fmt(r.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────
const People = () => {
  const dispatch = useDispatch();
  const { lendings, isLoading } = useSelector(s => s.lending);
  const [modalOpen, setModalOpen] = useState(false);
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [settleMode, setSettleMode] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [activeEntry, setActiveEntry] = useState(null);

  useEffect(() => {
    dispatch(fetchLendings());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const openRepay = (entry) => { setActiveEntry(entry); setSettleMode(false); setRepayModalOpen(true); };
  const openSettle = (entry) => { setActiveEntry(entry); setSettleMode(true); setRepayModalOpen(true); };
  const openEdit = (entry) => { setEditingEntry(entry); setModalOpen(true); };
  const handleDelete = (id) => { if (window.confirm('Delete this entry?')) dispatch(deleteLending(id)); };

  const lentItems = lendings.filter(l => l.type === 'lent' && !l.isSettled);
  const borrowedItems = lendings.filter(l => l.type === 'borrowed' && !l.isSettled);
  const settledItems = lendings.filter(l => l.isSettled);
  const totalOwedToMe = lentItems.reduce((s, l) => s + Math.max(0, l.amount - (l.repayments || []).reduce((a, r) => a + r.amount, 0)), 0);
  const totalIOwe = borrowedItems.reduce((s, l) => s + Math.max(0, l.amount - (l.repayments || []).reduce((a, r) => a + r.amount, 0)), 0);

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">People</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Track money you've lent out and money you owe.</p>
        </div>
        <button onClick={() => { setEditingEntry(null); setModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" />New Entry
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Owed to Me</p><p className="text-2xl font-bold text-blue-600">{fmt(totalOwedToMe)}</p></div>
            <div className="p-3 bg-blue-50 rounded-xl"><TrendingUp className="w-6 h-6 text-blue-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">I Owe</p><p className="text-2xl font-bold text-orange-600">{fmt(totalIOwe)}</p></div>
            <div className="p-3 bg-orange-50 rounded-xl"><TrendingDown className="w-6 h-6 text-orange-500" /></div>
          </div>
        </div>
      </div>

      {isLoading && lendings.length === 0 ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2"></span>Owed to Me ({lentItems.length})
            </h2>
            {lentItems.length === 0 ? <p className="text-sm text-gray-400 text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">No pending lendings.</p>
              : <div className="space-y-4">{lentItems.map(l => <LendingCard key={l._id} entry={l} onEdit={openEdit} onRepay={openRepay} onSettle={openSettle} onDelete={handleDelete} />)}</div>}
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-2"></span>I Owe ({borrowedItems.length})
            </h2>
            {borrowedItems.length === 0 ? <p className="text-sm text-gray-400 text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">No pending borrowings.</p>
              : <div className="space-y-4">{borrowedItems.map(l => <LendingCard key={l._id} entry={l} onEdit={openEdit} onRepay={openRepay} onSettle={openSettle} onDelete={handleDelete} />)}</div>}
          </div>
        </div>
      )}

      {settledItems.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Settled ({settledItems.length})</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {settledItems.map(l => <LendingCard key={l._id} entry={l} onEdit={() => { }} onRepay={() => { }} onSettle={() => { }} onDelete={handleDelete} />)}
          </div>
        </div>
      )}

      <LendingFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} entry={editingEntry} />
      <RepayModal isOpen={repayModalOpen} onClose={() => setRepayModalOpen(false)} entry={activeEntry} isSettleMode={settleMode} />
    </div>
  );
};

export default People;
