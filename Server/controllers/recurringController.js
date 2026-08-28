import RecurringRule from '../models/RecurringRule.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

export const getRecurringRules = async (req, res) => {
  try {
    const rules = await RecurringRule.find({ user: req.user._id })
      .populate('account', 'name currency')
      .populate('toAccount', 'name currency')
      .populate('category', 'name icon color');
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createRecurringRule = async (req, res) => {
  try {
    const rule = new RecurringRule({
      ...req.body,
      user: req.user._id,
    });
    console.log(rule)
    await rule.save();
    await rule.populate('account toAccount category');
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRecurringRule = async (req, res) => {
  try {
    const rule = await RecurringRule.findOne({ _id: req.params.id, user: req.user._id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    Object.assign(rule, req.body);
    await rule.save();
    await rule.populate('account toAccount category');
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteRecurringRule = async (req, res) => {
  try {
    const rule = await RecurringRule.findOne({ _id: req.params.id, user: req.user._id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    await rule.deleteOne();
    res.json({ message: 'Rule removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to advance date based on frequency
export const getNextRunDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  if (frequency === 'daily') date.setDate(date.getDate() + 1);
  else if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  else if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
  else if (frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);
  return date;
};

// Manual endpoint for when user clicks "Mark as Paid" on a bill
export const payBill = async (req, res) => {
  try {
    const rule = await RecurringRule.findOne({ _id: req.params.id, user: req.user._id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    // Allow overriding the amount or date during manual payment
    const { amount, date } = req.body;
    const paymentAmount = amount || rule.amount;
    const paymentDate = date || new Date();

    // 1. Create the Transaction
    const transaction = new Transaction({
      user: req.user._id,
      type: rule.type,
      amount: paymentAmount,
      date: paymentDate,
      account: rule.account,
      toAccount: rule.toAccount,
      category: rule.category,
      subcategory: rule.subcategory,
      merchant: rule.merchant,
      notes: rule.notes || `Manually paid from rule: ${rule.name}`,
    });

    await transaction.save();

    // 2. Update Account Balances
    const sourceAccount = await Account.findById(rule.account);
    if (sourceAccount) {
      if (rule.type === 'Income') sourceAccount.currentBalance += paymentAmount;
      else if (rule.type === 'Expense') sourceAccount.currentBalance -= paymentAmount;
      else if (rule.type === 'Transfer') {
        sourceAccount.currentBalance -= paymentAmount;
        const destAccount = await Account.findById(rule.toAccount);
        if (destAccount) {
          destAccount.currentBalance += paymentAmount;
          await destAccount.save();
        }
      }
      await sourceAccount.save();
    }

    // 3. Increment the nextRunDate of the rule
    rule.nextRunDate = getNextRunDate(rule.nextRunDate, rule.frequency);
    await rule.save();
    await rule.populate('account toAccount category');

    res.json({ rule, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
