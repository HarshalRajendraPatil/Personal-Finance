import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { checkBudgetGuardrails } from '../services/budgetGuardrailService.js';
import { previewBankStatement, ingestBankStatement } from '../services/csvIngestionService.js';
import { scanReceiptWithAI } from '../services/ocrReceiptService.js';

/**
 * ⚡ Get transactions with lean performance & optional pagination
 */
export const getTransactions = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

    const query = { user: req.user._id };
    if (req.query.type && req.query.type !== 'All') query.type = req.query.type;
    if (req.query.account) query.account = req.query.account;
    if (req.query.category) query.category = req.query.category;
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        query.date.$lte = new Date(req.query.endDate);
        query.date.$lte.setHours(23, 59, 59, 999);
      }
    }

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .populate('account', 'name type currency')
          .populate('toAccount', 'name type currency')
          .populate('category', 'name icon color type')
          .populate('subcategory', 'name')
          .sort({ date: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments(query),
      ]);

      return res.json({
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    }

    // Default fast unpaginated fetch with .lean()
    const transactions = await Transaction.find(query)
      .populate('account', 'name type currency')
      .populate('toAccount', 'name type currency')
      .populate('category', 'name icon color type')
      .populate('subcategory', 'name')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ⚡ Atomic Transaction Creation with Mongo $inc
 */
export const createTransaction = async (req, res) => {
  try {
    const { type, amount, date, account, toAccount, category, subcategory, merchant, notes, tags, attachmentUrl } =
      req.body;

    const sourceAccount = await Account.findOne({ _id: account, user: req.user._id });
    if (!sourceAccount) return res.status(404).json({ message: 'Source account not found' });

    if (type !== 'Transfer' && !category) {
      return res.status(400).json({ message: 'Category is required for Income and Expense transactions' });
    }

    if (type === 'Transfer') {
      if (!toAccount) return res.status(400).json({ message: 'Destination account is required for transfer' });
      if (account === toAccount) return res.status(400).json({ message: 'Cannot transfer to the same account' });
      const destExists = await Account.exists({ _id: toAccount, user: req.user._id });
      if (!destExists) return res.status(404).json({ message: 'Destination account not found' });
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

    // Save transaction and perform atomic balance increments in parallel
    const accountUpdates = [];
    if (type === 'Income') {
      accountUpdates.push(Account.findByIdAndUpdate(account, { $inc: { currentBalance: amount } }));
    } else if (type === 'Expense') {
      accountUpdates.push(Account.findByIdAndUpdate(account, { $inc: { currentBalance: -amount } }));
    } else if (type === 'Transfer') {
      accountUpdates.push(Account.findByIdAndUpdate(account, { $inc: { currentBalance: -amount } }));
      accountUpdates.push(Account.findByIdAndUpdate(toAccount, { $inc: { currentBalance: amount } }));
    }

    await Promise.all([transaction.save(), ...accountUpdates]);

    // Populate for response
    await transaction.populate('account', 'name type currency');
    await transaction.populate('toAccount', 'name type currency');
    await transaction.populate('category', 'name icon color type');
    await transaction.populate('subcategory', 'name');

    // ⚡ Check Event-Driven Budget Guardrails & Threshold Alerts
    let budgetAlert = null;
    if (type === 'Expense' && category) {
      budgetAlert = await checkBudgetGuardrails(req.user._id, category, transaction.date);
    }

    const responseData = transaction.toObject();
    if (budgetAlert && budgetAlert.triggered) {
      responseData.budgetAlert = budgetAlert;
    }

    res.status(201).json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ⚡ Atomic Transaction Update with Mongo $inc
 */
export const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    const { type, amount, date, account, toAccount, category, subcategory, merchant, notes, tags, attachmentUrl } =
      req.body;

    const oldType = transaction.type;
    const oldAmount = transaction.amount;
    const oldAccount = transaction.account;
    const oldToAccount = transaction.toAccount;

    const newType = type || oldType;
    const newAmount = amount !== undefined ? amount : oldAmount;
    const newAccount = account || oldAccount;
    const newToAccount = newType === 'Transfer' ? (toAccount || oldToAccount) : null;

    // Build atomic reverse updates for old balance effect
    const balanceUpdates = [];
    if (oldType === 'Income') {
      balanceUpdates.push(Account.findByIdAndUpdate(oldAccount, { $inc: { currentBalance: -oldAmount } }));
    } else if (oldType === 'Expense') {
      balanceUpdates.push(Account.findByIdAndUpdate(oldAccount, { $inc: { currentBalance: oldAmount } }));
    } else if (oldType === 'Transfer') {
      balanceUpdates.push(Account.findByIdAndUpdate(oldAccount, { $inc: { currentBalance: oldAmount } }));
      if (oldToAccount) {
        balanceUpdates.push(Account.findByIdAndUpdate(oldToAccount, { $inc: { currentBalance: -oldAmount } }));
      }
    }

    // Apply new balance effect
    if (newType === 'Income') {
      balanceUpdates.push(Account.findByIdAndUpdate(newAccount, { $inc: { currentBalance: newAmount } }));
    } else if (newType === 'Expense') {
      balanceUpdates.push(Account.findByIdAndUpdate(newAccount, { $inc: { currentBalance: -newAmount } }));
    } else if (newType === 'Transfer') {
      balanceUpdates.push(Account.findByIdAndUpdate(newAccount, { $inc: { currentBalance: -newAmount } }));
      if (newToAccount) {
        balanceUpdates.push(Account.findByIdAndUpdate(newToAccount, { $inc: { currentBalance: newAmount } }));
      }
    }

    // Update fields
    transaction.type = newType;
    transaction.amount = newAmount;
    transaction.date = date || transaction.date;
    transaction.account = newAccount;
    transaction.toAccount = newToAccount;
    transaction.category = newType !== 'Transfer' ? (category || transaction.category) : null;
    transaction.subcategory =
      newType !== 'Transfer' ? (subcategory !== undefined ? subcategory : transaction.subcategory) : null;
    transaction.merchant = merchant !== undefined ? merchant : transaction.merchant;
    transaction.notes = notes !== undefined ? notes : transaction.notes;
    transaction.tags = tags || transaction.tags;
    transaction.attachmentUrl = attachmentUrl !== undefined ? attachmentUrl : transaction.attachmentUrl;

    await Promise.all([transaction.save(), ...balanceUpdates]);

    await transaction.populate('account', 'name type currency');
    await transaction.populate('toAccount', 'name type currency');
    await transaction.populate('category', 'name icon color type');
    await transaction.populate('subcategory', 'name');

    // ⚡ Check Event-Driven Budget Guardrails & Threshold Alerts
    let budgetAlert = null;
    if (transaction.type === 'Expense' && transaction.category) {
      budgetAlert = await checkBudgetGuardrails(
        req.user._id,
        transaction.category._id || transaction.category,
        transaction.date
      );
    }

    const responseData = transaction.toObject();
    if (budgetAlert && budgetAlert.triggered) {
      responseData.budgetAlert = budgetAlert;
    }

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ⚡ Atomic Transaction Deletion with Mongo $inc
 */
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    // Reverse balance effect atomically
    const balanceUpdates = [];
    if (transaction.type === 'Income') {
      balanceUpdates.push(Account.findByIdAndUpdate(transaction.account, { $inc: { currentBalance: -transaction.amount } }));
    } else if (transaction.type === 'Expense') {
      balanceUpdates.push(Account.findByIdAndUpdate(transaction.account, { $inc: { currentBalance: transaction.amount } }));
    } else if (transaction.type === 'Transfer') {
      balanceUpdates.push(Account.findByIdAndUpdate(transaction.account, { $inc: { currentBalance: transaction.amount } }));
      if (transaction.toAccount) {
        balanceUpdates.push(Account.findByIdAndUpdate(transaction.toAccount, { $inc: { currentBalance: -transaction.amount } }));
      }
    }

    await Promise.all([transaction.deleteOne(), ...balanceUpdates]);
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ⚡ Preview bank statement CSV: identifies columns, auto-categorizes, and checks deduplication
 */
export const previewCSVStatement = async (req, res) => {
  try {
    const { csvContent, accountId, customMapping } = req.body;
    if (!csvContent) return res.status(400).json({ message: 'CSV content is required.' });

    const preview = await previewBankStatement({
      userId: req.user._id,
      csvContent,
      accountId,
      customMapping,
    });

    res.json(preview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ⚡ Ingests verified bank statement transactions atomically
 */
export const importCSVStatement = async (req, res) => {
  try {
    const { accountId, transactions } = req.body;
    if (!accountId) return res.status(400).json({ message: 'Account ID is required.' });
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: 'Valid transactions array is required.' });
    }

    const result = await ingestBankStatement({
      userId: req.user._id,
      accountId,
      transactions,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ⚡ AI Receipt & Invoice OCR Scanning Endpoint
 */
export const scanReceipt = async (req, res) => {
  try {
    const { imageUrl, imageBase64, textContent } = req.body;
    if (!imageUrl && !imageBase64 && !textContent) {
      return res.status(400).json({ message: 'Image or text data is required for receipt scanning.' });
    }

    const result = await scanReceiptWithAI({
      imageUrl,
      imageBase64,
      textContent,
      userId: req.user._id,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
