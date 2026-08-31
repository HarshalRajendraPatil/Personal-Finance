import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import NetWorthSnapshot from '../models/NetWorthSnapshot.js';
import MonthlyReviewDigest from '../models/MonthlyReviewDigest.js';

/**
 * Computes, generates, and persists a rich Monthly Financial Review Digest.
 */
export const computeAndSaveMonthlyReview = async (userId, year, monthNumber, isAutomated = true) => {
  const startDate = new Date(year, monthNumber, 1, 0, 0, 0, 0);
  const endDate = new Date(year, monthNumber + 1, 0, 23, 59, 59, 999);
  const threeMonthsAgo = new Date(year, monthNumber - 3, 1, 0, 0, 0, 0);

  const monthPad = String(monthNumber + 1).padStart(2, '0');
  const monthKey = `${year}-${monthPad}`;
  const monthName = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Parallel Query Fetching
  const [
    targetTransactions,
    historicalTransactions,
    budgets,
    startSnap,
    endSnap,
  ] = await Promise.all([
    Transaction.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate('category', 'name color icon')
      .lean(),

    Transaction.find({
      user: userId,
      date: { $gte: threeMonthsAgo, $lt: startDate },
    })
      .populate('category', 'name color icon')
      .lean(),

    Budget.find({ user: userId, isActive: true })
      .populate('category', 'name color icon')
      .lean(),

    NetWorthSnapshot.findOne({
      user: userId,
      date: { $lte: new Date(year, monthNumber, 5) },
    })
      .sort({ date: -1 })
      .lean(),

    NetWorthSnapshot.findOne({
      user: userId,
      date: { $lte: endDate },
    })
      .sort({ date: -1 })
      .lean(),
  ]);

  // 1. Calculate Income, Expenses & Category Spend
  let totalIncome = 0;
  let totalExpense = 0;
  const categorySpendMap = {};

  targetTransactions.forEach((t) => {
    if (t.type === 'Income') totalIncome += t.amount;
    if (t.type === 'Expense') {
      totalExpense += t.amount;
      const catKey = t.category?._id?.toString() || 'uncategorized';
      const catName = t.category?.name || 'Uncategorized';
      const catColor = t.category?.color || '#4f46e5';
      const catIcon = t.category?.icon || 'Tag';

      if (!categorySpendMap[catKey]) {
        categorySpendMap[catKey] = { name: catName, color: catColor, icon: catIcon, amount: 0 };
      }
      categorySpendMap[catKey].amount += t.amount;
    }
  });

  // 2. Historical Spend for Anomalies
  const historicalSpendMap = {};
  historicalTransactions.forEach((t) => {
    if (t.type === 'Expense') {
      const catKey = t.category?._id?.toString() || 'uncategorized';
      historicalSpendMap[catKey] = (historicalSpendMap[catKey] || 0) + t.amount;
    }
  });

  // 3. Top Categories
  const topCategories = Object.values(categorySpendMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      amount: Number(c.amount.toFixed(2)),
      color: c.color,
      icon: c.icon,
      percentage: totalExpense > 0 ? Number(((c.amount / totalExpense) * 100).toFixed(1)) : 0,
    }));

  // 4. Anomalies (>50% above 3-month average)
  const anomalies = [];
  Object.keys(categorySpendMap).forEach((catKey) => {
    const current = categorySpendMap[catKey].amount;
    const avgHistorical = (historicalSpendMap[catKey] || 0) / 3;
    if (avgHistorical > 0 && current > avgHistorical * 1.5 && current > 1000) {
      anomalies.push({
        category: categorySpendMap[catKey].name,
        current: Number(current.toFixed(2)),
        average: Number(avgHistorical.toFixed(2)),
        increase: Number((((current - avgHistorical) / avgHistorical) * 100).toFixed(0)),
      });
    }
  });

  // 5. Budget Performance Audit
  let overbudgetCount = 0;
  const budgetPerformance = budgets.map((b) => {
    const bCatId = b.category?._id?.toString();
    const spent = bCatId && categorySpendMap[bCatId] ? categorySpendMap[bCatId].amount : 0;
    const pct = b.limit > 0 ? Number(((spent / b.limit) * 100).toFixed(1)) : 0;
    let status = 'safe';
    if (spent > b.limit) {
      status = 'exceeded';
      overbudgetCount++;
    } else if (pct >= (b.alertThreshold || 80)) {
      status = 'near_limit';
    }
    return {
      name: b.name || b.category?.name || 'Budget',
      limit: b.limit,
      spent: Number(spent.toFixed(2)),
      percentage: pct,
      status,
    };
  });

  // 6. Net Cashflow & Savings Rate
  const netCashFlow = Number((totalIncome - totalExpense).toFixed(2));
  const savingsRate = totalIncome > 0 ? Number(((netCashFlow / totalIncome) * 100).toFixed(1)) : 0;

  // 7. Net Worth Trajectory Delta
  const startNetWorth = startSnap?.netWorth || 0;
  const endNetWorth = endSnap?.netWorth || startNetWorth + netCashFlow;
  const delta = Number((endNetWorth - startNetWorth).toFixed(2));
  const deltaPercentage =
    startNetWorth !== 0 ? Number(((delta / Math.abs(startNetWorth)) * 100).toFixed(1)) : 0;

  // 8. Financial Health Score Calculation (0-100)
  let healthScore = 50;
  if (savingsRate >= 30) healthScore += 25;
  else if (savingsRate >= 15) healthScore += 15;
  else if (savingsRate > 0) healthScore += 8;
  else healthScore -= 10;

  if (overbudgetCount === 0 && budgets.length > 0) healthScore += 15;
  else healthScore -= overbudgetCount * 5;

  if (anomalies.length === 0) healthScore += 10;
  else healthScore -= anomalies.length * 3;

  healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

  let grade = 'B';
  let status = 'Fair';
  if (healthScore >= 90) {
    grade = 'A+';
    status = 'Excellent';
  } else if (healthScore >= 80) {
    grade = 'A';
    status = 'Very Good';
  } else if (healthScore >= 70) {
    grade = 'B+';
    status = 'Good';
  } else if (healthScore >= 60) {
    grade = 'B';
    status = 'Fair';
  } else if (healthScore >= 45) {
    grade = 'C';
    status = 'Needs Attention';
  } else {
    grade = 'D';
    status = 'Critical Alert';
  }

  // 9. Largest Transactions
  const largestTransactions = targetTransactions
    .filter((t) => t.type === 'Expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((t) => ({
      merchant: t.merchant || t.category?.name || 'Expense',
      amount: t.amount,
      date: t.date,
      categoryName: t.category?.name || 'General',
    }));

  // 10. Key Insights & Actionable Recommendations
  const insights = [];
  const recommendations = [];

  if (netCashFlow >= 0) {
    insights.push(
      `Positive Net Cash Flow: You saved **₹${netCashFlow.toLocaleString('en-IN')}** this month, achieving a **${savingsRate}%** savings rate.`
    );
  } else {
    insights.push(
      `Negative Net Cash Flow: You spent **₹${Math.abs(netCashFlow).toLocaleString('en-IN')}** more than your recorded income this month.`
    );
    recommendations.push(
      'Review non-essential discretionary expenses to prevent dipping into emergency reserves.'
    );
  }

  if (topCategories.length > 0) {
    insights.push(
      `Dominant Spending Category: **${topCategories[0].name}** accounted for **${topCategories[0].percentage}%** (₹${topCategories[0].amount.toLocaleString('en-IN')}) of total outflows.`
    );
  }

  if (overbudgetCount > 0) {
    insights.push(
      `Budget Guardrails Triggered: **${overbudgetCount}** category budget limits were exceeded during the month.`
    );
    recommendations.push(
      `Adjust spending limits or set tighter mid-month guardrail alerts for categories that exceeded limits.`
    );
  } else if (budgets.length > 0) {
    insights.push('Budget Discipline: All active categories operated strictly within their configured limits.');
  }

  if (anomalies.length > 0) {
    insights.push(
      `Anomaly Detected: **${anomalies[0].category}** experienced a **+${anomalies[0].increase}%** spike above your 3-month baseline.`
    );
  }

  if (savingsRate >= 20) {
    recommendations.push(
      'Consider deploying surplus monthly cash flow into SIP investments or index funds.'
    );
  } else {
    recommendations.push(
      'Aim to gradually step up your monthly savings rate towards the 20-30% benchmark.'
    );
  }

  // Persist / Upsert into MonthlyReviewDigest
  const digestData = {
    user: userId,
    month: monthKey,
    year,
    monthNumber,
    monthName,
    summary: {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      netCashFlow,
      savingsRate,
    },
    financialHealthScore: {
      score: healthScore,
      grade,
      status,
    },
    topCategories,
    anomalies,
    budgetPerformance,
    netWorthChange: {
      startNetWorth,
      endNetWorth,
      delta,
      deltaPercentage,
    },
    largestTransactions,
    insights,
    recommendations,
    transactionCount: targetTransactions.length,
    isAutomated,
  };

  const digest = await MonthlyReviewDigest.findOneAndUpdate(
    { user: userId, month: monthKey },
    { $set: digestData },
    { upsert: true, new: true }
  ).lean();

  return digest;
};

/**
 * Retrieves cached monthly review digest or computes it instantly.
 */
export const getMonthlyReview = async (userId, year, monthNumber, forceRefresh = false) => {
  const monthPad = String(monthNumber + 1).padStart(2, '0');
  const monthKey = `${year}-${monthPad}`;

  if (!forceRefresh) {
    const existing = await MonthlyReviewDigest.findOne({ user: userId, month: monthKey }).lean();
    if (existing) return existing;
  }

  return await computeAndSaveMonthlyReview(userId, year, monthNumber, false);
};

/**
 * Lists all generated monthly review months for a user.
 */
export const listUserMonthlyReviews = async (userId) => {
  return await MonthlyReviewDigest.find({ user: userId })
    .select('month year monthNumber monthName summary financialHealthScore createdAt')
    .sort({ year: -1, monthNumber: -1 })
    .lean();
};
