import RecurringRule from '../../models/RecurringRule.js';
import Transaction from '../../models/Transaction.js';
import Account from '../../models/Account.js';

// Helper to calculate the next date based on frequency
const calculateNextRunDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  switch (frequency?.toLowerCase()) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  return date;
};

// Scheduled task to process recurring rules
export const processRecurringTransactions = async (targetUserId = null) => {
  console.log('[CRON] Starting recurring transaction processing...', new Date().toISOString());
  try {
    const today = new Date();

    const query = {
      isActive: true,
      autoPost: true,
      nextRunDate: { $lte: today },
    };
    if (targetUserId) query.user = targetUserId;

    const dueRules = await RecurringRule.find(query);
    console.log(`[CRON] Found ${dueRules.length} recurring rules due for processing.`);

    let processedCount = 0;

    for (const rule of dueRules) {
      // Check if end date has passed
      if (rule.endDate && rule.endDate < today) {
        rule.isActive = false;
        await rule.save();
        continue;
      }

      // Create a transaction
      const transaction = new Transaction({
        user: rule.user,
        type: rule.type,
        amount: rule.amount,
        account: rule.account,
        toAccount: rule.toAccount,
        category: rule.category,
        subcategory: rule.subcategory,
        merchant: rule.merchant,
        notes: `[Auto-posted] ${rule.notes || rule.name}`,
        date: rule.nextRunDate,
      });

      await transaction.save();

      // Update Account balances atomically
      if (rule.account) {
        if (rule.type === 'Income') {
          await Account.findByIdAndUpdate(rule.account, { $inc: { currentBalance: rule.amount } });
        } else if (rule.type === 'Expense') {
          await Account.findByIdAndUpdate(rule.account, { $inc: { currentBalance: -rule.amount } });
        } else if (rule.type === 'Transfer' && rule.toAccount) {
          await Account.findByIdAndUpdate(rule.account, { $inc: { currentBalance: -rule.amount } });
          await Account.findByIdAndUpdate(rule.toAccount, { $inc: { currentBalance: rule.amount } });
        }
      }

      // Update nextRunDate
      rule.nextRunDate = calculateNextRunDate(rule.nextRunDate, rule.frequency);

      // If the newly calculated nextRunDate is past the endDate, deactivate the rule
      if (rule.endDate && rule.nextRunDate > rule.endDate) {
        rule.isActive = false;
      }

      await rule.save();
      processedCount++;
      console.log(`[CRON] Auto-posted transaction for rule: ${rule.name}`);
    }

    return { success: true, processedCount };
  } catch (error) {
    console.error('[CRON] Error processing recurring transactions:', error);
    return { success: false, error: error.message };
  }
};
