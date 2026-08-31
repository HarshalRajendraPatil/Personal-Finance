import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

export const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user._id, isActive: true })
      .populate('category', 'name icon color type');
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBudget = async (req, res) => {
  try {
    const { name, category, period, startDate, endDate, limit, alertThreshold, rollover } = req.body;
    
    const budget = await Budget.create({
      user: req.user._id,
      name,
      category,
      period,
      startDate: period === 'custom' ? startDate : null,
      endDate: period === 'custom' ? endDate : null,
      limit,
      alertThreshold: alertThreshold || 80,
      rollover: rollover || false,
    });

    await budget.populate('category', 'name icon color type');
    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    Object.assign(budget, req.body);
    const updated = await budget.save();
    await updated.populate('category', 'name icon color type');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    await budget.deleteOne();
    res.json({ message: 'Budget removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper: get date range for current budget period
const getPeriodRange = (period, startDate, endDate) => {
  const now = new Date();
  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
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
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  } else if (period === 'custom') {
    return { start: new Date(startDate), end: new Date(endDate) };
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
};

// Get budgets with their current spend amounts
export const getBudgetsWithSpend = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user._id, isActive: true })
      .populate('category', 'name icon color type');

    const budgetsWithSpend = await Promise.all(budgets.map(async (budget) => {
      const { start, end } = getPeriodRange(budget.period, budget.startDate, budget.endDate);

      // Sum all expense transactions for this category in this period
      const spendResult = await Transaction.aggregate([
        {
          $match: {
            user: budget.user,
            category: budget.category._id,
            type: 'Expense',
            date: { $gte: start, $lte: end },
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const spent = spendResult.length > 0 ? spendResult[0].total : 0;
      const percentage = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
      const isOverBudget = spent > budget.limit;
      const isNearLimit = percentage >= budget.alertThreshold && !isOverBudget;

      return {
        ...budget.toObject(),
        spent,
        percentage,
        remaining: Math.max(0, budget.limit - spent),
        isOverBudget,
        isNearLimit,
        periodStart: start,
        periodEnd: end,
      };
    }));

    res.json(budgetsWithSpend);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ⚡ Returns active budget guardrails and threshold alerts across all user budgets
 */
export const getBudgetGuardrails = async (req, res) => {
  try {
    const { getAllBudgetGuardrails } = await import('../services/budgetGuardrailService.js');
    const result = await getAllBudgetGuardrails(req.user._id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

