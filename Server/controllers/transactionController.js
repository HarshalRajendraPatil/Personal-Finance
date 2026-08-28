import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

export const getTransactions = async (req, res) => {
  try {
    // Basic filtering based on query params could go here
    const transactions = await Transaction.find({ user: req.user._id })
      .populate('account', 'name type currency')
      .populate('toAccount', 'name type currency')
      .populate('category', 'name icon color type')
      .populate('subcategory', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createTransaction = async (req, res) => {
  // Ideally, use a Mongoose session/transaction here. For now, doing it sequentially.
  try {
    const { type, amount, date, account, toAccount, category, subcategory, merchant, notes, tags, attachmentUrl } = req.body;

    const sourceAccount = await Account.findOne({ _id: account, user: req.user._id });
    if (!sourceAccount) return res.status(404).json({ message: 'Source account not found' });

    // Enforce category for user-created Income/Expense transactions
    if (type !== 'Transfer' && !category) {
      return res.status(400).json({ message: 'Category is required for Income and Expense transactions' });
    }

    let destinationAccount = null;
    if (type === 'Transfer') {
      if (!toAccount) return res.status(400).json({ message: 'Destination account is required for transfer' });
      if (account === toAccount) return res.status(400).json({ message: 'Cannot transfer to the same account' });
      destinationAccount = await Account.findOne({ _id: toAccount, user: req.user._id });
      if (!destinationAccount) return res.status(404).json({ message: 'Destination account not found' });
    }

    const transaction = new Transaction({
      user: req.user._id,
      type,
      amount,
      date: date || Date.now(),
      account,
      toAccount: type === 'Transfer' ? toAccount : null,
      category: type !== 'Transfer' ? category : null,
      subcategory: type !== 'Transfer' ? subcategory : null,
      merchant,
      notes,
      tags,
      attachmentUrl,
    });

    await transaction.save();

    // Update Account Balances
    if (type === 'Income') {
      sourceAccount.currentBalance += amount;
      await sourceAccount.save();
    } else if (type === 'Expense') {
      sourceAccount.currentBalance -= amount;
      await sourceAccount.save();
    } else if (type === 'Transfer') {
      sourceAccount.currentBalance -= amount;
      destinationAccount.currentBalance += amount;
      await sourceAccount.save();
      await destinationAccount.save();
    }

    // Populate for response
    await transaction.populate('account', 'name type currency');
    await transaction.populate('toAccount', 'name type currency');
    await transaction.populate('category', 'name icon color type');
    await transaction.populate('subcategory', 'name');

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    const { type, amount, date, account, toAccount, category, subcategory, merchant, notes, tags, attachmentUrl } = req.body;

    // Reverse old transaction effect on balances
    const oldSource = await Account.findById(transaction.account);
    if (oldSource) {
      if (transaction.type === 'Income') oldSource.currentBalance -= transaction.amount;
      else if (transaction.type === 'Expense') oldSource.currentBalance += transaction.amount;
      else if (transaction.type === 'Transfer') {
        oldSource.currentBalance += transaction.amount;
        const oldDest = await Account.findById(transaction.toAccount);
        if (oldDest) {
          oldDest.currentBalance -= transaction.amount;
          await oldDest.save();
        }
      }
      await oldSource.save();
    }

    // Update transaction fields
    transaction.type = type || transaction.type;
    transaction.amount = amount || transaction.amount;
    transaction.date = date || transaction.date;
    transaction.account = account || transaction.account;
    transaction.toAccount = transaction.type === 'Transfer' ? (toAccount || transaction.toAccount) : null;
    transaction.category = transaction.type !== 'Transfer' ? (category || transaction.category) : null;
    transaction.subcategory = transaction.type !== 'Transfer' ? (subcategory !== undefined ? subcategory : transaction.subcategory) : null;
    transaction.merchant = merchant !== undefined ? merchant : transaction.merchant;
    transaction.notes = notes !== undefined ? notes : transaction.notes;
    transaction.tags = tags || transaction.tags;
    transaction.attachmentUrl = attachmentUrl !== undefined ? attachmentUrl : transaction.attachmentUrl;

    await transaction.save();

    // Apply new transaction effect on balances
    const newSource = await Account.findById(transaction.account);
    if (newSource) {
      if (transaction.type === 'Income') newSource.currentBalance += transaction.amount;
      else if (transaction.type === 'Expense') newSource.currentBalance -= transaction.amount;
      else if (transaction.type === 'Transfer') {
        newSource.currentBalance -= transaction.amount;
        const newDest = await Account.findById(transaction.toAccount);
        if (newDest) {
          newDest.currentBalance += transaction.amount;
          await newDest.save();
        }
      }
      await newSource.save();
    }

    await transaction.populate('account', 'name type currency');
    await transaction.populate('toAccount', 'name type currency');
    await transaction.populate('category', 'name icon color type');
    await transaction.populate('subcategory', 'name');

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    // Reverse effect on balances
    const sourceAccount = await Account.findById(transaction.account);
    if (sourceAccount) {
      if (transaction.type === 'Income') sourceAccount.currentBalance -= transaction.amount;
      else if (transaction.type === 'Expense') sourceAccount.currentBalance += transaction.amount;
      else if (transaction.type === 'Transfer') {
        sourceAccount.currentBalance += transaction.amount;
        const destAccount = await Account.findById(transaction.toAccount);
        if (destAccount) {
          destAccount.currentBalance -= transaction.amount;
          await destAccount.save();
        }
      }
      await sourceAccount.save();
    }

    await transaction.deleteOne();
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
