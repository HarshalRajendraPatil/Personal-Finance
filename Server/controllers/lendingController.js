import Lending from '../models/Lending.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import memoryCache from '../utils/cache.js';

/**
 * ⚡ Helper: Get or create default category for lending / borrowing
 */
const getOrCreateLendingCategory = async (userId, txType) => {
  let cat = await Category.findOne({ user: userId, name: 'Lending / Borrowing', type: txType });
  if (!cat) {
    cat = await Category.create({
      user: userId,
      name: 'Lending / Borrowing',
      type: txType,
      icon: 'Users',
      color: txType === 'Income' ? '#10b981' : '#8b5cf6',
    });
  }
  return cat;
};

/**
 * ⚡ Helper: Resolve account, falling back to user's first active account or auto-creating Cash account
 */
const resolveAccount = async (userId, preferredAccountId) => {
  if (preferredAccountId) {
    const acc = await Account.findOne({ _id: preferredAccountId, user: userId });
    if (acc) return acc;
  }
  let defaultAcc = await Account.findOne({ user: userId, isArchived: false }).sort({ createdAt: 1 });
  if (!defaultAcc) {
    defaultAcc = await Account.create({
      user: userId,
      name: 'Cash',
      type: 'Cash',
      openingBalance: 0,
      currentBalance: 0,
      currency: 'INR',
    });
  }
  return defaultAcc;
};

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
    const { person, type, amount, currency, dueDate, notes, interestRate } = req.body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    if (!person || !person.trim()) {
      return res.status(400).json({ message: 'Person / Contact name is required' });
    }

    const account = await resolveAccount(req.user._id, req.body.account);

    // lent = I gave money out (Expense)
    // borrowed = I received money in (Income)
    const txType = type === 'lent' ? 'Expense' : 'Income';
    const cat = await getOrCreateLendingCategory(req.user._id, txType);

    const txNote = notes
      ? `${type === 'lent' ? 'Lent to' : 'Borrowed from'} ${person.trim()}: ${notes}`
      : `${type === 'lent' ? 'Lent to' : 'Borrowed from'} ${person.trim()}`;

    const lending = new Lending({
      user: req.user._id,
      person: person.trim(),
      type,
      amount: numAmount,
      currency: currency || account.currency || 'INR',
      dueDate: dueDate || null,
      notes: notes || '',
      account: account._id,
      interestRate: interestRate || 0,
    });

    const transaction = new Transaction({
      user: req.user._id,
      type: txType,
      amount: numAmount,
      date: req.body.date || new Date(),
      account: account._id,
      category: cat._id,
      notes: txNote,
      tags: ['lending', type],
      lending: lending._id,
    });

    await transaction.save();

    lending.transactionId = transaction._id;
    await lending.save();

    // Update account balance atomically
    const balanceChange = txType === 'Income' ? numAmount : -numAmount;
    await Account.findByIdAndUpdate(account._id, { $inc: { currentBalance: balanceChange } });

    await lending.populate('account', 'name currency');
    memoryCache.invalidateUser(req.user._id);

    res.status(201).json(lending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLending = async (req, res) => {
  try {
    const lending = await Lending.findOne({ _id: req.params.id, user: req.user._id });
    if (!lending) return res.status(404).json({ message: 'Entry not found' });

    const totalRepaid = lending.repayments.reduce((sum, r) => sum + r.amount, 0);

    // Guard: cannot set a new amount lower than what's already been repaid
    if (req.body.amount !== undefined) {
      const newAmount = parseFloat(req.body.amount);
      if (isNaN(newAmount) || newAmount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
      }
      if (newAmount < totalRepaid) {
        return res.status(400).json({
          message: `Cannot set the principal to ₹${newAmount} — ₹${totalRepaid.toFixed(2)} has already been repaid.`
        });
      }
    }

    const oldAmount = lending.amount;
    const oldType = lending.type;
    const oldAccountId = lending.account;

    const newAmount = req.body.amount !== undefined ? parseFloat(req.body.amount) : oldAmount;
    const newType = req.body.type || oldType;
    let newAccountId = req.body.account !== undefined ? req.body.account : oldAccountId;

    const targetAccount = await resolveAccount(req.user._id, newAccountId);
    newAccountId = targetAccount._id;

    const newTxType = newType === 'lent' ? 'Expense' : 'Income';
    const cat = await getOrCreateLendingCategory(req.user._id, newTxType);

    const newPerson = req.body.person ? req.body.person.trim() : lending.person;
    const newNotes = req.body.notes !== undefined ? req.body.notes : lending.notes;
    const txNote = newNotes
      ? `${newType === 'lent' ? 'Lent to' : 'Borrowed from'} ${newPerson}: ${newNotes}`
      : `${newType === 'lent' ? 'Lent to' : 'Borrowed from'} ${newPerson}`;

    // Find linked transaction if exists
    let transaction = null;
    if (lending.transactionId) {
      transaction = await Transaction.findOne({ _id: lending.transactionId, user: req.user._id });
    }

    if (transaction) {
      // Revert old transaction effect on old account
      const oldAccountTarget = transaction.account || oldAccountId;
      if (oldAccountTarget) {
        const revertInc = transaction.type === 'Income' ? -transaction.amount : transaction.amount;
        await Account.findByIdAndUpdate(oldAccountTarget, { $inc: { currentBalance: revertInc } });
      }

      // Apply new transaction effect on new account
      const applyInc = newTxType === 'Income' ? newAmount : -newAmount;
      await Account.findByIdAndUpdate(newAccountId, { $inc: { currentBalance: applyInc } });

      // Update transaction fields
      transaction.amount = newAmount;
      transaction.type = newTxType;
      transaction.account = newAccountId;
      transaction.category = cat._id;
      transaction.notes = txNote;
      transaction.tags = ['lending', newType];
      transaction.lending = lending._id;
      if (req.body.date) transaction.date = req.body.date;
      await transaction.save();
    } else {
      // Transaction didn't exist previously (e.g. legacy entry), create it now!
      transaction = new Transaction({
        user: req.user._id,
        type: newTxType,
        amount: newAmount,
        date: req.body.date || lending.createdAt || new Date(),
        account: newAccountId,
        category: cat._id,
        notes: txNote,
        tags: ['lending', newType],
        lending: lending._id,
      });
      await transaction.save();
      lending.transactionId = transaction._id;

      const applyInc = newTxType === 'Income' ? newAmount : -newAmount;
      await Account.findByIdAndUpdate(newAccountId, { $inc: { currentBalance: applyInc } });
    }

    // Check if settlement status should change based on new amount vs repayments
    if (newAmount <= totalRepaid && totalRepaid > 0) {
      lending.isSettled = true;
      if (!lending.settledAt) lending.settledAt = new Date();
    } else if (newAmount > totalRepaid && lending.isSettled) {
      lending.isSettled = false;
      lending.settledAt = null;
    }

    Object.assign(lending, req.body);
    lending.amount = newAmount;
    lending.type = newType;
    lending.account = newAccountId;
    if (req.body.person) lending.person = req.body.person.trim();
    if (req.body.dueDate !== undefined) lending.dueDate = req.body.dueDate || null;

    await lending.save();
    await lending.populate('account', 'name currency');
    memoryCache.invalidateUser(req.user._id);

    res.json(lending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLending = async (req, res) => {
  try {
    const lending = await Lending.findOne({ _id: req.params.id, user: req.user._id });
    if (!lending) return res.status(404).json({ message: 'Entry not found' });

    // Collect all related transaction IDs: principal transaction + all repayments
    const txIds = [];
    if (lending.transactionId) txIds.push(lending.transactionId);
    if (lending.repayments && lending.repayments.length > 0) {
      for (const r of lending.repayments) {
        if (r.transactionId) txIds.push(r.transactionId);
      }
    }

    // Reverse balance effect of all related transactions on their accounts
    if (txIds.length > 0) {
      const transactions = await Transaction.find({ _id: { $in: txIds }, user: req.user._id });
      const balanceUpdates = [];
      for (const tx of transactions) {
        if (tx.type === 'Income') {
          balanceUpdates.push(
            Account.findByIdAndUpdate(tx.account, { $inc: { currentBalance: -tx.amount } })
          );
        } else if (tx.type === 'Expense') {
          balanceUpdates.push(
            Account.findByIdAndUpdate(tx.account, { $inc: { currentBalance: tx.amount } })
          );
        } else if (tx.type === 'Transfer') {
          balanceUpdates.push(
            Account.findByIdAndUpdate(tx.account, { $inc: { currentBalance: tx.amount } })
          );
          if (tx.toAccount) {
            balanceUpdates.push(
              Account.findByIdAndUpdate(tx.toAccount, { $inc: { currentBalance: -tx.amount } })
            );
          }
        }
      }

      await Promise.all([
        Transaction.deleteMany({ _id: { $in: txIds }, user: req.user._id }),
        ...balanceUpdates,
      ]);
    }

    await lending.deleteOne();
    memoryCache.invalidateUser(req.user._id);

    res.json({ message: 'Lending entry and associated transactions removed' });
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

    const { amount, date, note } = req.body;
    let { accountId, bookTransaction } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid repayment amount is required' });
    }

    // Guard: cannot pay more than what is outstanding
    const currentRepaid = lending.repayments.reduce((sum, r) => sum + r.amount, 0);
    const outstanding = lending.amount - currentRepaid;
    if (numAmount > outstanding + 0.001) { // small epsilon for float precision
      return res.status(400).json({
        message: `Repayment amount (₹${numAmount}) exceeds outstanding balance (₹${outstanding.toFixed(2)})`
      });
    }

    if (bookTransaction === undefined) {
      bookTransaction = true;
    }

    let transaction = null;
    if (bookTransaction) {
      const targetAccount = await resolveAccount(req.user._id, accountId || lending.account);
      accountId = targetAccount._id;

      // Repayment means money coming IN (if lent) or going OUT (if borrowed)
      const txType = lending.type === 'lent' ? 'Income' : 'Expense';
      const cat = await getOrCreateLendingCategory(req.user._id, txType);

      transaction = new Transaction({
        user: req.user._id,
        type: txType,
        amount: numAmount,
        date: date || new Date(),
        account: accountId,
        category: cat._id,
        notes: note || `Repayment — ${lending.person}`,
        tags: ['lending', 'repayment'],
        lending: lending._id,
      });
      await transaction.save();

      // Update account balance
      const balanceChange = txType === 'Income' ? numAmount : -numAmount;
      await Account.findByIdAndUpdate(accountId, { $inc: { currentBalance: balanceChange } });
    }

    lending.repayments.push({
      amount: numAmount,
      date: date || new Date(),
      note: note || '',
      transactionId: transaction ? transaction._id : null,
    });

    // Check if now fully settled
    const totalRepaid = lending.repayments.reduce((sum, r) => sum + r.amount, 0);
    if (totalRepaid >= lending.amount - 0.001) {
      lending.isSettled = true;
      lending.settledAt = new Date();
    }

    await lending.save();
    await lending.populate('account', 'name currency');
    memoryCache.invalidateUser(req.user._id);

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

    const outstanding = Math.max(0, lending.amount - lending.repayments.reduce((s, r) => s + r.amount, 0));
    const { date, note } = req.body;
    let { accountId } = req.body;

    let transaction = null;
    if (outstanding > 0) {
      const targetAccount = await resolveAccount(req.user._id, accountId || lending.account);
      accountId = targetAccount._id;

      const txType = lending.type === 'lent' ? 'Income' : 'Expense';
      const cat = await getOrCreateLendingCategory(req.user._id, txType);

      transaction = new Transaction({
        user: req.user._id,
        type: txType,
        amount: outstanding,
        date: date || new Date(),
        account: accountId,
        category: cat._id,
        notes: note || `Settlement — ${lending.person}`,
        tags: ['lending', 'settlement'],
        lending: lending._id,
      });
      await transaction.save();

      const balanceChange = txType === 'Income' ? outstanding : -outstanding;
      await Account.findByIdAndUpdate(accountId, { $inc: { currentBalance: balanceChange } });

      lending.repayments.push({
        amount: outstanding,
        date: date || new Date(),
        note: note || 'Full settlement',
        transactionId: transaction._id,
      });
    }

    lending.isSettled = true;
    lending.settledAt = new Date();

    await lending.save();
    await lending.populate('account', 'name currency');
    memoryCache.invalidateUser(req.user._id);

    res.json({ lending, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
