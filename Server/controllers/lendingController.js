import Lending from '../models/Lending.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';

export const getLendings = async (req, res) => {
  try {
    const lendings = await Lending.find({ user: req.user._id })
      .populate('account', 'name currency')
      .sort({ createdAt: -1 });
    res.json(lendings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLending = async (req, res) => {
  try {
    const lending = await Lending.create({ ...req.body, user: req.user._id });
    await lending.populate('account', 'name currency');
    res.status(201).json(lending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLending = async (req, res) => {
  try {
    const lending = await Lending.findOne({ _id: req.params.id, user: req.user._id });
    if (!lending) return res.status(404).json({ message: 'Entry not found' });

    // Guard: cannot set a new amount lower than what's already been repaid
    if (req.body.amount !== undefined) {
      const newAmount = parseFloat(req.body.amount);
      const totalRepaid = lending.repayments.reduce((sum, r) => sum + r.amount, 0);
      if (newAmount < totalRepaid) {
        return res.status(400).json({
          message: `Cannot set the principal to ₹${newAmount} — ₹${totalRepaid.toFixed(2)} has already been repaid.`
        });
      }
    }

    Object.assign(lending, req.body);
    await lending.save();
    await lending.populate('account', 'name currency');
    res.json(lending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLending = async (req, res) => {
  try {
    const lending = await Lending.findOne({ _id: req.params.id, user: req.user._id });
    if (!lending) return res.status(404).json({ message: 'Entry not found' });
    await lending.deleteOne();
    res.json({ message: 'Lending entry removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /:id/repay — add a partial repayment, optionally book a transaction
export const addRepayment = async (req, res) => {
  try {
    const lending = await Lending.findOne({ _id: req.params.id, user: req.user._id });
    if (!lending) return res.status(404).json({ message: 'Entry not found' });
    if (lending.isSettled) return res.status(400).json({ message: 'This entry is already settled' });

    const { amount, date, note, accountId, bookTransaction } = req.body;

    // Guard: cannot pay more than what is outstanding
    const currentRepaid = lending.repayments.reduce((sum, r) => sum + r.amount, 0);
    const outstanding = lending.amount - currentRepaid;
    if (amount > outstanding + 0.001) { // small epsilon for float precision
      return res.status(400).json({
        message: `Repayment amount (₹${amount}) exceeds outstanding balance (₹${outstanding.toFixed(2)})`
      });
    }

    lending.repayments.push({ amount, date: date || new Date(), note: note || '' });

    // Check if now fully settled
    const totalRepaid = lending.repayments.reduce((sum, r) => sum + r.amount, 0);
    if (totalRepaid >= lending.amount) {
      lending.isSettled = true;
      lending.settledAt = new Date();
    }

    let transaction = null;
    if (bookTransaction && accountId) {
      // Repayment means money coming IN (if lent) or going OUT (if borrowed)
      const txType = lending.type === 'lent' ? 'Income' : 'Expense';
      
      let cat = await Category.findOne({ user: req.user._id, name: 'Lending / Borrowing' });
      if (!cat) {
        cat = await Category.create({ user: req.user._id, name: 'Lending / Borrowing', type: txType, icon: 'Users', color: '#8b5cf6' });
      }

      transaction = new Transaction({
        user: req.user._id,
        type: txType,
        amount,
        date: date || new Date(),
        account: accountId,
        category: cat._id,
        notes: note || `Repayment — ${lending.person}`,
        tags: ['lending', 'repayment'],
      });
      await transaction.save();

      // Update account balance
      const account = await Account.findById(accountId);
      if (account) {
        account.currentBalance += txType === 'Income' ? amount : -amount;
        await account.save();
      }

      lending.repayments[lending.repayments.length - 1].transactionId = transaction._id;
    }

    await lending.save();
    await lending.populate('account', 'name currency');
    res.json({ lending, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /:id/settle — fully settle the remaining amount
export const settleLending = async (req, res) => {
  try {
    const lending = await Lending.findOne({ _id: req.params.id, user: req.user._id });
    if (!lending) return res.status(404).json({ message: 'Entry not found' });
    if (lending.isSettled) return res.status(400).json({ message: 'Already settled' });

    const outstanding = lending.amount - lending.repayments.reduce((s, r) => s + r.amount, 0);
    const { accountId, date, note } = req.body;

    if (outstanding > 0) {
      lending.repayments.push({ amount: outstanding, date: date || new Date(), note: note || 'Full settlement' });
    }

    lending.isSettled = true;
    lending.settledAt = new Date();

    let transaction = null;
    if (accountId && outstanding > 0) {
      const txType = lending.type === 'lent' ? 'Income' : 'Expense';
      
      let cat = await Category.findOne({ user: req.user._id, name: 'Lending / Borrowing' });
      if (!cat) {
        cat = await Category.create({ user: req.user._id, name: 'Lending / Borrowing', type: txType, icon: 'Users', color: '#8b5cf6' });
      }

      transaction = new Transaction({
        user: req.user._id,
        type: txType,
        amount: outstanding,
        date: date || new Date(),
        account: accountId,
        category: cat._id,
        notes: note || `Settlement — ${lending.person}`,
        tags: ['lending', 'settlement'],
      });
      await transaction.save();

      const account = await Account.findById(accountId);
      if (account) {
        account.currentBalance += txType === 'Income' ? outstanding : -outstanding;
        await account.save();
      }
    }

    await lending.save();
    await lending.populate('account', 'name currency');
    res.json({ lending, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
