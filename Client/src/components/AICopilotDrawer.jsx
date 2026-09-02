import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  askCopilot,
  addUserCopilotMessage,
  clearCopilotHistory,
  executeCopilotAction,
  fetchProactiveNudges,
  fetchSafeToSpend,
} from '../store/proactiveSlice';
import { fetchDashboardData } from '../store/dashboardSlice';
import { fetchBudgets } from '../store/budgetSlice';
import { fetchAccounts } from '../store/accountSlice';
import { fetchInvestments } from '../store/investmentSlice';
import { fetchGoals } from '../store/goalSlice';
import { fetchLendings } from '../store/lendingSlice';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RefreshCw,
  Zap,
  TrendingUp,
  Landmark,
  Wallet,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Tags,
  PiggyBank,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  Check,
} from 'lucide-react';

/**
 * Modern Markdown Renderer Component for AI Chat
 * Cleanly renders markdown tables, headers, lists, blockquotes, and bold text.
 */
const FormattedMessage = ({ text }) => {
  if (!text) return null;

  // Split into paragraphs / blocks
  const blocks = text.split(/\n\n+/);

  return (
    <div className="space-y-2.5 text-xs sm:text-sm text-gray-800 leading-relaxed">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();

        // 1. Table Detection
        if (trimmed.includes('|') && trimmed.includes('\n')) {
          const lines = trimmed.split('\n').filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));
          if (lines.length >= 2) {
            const headerLine = lines[0];
            const dataLines = lines.slice(2); // Skip header separator line (|:---|:---|)

            const headers = headerLine
              .split('|')
              .map((c) => c.trim())
              .filter((c) => c.length > 0);

            return (
              <div key={bIdx} className="overflow-x-auto my-2 rounded-xl border border-gray-200 shadow-2xs">
                <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                  <thead className="bg-indigo-50/70 text-indigo-950 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      {headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 whitespace-nowrap">
                          {parseInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {dataLines.map((rowLine, rIdx) => {
                      const cells = rowLine
                        .split('|')
                        .map((c) => c.trim())
                        .filter((c) => c.length > 0);
                      return (
                        <tr key={rIdx} className="hover:bg-gray-50/80 transition-colors">
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 whitespace-nowrap font-medium text-gray-700">
                              {parseInline(cell)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // 2. Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={bIdx} className="text-sm font-bold text-indigo-950 flex items-center gap-1.5 mt-2">
              {parseInline(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={bIdx} className="text-base font-bold text-gray-900 border-b border-gray-100 pb-1 mt-3">
              {parseInline(trimmed.replace(/^##\s+/, ''))}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={bIdx} className="text-base font-extrabold text-gray-900 mt-2">
              {parseInline(trimmed.replace(/^#\s+/, ''))}
            </h2>
          );
        }

        // 3. Blockquotes / Callout
        if (trimmed.startsWith('> ')) {
          return (
            <div
              key={bIdx}
              className="p-3 bg-indigo-50/70 border-l-4 border-indigo-600 rounded-r-xl text-xs text-indigo-950 font-medium my-2"
            >
              {parseInline(trimmed.replace(/^>\s+/, ''))}
            </div>
          );
        }

        // 4. Bullet Lists
        if (trimmed.split('\n').some((l) => l.trim().startsWith('* ') || l.trim().startsWith('- '))) {
          const items = trimmed.split('\n').map((l) => l.trim().replace(/^[\*\-]\s+/, ''));
          return (
            <ul key={bIdx} className="space-y-1 my-1.5 pl-1">
              {items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                  <span className="flex-1">{parseInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        // 5. Default Paragraph with Line breaks
        const lines = trimmed.split('\n');
        return (
          <p key={bIdx} className="text-xs sm:text-sm leading-relaxed">
            {lines.map((line, lIdx) => (
              <span key={lIdx}>
                {parseInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
};

// Helper to parse bold (**text**), italics (*text*), code (`text`), and rupee symbols
const parseInline = (str) => {
  if (!str) return '';

  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let match;
  let lastIdx = 0;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push(str.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-gray-950">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 bg-gray-100 text-indigo-700 rounded font-mono text-[11px]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-gray-700">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < str.length) {
    parts.push(str.substring(lastIdx));
  }

  return parts.length > 0 ? parts : str;
};

/**
 * 1-Click Interactive Action Proposal Card
 */
const ActionProposalCard = ({ action, onExecute, isExecuting, isExecuted }) => {
  const getActionIcon = (type) => {
    switch (type) {
      case 'UPDATE_BUDGET_LIMIT':
        return <Tags className="w-4 h-4 text-amber-600" />;
      case 'LOG_INVESTMENT_TOPUP':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'CONTRIBUTE_TO_GOAL':
        return <PiggyBank className="w-4 h-4 text-indigo-600" />;
      case 'GENERATE_WHATSAPP_REMINDER':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'PREPAY_LOAN_PRINCIPAL':
        return <CreditCard className="w-4 h-4 text-rose-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className={`mt-3 p-3.5 rounded-2xl border transition-all ${
      isExecuted
        ? 'bg-emerald-50/80 border-emerald-200'
        : 'bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/40 border-indigo-200/90 shadow-2xs hover:shadow-xs'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl shrink-0 ${isExecuted ? 'bg-emerald-100' : 'bg-indigo-100/80'}`}>
            {isExecuted ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : getActionIcon(action.type)}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">{action.title}</h4>
              {action.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isExecuted
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}>
                  {isExecuted ? 'Applied ✅' : action.badge}
                </span>
              )}
            </div>
            {action.description && (
              <p className="text-xs text-gray-600 mt-0.5 leading-snug">{action.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-2.5 flex items-center justify-end">
        {isExecuted ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300">
            <Check className="w-3.5 h-3.5" />
            <span>Action Approved & Executed</span>
          </div>
        ) : (
          <button
            onClick={() => onExecute(action)}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Applying Action...</span>
              </>
            ) : (
              <>
                <span>{action.actionText || 'Execute 1-Click Action'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const AICopilotDrawer = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { copilotMessages, isCopilotThinking, safeToSpendData, executingActionId, executedActions } = useSelector(
    (state) => state.proactive
  );
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    'What are my active budgets and what should I increase to avoid overspending?',
    'How can I optimize my idle cash in savings?',
    'Who owes me money and generate a WhatsApp reminder?',
    'Provide me the complete overview of my finances of the last month',
    'What is my dynamic Safe-to-Spend limit today?',
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, copilotMessages, isCopilotThinking]);

  if (!isOpen) return null;

  const handleSend = (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || isCopilotThinking) return;

    dispatch(addUserCopilotMessage(query));
    setInputMessage('');

    dispatch(
      askCopilot({
        message: query,
        history: copilotMessages,
      })
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle 1-Click Action Execution
  const handleExecuteAction = async (action) => {
    if (!action || executedActions[action.id]) return;

    // Special case for WhatsApp Reminders: Open WhatsApp Web / App
    if (action.type === 'GENERATE_WHATSAPP_REMINDER') {
      const personName = action.payload?.personName || 'friend';
      const amount = action.payload?.amount || 0;
      const dueDate = action.payload?.dueDate || '';
      const text = `Hi ${personName}! Hope you are doing well. Just a gentle reminder regarding the friendly loan of ₹${Number(amount).toLocaleString('en-IN')}${dueDate ? ` due by ${dueDate}` : ''}. Let me know whenever convenient!`;
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }

    // Execute on backend
    const resultAction = await dispatch(
      executeCopilotAction({
        actionId: action.id,
        actionType: action.type,
        payload: action.payload,
      })
    );

    if (executeCopilotAction.fulfilled.match(resultAction)) {
      // Refresh live application state across all affected stores
      dispatch(fetchBudgets());
      dispatch(fetchAccounts());
      dispatch(fetchInvestments());
      dispatch(fetchGoals());
      dispatch(fetchLendings());
      dispatch(fetchDashboardData());
      dispatch(fetchSafeToSpend());
      dispatch(fetchProactiveNudges());
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl z-10 flex flex-col h-full border-l border-gray-200 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Capise AI Copilot</h2>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Actionable AI
                </span>
              </div>
              <p className="text-xs text-indigo-200">1-Click Proactive Wealth Automation</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => dispatch(clearCopilotHistory())}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Reset Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Metrics Context Ribbon */}
        {safeToSpendData && (
          <div className="bg-indigo-50/90 px-4 py-2 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              Dynamic Safe-to-Spend:
            </span>
            <span className="font-bold font-mono text-indigo-800">
              ₹{safeToSpendData.safeToSpendDaily?.toLocaleString('en-IN')}/day
            </span>
          </div>
        )}

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/60">
          {copilotMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-indigo-100 to-white text-indigo-700 border border-indigo-200'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[88%] rounded-2xl p-4 shadow-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-xs text-xs sm:text-sm font-medium'
                    : 'bg-white text-gray-800 border border-gray-200/90 rounded-tl-xs'
                }`}
              >
                {msg.sender === 'user' ? (
                  <div className="whitespace-pre-line">{msg.text}</div>
                ) : (
                  <>
                    <FormattedMessage text={msg.text} />

                    {/* Render Interactive Action Proposals */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Proactive 1-Click Action Proposals</span>
                        </div>
                        {msg.actions.map((act) => (
                          <ActionProposalCard
                            key={act.id}
                            action={act}
                            onExecute={handleExecuteAction}
                            isExecuting={executingActionId === act.id}
                            isExecuted={Boolean(executedActions[act.id]?.success)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {isCopilotThinking && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-gray-200 p-3.5 rounded-2xl rounded-tl-xs shadow-xs text-xs text-gray-600 flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Capise Copilot is querying live records & preparing action proposals...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions Chips */}
        <div className="p-2.5 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl p-1.5 transition-all">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Copilot (e.g. 'How can I deploy my idle cash?')"
              className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputMessage.trim() || isCopilotThinking}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-xs shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AICopilotDrawer;
