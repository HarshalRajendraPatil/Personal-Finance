import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';

// @desc    Get all accounts for user
// @route   GET /api/accounts
// @access  Private
const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Create a new account
// @route   POST /api/accounts
// @access  Private
const createAccount = async (req, res) => {
  try {
    const {
      name,
      type,
      openingBalance,
      currency,
      notes,
      creditLimit,
      issuer,
      last4Digits,
      billingCycleDay,
      paymentDueDay,
    } = req.body;

    const account = new Account({
      user: req.user._id,
      name,
      type,
      openingBalance: parseFloat(openingBalance) || 0,
      currentBalance: parseFloat(openingBalance) || 0,
      currency: currency || 'INR',
      notes,
      creditLimit: creditLimit !== undefined && creditLimit !== '' ? parseFloat(creditLimit) : null,
      issuer: issuer || '',
      last4Digits: last4Digits || '',
      billingCycleDay: billingCycleDay ? parseInt(billingCycleDay, 10) : null,
      paymentDueDay: paymentDueDay ? parseInt(paymentDueDay, 10) : null,
    });

    const createdAccount = await account.save();
    res.status(201).json(createdAccount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an account
// @route   PUT /api/accounts/:id
// @access  Private
const updateAccount = async (req, res) => {
  try {
    const {
      name,
      type,
      currency,
      isArchived,
      notes,
      openingBalance,
      creditLimit,
      issuer,
      last4Digits,
      billingCycleDay,
      paymentDueDay,
    } = req.body;

    const account = await Account.findById(req.params.id);

    if (account) {
      if (account.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'User not authorized' });
      }

      account.name = name || account.name;
      account.type = type || account.type;
      account.currency = currency || account.currency;
      if (isArchived !== undefined) account.isArchived = isArchived;
      if (notes !== undefined) account.notes = notes;
      if (creditLimit !== undefined) {
        account.creditLimit = creditLimit !== '' && creditLimit !== null ? parseFloat(creditLimit) : null;
      }
      if (issuer !== undefined) account.issuer = issuer;
      if (last4Digits !== undefined) account.last4Digits = last4Digits;
      if (billingCycleDay !== undefined) {
        account.billingCycleDay = billingCycleDay ? parseInt(billingCycleDay, 10) : null;
      }
      if (paymentDueDay !== undefined) {
        account.paymentDueDay = paymentDueDay ? parseInt(paymentDueDay, 10) : null;
      }

      if (openingBalance !== undefined && parseFloat(openingBalance) !== account.openingBalance) {
        const netTransactions = account.currentBalance - account.openingBalance;
        account.openingBalance = parseFloat(openingBalance);
        account.currentBalance = parseFloat(openingBalance) + netTransactions;
      }

      const updatedAccount = await account.save();
      res.json(updatedAccount);
    } else {
      res.status(404).json({ message: 'Account not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an account
// @route   DELETE /api/accounts/:id
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (account) {
      if (account.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'User not authorized' });
      }

      await account.deleteOne();
      res.json({ message: 'Account removed' });
    } else {
      res.status(404).json({ message: 'Account not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Credit Card Statement & Cycle Details
// @route   GET /api/accounts/:id/statement
// @access  Private
const getCreditCardStatement = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (account.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    if (account.type !== 'Credit Card') {
      return res.status(400).json({ message: 'Account is not a credit card' });
    }

    const today = new Date();
    const cycleDay = account.billingCycleDay || 1;
    const dueDay = account.paymentDueDay || 20;

    // Calculate current cycle window
    let cycleStart, cycleEnd;
    if (today.getDate() >= cycleDay) {
      cycleStart = new Date(today.getFullYear(), today.getMonth(), cycleDay, 0, 0, 0);
      cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, cycleDay - 1, 23, 59, 59);
    } else {
      cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, cycleDay, 0, 0, 0);
      cycleEnd = new Date(today.getFullYear(), today.getMonth(), cycleDay - 1, 23, 59, 59);
    }

    // Calculate due date (typically in the following month or after cycle end)
    let dueDate = new Date(cycleEnd);
    dueDate.setDate(dueDay);
    if (dueDate <= cycleEnd) {
      dueDate = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth() + 1, dueDay);
    }

    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // Get transactions for the current cycle
    const transactions = await Transaction.find({
      user: req.user._id,
      $or: [{ account: account._id }, { toAccount: account._id }],
      date: { $gte: cycleStart, $lte: cycleEnd },
    })
      .populate('category')
      .populate('subcategory')
      .sort({ date: -1 });

    const totalCycleExpenses = transactions
      .filter((t) => t.type === 'Expense' && t.account.toString() === account._id.toString())
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCyclePayments = transactions
      .filter((t) => (t.type === 'Transfer' && t.toAccount?.toString() === account._id.toString()) || (t.type === 'Income' && t.account.toString() === account._id.toString()))
      .reduce((sum, t) => sum + t.amount, 0);

    const outstanding = Math.abs(Math.min(0, account.currentBalance));
    const statementBalance = Math.max(0, totalCycleExpenses - totalCyclePayments);
    const effectiveBalance = outstanding > 0 ? outstanding : statementBalance;
    const minimumDue = effectiveBalance > 0 ? Math.min(effectiveBalance, Math.max(500, Math.round(effectiveBalance * 0.05))) : 0;
    const creditLimit = account.creditLimit || 0;
    const availableCredit = creditLimit > 0 ? Math.max(0, creditLimit - outstanding) : 0;
    const utilization = creditLimit > 0 ? Math.round((outstanding / creditLimit) * 100) : 0;

    res.json({
      account,
      cycleStart,
      cycleEnd,
      dueDate,
      daysLeft,
      outstanding,
      creditLimit,
      availableCredit,
      utilization,
      statementBalance: effectiveBalance,
      minimumDue,
      totalCycleExpenses,
      totalCyclePayments,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pay Credit Card Bill via Transfer from a Bank Account
// @route   POST /api/accounts/:id/pay-bill
// @access  Private
const payCreditCardBill = async (req, res) => {
  try {
    const { fromAccountId, amount, date, notes } = req.body;

    if (!fromAccountId || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Please provide a valid source account and amount' });
    }

    const payAmount = parseFloat(amount);

    const creditCardAccount = await Account.findById(req.params.id);
    if (!creditCardAccount || creditCardAccount.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Credit card account not found' });
    }

    if (creditCardAccount.type !== 'Credit Card') {
      return res.status(400).json({ message: 'Target account is not a credit card' });
    }

    const fromAccount = await Account.findById(fromAccountId);
    if (!fromAccount || fromAccount.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Source bank account not found' });
    }

    if (fromAccount._id.toString() === creditCardAccount._id.toString()) {
      return res.status(400).json({ message: 'Cannot pay credit card from itself' });
    }

    // Create a Transfer transaction (no double counting of expenses!)
    const transaction = new Transaction({
      user: req.user._id,
      type: 'Transfer',
      amount: payAmount,
      date: date ? new Date(date) : new Date(),
      account: fromAccount._id,
      toAccount: creditCardAccount._id,
      merchant: `Bill Payment · ${creditCardAccount.name}`,
      notes: notes || 'Credit card bill settlement',
    });

    await transaction.save();

    // Adjust balances
    fromAccount.currentBalance -= payAmount;
    creditCardAccount.currentBalance += payAmount; // reduces credit card liability

    await fromAccount.save();
    await creditCardAccount.save();

    res.status(201).json({
      message: 'Credit card bill payment recorded successfully',
      transaction,
      fromAccount,
      creditCardAccount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getCreditCardStatement,
  payCreditCardBill,
};
