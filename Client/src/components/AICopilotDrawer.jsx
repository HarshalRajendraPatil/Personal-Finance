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
import { fetchTransactions } from '../store/transactionSlice';
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
 * Helper to parse inline markdown: bold (**text**), italics (*text*), inline code (`code`), links ([text](url)), and strikethrough (~~text~~)
 */
const InlineText = ({ text }) => {
  if (!text) return null;
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|~~([^~]+)~~)/g;
  const parts = [];
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }

    if (match[2] && match[3]) {
      // Link [text](url)
      parts.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 underline font-medium"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      // Bold **text**
      parts.push(
        <strong key={match.index} className="font-bold text-gray-950">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      // Code `text`
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-indigo-700 rounded font-mono text-[11px]">
          {match[5]}
        </code>
      );
    } else if (match[6]) {
      // Italic *text*
      parts.push(
        <em key={match.index} className="italic text-gray-700">
          {match[6]}
        </em>
      );
    } else if (match[7]) {
      // Strikethrough ~~text~~
      parts.push(
        <del key={match.index} className="line-through text-gray-400">
          {match[7]}
        </del>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return parts.length > 0 ? parts : text;
};

/**
 * Parses raw markdown text into structured semantic blocks:
 * Headings, Code Blocks, Tables, Bullet Lists, Numbered Lists, Blockquotes, Horizontal Rules, and Paragraphs.
 */
const parseMarkdownBlocks = (text) => {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Skip blank lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Code Block (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push({ type: 'code', language: lang, content: codeLines.join('\n') });
      continue;
    }

    // 3. Horizontal Rule (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 4. Headings (# H1, ## H2, ### H3, #### H4, ##### H5)
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        blocks.push({ type: 'heading', level: match[1].length, text: match[2] });
        i++;
        continue;
      }
    }

    // 5. Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
      continue;
    }

    // 6. Markdown Table (header + separator |:---|:---| + data rows)
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().includes('|') &&
      /^[|\s:\-]+$/.test(lines[i + 1].trim())
    ) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim().length > 0) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (r) => {
          const cells = r.split('|').map((c) => c.trim());
          if (cells[0] === '') cells.shift();
          if (cells[cells.length - 1] === '') cells.pop();
          return cells;
        };

        const headers = parseRow(tableLines[0]);
        const rows = tableLines.slice(2).map(parseRow);
        blocks.push({ type: 'table', headers, rows });
        continue;
      }
    }

    // 7. Bullet List (- item, * item, • item)
    if (/^[-*•]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'bullet_list', items });
      continue;
    }

    // 8. Numbered List (1. item, 2. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemMatch = lines[i].trim().match(/^\d+\.\s+(.*)$/);
        items.push(itemMatch ? itemMatch[1] : lines[i].trim());
        i++;
      }
      blocks.push({ type: 'numbered_list', items });
      continue;
    }

    // 9. Standard Paragraph (consume continuous text until next block)
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim().length > 0 &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !(lines[i].trim().includes('|') && i + 1 < lines.length && /^[|\s:\-]+$/.test(lines[i + 1].trim()))
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
    }
  }

  return blocks;
};

/**
 * Modern, High-Performance Markdown Renderer Component for AI Chat
 * Cleanly renders markdown tables, headers, lists, blockquotes, code, and bold text.
 */
const FormattedMessage = ({ text }) => {
  if (!text) return null;

  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="space-y-3 text-xs sm:text-sm text-gray-800 leading-relaxed overflow-hidden">
      {blocks.map((block, bIdx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <h2 key={bIdx} className="text-base sm:text-lg font-extrabold text-gray-950 mt-3 mb-1.5 flex items-center gap-1.5">
                  <InlineText text={block.text} />
                </h2>
              );
            }
            if (block.level === 2) {
              return (
                <h3 key={bIdx} className="text-sm sm:text-base font-bold text-gray-900 mt-3 mb-1 pb-1 border-b border-gray-100 flex items-center gap-1.5">
                  <InlineText text={block.text} />
                </h3>
              );
            }
            if (block.level === 3) {
              return (
                <h4 key={bIdx} className="text-xs sm:text-sm font-bold text-indigo-950 mt-2.5 mb-1 flex items-center gap-1.5">
                  <InlineText text={block.text} />
                </h4>
              );
            }
            return (
              <h5 key={bIdx} className="text-xs font-bold text-gray-800 mt-2 mb-0.5 flex items-center gap-1.5">
                <InlineText text={block.text} />
              </h5>
            );
          }

          case 'table': {
            return (
              <div key={bIdx} className="overflow-x-auto my-2.5 rounded-xl border border-gray-200/90 shadow-2xs bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                  <thead className="bg-indigo-50/80 text-indigo-950 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-3.5 py-2.5 whitespace-nowrap">
                          <InlineText text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-indigo-50/30 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2 text-gray-700 whitespace-nowrap font-medium">
                            <InlineText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case 'bullet_list': {
            return (
              <ul key={bIdx} className="space-y-1.5 my-2 pl-0.5">
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                    <span className="flex-1 leading-relaxed">
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          }

          case 'numbered_list': {
            return (
              <ol key={bIdx} className="space-y-2 my-2.5 pl-0.5">
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-800">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {iIdx + 1}
                    </span>
                    <span className="flex-1 leading-relaxed">
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ol>
            );
          }

          case 'blockquote': {
            return (
              <div key={bIdx} className="my-2 p-3 bg-indigo-50/70 border-l-4 border-indigo-600 rounded-r-xl text-xs text-indigo-950 font-medium leading-relaxed">
                <InlineText text={block.text} />
              </div>
            );
          }

          case 'hr': {
            return <hr key={bIdx} className="my-3.5 border-t border-gray-200/90" />;
          }

          case 'code': {
            return (
              <div key={bIdx} className="my-2.5 rounded-xl overflow-hidden bg-gray-900 border border-gray-800 shadow-xs">
                {block.language && (
                  <div className="px-3 py-1 bg-gray-800/80 text-gray-400 text-[10px] font-mono border-b border-gray-800 uppercase">
                    {block.language}
                  </div>
                )}
                <pre className="p-3 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre">
                  <code>{block.content}</code>
                </pre>
              </div>
            );
          }

          case 'paragraph':
          default: {
            const lines = block.text.split('\n');
            return (
              <p key={bIdx} className="text-xs sm:text-sm text-gray-800 leading-relaxed my-1">
                {lines.map((line, lIdx) => (
                  <span key={lIdx}>
                    <InlineText text={line} />
                    {lIdx < lines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            );
          }
        }
      })}
    </div>
  );
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
      dispatch(fetchTransactions());
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
