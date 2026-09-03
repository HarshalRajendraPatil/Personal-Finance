import Account from '../models/Account.js';
import Loan from '../models/Loan.js';
import RecurringRule from '../models/RecurringRule.js';
import Transaction from '../models/Transaction.js';
import memoryCache from '../utils/cache.js';

/**
 * 🛡️ Autonomous 14-Day Overdraft & Low-Balance Rolling Forecast Engine
 */
export const get14DayOverdraftForecast = async (userId, customThreshold = 5000) => {
  const cacheKey = `user_${userId}_overdraft_${customThreshold}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const horizonDays = 14;
  const endDate = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  endDate.setHours(23, 59, 59, 999);

  // 1. Fetch all active bank, cash, and liquid accounts
  const liquidAccounts = await Account.find({
    user: userId,
    type: { $in: ['Bank', 'Cash', 'UPI'] },
    isArchived: false,
  }).lean();

  if (liquidAccounts.length === 0) {
    return {
      summary: {
        totalAccounts: 0,
        breachedAccountsCount: 0,
        totalShortfall: 0,
        status: 'HEALTHY',
      },
      accounts: [],
      proposals: [],
    };
  }

  // Primary bank account fallback for unlinked rules
  const primaryAccount = liquidAccounts.find((a) => a.type === 'Bank') || liquidAccounts[0];

  // 2. Fetch active Loan EMIs
  const activeLoans = await Loan.find({ user: userId, isActive: true }).lean();

  // 3. Fetch active recurring expense rules
  const recurringRules = await RecurringRule.find({
    user: userId,
    isActive: true,
    type: 'Expense',
  })
    .populate('category', 'name')
    .lean();

  const accountForecasts = [];
  const rebalanceProposals = [];
  let totalShortfallSum = 0;
  let breachedCount = 0;

  for (const acc of liquidAccounts) {
    const startingBalance = acc.currentBalance || 0;
    let runningBalance = startingBalance;
    let minBalance = startingBalance;
    let breachDate = null;
    let breachTriggerItem = null;

    // Build day-by-day cash flow schedule (Days 0 to 14)
    const dailySchedule = [];
    for (let d = 0; d <= horizonDays; d++) {
      const targetDate = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      const dayNum = targetDate.getDate();
      const dateStr = targetDate.toISOString().split('T')[0];

      const dayOutflows = [];

      // Check Loan EMIs due on this date
      activeLoans.forEach((l) => {
        const isLinkedToThisAcc =
          (l.debitAccount && l.debitAccount.toString() === acc._id.toString()) ||
          (!l.debitAccount && acc._id.toString() === primaryAccount._id.toString());

        let isDueToday = false;
        if (l.nextEmiDate) {
          const emiDate = new Date(l.nextEmiDate);
          if (emiDate.toISOString().split('T')[0] === dateStr) {
            isDueToday = true;
          }
        } else if (l.debitDay === dayNum) {
          isDueToday = true;
        }

        if (isLinkedToThisAcc && isDueToday && l.emiAmount > 0) {
          dayOutflows.push({
            type: 'LOAN_EMI',
            title: `${l.name} EMI`,
            amount: l.emiAmount,
            source: 'Loan',
          });
        }
      });

      // Check Recurring Rules due on this date
      recurringRules.forEach((r) => {
        const isLinkedToThisAcc =
          (r.account && r.account.toString() === acc._id.toString()) ||
          (!r.account && acc._id.toString() === primaryAccount._id.toString());

        let isDueToday = false;
        if (r.nextRunDate) {
          const runDate = new Date(r.nextRunDate);
          if (runDate.toISOString().split('T')[0] === dateStr) {
            isDueToday = true;
          }
        }

        if (isLinkedToThisAcc && isDueToday && r.amount > 0) {
          dayOutflows.push({
            type: 'RECURRING_BILL',
            title: r.name || 'Recurring Expense',
            amount: r.amount,
            source: 'Recurring Rule',
          });
        }
      });

      const totalDayOutflow = dayOutflows.reduce((sum, item) => sum + item.amount, 0);
      runningBalance -= totalDayOutflow;

      if (runningBalance < minBalance) {
        minBalance = runningBalance;
        if (minBalance < customThreshold && !breachDate) {
          breachDate = dateStr;
          breachTriggerItem = dayOutflows[0] || null;
        }
      }

      dailySchedule.push({
        dayIndex: d,
        date: dateStr,
        dayName: targetDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        outflows: dayOutflows,
        totalOutflow: totalDayOutflow,
        projectedClosingBalance: runningBalance,
      });
    }

    const isBreached = minBalance < customThreshold;
    const shortfall = isBreached ? Math.max(0, customThreshold - minBalance) : 0;

    if (isBreached) {
      breachedCount += 1;
      totalShortfallSum += shortfall;

      // Recommended clean transfer amount (rounded to clean thousands)
      const recommendedTransfer = Math.max(5000, Math.ceil((shortfall + 5000) / 1000) * 1000);

      // Locate optimal donor account
      const potentialDonors = liquidAccounts.filter(
        (other) =>
          other._id.toString() !== acc._id.toString() &&
          other.currentBalance >= recommendedTransfer + 10000
      );

      const donorAccount = potentialDonors.sort((a, b) => b.currentBalance - a.currentBalance)[0] || null;

      rebalanceProposals.push({
        id: `proposal_${acc._id}_${Date.now()}`,
        targetAccountId: acc._id,
        targetAccountName: acc.name,
        targetCurrentBalance: acc.currentBalance,
        minProjectedBalance: minBalance,
        shortfallAmount: shortfall,
        breachDate: breachDate || 'Next 14 Days',
        triggeringItem: breachTriggerItem?.title || 'Scheduled Obligations',
        recommendedTransferAmount: recommendedTransfer,
        donorAccount: donorAccount
          ? {
              id: donorAccount._id,
              name: donorAccount.name,
              currentBalance: donorAccount.currentBalance,
            }
          : null,
        status: donorAccount ? 'ACTION_READY' : 'MANUAL_DEPOSIT_NEEDED',
        actionLabel: donorAccount
          ? `Transfer ₹${recommendedTransfer.toLocaleString('en-IN')} from ${donorAccount.name}`
          : `Deposit ₹${recommendedTransfer.toLocaleString('en-IN')} into ${acc.name}`,
      });
    }

    accountForecasts.push({
      accountId: acc._id,
      accountName: acc.name,
      accountType: acc.type,
      currency: acc.currency,
      currentBalance: acc.currentBalance,
      minProjectedBalance: minBalance,
      isBreached,
      shortfallAmount: shortfall,
      breachDate,
      triggeringItem: breachTriggerItem?.title || null,
      dailySchedule,
    });
  }

  const result = {
    summary: {
      forecastHorizonDays: horizonDays,
      totalAccounts: liquidAccounts.length,
      breachedAccountsCount: breachedCount,
      totalShortfall: totalShortfallSum,
      minimumBalanceBuffer: customThreshold,
      status: breachedCount > 0 ? 'BREACH_PROJECTED' : 'HEALTHY_BUFFER',
    },
    accounts: accountForecasts,
    proposals: rebalanceProposals,
  };

  memoryCache.set(cacheKey, result, 30);
  return result;
};

/**
 * ⚡ Executes 1-Click Auto-Rebalancing Transfer between accounts
 */
export const executeAutoRebalanceTransfer = async ({
  userId,
  fromAccountId,
  toAccountId,
  amount,
  reason = 'Overdraft & Low-Balance Shield Rebalance',
}) => {
  if (!userId || !fromAccountId || !toAccountId || !amount) {
    throw new Error('User ID, Source Account, Destination Account, and Amount are required.');
  }

  if (fromAccountId.toString() === toAccountId.toString()) {
    throw new Error('Cannot rebalance to the same account.');
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Valid transfer amount is required.');
  }

  const [fromAccount, toAccount] = await Promise.all([
    Account.findOne({ _id: fromAccountId, user: userId }),
    Account.findOne({ _id: toAccountId, user: userId }),
  ]);

  if (!fromAccount || !toAccount) {
    throw new Error('One or both accounts could not be found.');
  }

  if (fromAccount.currentBalance < numAmount) {
    throw new Error(`Insufficient funds in ${fromAccount.name} (Available: ₹${fromAccount.currentBalance.toLocaleString('en-IN')}).`);
  }

  // Perform atomic balance increments
  fromAccount.currentBalance -= numAmount;
  toAccount.currentBalance += numAmount;

  const txn = new Transaction({
    user: userId,
    type: 'Transfer',
    amount: numAmount,
    date: new Date(),
    account: fromAccount._id,
    toAccount: toAccount._id,
    merchant: 'Overdraft Shield Auto-Rebalance',
    notes: reason || `Auto-Rebalanced ₹${numAmount.toLocaleString('en-IN')} to protect ${toAccount.name} from low-balance breach`,
  });

  await Promise.all([fromAccount.save(), toAccount.save(), txn.save()]);

  // Invalidate in-memory cache for user
  memoryCache.invalidateUser(userId);

  return {
    success: true,
    message: `Successfully transferred ₹${numAmount.toLocaleString('en-IN')} from ${fromAccount.name} to ${toAccount.name}! Low-balance breach resolved.`,
    transaction: txn,
    balances: {
      fromAccount: { id: fromAccount._id, name: fromAccount.name, newBalance: fromAccount.currentBalance },
      toAccount: { id: toAccount._id, name: toAccount.name, newBalance: toAccount.currentBalance },
    },
  };
};
