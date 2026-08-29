import cron from 'node-cron';
import RecurringRule from '../models/RecurringRule.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

// Helper to calculate the next date based on frequency
const calculateNextRunDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  switch (frequency) {
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
const processRecurringTransactions = async () => {
  console.log('[CRON] Starting recurring transaction processing...', new Date().toISOString());
  try {
    const today = new Date();

    // Find active rules that are due (nextRunDate <= today) and have autoPost enabled
    const dueRules = await RecurringRule.find({
      isActive: true,
      autoPost: true,
      nextRunDate: { $lte: today },
    });

    console.log(`[CRON] Found ${dueRules.length} recurring rules due for processing.`);

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

      // Update Account balances
      const account = await Account.findById(rule.account);
      if (account) {
        if (rule.type === 'Income') {
          account.balance += rule.amount;
        } else if (rule.type === 'Expense') {
          account.balance -= rule.amount;
        } else if (rule.type === 'Transfer' && rule.toAccount) {
          account.balance -= rule.amount;
          const toAccount = await Account.findById(rule.toAccount);
          if (toAccount) {
            toAccount.balance += rule.amount;
            await toAccount.save();
          }
        }
        await account.save();
      }

      // Update nextRunDate
      rule.nextRunDate = calculateNextRunDate(rule.nextRunDate, rule.frequency);

      // If the newly calculated nextRunDate is past the endDate, deactivate the rule
      if (rule.endDate && rule.nextRunDate > rule.endDate) {
        rule.isActive = false;
      }

      await rule.save();
      console.log(`[CRON] Auto-posted transaction for rule: ${rule.name}`);
    }

  } catch (error) {
    console.error('[CRON] Error processing recurring transactions:', error);
  }
};

export const initCronJobs = () => {
  // Run every day at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', () => {
    processRecurringTransactions();
  });
  console.log('[CRON] Jobs initialized. Recurring transaction processor scheduled to run at midnight.');
};
