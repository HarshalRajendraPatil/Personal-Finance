import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Loan from '../models/Loan.js';
import Investment from '../models/Investment.js';
import TaxRecord from '../models/TaxRecord.js';
import Goal from '../models/Goal.js';
import Lending from '../models/Lending.js';
import Budget from '../models/Budget.js';
import RecurringTransaction from '../models/RecurringRule.js';
import Category from '../models/Category.js';
import NetWorthSnapshot from '../models/NetWorthSnapshot.js';

export const getDashboardData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const userId = req.user._id;
    const now = new Date();

    // ── 1. Current Point-in-Time Metrics ──
    const accounts = await Account.find({ user: userId });
    const cashAvailable = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    const loans = await Loan.find({ user: userId, isActive: true });
    const totalDebt = loans.reduce((sum, loan) => {
      const paid = loan.payments.reduce((s, p) => s + (p.principal || 0), 0);
      return sum + Math.max(0, loan.principal - paid);
    }, 0);

    const investments = await Investment.find({ user: userId });
    const totalInvestments = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.investedAmount || 0), 0);

    const lendings = await Lending.find({ user: userId, isSettled: false });
    const owedToMe = lendings.filter(l => l.type === 'lent').reduce((sum, l) => sum + (l.amount - l.repayments.reduce((s, r) => s + r.amount, 0)), 0);
    const iOwe = lendings.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + (l.amount - l.repayments.reduce((s, r) => s + r.amount, 0)), 0);

    const netWorth = cashAvailable + totalInvestments + owedToMe - totalDebt - iOwe;

    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const fy = `${currentYear}-${nextYear.toString().slice(2)}`;
    const taxRecord = await TaxRecord.findOne({ user: userId, financialYear: fy });
    const totalTaxes = taxRecord ? taxRecord.totalTaxLiability : 0;

    // ── Account-level Breakdown ──
    const accountBreakdown = accounts
      .filter(a => !a.isArchived && a.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .slice(0, 6)
      .map(a => ({ name: a.name, type: a.type, balance: a.currentBalance }));

    // ── Net Worth Sparkline (last 6 months) ──
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const netWorthSnapshots = await NetWorthSnapshot.find({
      user: userId,
      date: { $gte: sixMonthsAgo }
    }).sort({ date: 1 }).limit(6);
    const netWorthTrend = netWorthSnapshots.map(s => ({
      date: s.date.toISOString().split('T')[0],
      value: s.totalAssets - s.totalLiabilities
    }));
    if (netWorthTrend.length === 0) {
      netWorthTrend.push({ date: now.toISOString().split('T')[0], value: netWorth });
    }

    // ── 2. Period Flow Metrics (Current Transactions) ──
    const transactions = await Transaction.find({
      user: userId,
      date: { $gte: start, $lte: end }
    }).populate('category', 'name color icon');

    let periodIncome = 0;
    let periodExpense = 0;
    const expenseByCategory = {};
    const cashFlowByDate = {};

    transactions.forEach(t => {
      const dateStr = new Date(t.date).toISOString().split('T')[0];
      if (!cashFlowByDate[dateStr]) cashFlowByDate[dateStr] = { date: dateStr, Income: 0, Expense: 0 };

      if (t.type === 'Income') {
        periodIncome += t.amount;
        cashFlowByDate[dateStr].Income += t.amount;
      } else if (t.type === 'Expense') {
        periodExpense += t.amount;
        cashFlowByDate[dateStr].Expense += t.amount;

        const catName = t.category ? t.category.name : 'Uncategorized';
        if (!expenseByCategory[catName]) {
          expenseByCategory[catName] = { name: catName, total: 0, color: t.category ? t.category.color : '#94a3b8' };
        }
        expenseByCategory[catName].total += t.amount;
      }
    });

    const savingsRate = periodIncome > 0 ? Math.round(((periodIncome - periodExpense) / periodIncome) * 100) : 0;
    const cashFlowChart = Object.values(cashFlowByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
    const expenseCategories = Object.values(expenseByCategory).sort((a, b) => b.total - a.total).slice(0, 5);

    // ── 3. Period-over-Period Comparison ──
    const periodDuration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodDuration);
    const prevEnd = new Date(start.getTime() - 1);
    prevEnd.setHours(23, 59, 59, 999);

    const prevTransactions = await Transaction.find({
      user: userId,
      date: { $gte: prevStart, $lte: prevEnd }
    });

    let prevIncome = 0, prevExpense = 0;
    prevTransactions.forEach(t => {
      if (t.type === 'Income') prevIncome += t.amount;
      else if (t.type === 'Expense') prevExpense += t.amount;
    });
    const prevSavingsRate = prevIncome > 0 ? Math.round(((prevIncome - prevExpense) / prevIncome) * 100) : 0;

    const pctChange = (curr, prev) => prev > 0 ? parseFloat(((curr - prev) / prev * 100).toFixed(1)) : null;

    const comparison = {
      incomeChange: pctChange(periodIncome, prevIncome),
      expenseChange: pctChange(periodExpense, prevExpense),
      savingsRateChange: prevSavingsRate !== 0 ? savingsRate - prevSavingsRate : null,
      prevIncome,
      prevExpense,
      prevSavingsRate,
    };

    // ── 4. Spending Velocity ──
    const daysElapsed = Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
    const totalDaysInPeriod = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, totalDaysInPeriod - daysElapsed);
    const dailyExpenseRate = periodExpense / daysElapsed;
    const projectedMonthEndExpense = periodExpense + (dailyExpenseRate * daysRemaining);

    const spendingVelocity = {
      daysElapsed,
      daysRemaining,
      dailyRate: Math.round(dailyExpenseRate),
      projectedTotal: Math.round(projectedMonthEndExpense),
      pctOfPeriodElapsed: Math.round((daysElapsed / totalDaysInPeriod) * 100),
      pctOfBudgetUsed: projectedMonthEndExpense > 0 && periodExpense > 0
        ? Math.round((periodExpense / projectedMonthEndExpense) * 100) : 0,
    };

    // ── 5. Upcoming (Next 30 days) ──
    const next30 = new Date();
    next30.setDate(next30.getDate() + 30);

    const recurrings = await RecurringTransaction.find({ user: userId, isActive: true });
    let upcomingBills = [];
    recurrings.forEach(rule => {
      let current = new Date(rule.nextRunDate || rule.startDate || new Date());
      while (current <= next30) {
        if (rule.endDate && current > new Date(rule.endDate)) break;
        if (current >= new Date()) {
          upcomingBills.push({
            id: `rec_${rule._id}_${current.getTime()}`,
            title: rule.name, amount: rule.amount,
            date: current.toISOString(), type: rule.type, source: 'Bill'
          });
          break;
        }
        const freq = rule.frequency ? rule.frequency.toLowerCase() : '';
        if (freq === 'monthly') current.setMonth(current.getMonth() + 1);
        else if (freq === 'weekly') current.setDate(current.getDate() + 7);
        else if (freq === 'daily') current.setDate(current.getDate() + 1);
        else if (freq === 'yearly') current.setFullYear(current.getFullYear() + 1);
        else break;
      }
    });

    loans.forEach(loan => {
      if (loan.emiAmount && loan.isActive) {
        let emiDate = new Date(loan.startDate);
        emiDate = new Date(now.getFullYear(), now.getMonth(), emiDate.getDate());
        if (emiDate < now) emiDate.setMonth(emiDate.getMonth() + 1);
        if (emiDate <= next30) {
          upcomingBills.push({
            id: `emi_${loan._id}_${emiDate.getTime()}`,
            title: `EMI: ${loan.name}`, amount: loan.emiAmount,
            date: emiDate.toISOString(), type: 'Expense', source: 'EMI'
          });
        }
      }
    });

    upcomingBills.sort((a, b) => new Date(a.date) - new Date(b.date));
    upcomingBills = upcomingBills.slice(0, 6);

    // ── 6. Budgets (Active) ──
    const activeBudgets = await Budget.find({ user: userId, isActive: true }).populate('category', 'name color icon');
    const budgets = activeBudgets.map(budget => {
      const spent = transactions
        .filter(t => t.type === 'Expense' && t.category && t.category._id.toString() === budget.category._id.toString())
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...budget.toObject(), spent };
    });

    // ── 7. Goals Snapshot ──
    const activeGoals = await Goal.find({ user: userId, isCompleted: false }).sort({ createdAt: -1 }).limit(3);

    // ── 8. Recent Transactions ──
    const recentTransactions = await Transaction.find({ user: userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(6)
      .populate('category', 'name color')
      .populate('account', 'name');

    res.json({
      snapshot: {
        netWorth, cashAvailable, totalDebt, totalInvestments,
        totalTaxes, owedToMe, iOwe, netWorthTrend, accountBreakdown,
      },
      period: {
        income: periodIncome, expense: periodExpense, savingsRate,
        comparison, spendingVelocity,
      },
      charts: { cashFlow: cashFlowChart, expenseCategories },
      upcoming: upcomingBills,
      budgets,
      goals: activeGoals,
      recentTransactions
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ message: error.message });
  }
};
