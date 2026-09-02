import { GoogleGenAI } from '@google/genai';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Budget from '../models/Budget.js';
import Loan from '../models/Loan.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import Lending from '../models/Lending.js';
import RecurringRule from '../models/RecurringRule.js';
import Category from '../models/Category.js';
import TaxRecord from '../models/TaxRecord.js';
import MonthlyReviewDigest from '../models/MonthlyReviewDigest.js';
import { calculateSafeToSpend } from './proactiveIntelligenceService.js';

/**
 * Helper to compute detailed aggregated financials and extract ALL transactions for a specific date range.
 */
const getPeriodFinancials = async (userId, startDate, endDate, periodLabel) => {
  const txns = await Transaction.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate('category account toAccount')
    .sort({ date: -1 })
    .lean();

  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfers = 0;
  const categoryMap = {};
  const merchantMap = {};
  const dayWiseSpend = {};

  const allTransactions = txns.map((t) => {
    const amount = t.amount || 0;
    const dateStr = t.date ? new Date(t.date).toISOString().split('T')[0] : '';
    const catName = t.category?.name || 'Uncategorized';
    const merchant = t.merchant || t.description || 'Transaction';

    if (t.type === 'Income') {
      totalIncome += amount;
    } else if (t.type === 'Expense') {
      totalExpense += amount;
      categoryMap[catName] = (categoryMap[catName] || 0) + amount;
      if (merchant && merchant !== 'Transaction') {
        merchantMap[merchant] = (merchantMap[merchant] || 0) + amount;
      }
      if (dateStr) {
        dayWiseSpend[dateStr] = (dayWiseSpend[dateStr] || 0) + amount;
      }
    } else if (t.type === 'Transfer') {
      totalTransfers += amount;
    }

    return {
      date: dateStr,
      type: t.type,
      amount,
      merchantOrDescription: merchant,
      category: catName,
      sourceAccount: t.account?.name || 'Account',
      toAccount: t.toAccount?.name || null,
      notes: t.notes || '',
    };
  });

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentageOfTotalExpense: totalExpense > 0 ? `${((amount / totalExpense) * 100).toFixed(1)}%` : '0%',
    }))
    .sort((a, b) => b.amount - a.amount);

  const topMerchants = Object.entries(merchantMap)
    .map(([merchant, amount]) => ({ merchant, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Top 5 largest single expenses
  const largestExpenses = allTransactions
    .filter((t) => t.type === 'Expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    periodLabel,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    transactionCount: txns.length,
    totalIncome,
    totalExpense,
    totalTransfers,
    netSavings,
    savingsRate: `${savingsRate}%`,
    categoryBreakdown,
    topMerchants,
    largestExpenses,
    allTransactions, // Complete, un-truncated list of transactions for this period
  };
};

/**
 * Gathers complete real-time financial ground truth across multi-period windows and all collections.
 */
export const getLiveFinancialContext = async (userId, userMessage = '') => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // 1. Current Month (e.g. September 2026)
  const currentMonthStart = new Date(currentYear, currentMonth, 1);
  const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  const currentMonthName = currentMonthStart.toLocaleString('default', { month: 'long', year: 'numeric' });
  const thisMonthData = await getPeriodFinancials(userId, currentMonthStart, currentMonthEnd, `This Month (${currentMonthName})`);

  // 2. Last Month (e.g. August 2026)
  const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
  const lastMonthName = lastMonthStart.toLocaleString('default', { month: 'long', year: 'numeric' });
  const lastMonthData = await getPeriodFinancials(userId, lastMonthStart, lastMonthEnd, `Last Month (${lastMonthName})`);

  // 3. Two Months Ago (e.g. July 2026) for trend comparison
  const twoMonthsAgoStart = new Date(currentYear, currentMonth - 2, 1);
  const twoMonthsAgoEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59);
  const twoMonthsAgoName = twoMonthsAgoStart.toLocaleString('default', { month: 'long', year: 'numeric' });
  const twoMonthsAgoData = await getPeriodFinancials(userId, twoMonthsAgoStart, twoMonthsAgoEnd, twoMonthsAgoName);

  // 4. Monthly Review Digest if available
  const lastMonthKey = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDigest = await MonthlyReviewDigest.findOne({ user: userId, month: lastMonthKey }).lean();

  // 5. Historical 6-Month Rollup Summary
  const monthlyRollups = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(currentYear, currentMonth - i, 1);
    const mEnd = new Date(currentYear, currentMonth - i + 1, 0, 23, 59, 59);
    const mName = mStart.toLocaleString('default', { month: 'short', year: 'numeric' });

    const mTxns = await Transaction.find({
      user: userId,
      date: { $gte: mStart, $lte: mEnd },
    }).lean();

    let inc = 0;
    let exp = 0;
    mTxns.forEach((t) => {
      if (t.type === 'Income') inc += t.amount;
      if (t.type === 'Expense') exp += t.amount;
    });

    monthlyRollups.push({
      month: mName,
      income: inc,
      expense: exp,
      netCashFlow: inc - exp,
      savingsRate: inc > 0 ? `${Math.round(((inc - exp) / inc) * 100)}%` : '0%',
      transactions: mTxns.length,
    });
  }

  // 6. Accounts Breakdown
  const accounts = await Account.find({ user: userId, isArchived: false }).lean();
  const liquidAccounts = accounts.filter((a) => a.type === 'Bank' || a.type === 'Cash' || a.type === 'UPI');
  const creditAccounts = accounts.filter((a) => a.type === 'Credit Card');
  const fdAccounts = accounts.filter((a) => a.type === 'FD');

  const totalLiquidCash = liquidAccounts.reduce((sum, a) => sum + Math.max(0, a.currentBalance || 0), 0);
  const totalCreditDebt = creditAccounts.reduce((sum, a) => sum + (a.currentBalance < 0 ? Math.abs(a.currentBalance) : (a.currentBalance || 0)), 0);
  const totalFDBalance = fdAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const accountBreakdown = accounts.map((a) => ({
    name: a.name,
    type: a.type,
    currentBalance: a.currentBalance,
    currency: a.currency || 'INR',
    creditLimit: a.creditLimit || null,
    availableCredit: a.creditLimit ? Math.max(0, a.creditLimit - Math.abs(a.currentBalance || 0)) : null,
  }));

  // 7. Investments Breakdown
  const investments = await Investment.find({ user: userId }).lean();
  let totalInvestedAmount = 0;
  let totalCurrentValue = 0;
  const investmentTypeMap = {};

  const investmentItems = investments.map((inv) => {
    const invested = inv.investedAmount || 0;
    const current = inv.currentValue || invested;
    const pnl = current - invested;
    const returnPct = invested > 0 ? ((pnl / invested) * 100).toFixed(2) : 0;

    totalInvestedAmount += invested;
    totalCurrentValue += current;

    const type = inv.type || 'Other';
    if (!investmentTypeMap[type]) {
      investmentTypeMap[type] = { invested: 0, current: 0, count: 0 };
    }
    investmentTypeMap[type].invested += invested;
    investmentTypeMap[type].current += current;
    investmentTypeMap[type].count += 1;

    return {
      name: inv.name,
      type: inv.type,
      platform: inv.platform || 'Direct',
      investedAmount: invested,
      currentValue: current,
      profitLoss: pnl,
      returnPercentage: `${returnPct}%`,
      isSip: inv.isSip || false,
      sipAmount: inv.sipAmount || 0,
      sipFrequency: inv.sipFrequency || 'monthly',
      quantity: inv.quantity || null,
      buyPrice: inv.buyPrice || null,
    };
  });

  const totalInvestmentProfitLoss = totalCurrentValue - totalInvestedAmount;
  const overallInvestmentReturnPct = totalInvestedAmount > 0
    ? ((totalInvestmentProfitLoss / totalInvestedAmount) * 100).toFixed(2)
    : 0;

  // 8. Budgets
  const budgets = await Budget.find({ user: userId, isActive: true }).populate('category').lean();
  const budgetBreakdown = budgets.map((b) => {
    const catName = b.category?.name || b.name || 'General';
    const spentThisMonth = (thisMonthData.categoryBreakdown.find((c) => c.category === catName)?.amount) || 0;
    const limit = b.limit || b.amount || 0;
    const remaining = Math.max(0, limit - spentThisMonth);
    const pctUsed = limit > 0 ? Math.round((spentThisMonth / limit) * 100) : 0;
    return {
      id: b._id.toString(),
      name: b.name,
      category: catName,
      monthlyLimit: limit,
      spentThisMonth,
      remainingBudget: remaining,
      percentageUsed: `${pctUsed}%`,
      isOverBudget: spentThisMonth > limit,
      overspentBy: spentThisMonth > limit ? spentThisMonth - limit : 0,
    };
  });

  // 9. Loans & EMIs
  const loans = await Loan.find({ user: userId, isActive: true }).populate('debitAccount').lean();
  let totalLoanPrincipal = 0;
  let totalRemainingLoanDebt = 0;
  let totalMonthlyEMI = 0;

  const loanList = loans.map((l) => {
    const paidPrincipal = (l.payments || []).reduce((s, p) => s + (p.principal || 0), 0);
    const remaining = Math.max(0, (l.principal || 0) - paidPrincipal);

    totalLoanPrincipal += (l.principal || 0);
    totalRemainingLoanDebt += remaining;
    totalMonthlyEMI += (l.emiAmount || 0);

    return {
      id: l._id.toString(),
      name: l.name,
      lender: l.lender || 'Bank',
      type: l.type,
      originalPrincipal: l.principal,
      remainingDebt: remaining,
      paidPrincipal,
      annualInterestRate: `${l.interestRate}%`,
      tenureMonths: l.tenureMonths,
      monthlyEMI: l.emiAmount,
      autoDebit: l.autoDebit || false,
      debitDay: l.debitDay || 1,
      debitAccount: l.debitAccount?.name || 'Not Linked',
    };
  });

  // 10. People Ledger
  const lendingRecords = await Lending.find({ user: userId, isSettled: false }).lean();
  let totalOwedToMe = 0;
  let totalIOwe = 0;
  const lentToOthers = [];
  const borrowedFromOthers = [];

  lendingRecords.forEach((item) => {
    const totalRepaid = (item.repayments || []).reduce((s, r) => s + r.amount, 0);
    const outstanding = Math.max(0, item.amount - totalRepaid);

    if (item.type === 'lent') {
      totalOwedToMe += outstanding;
      lentToOthers.push({
        id: item._id.toString(),
        person: item.person,
        lentAmount: item.amount,
        repaid: totalRepaid,
        outstandingOwedToMe: outstanding,
        dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : null,
      });
    } else {
      totalIOwe += outstanding;
      borrowedFromOthers.push({
        id: item._id.toString(),
        person: item.person,
        borrowedAmount: item.amount,
        repaid: totalRepaid,
        outstandingIOwe: outstanding,
        dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : null,
      });
    }
  });

  // 11. Goals
  const goals = await Goal.find({ user: userId }).lean();
  const goalList = goals.map((g) => {
    const pct = g.targetAmount > 0 ? Math.min(100, Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)) : 0;
    return {
      id: g._id.toString(),
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount || 0,
      remainingAmount: Math.max(0, g.targetAmount - (g.currentAmount || 0)),
      progressPercentage: `${pct}%`,
      deadline: g.deadline ? new Date(g.deadline).toISOString().split('T')[0] : null,
      isCompleted: g.isCompleted || false,
    };
  });

  // 12. Recurring Rules
  const recurringRules = await RecurringRule.find({ user: userId, isActive: true }).populate('category account').lean();
  const recurringList = recurringRules.map((r) => ({
    id: r._id.toString(),
    title: r.title,
    amount: r.amount,
    type: r.type,
    frequency: r.frequency,
    category: r.category?.name || 'General',
    account: r.account?.name || 'Default Account',
    nextRunDate: r.nextRunDate ? new Date(r.nextRunDate).toISOString().split('T')[0] : null,
  }));

  // 13. Dynamic Intelligence Metrics
  const safeData = await calculateSafeToSpend(userId);
  const totalAssets = totalLiquidCash + totalCurrentValue + totalFDBalance + totalOwedToMe;
  const totalLiabilities = totalRemainingLoanDebt + totalCreditDebt + totalIOwe;
  const netWorth = totalAssets - totalLiabilities;

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    totalLiquidCash,
    totalCreditDebt,
    totalFixedDeposits: totalFDBalance,
    safeToSpendToday: safeData.safeToSpendDaily,

    // Time-Period Deep Dives
    thisMonth: thisMonthData,
    lastMonth: lastMonthData,
    twoMonthsAgo: twoMonthsAgoData,
    lastMonthDigest: lastMonthDigest ? {
      financialHealthScore: lastMonthDigest.financialHealthScore,
      topCategories: lastMonthDigest.topCategories,
      anomalies: lastMonthDigest.anomalies,
      insights: lastMonthDigest.insights,
      recommendations: lastMonthDigest.recommendations,
    } : null,
    sixMonthHistory: monthlyRollups,

    // Itemized Assets & Liabilities
    accounts: accountBreakdown,
    investments: {
      totalInvested: totalInvestedAmount,
      totalCurrentValue,
      totalProfitLoss: totalInvestmentProfitLoss,
      overallReturn: `${overallInvestmentReturnPct}%`,
      byAssetType: investmentTypeMap,
      items: investmentItems,
    },
    budgets: budgetBreakdown,
    loans: {
      totalPrincipal: totalLoanPrincipal,
      totalRemainingDebt: totalRemainingLoanDebt,
      totalMonthlyEMI,
      items: loanList,
    },
    people: {
      totalOwedToMe,
      totalIOwe,
      lentToOthers,
      borrowedFromOthers,
    },
    goals: goalList,
    recurringBills: recurringList,
  };
};

/**
 * Handles conversational queries with Google Gemini API, Multi-Period Ground Truth Financial Data & Generative Action Proposals.
 */
export const askFinancialCopilot = async ({ userId, message, conversationHistory = [] }) => {
  const context = await getLiveFinancialContext(userId, message);
  const apiKey = process.env.GEMINI_API_KEY;

  const systemPrompt = `You are Capise AI Copilot — the dedicated, elite AI wealth manager embedded directly inside the user's Capise Personal Finance App.
You have real-time, 100% accurate, read-only access to the user's complete live financial database across all months, accounts, investments, transactions, and debt obligations.

══════════════════════════════════════════════════════════════════════════════
📊 USER'S COMPLETE MULTI-PERIOD DATABASE STATE (GROUND TRUTH):
══════════════════════════════════════════════════════════════════════════════
${JSON.stringify(context, null, 2)}
══════════════════════════════════════════════════════════════════════════════

YOUR CORE PRINCIPLES & INSTRUCTIONS:
1. **EXACT PERIOD COMPREHENSION**:
   - If the user asks about "last month" or "overview of finances of last month", reference the \`lastMonth\` object (${context.lastMonth.periodLabel}).
     - Total Income: ₹${context.lastMonth.totalIncome.toLocaleString('en-IN')}
     - Total Expense: ₹${context.lastMonth.totalExpense.toLocaleString('en-IN')}
     - Net Savings: ₹${context.lastMonth.netSavings.toLocaleString('en-IN')} (Savings Rate: ${context.lastMonth.savingsRate})
     - Total Transactions: ${context.lastMonth.transactionCount}
     - Provide the COMPLETE category breakdown and mention key notable transactions (e.g. largest expenses like ${context.lastMonth.largestExpenses.map(e => `${e.merchantOrDescription} ₹${e.amount.toLocaleString('en-IN')}`).join(', ')}).
   - If the user asks about "this month", reference \`thisMonth\` (${context.thisMonth.periodLabel}).
   - If the user asks for historical trends, reference \`sixMonthHistory\`.
   - If the user asks about investments, reference \`investments\` (Total Invested: ₹${context.investments.totalInvested.toLocaleString('en-IN')}, Current Value: ₹${context.investments.totalCurrentValue.toLocaleString('en-IN')}, Return: ${context.investments.overallReturn}) and provide the full itemized table.
   - If the user asks about accounts/balances, reference \`accounts\` (Total Liquid Cash: ₹${context.totalLiquidCash.toLocaleString('en-IN')}).
   - If the user asks about loans, reference \`loans\` (Total Remaining Debt: ₹${context.loans.totalRemainingDebt.toLocaleString('en-IN')}, EMI: ₹${context.loans.totalMonthlyEMI.toLocaleString('en-IN')}/mo).
   - If the user asks about people/lending, reference \`people\` (Owed to me: ₹${context.people.totalOwedToMe.toLocaleString('en-IN')}, I owe: ₹${context.people.totalIOwe.toLocaleString('en-IN')}).

2. **COMPREHENSIVE & RIGOROUS BREAKDOWN**:
   - Do NOT abbreviate or truncate the data when the user asks for a complete overview or breakdown.
   - Use structured Markdown tables for:
     1. High-level Summary (Income, Expense, Net Savings, Savings Rate, Transaction count)
     2. Category-wise Spending Breakdown (Category Name, Amount, % Share)
     3. Key Transactions (Date, Merchant, Category, Amount, Source Account)
   - Format all currency with Indian Rupee symbols (₹).
   - Include helpful financial observations and actionable advice based on their spending velocity and cash buffers.

3. **ACTIONABLE 1-CLICK IN-CHAT EXECUTION BUTTONS (GENERATIVE TOOL CALLING)**:
   - When making concrete actionable recommendations (e.g. adjusting an overspent budget, deploying idle cash into an investment holding, contributing to an emergency/vacation goal, sending a WhatsApp reminder to a debtor, or logging a transaction), ALWAYS generate a structured Action Proposal block at the very end of your response inside a \`\`\`json:actions ... \`\`\` code block.
   - Supported action types and payloads:
     a) **UPDATE_BUDGET_LIMIT**:
        { "id": "act_budget_1", "type": "UPDATE_BUDGET_LIMIT", "title": "Increase Dining Budget to ₹8,000", "description": "Adjust monthly limit from ₹6,500 to ₹8,000 to match spending velocity.", "badge": "Budget Optimization", "actionText": "Approve Limit Change", "payload": { "categoryName": "Dining Out & Delivery", "newLimit": 8000 } }
     b) **LOG_INVESTMENT_TOPUP**:
        { "id": "act_inv_1", "type": "LOG_INVESTMENT_TOPUP", "title": "Deploy ₹25,000 into UTI Nifty 50", "description": "Invest idle cash from savings into index funds.", "badge": "Capital Growth", "actionText": "Deploy ₹25,000", "payload": { "investmentName": "UTI Nifty 50 Index Fund", "amount": 25000, "accountName": "HDFC Salary Account" } }
     c) **CONTRIBUTE_TO_GOAL**:
        { "id": "act_goal_1", "type": "CONTRIBUTE_TO_GOAL", "title": "Top-up Emergency Fund by ₹10,000", "description": "Allocate surplus funds to accelerate safety buffer.", "badge": "Goal Auto-Pilot", "actionText": "Contribute ₹10,000", "payload": { "goalName": "Emergency Fund", "amount": 10000, "accountName": "HDFC Salary Account" } }
     d) **GENERATE_WHATSAPP_REMINDER**:
        { "id": "act_wa_1", "type": "GENERATE_WHATSAPP_REMINDER", "title": "Remind Rahul Sharma (₹10,000 Overdue)", "description": "Open pre-filled polite payment reminder on WhatsApp.", "badge": "Debt Recovery", "actionText": "Send WhatsApp Reminder", "payload": { "personName": "Rahul Sharma", "amount": 10000, "dueDate": "September 14, 2026" } }
     e) **LOG_TRANSACTION**:
        { "id": "act_txn_1", "type": "LOG_TRANSACTION", "title": "Log ₹1,500 Grocery Expense", "description": "Record payment against Groceries category.", "badge": "Quick Log", "actionText": "Confirm Transaction", "payload": { "type": "Expense", "amount": 1500, "categoryName": "Groceries & Supplies", "merchant": "Nature Basket", "accountName": "HDFC Salary Account" } }

   - Make sure the \`\`\`json:actions block is valid JSON containing an array of action proposal objects.`;

  // Build multi-turn conversation history
  const recentHistory = (conversationHistory || [])
    .filter((m) => m.text && m.sender)
    .slice(-6)
    .map((m) => `${m.sender === 'user' ? 'User' : 'Capise AI'}: ${m.text}`)
    .join('\n\n');

  const fullPrompt = `${systemPrompt}\n\n${recentHistory ? `PREVIOUS CHAT HISTORY:\n${recentHistory}\n\n` : ''}User's Question: ${message}\n\nPlease provide an accurate, comprehensive, and well-structured response grounded in the user's data with actionable proposal buttons where relevant:`;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      if (response && response.text) {
        let cleanReply = response.text;
        let actions = [];

        // Extract json:actions block
        const actionBlockRegex = /```json:actions\s*([\s\S]*?)\s*```/i;
        const match = cleanReply.match(actionBlockRegex);
        if (match) {
          try {
            actions = JSON.parse(match[1]);
            cleanReply = cleanReply.replace(actionBlockRegex, '').trim();
          } catch (e) {
            console.warn('Failed to parse Gemini actions JSON:', e.message);
          }
        }

        return {
          reply: cleanReply,
          actions,
          contextUsed: {
            netWorth: context.netWorth,
            totalInvestments: context.investments.totalCurrentValue,
            investedAmount: context.investments.totalInvested,
            liquidCash: context.totalLiquidCash,
            safeToSpendToday: context.safeToSpendToday,
          },
        };
      }
    } catch (err) {
      console.error('Gemini API execution error:', err);
    }
  }

  // Fallback intelligent reasoning engine
  return generateDeterministicFallbackResponse(context, message);
};

/**
 * High-accuracy fallback engine for multi-period and generic queries with 1-click action proposals.
 */
const generateDeterministicFallbackResponse = (context, message) => {
  const q = message.toLowerCase();
  let actions = [];

  // 1. Last Month Overview Query
  if (q.includes('last month') || q.includes('previous month') || q.includes('august')) {
    const lm = context.lastMonth;
    let reply = `### 📊 Complete Financial Overview: ${lm.periodLabel}\n\n`;
    reply += `- **Total Inflow (Income)**: ₹${lm.totalIncome.toLocaleString('en-IN')}\n`;
    reply += `- **Total Outflow (Expenses)**: ₹${lm.totalExpense.toLocaleString('en-IN')}\n`;
    reply += `- **Net Cash Flow (Savings)**: ${lm.netSavings >= 0 ? '+' : '-'}₹${Math.abs(lm.netSavings).toLocaleString('en-IN')}\n`;
    reply += `- **Savings Rate**: **${lm.savingsRate}**\n`;
    reply += `- **Total Recorded Transactions**: **${lm.transactionCount} transactions**\n\n`;

    if (lm.categoryBreakdown.length > 0) {
      reply += `#### 🏷️ Category Spending Breakdown:\n\n`;
      reply += `| Category | Total Spent | % of Total Expenses |\n`;
      reply += `| :--- | :--- | :--- |\n`;
      lm.categoryBreakdown.forEach((c) => {
        reply += `| **${c.category}** | ₹${c.amount.toLocaleString('en-IN')} | ${c.percentageOfTotalExpense} |\n`;
      });
      reply += `\n`;
    }

    if (lm.largestExpenses.length > 0) {
      reply += `#### 💳 Top Largest Expenses in ${lm.periodLabel}:\n\n`;
      reply += `| Date | Merchant / Description | Category | Amount |\n`;
      reply += `| :--- | :--- | :--- | :--- |\n`;
      lm.largestExpenses.forEach((t) => {
        reply += `| ${t.date} | **${t.merchantOrDescription}** | ${t.category} | ₹${t.amount.toLocaleString('en-IN')} |\n`;
      });
    }

    // Attach suggested surplus deployment action if positive net savings
    if (lm.netSavings > 10000 && context.investments.items.length > 0) {
      const topInv = context.investments.items[0];
      actions.push({
        id: 'act_deploy_surplus',
        type: 'LOG_INVESTMENT_TOPUP',
        title: `Deploy ₹15,000 Surplus into ${topInv.name}`,
        description: `Invest a portion of last month's ₹${lm.netSavings.toLocaleString('en-IN')} surplus to accelerate compounding.`,
        badge: 'Wealth Building',
        actionText: 'Deploy ₹15,000',
        payload: {
          investmentName: topInv.name,
          amount: 15000,
          accountName: 'HDFC Salary Account',
        },
      });
    }

    return {
      reply,
      actions,
      contextUsed: {
        lastMonthIncome: lm.totalIncome,
        lastMonthExpense: lm.totalExpense,
        lastMonthSavings: lm.netSavings,
      },
    };
  }

  // 2. Investments & Idle Cash Deployment Query
  if (q.includes('idle cash') || q.includes('deploy') || q.includes('investment') || q.includes('portfolio') || q.includes('stock')) {
    const inv = context.investments;
    let reply = `### 📈 Your Investment Portfolio & Idle Cash Optimization\n\n`;
    reply += `- **Total Liquid Cash**: ₹${context.totalLiquidCash.toLocaleString('en-IN')}\n`;
    reply += `- **Total Invested Amount**: ₹${inv.totalInvested.toLocaleString('en-IN')}\n`;
    reply += `- **Total Current Value**: ₹${inv.totalCurrentValue.toLocaleString('en-IN')}\n`;
    reply += `- **Overall Profit / Loss**: ${inv.totalProfitLoss >= 0 ? '+' : '-'}₹${Math.abs(inv.totalProfitLoss).toLocaleString('en-IN')} (${inv.overallReturn})\n\n`;

    if (inv.items && inv.items.length > 0) {
      reply += `#### 📋 Itemized Holdings Breakdown:\n\n`;
      reply += `| Asset Name | Type | Invested | Current Value | P&L (Return) |\n`;
      reply += `| :--- | :--- | :--- | :--- | :--- |\n`;
      inv.items.forEach((item) => {
        reply += `| **${item.name}** | ${item.type} | ₹${item.investedAmount.toLocaleString('en-IN')} | ₹${item.currentValue.toLocaleString('en-IN')} | ${item.profitLoss >= 0 ? '+' : ''}₹${item.profitLoss.toLocaleString('en-IN')} (${item.returnPercentage}) |\n`;
      });
    }

    if (inv.items.length > 0 && context.totalLiquidCash > 50000) {
      const topInv = inv.items[0];
      actions.push({
        id: 'act_topup_inv',
        type: 'LOG_INVESTMENT_TOPUP',
        title: `Deploy ₹25,000 into ${topInv.name}`,
        description: `Transfer idle bank cash into ${topInv.name} (${topInv.type}) to optimize yield.`,
        badge: 'Idle Cash Optimizer',
        actionText: 'Deploy ₹25,000',
        payload: {
          investmentName: topInv.name,
          amount: 25000,
          accountName: 'HDFC Salary Account',
        },
      });
    }

    return {
      reply,
      actions,
      contextUsed: {
        totalInvestments: inv.totalCurrentValue,
        investedAmount: inv.totalInvested,
      },
    };
  }

  // 3. Budgets & Overspending Query
  if (q.includes('budget') || q.includes('overspend') || q.includes('limit') || q.includes('dining')) {
    let reply = `### 🎯 Budget Guardrails & Spending Status\n\n`;
    const overspentBudgets = context.budgets.filter((b) => b.isOverBudget);

    if (overspentBudgets.length > 0) {
      reply += `> ⚠️ You have **${overspentBudgets.length} budget(s)** currently exceeding limits!\n\n`;
    }

    reply += `| Category | Limit | Spent This Month | Remaining | Status |\n`;
    reply += `| :--- | :--- | :--- | :--- | :--- |\n`;
    context.budgets.forEach((b) => {
      reply += `| **${b.category}** | ₹${b.monthlyLimit.toLocaleString('en-IN')} | ₹${b.spentThisMonth.toLocaleString('en-IN')} | ₹${b.remainingBudget.toLocaleString('en-IN')} | ${b.isOverBudget ? '🔴 Over Limit' : '🟢 Safe'} |\n`;
    });

    // Propose budget increase action
    const targetBudget = overspentBudgets[0] || context.budgets[0];
    if (targetBudget) {
      const recommendedLimit = Math.ceil((targetBudget.spentThisMonth * 1.2 || targetBudget.monthlyLimit * 1.25) / 500) * 500;
      actions.push({
        id: `act_budget_${targetBudget.id || 'target'}`,
        type: 'UPDATE_BUDGET_LIMIT',
        title: `Increase ${targetBudget.category} Budget to ₹${recommendedLimit.toLocaleString('en-IN')}`,
        description: `Adjust monthly limit to ₹${recommendedLimit.toLocaleString('en-IN')} to prevent repeated warning alerts.`,
        badge: 'Budget Guardrail',
        actionText: `Approve ₹${recommendedLimit.toLocaleString('en-IN')} Limit`,
        payload: {
          budgetId: targetBudget.id,
          categoryName: targetBudget.category,
          newLimit: recommendedLimit,
        },
      });
    }

    return { reply, actions, contextUsed: { safeToSpendToday: context.safeToSpendToday } };
  }

  // 4. People / Lending Query
  if (q.includes('who owes') || q.includes('people') || q.includes('lend') || q.includes('borrow') || q.includes('rahul')) {
    const p = context.people;
    let reply = `### 🤝 People Ledger (Debts & Receivables)\n\n`;
    reply += `- **Total Money Owed To You**: ₹${p.totalOwedToMe.toLocaleString('en-IN')}\n`;
    reply += `- **Total Money You Owe**: ₹${p.totalIOwe.toLocaleString('en-IN')}\n\n`;

    if (p.lentToOthers.length > 0) {
      reply += `#### 📋 Outstanding Loans Lent to Friends:\n\n`;
      reply += `| Person | Lent Amount | Repaid | Outstanding | Due Date |\n`;
      reply += `| :--- | :--- | :--- | :--- | :--- |\n`;
      p.lentToOthers.forEach((l) => {
        reply += `| **${l.person}** | ₹${l.lentAmount.toLocaleString('en-IN')} | ₹${l.repaid.toLocaleString('en-IN')} | **₹${l.outstandingOwedToMe.toLocaleString('en-IN')}** | ${l.dueDate || 'No date set'} |\n`;
      });

      const firstDebtor = p.lentToOthers[0];
      actions.push({
        id: `act_wa_${firstDebtor.person}`,
        type: 'GENERATE_WHATSAPP_REMINDER',
        title: `Send WhatsApp Reminder to ${firstDebtor.person}`,
        description: `Open pre-filled polite reminder for ₹${firstDebtor.outstandingOwedToMe.toLocaleString('en-IN')}.`,
        badge: 'Debt Recovery',
        actionText: 'Send WhatsApp Reminder',
        payload: {
          personName: firstDebtor.person,
          amount: firstDebtor.outstandingOwedToMe,
          dueDate: firstDebtor.dueDate,
        },
      });
    }

    return { reply, actions, contextUsed: { totalOwedToMe: p.totalOwedToMe } };
  }

  // 5. Default Overview
  let reply = `### 💎 Capise Live Financial Overview\n\n`;
  reply += `- **Net Worth**: ₹${context.netWorth.toLocaleString('en-IN')}\n`;
  reply += `- **Liquid Cash**: ₹${context.totalLiquidCash.toLocaleString('en-IN')}\n`;
  reply += `- **Total Investments**: ₹${context.investments.totalCurrentValue.toLocaleString('en-IN')} (Invested: ₹${context.investments.totalInvested.toLocaleString('en-IN')})\n`;
  reply += `- **Total Liabilities**: ₹${context.totalLiabilities.toLocaleString('en-IN')}\n`;
  reply += `- **Safe-to-Spend Today**: ₹${context.safeToSpendToday.toLocaleString('en-IN')}/day\n\n`;
  reply += `Ask me about your **budgets, idle cash deployment, previous month breakdown, or overdue reminders**!`;

  return { reply, actions, contextUsed: { netWorth: context.netWorth } };
};
