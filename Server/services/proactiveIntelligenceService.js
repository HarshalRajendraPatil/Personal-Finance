import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Budget from '../models/Budget.js';
import RecurringRule from '../models/RecurringRule.js';
import Loan from '../models/Loan.js';
import Goal from '../models/Goal.js';
import ProactiveNudge from '../models/ProactiveNudge.js';
import { runSubscriptionCleanUpAudit } from './subscriptionDetectorService.js';
import { get14DayOverdraftForecast } from './overdraftShieldService.js';
import memoryCache from '../utils/cache.js';

/**
 * Computes the dynamic "Safe-to-Spend Today" daily allowance.
 */
export const calculateSafeToSpend = async (userId) => {
  const cacheKey = `user_${userId}_safetospend`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = Math.max(1, totalDaysInMonth - dayOfMonth + 1);

  // 1. Total Liquid Cash (Bank + Cash accounts)
  const liquidAccounts = await Account.find({
    user: userId,
    type: { $in: ['Bank', 'Cash'] },
    isArchived: false,
  }).lean();
  const liquidBalance = liquidAccounts.reduce((sum, acc) => sum + Math.max(0, acc.currentBalance), 0);

  // 2. Upcoming Scheduled Obligations for the rest of the month
  const startOfTomorrow = new Date(year, month, dayOfMonth + 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  // Upcoming Recurring Rules (Bills, Subscriptions, Rent)
  const upcomingBills = await RecurringRule.find({
    user: userId,
    isActive: true,
    nextRunDate: { $gte: startOfTomorrow, $lte: endOfMonth },
    type: 'Expense',
  }).lean();
  const totalUpcomingBills = upcomingBills.reduce((sum, b) => sum + b.amount, 0);

  // Upcoming Loan EMIs
  const upcomingLoans = await Loan.find({
    user: userId,
    status: 'Active',
    autoDebit: true,
    nextDebitDate: { $gte: startOfTomorrow, $lte: endOfMonth },
  });
  const totalUpcomingEMIs = upcomingLoans.reduce((sum, l) => sum + (l.emiAmount || 0), 0);

  // Monthly Savings Goals target allocation
  const activeGoals = await Goal.find({ user: userId, status: 'In Progress' });
  const monthlyGoalTarget = activeGoals.reduce((sum, g) => {
    // If targetDate exists, calculate monthly required
    if (g.targetDate) {
      const monthsLeft = Math.max(1, Math.ceil((new Date(g.targetDate) - now) / (1000 * 60 * 60 * 24 * 30)));
      const needed = Math.max(0, g.targetAmount - g.currentAmount);
      return sum + Math.round(needed / monthsLeft);
    }
    return sum + 0;
  }, 0);

  // Safe discretionary cash available for remainder of month
  const committedExpenditures = totalUpcomingBills + totalUpcomingEMIs + monthlyGoalTarget;
  const uncommittedBuffer = Math.max(0, liquidBalance - committedExpenditures);
  const safeToSpendDaily = Math.round(uncommittedBuffer / daysRemaining);

  const result = {
    safeToSpendDaily,
    liquidBalance,
    committedExpenditures,
    totalUpcomingBills,
    totalUpcomingEMIs,
    monthlyGoalTarget,
    daysRemaining,
    totalDaysInMonth,
    dayOfMonth,
  };

  memoryCache.set(cacheKey, result, 30);
  return result;
};

/**
 * Runs the comprehensive Proactive Intelligence Engine for a user.
 * Generates and updates real-time actionable nudges.
 */
export const runProactiveIntelligenceCheck = async (userId) => {
  const nudges = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  // -------------------------------------------------------------
  // 1. Predictive Budget Velocity Burn Engine
  // -------------------------------------------------------------
  const activeBudgets = await Budget.find({ user: userId, isActive: true }).populate('category').lean();
  for (const budget of activeBudgets) {
    const categoryId = budget.category?._id || budget.category;
    const categoryName = budget.category?.name || 'Overall';

    const txns = await Transaction.find({
      user: userId,
      category: categoryId,
      type: 'Expense',
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean();

    const spent = txns.reduce((sum, t) => sum + t.amount, 0);
    const budgetCap = budget.amount;

    if (dayOfMonth >= 3 && spent > 0) {
      const dailyVelocity = spent / dayOfMonth;
      const projectedMonthSpend = Math.round(dailyVelocity * totalDaysInMonth);
      const exhaustionDay = Math.floor(budgetCap / dailyVelocity);

      if (exhaustionDay < totalDaysInMonth && spent < budgetCap) {
        nudges.push({
          user: userId,
          type: 'PREDICTIVE_BUDGET_EXHAUSTION',
          severity: exhaustionDay <= dayOfMonth + 5 ? 'CRITICAL' : 'WARNING',
          title: `🚨 ${categoryName} Budget Exhaustion Predicted (Day ${exhaustionDay})`,
          message: `At your current velocity of ₹${Math.round(dailyVelocity).toLocaleString('en-IN')}/day, your ₹${budgetCap.toLocaleString('en-IN')} ${categoryName} budget will completely exhaust around Day ${exhaustionDay} (${new Date(year, month, exhaustionDay).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}). Projected total: ₹${projectedMonthSpend.toLocaleString('en-IN')}.`,
          data: {
            categoryName,
            spent,
            budgetCap,
            dailyVelocity,
            exhaustionDay,
            projectedMonthSpend,
          },
          actionLabel: 'Adjust Budget',
          actionUrl: '/budgets',
        });
      } else if (spent >= budgetCap) {
        nudges.push({
          user: userId,
          type: 'PREDICTIVE_BUDGET_EXHAUSTION',
          severity: 'CRITICAL',
          title: `⚠️ ${categoryName} Budget Exceeded by ₹${(spent - budgetCap).toLocaleString('en-IN')}`,
          message: `You have spent ₹${spent.toLocaleString('en-IN')} of your ₹${budgetCap.toLocaleString('en-IN')} limit with ${totalDaysInMonth - dayOfMonth} days remaining in the month.`,
          data: { categoryName, spent, budgetCap },
          actionLabel: 'View Transactions',
          actionUrl: '/transactions',
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 2. Duplicate Transaction Guardian (Within 30 Mins)
  // -------------------------------------------------------------
  const recentTxns = await Transaction.find({
    user: userId,
    type: 'Expense',
    date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  }).sort({ date: -1 }).lean();

  for (let i = 0; i < recentTxns.length - 1; i++) {
    const current = recentTxns[i];
    const next = recentTxns[i + 1];

    const timeDiffMinutes = Math.abs(new Date(current.date) - new Date(next.date)) / (1000 * 60);
    const isSameAmount = current.amount === next.amount;
    const currentDesc = (current.merchant || current.notes || '').toLowerCase().trim();
    const nextDesc = (next.merchant || next.notes || '').toLowerCase().trim();
    const isSimilarDesc = currentDesc && nextDesc && currentDesc === nextDesc;

    if (timeDiffMinutes <= 30 && isSameAmount && isSimilarDesc) {
      nudges.push({
        user: userId,
        type: 'DUPLICATE_TRANSACTION_ALERT',
        severity: 'WARNING',
        title: `⚠️ Possible Duplicate Charge Detected (₹${current.amount.toLocaleString('en-IN')})`,
        message: `Two identical charges of ₹${current.amount.toLocaleString('en-IN')} at "${current.merchant || current.notes || 'Unknown'}" occurred within ${Math.round(timeDiffMinutes)} minutes. Check if you were double-billed.`,
        data: {
          amount: current.amount,
          description: current.merchant || current.notes || 'Transaction',
          firstDate: next.date,
          secondDate: current.date,
        },
        actionLabel: 'Verify Charge',
        actionUrl: '/transactions',
      });
      break; // Report the latest one
    }
  }

  // -------------------------------------------------------------
  // 3. Liquidity Buffer Pre-Alert (Upcoming EMIs & Bills vs Balance)
  // -------------------------------------------------------------
  const fourDaysLater = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
  const imminentLoans = await Loan.find({
    user: userId,
    isActive: true,
    autoDebit: true,
    nextEmiDate: { $gte: now, $lte: fourDaysLater },
  }).populate('debitAccount').lean();

  for (const loan of imminentLoans) {
    const fundingAcc = loan.debitAccount;
    if (fundingAcc && fundingAcc.currentBalance < (loan.emiAmount || 0)) {
      const shortfall = (loan.emiAmount || 0) - fundingAcc.currentBalance;
      nudges.push({
        user: userId,
        type: 'LIQUIDITY_BUFFER_WARNING',
        severity: 'CRITICAL',
        title: `🔴 Low Balance for ${loan.name} EMI Auto-Debit`,
        message: `Your EMI of ₹${(loan.emiAmount || 0).toLocaleString('en-IN')} is due on ${new Date(loan.nextEmiDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, but "${fundingAcc.name}" only has ₹${fundingAcc.currentBalance.toLocaleString('en-IN')}. Transfer at least ₹${shortfall.toLocaleString('en-IN')} to prevent bounce charges.`,
        data: {
          loanName: loan.name,
          emiAmount: loan.emiAmount,
          accountName: fundingAcc.name,
          currentBalance: fundingAcc.currentBalance,
          shortfall,
        },
        actionLabel: 'Manage Accounts',
        actionUrl: '/accounts',
      });
    }
  }

  // -------------------------------------------------------------
  // 4. Safe-to-Spend Daily Allowance Nudge
  // -------------------------------------------------------------
  const safeData = await calculateSafeToSpend(userId);
  if (safeData.safeToSpendDaily > 0) {
    nudges.push({
      user: userId,
      type: 'SAFE_TO_SPEND_NUDGE',
      severity: 'INFO',
      title: `💡 Today's Safe-to-Spend: ₹${safeData.safeToSpendDaily.toLocaleString('en-IN')}`,
      message: `After reserving ₹${safeData.committedExpenditures.toLocaleString('en-IN')} for upcoming bills, EMIs, and savings goals, you can comfortably spend up to ₹${safeData.safeToSpendDaily.toLocaleString('en-IN')} today.`,
      data: safeData,
      actionLabel: 'View Cash Flow',
      actionUrl: '/intelligence',
    });
  }

  // -------------------------------------------------------------
  // 5. Idle Cash Sweeper Recommendation
  // -------------------------------------------------------------
  const last3MonthsTxns = await Transaction.find({
    user: userId,
    type: 'Expense',
    date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  });
  const avgMonthlyBurn = (last3MonthsTxns.reduce((sum, t) => sum + t.amount, 0) / 3) || 30000;

  if (safeData.liquidBalance > avgMonthlyBurn * 4 && safeData.liquidBalance > 200000) {
    const surplus = Math.round(safeData.liquidBalance - avgMonthlyBurn * 3);
    const potentialInterest = Math.round((surplus * 0.07) - (surplus * 0.027)); // 7% Arbitrage/FD vs 2.7% Savings

    nudges.push({
      user: userId,
      type: 'IDLE_CASH_RECOMMENDATION',
      severity: 'SUCCESS',
      title: `💰 Idle Cash Optimization (Earn ~₹${potentialInterest.toLocaleString('en-IN')}/yr extra)`,
      message: `You have ₹${safeData.liquidBalance.toLocaleString('en-IN')} in liquid cash (>3 months expenses). Moving a surplus of ₹${surplus.toLocaleString('en-IN')} into a high-yield liquid fund or arbitrage fund could yield ~₹${potentialInterest.toLocaleString('en-IN')} more in annual risk-free returns.`,
      data: {
        liquidBalance: safeData.liquidBalance,
        avgMonthlyBurn,
        surplus,
        potentialInterest,
      },
      actionLabel: 'Explore Investments',
      actionUrl: '/investments',
    });
  }

  // -------------------------------------------------------------
  // 7. Zombie Subscriptions & Hidden Price-Hike Detector Nudges
  // -------------------------------------------------------------
  try {
    const auditData = await runSubscriptionCleanUpAudit(userId);
    if (auditData?.summary?.totalHikesCount > 0) {
      const hikeSubs = auditData.subscriptions.filter((s) => s.hasPriceHike);
      const firstHike = hikeSubs[0];
      nudges.push({
        user: userId,
        type: 'PRICE_HIKE_ALERT',
        severity: 'WARNING',
        title: `⚠️ Price Hike Detected: ${firstHike.name} (+${firstHike.priceHike.hikePercentage}%)`,
        message: `${firstHike.name} increased from ₹${firstHike.priceHike.previousPrice} to ₹${firstHike.priceHike.currentPrice}/mo (adding ₹${firstHike.priceHike.extraAnnualCost.toLocaleString('en-IN')}/yr in extra cost).`,
        data: firstHike,
        actionLabel: 'Review Audit',
        actionUrl: '/bills',
      });
    }

    if (auditData?.summary?.totalZombiesCount > 0) {
      const zombieSubs = auditData.subscriptions.filter((s) => s.isZombie);
      const firstZombie = zombieSubs[0];
      nudges.push({
        user: userId,
        type: 'ZOMBIE_SUBSCRIPTION_WARNING',
        severity: 'WARNING',
        title: `🧟 Inactive Subscription: ${firstZombie.name} (${firstZombie.zombieDetails.daysInactive}d inactive)`,
        message: `No activity recorded for ${firstZombie.name} in 60+ days. Cancelling or pausing this rule could save you ₹${firstZombie.zombieDetails.potentialAnnualSavings.toLocaleString('en-IN')}/year!`,
        data: firstZombie,
        actionLabel: 'Clean Up Subscriptions',
        actionUrl: '/bills',
      });
    }
  } catch (subErr) {
    console.warn('Subscription audit nudge check error:', subErr.message);
  }

  // -------------------------------------------------------------
  // 8. Overdraft & Low-Balance Shield Alert
  // -------------------------------------------------------------
  try {
    const shieldData = await get14DayOverdraftForecast(userId);
    if (shieldData?.summary?.breachedAccountsCount > 0 && shieldData.proposals.length > 0) {
      const topProposal = shieldData.proposals[0];
      nudges.push({
        user: userId,
        type: 'OVERDRAFT_SHIELD_ALERT',
        severity: 'CRITICAL',
        title: `🛡️ Low-Balance Shield: ${topProposal.targetAccountName} (Breach Risk on ${topProposal.breachDate})`,
        message: `Projected shortfall of ₹${topProposal.shortfallAmount.toLocaleString('en-IN')} before upcoming ${topProposal.triggeringItem}. Rebalance ₹${topProposal.recommendedTransferAmount.toLocaleString('en-IN')} from ${topProposal.donorAccount?.name || 'savings'} in 1-click to avoid EMI bounce!`,
        data: topProposal,
        actionLabel: '1-Click Rebalance',
        actionUrl: '/accounts',
      });
    }
  } catch (shieldErr) {
    console.warn('Overdraft shield nudge check error:', shieldErr.message);
  }

  // -------------------------------------------------------------
  // Persist / Sync Nudges to Database (Avoid Stale Duplicates)
  // -------------------------------------------------------------
  // Remove non-dismissed nudges older than 2 days
  await ProactiveNudge.deleteMany({
    user: userId,
    isDismissed: false,
    createdAt: { $lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  });

  // Save new unique nudges
  for (const n of nudges) {
    const existing = await ProactiveNudge.findOne({
      user: userId,
      type: n.type,
      title: n.title,
      isDismissed: false,
    });

    if (!existing) {
      await ProactiveNudge.create(n);
    }
  }

  // Return active non-dismissed nudges
  return await ProactiveNudge.find({ user: userId, isDismissed: false }).sort({ createdAt: -1 });
};
