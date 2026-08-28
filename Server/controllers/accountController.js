import Account from '../models/Account.js';

// @desc    Get all accounts for user
// @route   GET /api/accounts
// @access  Private
const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id }).sort({ createdAt: -1 });
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
    const { name, type, openingBalance, currency, notes } = req.body;

    const account = new Account({
      user: req.user._id,
      name,
      type,
      openingBalance,
      currentBalance: openingBalance, // initially the same
      currency: currency || 'INR',
      notes,
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
    const { name, type, currency, isArchived, notes, openingBalance } = req.body;
    
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
      
      // If user wants to adjust opening balance directly (mostly for corrections)
      // currentBalance needs to be re-adjusted. 
      // CurrentBalance = NewOpeningBalance + (OldCurrentBalance - OldOpeningBalance)
      if (openingBalance !== undefined && openingBalance !== account.openingBalance) {
        const netTransactions = account.currentBalance - account.openingBalance;
        account.openingBalance = openingBalance;
        account.currentBalance = openingBalance + netTransactions;
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

      // Check if account has transactions. 
      // Since transactions aren't implemented yet, we will just delete it.
      // In a real scenario, you'd check: const hasTransactions = await Transaction.exists({ account: account._id })
      // If it has transactions, you might prefer to archive it. 
      
      await account.deleteOne();
      res.json({ message: 'Account removed' });
    } else {
      res.status(404).json({ message: 'Account not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getAccounts, createAccount, updateAccount, deleteAccount };
