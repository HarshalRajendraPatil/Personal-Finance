import Goal from '../models/Goal.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';

export const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createGoal = async (req, res) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.user._id });
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    // Guard: cannot set a target lower than what is already saved
    if (req.body.targetAmount !== undefined) {
      const newTarget = parseFloat(req.body.targetAmount);
      const saved = goal.currentAmount || 0;
      if (newTarget < saved) {
        return res.status(400).json({
          message: `Cannot set target to ₹${newTarget} — ₹${saved.toFixed(2)} is already saved.`
        });
      }
    }

    Object.assign(goal, req.body);
    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    await goal.deleteOne();
    res.json({ message: 'Goal removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /:id/contribute — add a contribution
export const addContribution = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (goal.isCompleted) return res.status(400).json({ message: 'Goal is already completed' });

    const { amount, date, note, accountId, bookTransaction } = req.body;

    // Guard: cannot contribute more than remaining
    const remaining = goal.targetAmount - (goal.currentAmount || 0);
    if (amount > remaining + 0.001) {
      return res.status(400).json({
        message: `Contribution (₹${amount}) exceeds remaining goal amount (₹${remaining.toFixed(2)})`
      });
    }

    goal.currentAmount = (goal.currentAmount || 0) + amount;
    goal.contributions.push({ amount, date: date || new Date(), note: note || '' });

    if (goal.currentAmount >= goal.targetAmount) {
      goal.isCompleted = true;
      goal.completedAt = new Date();
    }

    let transaction = null;
    if (bookTransaction && accountId) {
      transaction = new Transaction({
        user: req.user._id,
        type: 'Transfer', // Goal contribution is a transfer (savings), not an expense
        amount,
        date: date || new Date(),
        account: accountId,
        toAccount: null,
        category: null,
        notes: note || `Contribution to goal — ${goal.name}`,
        tags: ['goal', 'contribution'],
      });
      await transaction.save();

      const account = await Account.findById(accountId);
      if (account) {
        account.currentBalance -= amount;
        await account.save();
      }
      goal.contributions[goal.contributions.length - 1].transactionId = transaction._id;
    }

    await goal.save();
    res.json({ goal, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
