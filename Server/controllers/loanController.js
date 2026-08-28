import Loan from '../models/Loan.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';

// ── EMI formula: M = P * r * (1+r)^n / ((1+r)^n - 1)
const calcEmi = (principal, annualRate, months) => {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
};

// Generate full amortization schedule (array of rows)
const generateSchedule = (principal, annualRate, months, startDate, emiAmount) => {
  const schedule = [];
  let balance = principal;
  const r = annualRate / 100 / 12;
  const emi = emiAmount || calcEmi(principal, annualRate, months);

  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const principalComponent = Math.min(emi - interest, balance);
    balance = Math.max(0, balance - principalComponent);

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installment: i,
      dueDate,
      emi: parseFloat(emi.toFixed(2)),
      principal: parseFloat(principalComponent.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
    });
  }
  return schedule;
};

export const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id })
      .populate('account', 'name currency')
      .sort({ createdAt: -1 });
    res.json(loans);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createLoan = async (req, res) => {
  try {
    const { principal, interestRate, tenureMonths } = req.body;
    const emiAmount = parseFloat(calcEmi(principal, interestRate, tenureMonths).toFixed(2));
    const loan = await Loan.create({ ...req.body, user: req.user._id, emiAmount });
    await loan.populate('account', 'name currency');
    res.status(201).json(loan);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    // Recalculate EMI if core fields changed
    const { principal, interestRate, tenureMonths } = { ...loan.toObject(), ...req.body };
    req.body.emiAmount = parseFloat(calcEmi(principal, interestRate, tenureMonths).toFixed(2));
    Object.assign(loan, req.body);
    await loan.save();
    await loan.populate('account', 'name currency');
    res.json(loan);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    await loan.deleteOne();
    res.json({ message: 'Loan removed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// GET /:id/schedule — return full amortization table
export const getSchedule = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    const schedule = generateSchedule(loan.principal, loan.interestRate, loan.tenureMonths, loan.startDate, loan.emiAmount);
    res.json({ schedule, emiAmount: loan.emiAmount });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// POST /:id/pay — log an EMI payment
export const addPayment = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    const { amount, date, note, accountId, bookTransaction } = req.body;

    // Calculate P&I split based on remaining principal
    const paidPrincipal = loan.payments.reduce((s, p) => s + (p.principal || 0), 0);
    const remainingPrincipal = Math.max(0, loan.principal - paidPrincipal);
    const r = loan.interestRate / 100 / 12;
    const interest = parseFloat((remainingPrincipal * r).toFixed(2));
    const principal = parseFloat(Math.max(0, amount - interest).toFixed(2));

    loan.payments.push({ amount, date: date || new Date(), note: note || '', principal, interest });

    // Check if fully paid
    const totalPaidPrincipal = loan.payments.reduce((s, p) => s + (p.principal || 0), 0);
    if (totalPaidPrincipal >= loan.principal) loan.isActive = false;

    let transaction = null;
    if (bookTransaction && accountId) {
      let cat = await Category.findOne({ user: req.user._id, name: 'Debt Repayment' });
      if (!cat) {
        cat = await Category.create({ user: req.user._id, name: 'Debt Repayment', type: 'Expense', icon: 'Building2', color: '#f97316' });
      }

      transaction = new Transaction({
        user: req.user._id,
        type: 'Expense',
        amount,
        date: date || new Date(),
        account: accountId,
        category: cat._id,
        notes: note || `EMI payment — ${loan.name}`,
        tags: ['loan', 'emi'],
      });
      await transaction.save();
      const account = await Account.findById(accountId);
      if (account) { account.currentBalance -= amount; await account.save(); }
      loan.payments[loan.payments.length - 1].transactionId = transaction._id;
    }

    await loan.save();
    await loan.populate('account', 'name currency');
    res.json({ loan, transaction });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
