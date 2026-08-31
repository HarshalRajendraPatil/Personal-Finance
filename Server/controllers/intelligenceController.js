import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Budget from '../models/Budget.js';
import Loan from '../models/Loan.js';
import RecurringRule from '../models/RecurringRule.js';
import Investment from '../models/Investment.js';
import Goal from '../models/Goal.js';
import {
  getMonthlyReview as getMonthlyReviewService,
  computeAndSaveMonthlyReview,
  listUserMonthlyReviews,
} from '../services/monthlyReviewService.js';



export const getHealthScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // 1. Calculate Savings Rate over last 6 months
    const transactions = await Transaction.find({
      user: userId,
      date: { $gte: sixMonthsAgo }
    });

    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === 'Income') totalIncome += t.amount;
      if (t.type === 'Expense') totalExpense += t.amount;
    });

    // Handle edge case where no income exists
    const monthlyIncome = totalIncome / 6 || 1;
    const monthlyExpense = totalExpense / 6 || 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // Score Savings Rate (Max 30) - 20% savings is optimal
    let savingsScore = 0;
    if (savingsRate >= 20) savingsScore = 30;
    else if (savingsRate > 0) savingsScore = Math.round((savingsRate / 20) * 30);
    else savingsScore = 0;

    // 2. Calculate Debt-to-Income (DTI)
    const loans = await Loan.find({ user: userId, status: 'Active' });
    let totalDebtMonthlyPayment = 0;
    let totalDebtRemaining = 0;
    loans.forEach(l => {
      // Assuming loan amount / duration is a proxy for monthly payment if EMI is not explicitly stored
      totalDebtRemaining += (l.amount - l.paidAmount);
      // Rough estimate of monthly obligation for DTI
      if (l.type === 'Borrow' || l.type === 'I Owe') {
        totalDebtMonthlyPayment += (l.amount / 12); // Just a heuristic
      }
    });

    // Add Credit Card Debt to remaining debt
    const ccAccounts = await Account.find({ user: userId, type: 'Credit Card', isArchived: false });
    ccAccounts.forEach(acc => {
       if (acc.currentBalance < 0) {
         totalDebtRemaining += Math.abs(acc.currentBalance);
         totalDebtMonthlyPayment += Math.abs(acc.currentBalance) * 0.05; // 5% minimum payment heuristic
       }
    });

    const dti = monthlyIncome > 0 ? (totalDebtMonthlyPayment / monthlyIncome) * 100 : 0;
    
    // Score DTI (Max 30) - < 10% is excellent, > 40% is risky
    let dtiScore = 30;
    if (dti > 40) dtiScore = 0;
    else if (dti > 10) dtiScore = Math.round(30 - ((dti - 10) / 30) * 30);

    // 3. Cash Cushion (Emergency Fund) - Max 20
    const liquidAccounts = await Account.find({ 
      user: userId, 
      type: { $in: ['Bank', 'Cash'] },
      isArchived: false
    });
    const liquidCash = liquidAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
    
    const monthsOfCushion = monthlyExpense > 0 ? (liquidCash / monthlyExpense) : 0;
    
    let cashScore = 0;
    if (monthsOfCushion >= 3) cashScore = 20;
    else if (monthsOfCushion > 0) cashScore = Math.round((monthsOfCushion / 3) * 20);

    // 4. Budget Adherence - Max 20
    const budgets = await Budget.find({ user: userId, isActive: true });
    let budgetScore = 20;
    let overBudgetCount = 0;
    if (budgets.length > 0) {
       budgetScore = 20; // Assume good until proven otherwise in a more complex setup
    } else {
       budgetScore = 10; // Penalty for not using budgets
    }

    const totalScore = Math.min(100, Math.max(0, savingsScore + dtiScore + cashScore + budgetScore));

    res.json({
      score: totalScore,
      pillars: {
        savings: { score: savingsScore, max: 30, value: savingsRate.toFixed(1) + '%', label: 'Savings Rate' },
        debt: { score: dtiScore, max: 30, value: dti.toFixed(1) + '%', label: 'Debt-to-Income' },
        cash: { score: cashScore, max: 20, value: monthsOfCushion.toFixed(1) + ' mo', label: 'Cash Cushion' },
        budget: { score: budgetScore, max: 20, value: budgets.length > 0 ? 'Active' : 'None', label: 'Budget Adherence' }
      },
      metrics: {
        liquidCash,
        totalDebtRemaining,
        monthlyIncome,
        monthlyExpense
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonthlyReview = async (req, res) => {
  try {
    const userId = req.user._id;
    let { month, year, refresh } = req.query;

    if (month === undefined || year === undefined) {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      month = now.getMonth(); // 0-indexed
      year = now.getFullYear();
    } else {
      month = parseInt(month, 10);
      year = parseInt(year, 10);
    }

    const forceRefresh = refresh === 'true' || refresh === true;
    const digest = await getMonthlyReviewService(userId, year, month, forceRefresh);

    res.json({
      period: {
        month,
        year,
        name: digest.monthName,
      },
      summary: digest.summary,
      financialHealthScore: digest.financialHealthScore,
      topCategories: digest.topCategories,
      anomalies: digest.anomalies,
      budgetPerformance: digest.budgetPerformance,
      netWorthChange: digest.netWorthChange,
      largestTransactions: digest.largestTransactions,
      insights: digest.insights,
      recommendations: digest.recommendations,
      transactionCount: digest.transactionCount,
      isAutomated: digest.isAutomated,
      createdAt: digest.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateMonthlyReview = async (req, res) => {
  try {
    const userId = req.user._id;
    let { month, year } = req.body;

    if (month === undefined || year === undefined) {
      const now = new Date();
      month = now.getMonth();
      year = now.getFullYear();
    } else {
      month = parseInt(month, 10);
      year = parseInt(year, 10);
    }

    const digest = await computeAndSaveMonthlyReview(userId, year, month, false);
    res.json(digest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listMonthlyReviews = async (req, res) => {
  try {
    const list = await listUserMonthlyReviews(req.user._id);
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ─────────────────────────────────────────────
// SPENDING INSIGHTS & ANOMALY DETECTION
// ─────────────────────────────────────────────
export const getSpendingInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = now;
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [currentTxns, prevTxns, historicalTxns, sixMonthsTxns] = await Promise.all([
      Transaction.find({ user: userId, date: { $gte: periodStart, $lte: periodEnd } })
        .populate('category', 'name color icon')
        .populate('account', 'name type'),
      Transaction.find({ user: userId, date: { $gte: prevStart, $lte: prevEnd } })
        .populate('category', 'name color icon')
        .populate('account', 'name type'),
      Transaction.find({ user: userId, date: { $gte: threeMonthsAgo, $lt: periodStart }, type: 'Expense' }),
      Transaction.find({ user: userId, date: { $gte: sixMonthsAgo } })
        .populate('category', 'name color icon'),
    ]);

    const currentExpenses = currentTxns.filter(t => t.type === 'Expense');

    // ── 1. Day-of-week breakdown ──
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daySpend = Array(7).fill(0);
    const dayCounts = Array(7).fill(0);
    currentExpenses.forEach(t => {
      const dow = new Date(t.date).getDay();
      daySpend[dow] += t.amount;
      dayCounts[dow]++;
    });
    const dayOfWeekBreakdown = dayNames.map((name, i) => ({
      day: name, total: daySpend[i], count: dayCounts[i],
      avg: dayCounts[i] > 0 ? Math.round(daySpend[i] / dayCounts[i]) : 0,
    }));

    const weekendSpend = daySpend[0] + daySpend[6];
    const weekdaySpend = daySpend.slice(1, 6).reduce((s, v) => s + v, 0);
    const weekdayAvg = weekdaySpend / 5;
    const weekendAvg = weekendSpend / 2;

    // ── 2. Merchant leaderboard ──
    const merchantMap = {};
    currentExpenses.forEach(t => {
      const merchant = t.merchant?.trim() || 'Unknown';
      if (!merchantMap[merchant]) merchantMap[merchant] = { name: merchant, total: 0, count: 0 };
      merchantMap[merchant].total += t.amount;
      merchantMap[merchant].count++;
    });
    const topMerchants = Object.values(merchantMap)
      .sort((a, b) => b.total - a.total).slice(0, 7)
      .map(m => ({ ...m, avg: Math.round(m.total / m.count) }));

    // ── 3. Category trends ──
    const buildCategoryMap = (txns) => {
      const map = {};
      txns.filter(t => t.type === 'Expense').forEach(t => {
        if (!t.category) return;
        const key = t.category._id?.toString() || t.category.toString();
        const name = t.category.name || 'Unknown';
        const color = t.category.color || '#6366f1';
        if (!map[key]) map[key] = { name, color, total: 0 };
        map[key].total += t.amount;
      });
      return map;
    };
    const currentCatMap = buildCategoryMap(currentTxns);
    const prevCatMap = buildCategoryMap(prevTxns);

    const categoryTrends = Object.entries(currentCatMap).map(([id, curr]) => {
      const prev = prevCatMap[id]?.total || 0;
      const change = prev > 0 ? (((curr.total - prev) / prev) * 100).toFixed(1) : null;
      return { id, name: curr.name, color: curr.color, current: curr.total, previous: prev, changePct: change };
    }).sort((a, b) => b.current - a.current).slice(0, 8);

    // ── 4. Transaction size analysis ──
    const currentAvgTxn = currentExpenses.length > 0 ? currentExpenses.reduce((s, t) => s + t.amount, 0) / currentExpenses.length : 0;
    const prevExpenses = prevTxns.filter(t => t.type === 'Expense');
    const prevAvgTxn = prevExpenses.length > 0 ? prevExpenses.reduce((s, t) => s + t.amount, 0) / prevExpenses.length : 0;
    const avgTxnChange = prevAvgTxn > 0 ? (((currentAvgTxn - prevAvgTxn) / prevAvgTxn) * 100).toFixed(1) : null;

    // ── 5. Anomaly detection ──
    const largeTransactionThreshold = currentAvgTxn * 2;
    const anomalousTransactions = currentExpenses
      .filter(t => t.amount > largeTransactionThreshold && t.amount > 5000)
      .sort((a, b) => b.amount - a.amount).slice(0, 5)
      .map(t => ({
        id: t._id, amount: t.amount, date: t.date,
        merchant: t.merchant || 'Unknown',
        category: t.category?.name || 'Uncategorized',
        ratio: currentAvgTxn > 0 ? (t.amount / currentAvgTxn).toFixed(1) : 'N/A'
      }));

    // ── 6. Subscription detector ──
    const hist3mAmounts = {};
    historicalTxns.forEach(t => {
      const key = Math.round(t.amount / 10) * 10;
      if (!hist3mAmounts[key]) hist3mAmounts[key] = { amounts: [], merchants: new Set() };
      hist3mAmounts[key].amounts.push(t);
      if (t.merchant) hist3mAmounts[key].merchants.add(t.merchant);
    });
    const subscriptionCandidates = Object.entries(hist3mAmounts)
      .filter(([, v]) => v.amounts.length >= 2)
      .map(([amt, v]) => ({
        amount: parseInt(amt), occurrences: v.amounts.length,
        merchants: [...v.merchants].slice(0, 3).join(', ') || 'Various',
      })).sort((a, b) => b.amount - a.amount).slice(0, 5);

    // ── 7. Burn rate ──
    const daysInPeriod = Math.max(1, Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)));
    const totalCurrentExpense = currentExpenses.reduce((s, t) => s + t.amount, 0);
    const dailyBurnRate = totalCurrentExpense / daysInPeriod;
    const hist3mTotal = historicalTxns.reduce((s, t) => s + t.amount, 0);
    const historicalDailyBurn = hist3mTotal / 90;

    // ── 8. Time-of-Day Analysis ──
    const timeSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    const timeSlotCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    currentExpenses.forEach(t => {
      const hour = new Date(t.date).getHours();
      let slot;
      if (hour >= 5 && hour < 12) slot = 'morning';
      else if (hour >= 12 && hour < 17) slot = 'afternoon';
      else if (hour >= 17 && hour < 21) slot = 'evening';
      else slot = 'night';
      timeSlots[slot] += t.amount;
      timeSlotCounts[slot]++;
    });
    const timeOfDayBreakdown = Object.entries(timeSlots).map(([slot, total]) => ({
      slot, total, count: timeSlotCounts[slot],
      label: slot.charAt(0).toUpperCase() + slot.slice(1),
    }));

    // ── 9. Essential vs Discretionary ──
    const essentialCategories = new Set(['rent', 'groceries', 'utilities', 'bills', 'insurance', 'emi', 'healthcare', 'medical', 'education', 'fuel', 'transport']);
    let essentialTotal = 0, discretionaryTotal = 0;
    currentExpenses.forEach(t => {
      const catName = (t.category?.name || '').toLowerCase();
      if (essentialCategories.has(catName)) essentialTotal += t.amount;
      else discretionaryTotal += t.amount;
    });
    const essentialVsDiscretionary = {
      essential: essentialTotal,
      discretionary: discretionaryTotal,
      essentialPct: totalCurrentExpense > 0 ? Math.round((essentialTotal / totalCurrentExpense) * 100) : 0,
      discretionaryPct: totalCurrentExpense > 0 ? Math.round((discretionaryTotal / totalCurrentExpense) * 100) : 0,
    };

    // ── 10. Month-end projection ──
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsedInMonth = Math.max(1, now.getDate());
    const daysRemainingInMonth = totalDaysInMonth - daysElapsedInMonth;
    const projectedMonthTotal = totalCurrentExpense + (dailyBurnRate * daysRemainingInMonth);
    const spendingProjection = {
      spentSoFar: Math.round(totalCurrentExpense),
      projectedRemaining: Math.round(dailyBurnRate * daysRemainingInMonth),
      projectedTotal: Math.round(projectedMonthTotal),
      daysElapsed: daysElapsedInMonth,
      daysRemaining: daysRemainingInMonth,
    };

    // ── 11. Top 5 Largest Transactions ──
    const topTransactions = currentExpenses
      .sort((a, b) => b.amount - a.amount).slice(0, 5)
      .map(t => ({
        id: t._id, amount: t.amount, date: t.date,
        merchant: t.merchant || 'Unknown',
        category: t.category?.name || 'Uncategorized',
        color: t.category?.color || '#94a3b8',
      }));

    // ── 12. Category Concentration Index ──
    const catTotals = Object.values(currentCatMap).map(c => c.total).sort((a, b) => b - a);
    const totalCatSpend = catTotals.reduce((s, v) => s + v, 0) || 1;
    const hhi = catTotals.reduce((sum, val) => sum + Math.pow(val / totalCatSpend, 2), 0);
    const top2Share = catTotals.length >= 2
      ? Math.round(((catTotals[0] + catTotals[1]) / totalCatSpend) * 100) : 100;
    const categoryConcentration = {
      hhi: parseFloat(hhi.toFixed(3)),
      top2SharePct: top2Share,
      totalCategories: catTotals.length,
      isDiversified: hhi < 0.25,
    };

    // ── 13. Multi-Month 6-Month Spending History (NEW) ──
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyHistoryMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyHistoryMap[key] = {
        key,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
        expense: 0,
        income: 0,
        net: 0,
      };
    }
    sixMonthsTxns.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyHistoryMap[key]) {
        if (t.type === 'Expense') monthlyHistoryMap[key].expense += t.amount;
        if (t.type === 'Income') monthlyHistoryMap[key].income += t.amount;
      }
    });
    const monthlySpendingHistory = Object.values(monthlyHistoryMap).map((m, idx, arr) => {
      m.net = m.income - m.expense;
      const prev = idx > 0 ? arr[idx - 1].expense : null;
      const momPct = prev && prev > 0 ? (((m.expense - prev) / prev) * 100).toFixed(1) : null;
      return {
        ...m,
        expense: Math.round(m.expense),
        income: Math.round(m.income),
        net: Math.round(m.net),
        momPct: momPct !== null ? parseFloat(momPct) : null,
      };
    });
    const sixMonthAvgExpense = monthlySpendingHistory.reduce((s, m) => s + m.expense, 0) / Math.max(1, monthlySpendingHistory.length);

    // ── 14. Week-of-Month (Payday Cycle) Breakdown (NEW) ──
    const weekBuckets = [
      { week: 'Week 1 (1-7)', spend: 0, count: 0, desc: 'Salary & Bills Week' },
      { week: 'Week 2 (8-14)', spend: 0, count: 0, desc: 'Mid-Month Steady' },
      { week: 'Week 3 (15-21)', spend: 0, count: 0, desc: 'Discretionary Phase' },
      { week: 'Week 4 (22+)', spend: 0, count: 0, desc: 'Month-End Run' },
    ];
    currentExpenses.forEach(t => {
      const dayNum = new Date(t.date).getDate();
      let bIndex = 0;
      if (dayNum <= 7) bIndex = 0;
      else if (dayNum <= 14) bIndex = 1;
      else if (dayNum <= 21) bIndex = 2;
      else bIndex = 3;
      weekBuckets[bIndex].spend += t.amount;
      weekBuckets[bIndex].count++;
    });
    const weekOfMonthBreakdown = weekBuckets.map(b => ({
      ...b,
      spend: Math.round(b.spend),
      pct: totalCurrentExpense > 0 ? Math.round((b.spend / totalCurrentExpense) * 100) : 0,
    }));
    const isFrontLoaded = weekOfMonthBreakdown[0].pct >= 38;

    // ── 15. Payment Outflow Channel Breakdown (NEW) ──
    const paymentMap = {
      'Credit Card': { type: 'Credit Card', total: 0, count: 0, color: '#f43f5e' },
      'Bank Account': { type: 'Bank Account', total: 0, count: 0, color: '#3b82f6' },
      'UPI / Wallet': { type: 'UPI / Wallet', total: 0, count: 0, color: '#8b5cf6' },
      'Cash': { type: 'Cash', total: 0, count: 0, color: '#10b981' },
      'Other': { type: 'Other', total: 0, count: 0, color: '#64748b' },
    };
    currentExpenses.forEach(t => {
      const accType = t.account?.type;
      let key = 'Other';
      if (accType === 'Credit Card') key = 'Credit Card';
      else if (accType === 'Bank') key = 'Bank Account';
      else if (accType === 'UPI' || accType === 'Wallet') key = 'UPI / Wallet';
      else if (accType === 'Cash') key = 'Cash';
      paymentMap[key].total += t.amount;
      paymentMap[key].count++;
    });
    const paymentMethodBreakdown = Object.values(paymentMap)
      .filter(p => p.total > 0 || p.count > 0)
      .map(p => ({
        ...p,
        total: Math.round(p.total),
        pct: totalCurrentExpense > 0 ? Math.round((p.total / totalCurrentExpense) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── 16. Micro-Transactions / Impulse Tracker (NEW) ──
    let microTotal = 0, microCount = 0;
    let mediumTotal = 0, mediumCount = 0;
    let largeTotal = 0, largeCount = 0;
    currentExpenses.forEach(t => {
      if (t.amount < 500) { microTotal += t.amount; microCount++; }
      else if (t.amount <= 5000) { mediumTotal += t.amount; mediumCount++; }
      else { largeTotal += t.amount; largeCount++; }
    });
    const microTransactions = {
      micro: { total: Math.round(microTotal), count: microCount, pct: totalCurrentExpense > 0 ? Math.round((microTotal / totalCurrentExpense) * 100) : 0 },
      medium: { total: Math.round(mediumTotal), count: mediumCount, pct: totalCurrentExpense > 0 ? Math.round((mediumTotal / totalCurrentExpense) * 100) : 0 },
      large: { total: Math.round(largeTotal), count: largeCount, pct: totalCurrentExpense > 0 ? Math.round((largeTotal / totalCurrentExpense) * 100) : 0 },
      estimatedAnnualMicro: Math.round(microTotal * 12),
    };

    // ── 17. Actionable Smart Recommendations Engine (NEW) ──
    const recommendations = [];
    if (weekendSpend > 0 && weekendAvg > weekdayAvg * 1.25) {
      const potSave = Math.round(weekendSpend * 0.20 * 12);
      recommendations.push({
        id: 'rec-weekend',
        title: 'Trim Weekend Velocity',
        description: `Weekend spending runs ${((weekendAvg / weekdayAvg - 1) * 100).toFixed(0)}% higher than weekdays. Capping discretionary weekend dining/entertainment by 20% saves money rapidly.`,
        potentialAnnualSavings: potSave,
        difficulty: 'Easy',
        category: 'Lifestyle',
        icon: 'calendar',
      });
    }
    if (microTransactions.micro.total > 2000) {
      const potSave = Math.round(microTransactions.micro.total * 0.35 * 12);
      recommendations.push({
        id: 'rec-micro',
        title: 'Audit Micro-Transactions (< ₹500)',
        description: `You had ${microTransactions.micro.count} micro-purchases totaling ₹${microTransactions.micro.total.toLocaleString('en-IN')}. Frequent small taps create hidden budget leaks.`,
        potentialAnnualSavings: potSave,
        difficulty: 'Medium',
        category: 'Habits',
        icon: 'coffee',
      });
    }
    if (essentialVsDiscretionary.discretionaryPct > 50) {
      const potSave = Math.round(discretionaryTotal * 0.15 * 12);
      recommendations.push({
        id: 'rec-discretionary',
        title: 'Optimize Discretionary Allocation',
        description: `Discretionary spend accounts for ${essentialVsDiscretionary.discretionaryPct}% of total outflow. Allocating 10-15% into auto-investments creates long-term wealth.`,
        potentialAnnualSavings: potSave,
        difficulty: 'Medium',
        category: 'Wealth',
        icon: 'trending-up',
      });
    }
    if (subscriptionCandidates.length > 0) {
      const totalSub = subscriptionCandidates.reduce((s, c) => s + c.amount, 0);
      recommendations.push({
        id: 'rec-subs',
        title: 'Review Recurring Subscriptions',
        description: `Identified ${subscriptionCandidates.length} potential recurring charges totaling ₹${totalSub.toLocaleString('en-IN')}/mo. Cancel unused memberships.`,
        potentialAnnualSavings: totalSub * 12,
        difficulty: 'Easy',
        category: 'Subscriptions',
        icon: 'repeat',
      });
    }
    if (isFrontLoaded) {
      recommendations.push({
        id: 'rec-payday',
        title: 'Smooth Out Payday Surge',
        description: `Over ${weekOfMonthBreakdown[0].pct}% of spending occurs in Week 1. Consider setting weekly envelope limits to avoid month-end cash crunches.`,
        potentialAnnualSavings: 0,
        difficulty: 'Easy',
        category: 'Cashflow',
        icon: 'clock',
      });
    }

    // ── 18. Behavioral insights ──
    const insights = [];
    if (weekendAvg > weekdayAvg * 1.3) {
      insights.push({ icon: 'calendar', text: `You spend **${((weekendAvg / weekdayAvg - 1) * 100).toFixed(0)}% more on weekends** (₹${Math.round(weekendAvg).toLocaleString('en-IN')}/day) compared to weekdays (₹${Math.round(weekdayAvg).toLocaleString('en-IN')}/day).` });
    }
    if (dailyBurnRate > historicalDailyBurn * 1.2) {
      insights.push({ icon: 'trending-up', text: `Your daily spending of **₹${Math.round(dailyBurnRate).toLocaleString('en-IN')}** this month is **${((dailyBurnRate / historicalDailyBurn - 1) * 100).toFixed(0)}% higher** than your 3-month average.` });
    } else if (dailyBurnRate < historicalDailyBurn * 0.8) {
      insights.push({ icon: 'trending-down', text: `Great job! Your daily burn rate of **₹${Math.round(dailyBurnRate).toLocaleString('en-IN')}** is **${((1 - dailyBurnRate / historicalDailyBurn) * 100).toFixed(0)}% lower** than usual.` });
    }
    if (topMerchants.length > 0) {
      insights.push({ icon: 'store', text: `Your top merchant this month is **${topMerchants[0].name}** with ₹${topMerchants[0].total.toLocaleString('en-IN')} across **${topMerchants[0].count} transactions**.` });
    }
    if (avgTxnChange !== null && parseFloat(avgTxnChange) > 20) {
      insights.push({ icon: 'arrow-up', text: `Your average transaction size increased from **₹${Math.round(prevAvgTxn).toLocaleString('en-IN')}** to **₹${Math.round(currentAvgTxn).toLocaleString('en-IN')}** (+${avgTxnChange}%).` });
    }
    if (essentialVsDiscretionary.discretionaryPct > 60) {
      insights.push({ icon: 'alert', text: `**${essentialVsDiscretionary.discretionaryPct}% of your spending** this month is discretionary. Consider trimming non-essential expenses.` });
    }
    if (!categoryConcentration.isDiversified) {
      insights.push({ icon: 'pie', text: `**${top2Share}% of spending** goes to just 2 categories. Your spending is highly concentrated.` });
    }

    res.json({
      period: { start: periodStart, end: periodEnd },
      dayOfWeekBreakdown,
      weekendVsWeekday: { weekendTotal: weekendSpend, weekdayTotal: weekdaySpend, weekendDailyAvg: Math.round(weekendAvg), weekdayDailyAvg: Math.round(weekdayAvg) },
      topMerchants,
      categoryTrends,
      transactionSizeMetrics: { currentAvg: Math.round(currentAvgTxn), previousAvg: Math.round(prevAvgTxn), changePct: avgTxnChange },
      anomalousTransactions,
      subscriptionCandidates,
      burnRate: { daily: Math.round(dailyBurnRate), historicalDaily: Math.round(historicalDailyBurn) },
      timeOfDayBreakdown,
      essentialVsDiscretionary,
      spendingProjection,
      topTransactions,
      categoryConcentration,
      monthlySpendingHistory,
      sixMonthAvgExpense: Math.round(sixMonthAvgExpense),
      weekOfMonthBreakdown,
      paymentMethodBreakdown,
      microTransactions,
      recommendations,
      insights,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// CASH-FLOW FORECASTING (90-day + Scenarios)
// ─────────────────────────────────────────────
export const getCashflowForecast = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Affordability check (optional query param)
    const affordAmount = parseFloat(req.query.affordAmount) || 0;

    const liquidAccounts = await Account.find({ user: userId, type: { $in: ['Bank', 'Cash', 'UPI'] }, isArchived: false });
    const startingBalance = liquidAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    const recurringRules = await RecurringRule.find({ user: userId, isActive: true });

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const historicalExpenses = await Transaction.find({
      user: userId, type: 'Expense',
      date: { $gte: ninetyDaysAgo, $lt: now },
    });
    const totalHistoricalExpense = historicalExpenses.reduce((s, t) => s + t.amount, 0);
    const avgDailyExpense = totalHistoricalExpense / 90;

    // Schedule recurring events in a date map
    const scheduleEvents = (rule, from, days) => {
      const events = [];
      let cursor = new Date(Math.max(rule.nextRunDate.getTime(), from.getTime()));
      cursor.setHours(0, 0, 0, 0);
      const endWindow = new Date(from);
      endWindow.setDate(from.getDate() + days);

      while (cursor <= endWindow) {
        if (rule.endDate && cursor > rule.endDate) break;
        events.push({ date: new Date(cursor), amount: rule.amount, type: rule.type, name: rule.name });
        if (rule.frequency === 'monthly') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
        else if (rule.frequency === 'yearly') cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), cursor.getDate());
        else if (rule.frequency === 'weekly') cursor.setDate(cursor.getDate() + 7);
        else cursor.setDate(cursor.getDate() + 1);
      }
      return events;
    };

    const eventsByDate = {};
    recurringRules.forEach(rule => {
      scheduleEvents(rule, now, 90).forEach(ev => {
        const key = ev.date.toISOString().split('T')[0];
        if (!eventsByDate[key]) eventsByDate[key] = [];
        eventsByDate[key].push(ev);
      });
    });

    // Build 3 scenarios: baseline, optimistic (-15% expense), pessimistic (+15% expense)
    const buildForecast = (expenseMultiplier, oneTimeExpense = 0) => {
      const forecast = [];
      let balance = startingBalance - oneTimeExpense;
      const summaries = {};

      for (let i = 0; i < 90; i++) {
        const day = new Date(now);
        day.setDate(now.getDate() + i);
        const key = day.toISOString().split('T')[0];
        const monthKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}`;

        const scheduled = eventsByDate[key] || [];
        let dayIncome = 0;
        let dayExpense = avgDailyExpense * expenseMultiplier;
        const events = [];

        scheduled.forEach(ev => {
          if (ev.type === 'Income') { dayIncome += ev.amount; events.push({ name: ev.name, amount: ev.amount, type: 'income' }); }
          else if (ev.type === 'Expense') { dayExpense += ev.amount; events.push({ name: ev.name, amount: ev.amount, type: 'expense' }); }
        });

        balance += dayIncome - dayExpense;

        forecast.push({
          date: key, balance: Math.round(balance),
          income: Math.round(dayIncome), expense: Math.round(dayExpense),
          events: events.length > 0 ? events : undefined,
        });

        if (!summaries[monthKey]) summaries[monthKey] = { label: monthKey, projectedEndBalance: 0, income: 0, expense: 0 };
        summaries[monthKey].income += dayIncome;
        summaries[monthKey].expense += dayExpense;
        summaries[monthKey].projectedEndBalance = Math.round(balance);
      }

      const monthly = Object.values(summaries).map(m => ({
        ...m, income: Math.round(m.income), expense: Math.round(m.expense),
      }));

      const minBalance = Math.min(...forecast.map(f => f.balance));

      return {
        dailyForecast: forecast,
        monthlyProjections: monthly,
        riskMonths: monthly.filter(m => m.projectedEndBalance < 0),
        minBalance,
        endBalance: forecast[forecast.length - 1]?.balance || 0,
      };
    };

    const baseline = buildForecast(1.0);
    const optimistic = buildForecast(0.85);
    const pessimistic = buildForecast(1.15);

    // Affordability analysis
    let affordability = null;
    if (affordAmount > 0) {
      const withPurchase = buildForecast(1.0, affordAmount);
      const lowestBalance = Math.min(...withPurchase.dailyForecast.map(d => d.balance));
      const goesNegative = lowestBalance < 0;
      const recoveryDay = withPurchase.dailyForecast.find((d, i) => i > 0 && d.balance >= startingBalance);

      affordability = {
        amount: affordAmount,
        canAfford: !goesNegative,
        lowestProjectedBalance: lowestBalance,
        goesNegative,
        recoveryDate: recoveryDay?.date || null,
        impactOnMonth1: withPurchase.monthlyProjections[0]
          ? baseline.monthlyProjections[0].projectedEndBalance - withPurchase.monthlyProjections[0].projectedEndBalance
          : 0,
      };
    }

    // ── Emergency Survival Runway Calculator (NEW) ──
    const monthlyEssentialBurn = Math.max(1, avgDailyExpense * 30 * 0.6); // 60% essential heuristic
    const monthlyTotalBurn = Math.max(1, avgDailyExpense * 30);
    const essentialRunwayMonths = parseFloat((startingBalance / monthlyEssentialBurn).toFixed(1));
    const totalRunwayMonths = parseFloat((startingBalance / monthlyTotalBurn).toFixed(1));
    let runwayStatus = 'Critical';
    if (essentialRunwayMonths >= 6) runwayStatus = 'Exceptional';
    else if (essentialRunwayMonths >= 3) runwayStatus = 'Healthy';
    else if (essentialRunwayMonths >= 1.5) runwayStatus = 'Moderate';

    const emergencyRunway = {
      liquidBalance: Math.round(startingBalance),
      essentialMonthlyBurn: Math.round(monthlyEssentialBurn),
      totalMonthlyBurn: Math.round(monthlyTotalBurn),
      essentialRunwayMonths,
      totalRunwayMonths,
      runwayStatus,
    };

    // ── 6-Month Cash Flow Bridge (Past 3 Months Actual + Next 3 Months Projected) (NEW) ──
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const threeMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const pastTxns = await Transaction.find({
      user: userId,
      date: { $gte: threeMonthsAgoDate, $lt: now },
    });
    const pastMonthlyMap = {};
    for (let i = 3; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      pastMonthlyMap[key] = { label: `${monthNames[d.getMonth()]}`, income: 0, expense: 0, type: 'actual' };
    }
    pastTxns.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (pastMonthlyMap[key]) {
        if (t.type === 'Income') pastMonthlyMap[key].income += t.amount;
        if (t.type === 'Expense') pastMonthlyMap[key].expense += t.amount;
      }
    });

    const cashflowBridge = [
      ...Object.values(pastMonthlyMap).map(m => ({
        ...m,
        income: Math.round(m.income),
        expense: Math.round(m.expense),
        net: Math.round(m.income - m.expense),
      })),
      ...baseline.monthlyProjections.slice(0, 3).map(m => {
        const [yr, mo] = m.label.split('-');
        const monthIndex = parseInt(mo) - 1;
        return {
          label: `${monthNames[monthIndex]} (Proj)`,
          income: m.income,
          expense: m.expense,
          net: m.income - m.expense,
          type: 'projected',
        };
      }),
    ];

    res.json({
      startingBalance: Math.round(startingBalance),
      scenarios: { baseline, optimistic, pessimistic },
      dailyForecast: baseline.dailyForecast,
      monthlyProjections: baseline.monthlyProjections,
      riskMonths: baseline.riskMonths,
      affordability,
      emergencyRunway,
      cashflowBridge,
      assumptions: {
        avgDailyExpense: Math.round(avgDailyExpense),
        recurringRulesUsed: recurringRules.length,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// LONG-TERM NET WORTH PROJECTION (5 years)
// ─────────────────────────────────────────────
export const getLongtermProjection = async (req, res) => {
  try {
    const userId = req.user._id;

    const salaryGrowthRate = parseFloat(req.query.salaryGrowthRate) || 10;
    const investmentReturnRate = parseFloat(req.query.investmentReturnRate) || 12;
    const inflationRate = parseFloat(req.query.inflationRate) || 6;
    const monthlySavingsBoost = parseFloat(req.query.monthlySavingsBoost) || 0;

    const [accounts, investments, loans, goals] = await Promise.all([
      Account.find({ user: userId, isArchived: false }),
      Investment.find({ user: userId }),
      Loan.find({ user: userId, status: 'Active' }),
      Goal.find({ user: userId, isCompleted: false }),
    ]);

    const totalCash = accounts.filter(a => ['Bank', 'Cash', 'UPI'].includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
    const totalInvestments = investments.reduce((s, i) => s + (i.currentValue || i.investedAmount || 0), 0);
    const totalDebt = loans.reduce((s, l) => s + Math.max(0, l.amount - (l.paidAmount || 0)), 0);
    const currentNetWorth = totalCash + totalInvestments - totalDebt;

    // Derive monthly savings from last 6-month history
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentTxns = await Transaction.find({ user: userId, date: { $gte: sixMonthsAgo } });
    let totalIncome6m = 0, totalExpense6m = 0;
    recentTxns.forEach(t => {
      if (t.type === 'Income') totalIncome6m += t.amount;
      if (t.type === 'Expense') totalExpense6m += t.amount;
    });
    const monthlyIncome = totalIncome6m / 6 || 0;
    const monthlyExpense = totalExpense6m / 6 || 0;
    const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);

    // Helper to calculate 5-year trajectory
    const runProjection = (extraMonthlySavings = 0) => {
      const proj = [];
      let pCash = totalCash;
      let pInvest = totalInvestments;
      let pDebt = totalDebt;
      let mIncome = monthlyIncome;
      let mSavings = monthlySavings + extraMonthlySavings;
      const milestoneThresholds = [100000, 500000, 1000000, 2500000, 5000000, 10000000];
      const mList = [];

      for (let year = 0; year <= 5; year++) {
        const nw = pCash + pInvest - pDebt;
        proj.push({
          year: new Date().getFullYear() + year,
          label: `${new Date().getFullYear() + year}`,
          netWorth: Math.round(nw),
          assets: Math.round(pCash + pInvest),
          liabilities: Math.round(pDebt),
          cash: Math.round(pCash),
          investments: Math.round(pInvest),
          monthlyIncome: Math.round(mIncome),
          monthlySavings: Math.round(mSavings),
        });

        milestoneThresholds.forEach(threshold => {
          if (year > 0) {
            const prevNW = proj[year - 1].netWorth;
            if (prevNW < threshold && nw >= threshold) {
              const labels = { 100000: '₹1L', 500000: '₹5L', 1000000: '₹10L', 2500000: '₹25L', 5000000: '₹50L', 10000000: '₹1Cr' };
              mList.push({ year: new Date().getFullYear() + year, threshold, label: labels[threshold] || `₹${threshold}` });
            }
          }
        });

        if (year < 5) {
          const incomeGrowthFactor = 1 + salaryGrowthRate / 100;
          const investReturnFactor = 1 + investmentReturnRate / 100;
          const inflationFactor = 1 + inflationRate / 100;

          const annualInvestmentContribution = mSavings * 0.5 * 12;
          pInvest = pInvest * investReturnFactor + annualInvestmentContribution;
          pCash += mSavings * 0.5 * 12;
          pDebt = Math.max(0, pDebt * 0.75);
          mIncome *= incomeGrowthFactor;
          const newMonthlyExpense = monthlyExpense * Math.pow(inflationFactor, year + 1);
          mSavings = Math.max(0, mIncome - newMonthlyExpense) + extraMonthlySavings;
        }
      }
      return { proj, mList };
    };

    const { proj: projections, mList: milestones } = runProjection(0);
    const { proj: boostedProjections, mList: boostedMilestones } = monthlySavingsBoost > 0
      ? runProjection(monthlySavingsBoost)
      : { proj: projections, mList: milestones };

    // Compare baseline vs boosted
    const finalBaselineNW = projections[projections.length - 1].netWorth;
    const finalBoostedNW = boostedProjections[boostedProjections.length - 1].netWorth;
    const totalExtraDeposited = monthlySavingsBoost * 12 * 5;
    const extraWealthCreated = Math.max(0, finalBoostedNW - finalBaselineNW);

    const boostComparison = {
      monthlySavingsBoost,
      totalExtraDeposited,
      baseline5YrNetWorth: finalBaselineNW,
      boosted5YrNetWorth: finalBoostedNW,
      extraWealthCreated,
      compoundGain: Math.max(0, extraWealthCreated - totalExtraDeposited),
    };

    // Goal timeline — when will each goal be reached at current savings rate?
    const effectiveSavings = monthlySavings + monthlySavingsBoost;
    const goalTimeline = goals.map(g => {
      const remaining = Math.max(0, g.targetAmount - (g.currentAmount || 0));
      const monthsToGoal = effectiveSavings > 0 ? Math.ceil(remaining / effectiveSavings) : null;
      const targetDate = monthsToGoal !== null
        ? new Date(new Date().getFullYear(), new Date().getMonth() + monthsToGoal, 1).toISOString().split('T')[0]
        : null;
      return {
        id: g._id, name: g.name,
        targetAmount: g.targetAmount, currentAmount: g.currentAmount || 0,
        remaining, monthsToGoal, estimatedDate: targetDate,
        isOnTrack: g.deadline ? new Date(targetDate) <= new Date(g.deadline) : true,
      };
    });

    res.json({
      currentNetWorth: Math.round(currentNetWorth),
      projections,
      boostedProjections: monthlySavingsBoost > 0 ? boostedProjections : undefined,
      milestones,
      boostedMilestones: monthlySavingsBoost > 0 ? boostedMilestones : undefined,
      boostComparison,
      goalTimeline,
      assumptions: {
        salaryGrowthRate, investmentReturnRate, inflationRate, monthlySavingsBoost,
        baseMonthlySavings: Math.round(monthlySavings),
        baseMonthlyIncome: Math.round(monthlyIncome),
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
