import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchProactiveNudges, dismissNudge } from '../store/proactiveSlice';
import {
  Bell,
  X,
  AlertTriangle,
  Flame,
  Lightbulb,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

const ActionCenterDrawer = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { nudges, isLoadingNudges } = useSelector((state) => state.proactive);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchProactiveNudges());
    }
  }, [isOpen, dispatch]);

  if (!isOpen) return null;

  const handleDismiss = (nudgeId, e) => {
    e.stopPropagation();
    dispatch(dismissNudge(nudgeId));
  };

  const handleAction = (nudge) => {
    if (nudge.actionUrl) {
      navigate(nudge.actionUrl);
      onClose();
    }
  };

  const getNudgeIcon = (type, severity) => {
    if (type === 'PREDICTIVE_BUDGET_EXHAUSTION') return <Flame className="w-5 h-5 text-rose-500" />;
    if (type === 'DUPLICATE_TRANSACTION_ALERT') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    if (type === 'LIQUIDITY_BUFFER_WARNING') return <ShieldAlert className="w-5 h-5 text-rose-600" />;
    if (type === 'SAFE_TO_SPEND_NUDGE') return <Lightbulb className="w-5 h-5 text-indigo-500" />;
    if (type === 'IDLE_CASH_RECOMMENDATION') return <Sparkles className="w-5 h-5 text-emerald-500" />;
    return <Bell className="w-5 h-5 text-indigo-500" />;
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'WARNING':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SUCCESS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl z-10 flex flex-col h-full border-l border-gray-200 animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Proactive Action Center</h2>
              <p className="text-xs text-gray-500">Autonomous Financial Guardian & Nudges</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nudges List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {nudges.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">All Financial Guardrails Optimal</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                No budget velocity spikes, duplicate transactions, or liquidity risks detected.
              </p>
            </div>
          ) : (
            nudges.map((nudge) => (
              <div
                key={nudge._id}
                onClick={() => handleAction(nudge)}
                className="p-4 bg-white border border-gray-200 hover:border-indigo-400 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getNudgeIcon(nudge.type, nudge.severity)}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                        nudge.severity
                      )}`}
                    >
                      {nudge.severity}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDismiss(nudge._id, e)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {nudge.title}
                </h4>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{nudge.message}</p>

                {nudge.actionLabel && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-800">
                    <span>{nudge.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500 text-center">
          Evaluated autonomously via Capise Proactive Daemon Suite.
        </div>

      </div>
    </div>
  );
};

export default ActionCenterDrawer;
