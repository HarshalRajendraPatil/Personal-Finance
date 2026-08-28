import Account from '../models/Account.js';
import Investment from '../models/Investment.js';
import Loan from '../models/Loan.js';
import Lending from '../models/Lending.js';
import NetWorthSnapshot from '../models/NetWorthSnapshot.js';

// Helper: compute current net worth from live data
const computeNetWorth = async (userId) => {
  // Assets: all non-archived, non-credit-card accounts
  const accounts = await Account.find({ user: userId, isArchived: { $ne: true } });
  let cashAndBankBalances = 0;
  let creditCardBalances = 0;
  for (const acc of accounts) {
    if (acc.type === 'Credit Card') {
      // Negative balance on CC = liability (outstanding debt)
      if (acc.currentBalance < 0) creditCardBalances += Math.abs(acc.currentBalance);
    } else {
      cashAndBankBalances += acc.currentBalance || 0;
    }
  }

  // Assets: investments
  const investments = await Investment.find({ user: userId, isActive: true });
  const investmentValue = investments.reduce((s, i) => s + (i.currentValue || 0), 0);

  // Liabilities: active loans (remaining principal)
  const loans = await Loan.find({ user: userId, isActive: true });
  const loanBalances = loans.reduce((s, l) => {
    const paidPrincipal = l.payments.reduce((ps, p) => ps + (p.principal || 0), 0);
    return s + Math.max(0, l.principal - paidPrincipal);
  }, 0);

  // Lending: money owed TO user (receivable = asset)
  const lendings = await Lending.find({ user: userId, isSettled: false });
  let moneySentOutstanding = 0; // owed to me
  let moneyBorrowedOutstanding = 0; // I owe
  for (const l of lendings) {
    const repaid = l.repayments.reduce((s, r) => s + r.amount, 0);
    const outstanding = Math.max(0, l.amount - repaid);
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
    // breakdown for UI
    breakdown: {
      accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.currentBalance })),
      investments: investments.map(i => ({ name: i.name, type: i.type, value: i.currentValue })),
      loans: loans.map(l => {
        const pp = l.payments.reduce((s, p) => s + (p.principal || 0), 0);
        return { name: l.name, type: l.type, remaining: Math.max(0, l.principal - pp) };
      }),
    },
  };
};

export const getCurrentNetWorth = async (req, res) => {
  try {
    const data = await computeNetWorth(req.user._id);
    res.json(data);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getHistory = async (req, res) => {
  try {
    const snapshots = await NetWorthSnapshot.find({ user: req.user._id }).sort({ date: 1 }).limit(24);
    res.json(snapshots);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const takeSnapshot = async (req, res) => {
  try {
    const data = await computeNetWorth(req.user._id);
    const snapshot = await NetWorthSnapshot.create({
      user: req.user._id,
      date: new Date(),
      ...data,
      notes: req.body.notes || '',
    });
    res.status(201).json(snapshot);
  } catch (error) { res.status(500).json({ message: error.message }); }
};
