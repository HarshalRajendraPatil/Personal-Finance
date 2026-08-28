import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGoals, createGoal, updateGoal, deleteGoal, addContribution } from '../../store/goalSlice';
import { fetchAccounts } from '../../store/accountSlice';
import * as Icons from 'lucide-react';
const { Plus, Target, Edit2, Trash2, Sparkles } = Icons;

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const GOAL_ICONS = ['Target', 'Home', 'Car', 'Plane', 'Laptop', 'ShoppingBag', 'GraduationCap', 'Heart', 'Baby', 'Palmtree', 'Umbrella', 'PiggyBank'];
const GOAL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const getProjectedDate = (goal) => {
  if (!goal.contributions || goal.contributions.length < 2) return null;
  const sorted = [...goal.contributions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = new Date(sorted[0].date);
  const last = new Date(sorted[sorted.length - 1].date);
  const months = Math.max(1, (last - first) / (1000 * 60 * 60 * 24 * 30));
  const monthlyRate = goal.currentAmount / months;
  if (monthlyRate <= 0) return null;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const monthsLeft = Math.ceil(remaining / monthlyRate);
  const projected = new Date();
  projected.setMonth(projected.getMonth() + monthsLeft);
  return projected.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

// ── Circular Progress ────────────────────────────────────────────────
const CircularProgress = ({ percentage, color, size = 100 }) => {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (percentage / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="bold" fill={color}>{percentage}%</text>
    </svg>
  );
};

// ── Goal Form Modal ───────────────────────────────────────────────────
const GoalFormModal = ({ isOpen, onClose, goal = null }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector(s => s.goals);
  const [form, setForm] = useState({ name: '', targetAmount: '', currentAmount: '', deadline: '', icon: 'Target', color: '#3b82f6', notes: '' });
  const [localError, setLocalError] = useState('');

  // Already saved amount - used to enforce min target amount on edit
  const alreadySaved = goal ? (goal.currentAmount || 0) : 0;

  useEffect(() => {
    setLocalError('');
    if (goal) setForm({ name: goal.name, targetAmount: goal.targetAmount, currentAmount: goal.currentAmount, deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '', icon: goal.icon || 'Target', color: goal.color || '#3b82f6', notes: goal.notes || '' });
    else setForm({ name: '', targetAmount: '', currentAmount: '0', deadline: '', icon: 'Target', color: '#3b82f6', notes: '' });
  }, [goal, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const newTarget = parseFloat(form.targetAmount);

    // Client-side guard: cannot set target lower than already saved
    if (goal && newTarget < alreadySaved) {
      setLocalError(`Cannot set target below ₹${alreadySaved.toFixed(0)} (already saved).`);
      return;
    }

    try {
      const payload = { ...form, targetAmount: newTarget, currentAmount: parseFloat(form.currentAmount || 0), deadline: form.deadline || null };
      if (goal) await dispatch(updateGoal({ id: goal._id, data: payload })).unwrap();
      else await dispatch(createGoal(payload)).unwrap();
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-5">{goal ? 'Edit Goal' : 'New Savings Goal'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700">Goal Name</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency Fund, Europe Trip" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Amount (₹)</label>
              <input required type="number" step="0.01" min={goal ? alreadySaved : 0.01} value={form.targetAmount}
                onChange={e => { setLocalError(''); setForm(f => ({ ...f, targetAmount: e.target.value })); }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              {goal && alreadySaved > 0 && (
                <p className="mt-1 text-xs text-amber-600">Min: ₹{alreadySaved.toFixed(0)} (already saved)</p>
              )}
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Already Saved (₹)</label>
              <input type="number" step="0.01" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" disabled={!!goal} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Deadline (optional)</label>
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md bg-gray-50">
              {GOAL_ICONS.map(iconName => {
                const IconComponent = Icons[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icon: iconName }))}
                    className={`p-2 flex items-center justify-center rounded-md transition ${
                      form.icon === iconName ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-100 shadow-sm border border-gray-100'
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-5 h-5 text-gray-700" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex items-center flex-wrap gap-2">
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 flex-shrink-0 rounded-full border-2 transition ${form.color === c && GOAL_COLORS.includes(form.color) ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <div className="relative flex items-center justify-center w-7 h-7 ml-2 group" title="Choose custom color">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform ${
                    !GOAL_COLORS.includes(form.color) ? 'border-gray-900 scale-110' : 'border-gray-300 border-dashed group-hover:scale-110'
                  }`}
                  style={{ backgroundColor: !GOAL_COLORS.includes(form.color) ? form.color : '#ffffff' }}
                >
                  {GOAL_COLORS.includes(form.color) && <span className="text-gray-400 text-lg leading-none -mt-0.5">+</span>}
                </div>
              </div>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>

          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}

          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : goal ? 'Update' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Contribute Modal ──────────────────────────────────────────────────
const ContributeModal = ({ isOpen, onClose, goal }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector(s => s.accounts);
  const { isLoading } = useSelector(s => s.goals);

  const remaining = goal ? Math.max(0, goal.targetAmount - (goal.currentAmount || 0)) : 0;

  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '', accountId: '', bookTransaction: true });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError('');
    setForm({ amount: '', date: new Date().toISOString().split('T')[0], note: '', accountId: '', bookTransaction: true });
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const amt = parseFloat(form.amount);

    // Client-side over-contribution guard
    if (amt > remaining + 0.001) {
      setLocalError(`Amount cannot exceed the remaining goal amount of ₹${remaining.toFixed(2)}.`);
      return;
    }
    if (amt <= 0) {
      setLocalError('Amount must be greater than zero.');
      return;
    }
    // Require account selection when booking
    if (form.bookTransaction && !form.accountId) {
      setLocalError('Please select an account to deduct from.');
      return;
    }

    try {
      await dispatch(addContribution({ id: goal?._id, data: { ...form, amount: amt, accountId: form.accountId || null } })).unwrap();
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  }

  if (!isOpen || !goal) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Add Contribution</h2>
        <p className="text-sm text-gray-500 mb-5">Goal: <span className="font-medium">{goal.name}</span> · Remaining: <span className="font-semibold">{fmt(remaining)}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={form.amount}
              onChange={e => { setLocalError(''); setForm(f => ({ ...f, amount: e.target.value })); }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">Max: ₹{remaining.toFixed(2)}</p>
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700">Note (optional)</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-2">
              <input type="checkbox" checked={form.bookTransaction} onChange={e => { setLocalError(''); setForm(f => ({ ...f, bookTransaction: e.target.checked, accountId: '' })); }} className="rounded" />
              <span className="text-sm text-gray-700">Deduct from account (Expense)</span>
            </label>
            {form.bookTransaction && (
              <select
                value={form.accountId}
                onChange={e => { setLocalError(''); setForm(f => ({ ...f, accountId: e.target.value })); }}
                className={`block w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${form.bookTransaction && !form.accountId ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}`}
              >
                <option value="">Select Account *</option>
                {accounts.filter(a => !a.isArchived).map(a => <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>)}
              </select>)}
          </div>

          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}

          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Add Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────
const Goals = () => {
  const dispatch = useDispatch();
  const { goals, isLoading } = useSelector(s => s.goals);
  const [modalOpen, setModalOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [activeGoal, setActiveGoal] = useState(null);

  useEffect(() => {
    dispatch(fetchGoals());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleDelete = (id) => { if (window.confirm('Delete this goal?')) dispatch(deleteGoal(id)); };
  const openEdit = (g) => { setEditingGoal(g); setModalOpen(true); };
  const openContribute = (g) => { setActiveGoal(g); setContributeOpen(true); };

  const activeGoals = goals.filter(g => !g.isCompleted);
  const completedGoals = goals.filter(g => g.isCompleted);
  const totalSaved = activeGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = activeGoals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
          <p className="mt-1 text-sm text-gray-500">Track progress toward your financial targets.</p>
        </div>
        <button onClick={() => { setEditingGoal(null); setModalOpen(true); }} className="mt-4 sm:mt-0 flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />New Goal
        </button>
      </div>

      {/* Summary */}
      {activeGoals.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Saved (Active Goals)</p>
              <p className="text-3xl font-bold mt-1">{fmt(totalSaved)}</p>
              <p className="text-blue-200 text-sm mt-1">of {fmt(totalTarget)} target</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-bold opacity-80">{totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%</p>
              <p className="text-blue-200 text-sm">overall progress</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && goals.length === 0 ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div></div>
      ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
        <div className="text-center bg-white rounded-xl border border-dashed border-gray-200 py-16">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No savings goals yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create a goal and start tracking your progress.</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />New Goal
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeGoals.map(goal => {
              const pct = Math.min(100, Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100));
              const projected = getProjectedDate(goal);
              return (
                <div key={goal._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ backgroundColor: `${goal.color}20` }}>
                          {(() => {
                            const IconC = Icons[goal.icon] || Icons.Target;
                            return <IconC className="w-4 h-4" style={{ color: goal.color }} />;
                          })()}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">{goal.name}</h3>
                      </div>
                      {goal.deadline && <p className="text-xs text-gray-400">Deadline: {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                      {projected && <p className="text-xs text-indigo-500">Projected: {projected}</p>}
                    </div>
                    <CircularProgress percentage={pct} color={goal.color || '#3b82f6'} size={80} />
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-gray-900">{fmt(goal.currentAmount || 0)}</span>
                      <span className="text-gray-400">of {fmt(goal.targetAmount)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: goal.color || '#3b82f6' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{fmt(Math.max(0, goal.targetAmount - (goal.currentAmount || 0)))} remaining</p>
                  </div>

                  {goal.notes && <p className="mt-2 text-xs text-gray-400 italic">"{goal.notes}"</p>}

                  <div className="mt-4 flex space-x-2">
                    <button onClick={() => openContribute(goal)} className="flex-1 text-xs py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 mr-1" />Add Contribution
                    </button>
                    <button onClick={() => openEdit(goal)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(goal._id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {completedGoals.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />Completed ({completedGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedGoals.map(goal => (
                  <div key={goal._id} className="bg-green-50 rounded-xl border border-green-200 p-4 opacity-80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-500 text-xl">🎉</span>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">{goal.name}</h3>
                          <p className="text-xs text-gray-500">{fmt(goal.targetAmount)} · Completed {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(goal._id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <GoalFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} goal={editingGoal} />
      <ContributeModal isOpen={contributeOpen} onClose={() => setContributeOpen(false)} goal={activeGoal} />
    </div>
  );
};

export default Goals;
