import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

export const getPeriodRange = (period, startDate, endDate, referenceDate = new Date()) => {
  const now = new Date(referenceDate);
  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  } else if (period === 'weekly') {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else if (period === 'yearly') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  } else if (period === 'custom' && startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
};

/**
 * ⚡ Evaluates budget guardrail thresholds for a specific category when an expense occurs.
 */
export const checkBudgetGuardrails = async (userId, categoryId, transactionDate = new Date()) => {
  if (!userId || !categoryId) return null;

  try {
    const budget = await Budget.findOne({ user: userId, category: categoryId, isActive: true })
      .populate('category', 'name color icon');
    if (!budget) return null;

    const { start, end } = getPeriodRange(budget.period, budget.startDate, budget.endDate, transactionDate);

    const spendResult = await Transaction.aggregate([
      {
        $match: {
          user: budget.user,
          category: budget.category._id,
          type: 'Expense',
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalSpent = spendResult[0]?.total || 0;
    const percentage = budget.limit > 0 ? Math.round((totalSpent / budget.limit) * 100) : 0;
    const threshold = budget.alertThreshold || 80;

    if (totalSpent > budget.limit) {
      const overspentBy = totalSpent - budget.limit;
      return {
        triggered: true,
        level: 'critical',
        status: 'exceeded',
        budgetId: budget._id,
        budgetName: budget.name,
        categoryName: budget.category?.name || 'Category',
        limit: budget.limit,
        spent: totalSpent,
        overspentBy,
        percentage,
        remaining: 0,
        message: `🚨 Critical Budget Alert: You have exceeded your "${budget.name}" budget by ₹${overspentBy.toLocaleString('en-IN')} (${percentage}% used)!`,
      };
    } else if (percentage >= threshold) {
      const remaining = budget.limit - totalSpent;
      return {
        triggered: true,
        level: 'warning',
        status: 'near_limit',
        budgetId: budget._id,
        budgetName: budget.name,
        categoryName: budget.category?.name || 'Category',
        limit: budget.limit,
        spent: totalSpent,
        remaining,
        percentage,
        threshold,
        message: `⚠️ Budget Warning: You have reached ${percentage}% of your "${budget.name}" budget. ₹${remaining.toLocaleString('en-IN')} remaining.`,
      };
    }

    return {
      triggered: false,
      level: 'info',
      status: 'safe',
      budgetId: budget._id,
      budgetName: budget.name,
      categoryName: budget.category?.name || 'Category',
      limit: budget.limit,
      spent: totalSpent,
      remaining: Math.max(0, budget.limit - totalSpent),
      percentage,
    };
  } catch (err) {
    console.error('[BudgetGuardrails] Evaluation error:', err.message);
    return null;
  }
};

/**
 * ⚡ Returns comprehensive guardrail alerts for all active budgets of a user.
 */
export const getAllBudgetGuardrails = async (userId) => {
  try {
    const budgets = await Budget.find({ user: userId, isActive: true })
      .populate('category', 'name icon color type');

    const alerts = await Promise.all(
      budgets.map(async (budget) => {
        const { start, end } = getPeriodRange(budget.period, budget.startDate, budget.endDate);

        const spendResult = await Transaction.aggregate([
          {
            $match: {
              user: budget.user,
              category: budget.category._id,
              type: 'Expense',
              date: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const spent = spendResult[0]?.total || 0;
        const percentage = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
        const threshold = budget.alertThreshold || 80;
        const isOverBudget = spent > budget.limit;
        const isNearLimit = percentage >= threshold && !isOverBudget;

        let status = 'safe';
        let level = 'info';
        let message = `Budget on track (${percentage}% used)`;

        if (isOverBudget) {
          status = 'exceeded';
          level = 'critical';
          message = `Exceeded by ₹${(spent - budget.limit).toLocaleString('en-IN')}`;
        } else if (isNearLimit) {
          status = 'near_limit';
          level = 'warning';
          message = `${percentage}% spent (Threshold: ${threshold}%)`;
        }

        return {
          _id: budget._id,
          name: budget.name,
          category: budget.category,
          limit: budget.limit,
          spent,
          remaining: Math.max(0, budget.limit - spent),
          percentage,
          threshold,
          status,
          level,
          message,
          period: budget.period,
          periodStart: start,
          periodEnd: end,
        };
      })
    );

    const exceededCount = alerts.filter((a) => a.status === 'exceeded').length;
    const warningCount = alerts.filter((a) => a.status === 'near_limit').length;
    const healthyCount = alerts.filter((a) => a.status === 'safe').length;

    return {
      summary: {
        totalBudgets: budgets.length,
        exceededCount,
        warningCount,
        healthyCount,
        hasAlerts: exceededCount > 0 || warningCount > 0,
      },
      alerts,
    };
  } catch (err) {
    console.error('[BudgetGuardrails] Fetch all error:', err.message);
    throw err;
  }
};
