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
    const timeStr = req.body.time || '09:00';
    let runDate = new Date(req.body.nextRunDate || new Date());
    if (timeStr && timeStr.includes(':')) {
      const [h, m] = timeStr.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        runDate.setHours(h, m, 0, 0);
      }
    }

    const rule = new RecurringRule({
      ...req.body,
      time: timeStr,
      nextRunDate: runDate,
      user: req.user._id,
    });
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

    const updateData = { ...req.body };
    const timeStr = updateData.time !== undefined ? updateData.time : (rule.time || '09:00');
    updateData.time = timeStr;

    if (updateData.nextRunDate) {
      let runDate = new Date(updateData.nextRunDate);
      if (timeStr && timeStr.includes(':')) {
        const [h, m] = timeStr.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          runDate.setHours(h, m, 0, 0);
        }
      }
      updateData.nextRunDate = runDate;
    } else if (updateData.time && updateData.time !== rule.time) {
      // If time changed without nextRunDate, update time on existing nextRunDate
      let runDate = new Date(rule.nextRunDate);
      const [h, m] = updateData.time.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        runDate.setHours(h, m, 0, 0);
      }
      updateData.nextRunDate = runDate;
    }

    Object.assign(rule, updateData);
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

// Helper function to advance date based on frequency while preserving exact time
export const getNextRunDate = (currentDate, frequency, timeStr = null) => {
  const date = new Date(currentDate);
  if (frequency === 'daily') date.setDate(date.getDate() + 1);
  else if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  else if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
  else if (frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);

  if (timeStr && timeStr.includes(':')) {
    const [h, m] = timeStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      date.setHours(h, m, 0, 0);
    }
  }
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
    const paymentDate = date ? new Date(date) : new Date();

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

    // 3. Increment the nextRunDate of the rule preserving scheduled time
    rule.nextRunDate = getNextRunDate(rule.nextRunDate, rule.frequency, rule.time);
    if (rule.endDate && rule.nextRunDate > rule.endDate) {
      rule.isActive = false;
    }
    await rule.save();
    await rule.populate('account toAccount category');

    res.json({ rule, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
