import RecurringRule from '../../models/RecurringRule.js';
import Transaction from '../../models/Transaction.js';
import Account from '../../models/Account.js';

let isProcessingRecurring = false;

// Helper to calculate the next date based on frequency while preserving exact time
const calculateNextRunDate = (currentDate, frequency, timeStr = null) => {
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

  if (timeStr && timeStr.includes(':')) {
    const [h, m] = timeStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      date.setHours(h, m, 0, 0);
    }
  }
  return date;
};

// Scheduled task to process recurring rules at their exact scheduled time
export const processRecurringTransactions = async (targetUserId = null) => {
  if (isProcessingRecurring) {
    return { success: true, processedCount: 0, skipped: true };
  }
  isProcessingRecurring = true;

  try {
    const now = new Date();

    const query = {
      isActive: true,
      autoPost: true,
      nextRunDate: { $lte: now },
    };
    if (targetUserId) query.user = targetUserId;

    const dueRules = await RecurringRule.find(query);
    if (dueRules.length > 0) {
      console.log(`[CRON EXACT-TIME] Processing ${dueRules.length} recurring rules due at or before ${now.toISOString()}`);
    }

    let processedCount = 0;

    for (const rule of dueRules) {
      // Check if end date has passed
      if (rule.endDate && rule.endDate < now) {
        rule.isActive = false;
        await rule.save();
        continue;
      }

      // Create a transaction with timestamp of the scheduled nextRunDate
      const transaction = new Transaction({
        user: rule.user,
        type: rule.type,
        amount: rule.amount,
        account: rule.account,
        toAccount: rule.toAccount,
        category: rule.category,
        subcategory: rule.subcategory,
        merchant: rule.merchant,
        notes: `[Auto-posted at ${rule.time || '09:00'}] ${rule.notes || rule.name}`,
        date: rule.nextRunDate || now,
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

      // Update nextRunDate preserving exact execution time
      rule.nextRunDate = calculateNextRunDate(rule.nextRunDate, rule.frequency, rule.time);

      // If the newly calculated nextRunDate is past the endDate, deactivate the rule
      if (rule.endDate && rule.nextRunDate > rule.endDate) {
        rule.isActive = false;
      }

      await rule.save();
      processedCount++;
      console.log(`[CRON EXACT-TIME] Auto-posted rule "${rule.name}" (Amount: ${rule.amount}, Next Run: ${rule.nextRunDate.toISOString()})`);
    }

    return { success: true, processedCount };
  } catch (error) {
    console.error('[CRON EXACT-TIME] Error processing recurring transactions:', error);
    return { success: false, error: error.message };
  } finally {
    isProcessingRecurring = false;
  }
};
