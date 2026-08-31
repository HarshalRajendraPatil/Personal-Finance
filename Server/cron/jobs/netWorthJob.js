import User from '../../models/User.js';
import Account from '../../models/Account.js';
import Investment from '../../models/Investment.js';
import Loan from '../../models/Loan.js';
import Lending from '../../models/Lending.js';
import NetWorthSnapshot from '../../models/NetWorthSnapshot.js';

// High-speed parallel net worth calculation using .lean()
export const computeLiveNetWorth = async (userId) => {
  const [accounts, investments, loans, lendings] = await Promise.all([
    Account.find({ user: userId, isArchived: { $ne: true } }).lean(),
    Investment.find({ user: userId, isActive: true }).lean(),
    Loan.find({ user: userId, isActive: true }).lean(),
    Lending.find({ user: userId, isSettled: false }).lean(),
  ]);

  let cashAndBankBalances = 0;
  let creditCardBalances = 0;
  for (const acc of accounts) {
    if (acc.type === 'Credit Card') {
      if (acc.currentBalance < 0) creditCardBalances += Math.abs(acc.currentBalance);
    } else {
      cashAndBankBalances += acc.currentBalance || 0;
    }
  }

  const investmentValue = investments.reduce((s, i) => s + (i.currentValue || 0), 0);

  const loanBalances = loans.reduce((s, l) => {
    const paidPrincipal = (l.payments || []).reduce((ps, p) => ps + (p.principal || 0), 0);
    return s + Math.max(0, (l.principal || 0) - paidPrincipal);
  }, 0);

  let moneySentOutstanding = 0; // Asset (owed to user)
  let moneyBorrowedOutstanding = 0; // Liability (user owes)
  for (const l of lendings) {
    const repaid = (l.repayments || []).reduce((s, r) => s + (r.amount || 0), 0);
    const outstanding = Math.max(0, (l.amount || 0) - repaid);
    if (l.type === 'lent') moneySentOutstanding += outstanding;
    else moneyBorrowedOutstanding += outstanding;
  }

  const totalAssets = cashAndBankBalances + investmentValue + moneySentOutstanding;
  const totalLiabilities = loanBalances + creditCardBalances + moneyBorrowedOutstanding;
  const netWorth = totalAssets - totalLiabilities;

  return {
    cashAndBankBalances,
    investmentValue,
    otherAssets: moneySentOutstanding,
    totalAssets,
    loanBalances,
    creditCardBalances: creditCardBalances + moneyBorrowedOutstanding,
    otherLiabilities: 0,
    totalLiabilities,
    netWorth,
    breakdown: {
      accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.currentBalance })),
      investments: investments.map(i => ({ name: i.name, type: i.type, value: i.currentValue })),
      loans: loans.map(l => {
        const pp = (l.payments || []).reduce((s, p) => s + (p.principal || 0), 0);
        return { name: l.name, type: l.type, remaining: Math.max(0, (l.principal || 0) - pp) };
      }),
    },
  };
};

// Capture an autonomous snapshot for a specific user
export const captureAutomatedSnapshotForUser = async (userId, customNote = null) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Check if an automated snapshot was already taken today to avoid duplicates
    const existingToday = await NetWorthSnapshot.findOne({
      user: userId,
      date: { $gte: startOfToday },
      isAutomated: true,
    });

    if (existingToday) {
      console.log(`[CRON] Net worth snapshot already exists for user ${userId} today. Skipping.`);
      return existingToday;
    }

    const data = await computeLiveNetWorth(userId);
    const snapshot = await NetWorthSnapshot.create({
      user: userId,
      date: new Date(),
      cashAndBankBalances: data.cashAndBankBalances,
      investmentValue: data.investmentValue,
      otherAssets: data.otherAssets,
      totalAssets: data.totalAssets,
      loanBalances: data.loanBalances,
      creditCardBalances: data.creditCardBalances,
      otherLiabilities: data.otherLiabilities,
      totalLiabilities: data.totalLiabilities,
      netWorth: data.netWorth,
      notes: customNote || '[Auto-Captured] Monthly Wealth Milestone',
      isAutomated: true,
    });

    console.log(`[CRON] Captured automated net worth snapshot for user ${userId}: ₹${data.netWorth}`);
    return snapshot;
  } catch (error) {
    console.error(`[CRON] Failed to capture net worth snapshot for user ${userId}:`, error);
    throw error;
  }
};

// Autonomous monthly batch runner across all active users
export const generateMonthlyNetWorthSnapshots = async () => {
  console.log('[CRON] Starting Autonomous Monthly Net Worth Snapshot Engine...', new Date().toISOString());
  try {
    const users = await User.find({}, '_id name email').lean();
    console.log(`[CRON] Capturing net worth snapshots across ${users.length} active users.`);

    let capturedCount = 0;
    for (const user of users) {
      try {
        await captureAutomatedSnapshotForUser(user._id);
        capturedCount++;
      } catch (err) {
        console.error(`[CRON] Could not capture snapshot for user ${user._id}:`, err.message);
      }
    }

    console.log(`[CRON] Successfully generated ${capturedCount} automated net worth snapshots.`);
    return { success: true, capturedCount };
  } catch (error) {
    console.error('[CRON] Error during monthly net worth snapshot job:', error);
    return { success: false, error: error.message };
  }
};
