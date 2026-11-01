import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import Lending from '../models/Lending.js';
import Loan from '../models/Loan.js';
import RecurringRule from '../models/RecurringRule.js';
import memoryCache from '../utils/cache.js';

// ⚡ Helper: Parse numbers safely (handles commas, strings, nulls)
const cleanNumber = (val, defaultVal = 0) => {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? defaultVal : num;
};

// ⚡ Helper: Resolve account by ID, name regex, or type fallback
const resolveAccount = async (userId, identifier, preferType = 'Bank') => {
  if (identifier) {
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      try {
        const acc = await Account.findOne({ _id: identifier, user: userId });
        if (acc) return acc;
      } catch (e) {}
    }
    const accByName = await Account.findOne({
      user: userId,
      name: { $regex: new RegExp(`^${String(identifier).trim()}$`, 'i') },
      isArchived: false,
    });
    if (accByName) return accByName;

    // Partial search
    const accByPartial = await Account.findOne({
      user: userId,
      name: { $regex: new RegExp(String(identifier).trim(), 'i') },
      isArchived: false,
    });
    if (accByPartial) return accByPartial;
  }

  // Fallback 1: Preferred type with highest positive balance
  let fallback = await Account.findOne({
    user: userId,
    type: preferType,
    isArchived: false,
  }).sort({ currentBalance: -1 });

  // Fallback 2: Any non-credit card account with highest balance
  if (!fallback) {
    fallback = await Account.findOne({
      user: userId,
      type: { $ne: 'Credit Card' },
      isArchived: false,
    }).sort({ currentBalance: -1 });
  }

  // Fallback 3: Any active account
  if (!fallback) {
    fallback = await Account.findOne({ user: userId, isArchived: false });
  }

  // Fallback 4: Auto-create Cash account if none exist
  if (!fallback) {
    fallback = await Account.create({
      user: userId,
      name: 'Cash Wallet',
      type: 'Cash',
      openingBalance: 0,
      currentBalance: 0,
      currency: 'INR',
    });
  }

  return fallback;
};

// ⚡ Helper: Resolve category by ID or name
const resolveCategory = async (userId, identifier, type = 'Expense') => {
  if (identifier) {
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      try {
        const cat = await Category.findOne({ _id: identifier, user: userId });
        if (cat) return cat;
      } catch (e) {}
    }
    const catByName = await Category.findOne({
      user: userId,
      name: { $regex: new RegExp(`^${String(identifier).trim()}$`, 'i') },
    });
    if (catByName) return catByName;

    // Partial match
    const catByPartial = await Category.findOne({
      user: userId,
      name: { $regex: new RegExp(String(identifier).trim(), 'i') },
    });
    if (catByPartial) return catByPartial;
  }

  // Find or create category
  const defaultName = type === 'Income' ? 'Other Income' : 'General & Discretionary';
  let cat = await Category.findOne({
    user: userId,
    name: { $regex: new RegExp(`^${defaultName}$`, 'i') },
  });

  if (!cat) {
    cat = await Category.create({
      user: userId,
      name: identifier && typeof identifier === 'string' ? identifier.trim() : defaultName,
      type,
      color: type === 'Income' ? '#10b981' : '#6366f1',
      icon: 'Tag',
    });
  }

  return cat;
};

/**
 * 🌟 Metadata manifest of all available 1-Click Action Proposals across the platform
 */
export const getAvailableActions = () => [
  {
    type: 'CREATE_GOAL',
    label: 'Create Savings Goal',
    description: 'Create a new savings goal with target amount, timeline, and optional initial funding',
    fields: ['name', 'targetAmount', 'deadline', 'initialDeposit', 'accountName'],
  },
  {
    type: 'CONTRIBUTE_TO_GOAL',
    label: 'Contribute to Goal',
    description: 'Allocate surplus or savings to an active goal and debit funding account',
    fields: ['goalName', 'amount', 'accountName', 'note'],
  },
  {
    type: 'UPDATE_GOAL',
    label: 'Update Goal Target',
    description: 'Modify target amount or target date for an existing goal',
    fields: ['goalName', 'newTargetAmount', 'deadline'],
  },
  {
    type: 'CREATE_BUDGET',
    label: 'Set Up Category Budget',
    description: 'Establish a new monthly spending limit for a category',
    fields: ['categoryName', 'limit', 'period', 'alertThreshold'],
  },
  {
    type: 'UPDATE_BUDGET_LIMIT',
    label: 'Adjust Budget Limit',
    description: 'Update spending ceiling for an existing category budget',
    fields: ['categoryName', 'newLimit'],
  },
  {
    type: 'LOG_TRANSACTION',
    label: 'Log Transaction',
    description: 'Record an income or expense transaction with automatic balance update',
    fields: ['type', 'amount', 'categoryName', 'merchant', 'accountName', 'notes'],
  },
  {
    type: 'TRANSFER_MONEY',
    label: 'Transfer Funds',
    description: 'Move money between two user accounts with atomic ledger balance sync',
    fields: ['fromAccount', 'toAccount', 'amount', 'notes'],
  },
  {
    type: 'CREATE_INVESTMENT',
    label: 'Add Investment Holding',
    description: 'Record a new mutual fund, stock, ETF, or fixed deposit investment position',
    fields: ['name', 'type', 'platform', 'investedAmount', 'currentValue', 'isSip', 'sipAmount'],
  },
  {
    type: 'LOG_INVESTMENT_TOPUP',
    label: 'Deploy Investment Capital',
    description: 'Deploy idle cash into an existing investment holding',
    fields: ['investmentName', 'amount', 'accountName'],
  },
  {
    type: 'UPDATE_INVESTMENT_SIP',
    label: 'Set Up / Adjust SIP',
    description: 'Configure or increase systematic investment plan (SIP)',
    fields: ['investmentName', 'sipAmount', 'sipFrequency', 'sipDay'],
  },
  {
    type: 'CREATE_RECURRING_RULE',
    label: 'Add Recurring Bill / Subscription',
    description: 'Schedule a recurring expense or bill with auto-posting',
    fields: ['name', 'amount', 'type', 'frequency', 'categoryName', 'accountName'],
  },
  {
    type: 'CANCEL_SUBSCRIPTION',
    label: 'Cancel / Pause Subscription',
    description: 'Deactivate an unwanted recurring rule or zombie subscription',
    fields: ['subscriptionName', 'ruleId'],
  },
  {
    type: 'ACKNOWLEDGE_PRICE_HIKE',
    label: 'Acknowledge Subscription Hike',
    description: 'Update subscription record to accept a price increase',
    fields: ['subscriptionName', 'newAmount'],
  },
  {
    type: 'CREATE_LOAN',
    label: 'Record Loan / Debt',
    description: 'Add a new amortizing loan with automated EMI calculation',
    fields: ['name', 'lender', 'principal', 'interestRate', 'tenureMonths', 'emiAmount'],
  },
  {
    type: 'PREPAY_LOAN_PRINCIPAL',
    label: 'Prepay Loan Principal',
    description: 'Make an extra principal reduction payment on an active loan',
    fields: ['loanName', 'amount', 'accountName'],
  },
  {
    type: 'RECORD_LOAN_EMI_PAYMENT',
    label: 'Record EMI Payment',
    description: 'Log an EMI installment against an active loan',
    fields: ['loanName', 'amount', 'accountName', 'note'],
  },
  {
    type: 'CREATE_LENDING',
    label: 'Record Lending / Borrowing',
    description: 'Log money lent or borrowed with linked transaction and balance update',
    fields: ['person', 'type', 'amount', 'dueDate', 'accountName'],
  },
  {
    type: 'RECORD_LENDING_REPAYMENT',
    label: 'Record Repayment',
    description: 'Log a partial or full repayment for money lent/borrowed',
    fields: ['person', 'amount', 'accountName'],
  },
  {
    type: 'SETTLE_LENDING',
    label: 'Settle Debt / Lending',
    description: 'Fully settle an outstanding lending record with final transaction',
    fields: ['person', 'accountName'],
  },
  {
    type: 'CREATE_ACCOUNT',
    label: 'Create Account',
    description: 'Add a new bank account, credit card, cash wallet, or FD',
    fields: ['name', 'type', 'openingBalance', 'creditLimit'],
  },
  {
    type: 'EXECUTE_AUTO_REBALANCE',
    label: 'Overdraft Auto-Rebalance',
    description: 'Transfer funds from high-balance account to avert low-balance fees',
    fields: ['fromAccount', 'toAccount', 'amount', 'reason'],
  },
  {
    type: 'BUFFER_RESERVE',
    label: 'Allocate Emergency Buffer',
    description: 'Cordon off liquid cash into dedicated emergency reserves',
    fields: ['amount', 'fromAccount', 'goalName', 'reason'],
  },
  {
    type: 'GENERATE_WHATSAPP_REMINDER',
    label: 'WhatsApp Debt Reminder',
    description: 'Generate polite pre-filled WhatsApp reminder link',
    fields: ['personName', 'amount', 'dueDate'],
  },
];

/**
 * ⚡ Ultra-resilient executor for AI-generated proactive action proposals.
 */
export const executeCopilotAction = async ({ userId, actionType, payload }) => {
  if (!userId) throw new Error('User ID is required.');
  if (!actionType) throw new Error('Action Type is required.');
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be a valid object.');
  }

  const rawType = String(actionType).trim().toUpperCase();

  // Normalize aliases to canonical action types
  let canonicalType = rawType;
  if (['CREATE_GOAL', 'ADD_GOAL', 'SET_UP_GOAL', 'CREATE_SINKING_FUND', 'NEW_GOAL'].includes(rawType)) {
    canonicalType = 'CREATE_GOAL';
  } else if (['CONTRIBUTE_TO_GOAL', 'TOPUP_GOAL', 'ADD_TO_GOAL', 'FUND_GOAL', 'CONTRIBUTE_GOAL'].includes(rawType)) {
    canonicalType = 'CONTRIBUTE_TO_GOAL';
  } else if (['UPDATE_GOAL', 'EDIT_GOAL', 'ADJUST_GOAL'].includes(rawType)) {
    canonicalType = 'UPDATE_GOAL';
  } else if (['CREATE_BUDGET', 'ADD_BUDGET', 'SET_BUDGET', 'BUDGET_GUARD', 'NEW_BUDGET'].includes(rawType)) {
    canonicalType = 'CREATE_BUDGET';
  } else if (['UPDATE_BUDGET_LIMIT', 'ADJUST_BUDGET', 'INCREASE_BUDGET', 'CHANGE_BUDGET', 'EDIT_BUDGET'].includes(rawType)) {
    canonicalType = 'UPDATE_BUDGET_LIMIT';
  } else if (['LOG_TRANSACTION', 'CREATE_TRANSACTION', 'ADD_TRANSACTION', 'RECORD_EXPENSE', 'RECORD_INCOME', 'LOG_EXPENSE'].includes(rawType)) {
    canonicalType = 'LOG_TRANSACTION';
  } else if (['TRANSFER_MONEY', 'TRANSFER_FUNDS', 'TRANSFER_CASH', 'MOVE_MONEY', 'LOG_TRANSFER'].includes(rawType)) {
    canonicalType = 'TRANSFER_MONEY';
  } else if (['CREATE_INVESTMENT', 'ADD_INVESTMENT', 'NEW_INVESTMENT', 'RECORD_INVESTMENT'].includes(rawType)) {
    canonicalType = 'CREATE_INVESTMENT';
  } else if (['LOG_INVESTMENT_TOPUP', 'TOPUP_INVESTMENT', 'DEPLOY_CASH', 'INVEST_FUNDS', 'ADD_INVESTMENT_FUNDS'].includes(rawType)) {
    canonicalType = 'LOG_INVESTMENT_TOPUP';
  } else if (['UPDATE_INVESTMENT_SIP', 'ADJUST_SIP', 'UPDATE_SIP', 'START_SIP', 'SET_UP_SIP', 'INCREASE_SIP'].includes(rawType)) {
    canonicalType = 'UPDATE_INVESTMENT_SIP';
  } else if (['CREATE_RECURRING_RULE', 'ADD_RECURRING_RULE', 'ADD_SUBSCRIPTION', 'CREATE_SUBSCRIPTION', 'ADD_BILL', 'SET_UP_BILL'].includes(rawType)) {
    canonicalType = 'CREATE_RECURRING_RULE';
  } else if (['CANCEL_SUBSCRIPTION', 'PAUSE_SUBSCRIPTION', 'STOP_SUBSCRIPTION', 'DEACTIVATE_RECURRING'].includes(rawType)) {
    canonicalType = 'CANCEL_SUBSCRIPTION';
  } else if (['ACKNOWLEDGE_PRICE_HIKE', 'ACCEPT_PRICE_HIKE', 'UPDATE_SUBSCRIPTION_AMOUNT'].includes(rawType)) {
    canonicalType = 'ACKNOWLEDGE_PRICE_HIKE';
  } else if (['CREATE_LOAN', 'ADD_LOAN', 'NEW_LOAN', 'RECORD_LOAN'].includes(rawType)) {
    canonicalType = 'CREATE_LOAN';
  } else if (['PREPAY_LOAN_PRINCIPAL', 'PREPAY_LOAN', 'PAY_OFF_PRINCIPAL'].includes(rawType)) {
    canonicalType = 'PREPAY_LOAN_PRINCIPAL';
  } else if (['RECORD_LOAN_EMI_PAYMENT', 'LOG_LOAN_PAYMENT', 'PAY_EMI', 'RECORD_EMI'].includes(rawType)) {
    canonicalType = 'RECORD_LOAN_EMI_PAYMENT';
  } else if (['CREATE_LENDING', 'RECORD_LENDING', 'LEND_MONEY', 'BORROW_MONEY', 'ADD_LENDING'].includes(rawType)) {
    canonicalType = 'CREATE_LENDING';
  } else if (['RECORD_LENDING_REPAYMENT', 'LOG_LENDING_REPAYMENT', 'RECEIVE_REPAYMENT', 'PAY_BORROWED_BACK'].includes(rawType)) {
    canonicalType = 'RECORD_LENDING_REPAYMENT';
  } else if (['SETTLE_LENDING', 'SETTLE_DEBT', 'CLOSE_LENDING', 'MARK_LENDING_SETTLED'].includes(rawType)) {
    canonicalType = 'SETTLE_LENDING';
  } else if (['CREATE_ACCOUNT', 'ADD_ACCOUNT', 'NEW_ACCOUNT', 'SET_UP_ACCOUNT'].includes(rawType)) {
    canonicalType = 'CREATE_ACCOUNT';
  } else if (['EXECUTE_AUTO_REBALANCE', 'AUTO_REBALANCE', 'REBALANCE_ACCOUNTS'].includes(rawType)) {
    canonicalType = 'EXECUTE_AUTO_REBALANCE';
  } else if (['BUFFER_RESERVE', 'ALLOCATE_EMERGENCY_BUFFER', 'STAGGER_PURCHASE', 'RESERVE_CASH'].includes(rawType)) {
    canonicalType = 'BUFFER_RESERVE';
  } else if (['GENERATE_WHATSAPP_REMINDER', 'WHATSAPP_REMINDER'].includes(rawType)) {
    canonicalType = 'GENERATE_WHATSAPP_REMINDER';
  }

  let resultData = null;
  let successMessage = '';

  switch (canonicalType) {
    // ══════════════════════════════════════════════════════════════════════════
    // 1. CREATE GOAL
    // ══════════════════════════════════════════════════════════════════════════
    case 'CREATE_GOAL': {
      const name = (payload.name || payload.title || payload.goalName || 'New Financial Goal').trim();
      const targetAmount = cleanNumber(payload.targetAmount || payload.amount, 100000);
      const initialDeposit = cleanNumber(payload.initialDeposit || payload.currentAmount || 0, 0);

      if (targetAmount <= 0) {
        throw new Error('Valid target amount greater than zero is required.');
      }

      let deadline = null;
      if (payload.deadline || payload.targetDate) {
        const d = new Date(payload.deadline || payload.targetDate);
        if (!isNaN(d.getTime())) deadline = d;
      }

      // Check if goal already exists with this name
      let goal = await Goal.findOne({
        user: userId,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
      });

      if (!goal) {
        goal = new Goal({
          user: userId,
          name,
          targetAmount,
          currentAmount: 0,
          deadline,
          icon: payload.icon || 'Target',
          color: payload.color || '#10b981',
          notes: payload.notes || 'Created via Capise AI Copilot 1-Click Action',
          contributions: [],
        });
      } else {
        goal.targetAmount = targetAmount;
        if (deadline) goal.deadline = deadline;
      }

      // Handle optional initial deposit
      if (initialDeposit > 0) {
        const account = await resolveAccount(userId, payload.accountName || payload.account, 'Bank');
        if (account) {
          account.currentBalance -= initialDeposit;
          await account.save();

          const txn = await Transaction.create({
            user: userId,
            type: 'Transfer',
            amount: initialDeposit,
            date: new Date(),
            account: account._id,
            merchant: `Goal Deposit: ${goal.name}`,
            notes: `Initial seed deposit for goal "${goal.name}" via Capise AI Copilot`,
            tags: ['goal', 'deposit'],
          });

          goal.contributions.push({
            amount: initialDeposit,
            date: new Date(),
            note: 'Initial seed deposit',
            transactionId: txn._id,
          });
          goal.currentAmount = (goal.currentAmount || 0) + initialDeposit;
        }
      }

      if (goal.currentAmount >= goal.targetAmount) {
        goal.isCompleted = true;
        goal.completedAt = new Date();
      }

      await goal.save();
      resultData = goal;
      successMessage = `Successfully created goal "${goal.name}" with a target of ₹${targetAmount.toLocaleString('en-IN')}${initialDeposit > 0 ? ` and initial deposit of ₹${initialDeposit.toLocaleString('en-IN')}` : ''}!`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. CONTRIBUTE TO GOAL
    // ══════════════════════════════════════════════════════════════════════════
    case 'CONTRIBUTE_TO_GOAL': {
      const goalIdentifier = payload.goalId || payload.id;
      const goalName = payload.goalName || payload.name || payload.title;
      const numAmount = cleanNumber(payload.amount);
      if (numAmount <= 0) {
        throw new Error('Valid contribution amount is required.');
      }

      let goal;
      if (goalIdentifier && mongoose.Types.ObjectId.isValid(goalIdentifier)) {
        try { goal = await Goal.findOne({ _id: goalIdentifier, user: userId }); } catch (e) {}
      }
      if (!goal && goalName) {
        goal = await Goal.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${goalName.trim()}$`, 'i') },
        });
        if (!goal) {
          goal = await Goal.findOne({
            user: userId,
            name: { $regex: new RegExp(goalName.trim(), 'i') },
          });
        }
      }
      if (!goal) {
        goal = await Goal.findOne({ user: userId, isCompleted: false }).sort({ currentAmount: -1 });
      }
      if (!goal) {
        // Auto-create Emergency Fund goal if user has none
        goal = await Goal.create({
          user: userId,
          name: goalName || 'Emergency Fund',
          targetAmount: Math.max(100000, numAmount * 5),
          currentAmount: 0,
          color: '#10b981',
          icon: 'Shield',
          notes: 'Auto-created via Capise AI Copilot',
        });
      }

      const account = await resolveAccount(userId, payload.accountName || payload.account, 'Bank');
      if (account) {
        account.currentBalance -= numAmount;
        await account.save();
      }

      const txn = await Transaction.create({
        user: userId,
        type: 'Transfer',
        amount: numAmount,
        date: new Date(),
        account: account._id,
        merchant: `Goal Savings: ${goal.name}`,
        notes: payload.note || `Contribution to "${goal.name}" via Capise AI Copilot`,
        tags: ['goal', 'contribution'],
      });

      goal.currentAmount = (goal.currentAmount || 0) + numAmount;
      goal.contributions.push({
        amount: numAmount,
        date: new Date(),
        note: payload.note || 'Contributed via Capise AI Copilot',
        transactionId: txn._id,
      });

      if (goal.currentAmount >= goal.targetAmount) {
        goal.isCompleted = true;
        goal.completedAt = new Date();
      }

      await goal.save();
      resultData = goal;
      successMessage = `Successfully contributed ₹${numAmount.toLocaleString('en-IN')} to "${goal.name}". New progress: ₹${goal.currentAmount.toLocaleString('en-IN')} / ₹${goal.targetAmount.toLocaleString('en-IN')} (${goal.percentage}%).`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. UPDATE GOAL
    // ══════════════════════════════════════════════════════════════════════════
    case 'UPDATE_GOAL': {
      const goalIdentifier = payload.goalId || payload.id;
      const goalName = payload.goalName || payload.name;
      const newTarget = cleanNumber(payload.newTargetAmount || payload.targetAmount || payload.amount);

      let goal;
      if (goalIdentifier && mongoose.Types.ObjectId.isValid(goalIdentifier)) {
        try { goal = await Goal.findOne({ _id: goalIdentifier, user: userId }); } catch (e) {}
      }
      if (!goal && goalName) {
        goal = await Goal.findOne({
          user: userId,
          name: { $regex: new RegExp(goalName.trim(), 'i') },
        });
      }
      if (!goal) {
        throw new Error('Target goal could not be found to update.');
      }

      if (newTarget > 0) goal.targetAmount = newTarget;
      if (payload.deadline) {
        const d = new Date(payload.deadline);
        if (!isNaN(d.getTime())) goal.deadline = d;
      }
      if (payload.notes) goal.notes = payload.notes;

      await goal.save();
      resultData = goal;
      successMessage = `Updated goal "${goal.name}" target to ₹${goal.targetAmount.toLocaleString('en-IN')}.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. CREATE BUDGET
    // ══════════════════════════════════════════════════════════════════════════
    case 'CREATE_BUDGET': {
      const catSearch = payload.categoryName || payload.category || payload.name || 'General';
      const limit = cleanNumber(payload.limit || payload.amount || payload.newLimit, 10000);
      const period = payload.period || 'monthly';
      const alertThreshold = cleanNumber(payload.alertThreshold, 80);

      if (limit <= 0) throw new Error('Budget limit must be greater than zero.');

      const category = await resolveCategory(userId, catSearch, 'Expense');

      // Check if budget already exists for this category
      let budget = await Budget.findOne({ user: userId, category: category._id });
      if (budget) {
        budget.limit = limit;
        budget.period = period;
        budget.alertThreshold = alertThreshold;
        budget.isActive = true;
      } else {
        budget = new Budget({
          user: userId,
          name: `${category.name} Budget`,
          category: category._id,
          limit,
          period,
          alertThreshold,
          isActive: true,
        });
      }

      await budget.save();
      resultData = budget;
      successMessage = `Established ${period} budget for "${category.name}" at ₹${limit.toLocaleString('en-IN')} (alert at ${alertThreshold}%).`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. UPDATE BUDGET LIMIT
    // ══════════════════════════════════════════════════════════════════════════
    case 'UPDATE_BUDGET_LIMIT': {
      const budgetIdentifier = payload.budgetId || payload.categoryId || payload.id || payload._id;
      const categoryName = payload.categoryName || payload.category || payload.name;
      const newLimit = cleanNumber(payload.newLimit || payload.limit || payload.amount);

      if (newLimit <= 0) {
        throw new Error('Valid budget limit amount is required.');
      }

      let budget = null;
      if (budgetIdentifier && mongoose.Types.ObjectId.isValid(budgetIdentifier)) {
        try { budget = await Budget.findOne({ _id: budgetIdentifier, user: userId }); } catch (e) {}
        if (!budget) {
          try { budget = await Budget.findOne({ category: budgetIdentifier, user: userId }); } catch (e) {}
        }
      }

      if (!budget && categoryName) {
        const category = await Category.findOne({
          user: userId,
          name: { $regex: new RegExp(categoryName.trim(), 'i') },
        });

        if (category) {
          budget = await Budget.findOne({ user: userId, category: category._id });
        }

        if (!budget) {
          budget = await Budget.findOne({
            user: userId,
            name: { $regex: new RegExp(categoryName.trim(), 'i') },
          });
        }

        if (!budget && category) {
          budget = new Budget({
            user: userId,
            name: `${category.name} Budget`,
            category: category._id,
            limit: newLimit,
            alertThreshold: 80,
            isActive: true,
          });
        }
      }

      if (!budget) {
        budget = await Budget.findOne({ user: userId, isActive: true });
      }

      if (!budget) {
        throw new Error(`Could not find a budget to update for ${categoryName || budgetIdentifier}`);
      }

      const oldLimit = budget.limit;
      budget.limit = newLimit;
      await budget.save();

      resultData = budget;
      successMessage = `Updated budget for "${budget.name}" from ₹${(oldLimit || 0).toLocaleString('en-IN')} to ₹${newLimit.toLocaleString('en-IN')}.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. LOG TRANSACTION
    // ══════════════════════════════════════════════════════════════════════════
    case 'LOG_TRANSACTION': {
      const type = payload.type === 'Income' ? 'Income' : 'Expense';
      const numAmount = cleanNumber(payload.amount);
      if (numAmount <= 0) throw new Error('Valid transaction amount is required.');

      const account = await resolveAccount(userId, payload.accountName || payload.account);
      const category = await resolveCategory(userId, payload.categoryName || payload.category, type);

      const txn = new Transaction({
        user: userId,
        type,
        amount: numAmount,
        date: payload.date ? new Date(payload.date) : new Date(),
        account: account._id,
        category: category?._id || null,
        merchant: payload.merchant || (type === 'Income' ? 'Direct Credit' : 'Payment'),
        notes: payload.notes || 'Logged via Capise AI Copilot 1-Click Action',
      });
      await txn.save();

      // Update account balance
      if (type === 'Expense') {
        account.currentBalance -= numAmount;
      } else {
        account.currentBalance += numAmount;
      }
      await account.save();

      resultData = txn;
      successMessage = `Successfully logged ${type} of ₹${numAmount.toLocaleString('en-IN')} (${category?.name}) on ${account.name}.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. TRANSFER MONEY
    // ══════════════════════════════════════════════════════════════════════════
    case 'TRANSFER_MONEY': {
      const numAmount = cleanNumber(payload.amount);
      if (numAmount <= 0) throw new Error('Valid transfer amount is required.');

      const fromAccount = await resolveAccount(userId, payload.fromAccount || payload.fromAccountId || payload.fromAccountName);
      let toAccount = await resolveAccount(userId, payload.toAccount || payload.toAccountId || payload.toAccountName, 'Bank');

      if (fromAccount._id.toString() === toAccount._id.toString()) {
        // Pick an alternate account
        const alt = await Account.findOne({
          user: userId,
          _id: { $ne: fromAccount._id },
          isArchived: false,
        });
        if (alt) toAccount = alt;
        else throw new Error('Source and destination accounts must be different.');
      }

      fromAccount.currentBalance -= numAmount;
      toAccount.currentBalance += numAmount;

      const txn = new Transaction({
        user: userId,
        type: 'Transfer',
        amount: numAmount,
        date: payload.date ? new Date(payload.date) : new Date(),
        account: fromAccount._id,
        toAccount: toAccount._id,
        merchant: `Transfer to ${toAccount.name}`,
        notes: payload.notes || `Internal transfer from ${fromAccount.name} to ${toAccount.name} via Capise AI Copilot`,
        tags: ['transfer', 'internal'],
      });

      await Promise.all([fromAccount.save(), toAccount.save(), txn.save()]);

      resultData = txn;
      successMessage = `Transferred ₹${numAmount.toLocaleString('en-IN')} from "${fromAccount.name}" to "${toAccount.name}".`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 8. CREATE INVESTMENT
    // ══════════════════════════════════════════════════════════════════════════
    case 'CREATE_INVESTMENT': {
      const name = (payload.name || payload.investmentName || 'Index Mutual Fund').trim();
      const validTypes = ['Stocks', 'Mutual Fund', 'ETF', 'Fixed Deposit', 'PPF', 'EPF', 'NPS', 'Gold', 'Silver', 'Crypto', 'Bonds', 'Other'];
      const invType = validTypes.includes(payload.type) ? payload.type : 'Mutual Fund';
      const investedAmount = cleanNumber(payload.investedAmount || payload.amount || 0);
      const currentValue = cleanNumber(payload.currentValue, investedAmount);
      const isSip = Boolean(payload.isSip || payload.sipAmount);
      const sipAmount = cleanNumber(payload.sipAmount, 0);

      const investment = new Investment({
        user: userId,
        name,
        type: invType,
        platform: payload.platform || 'Direct',
        investedAmount,
        currentValue,
        quantity: cleanNumber(payload.quantity, null),
        buyPrice: cleanNumber(payload.buyPrice, null),
        isSip,
        sipAmount,
        sipFrequency: payload.sipFrequency || 'monthly',
        sipDay: cleanNumber(payload.sipDay, 1),
        symbol: payload.symbol || '',
        notes: payload.notes || 'Created via Capise AI Copilot',
        valueHistory: [{ date: new Date(), value: currentValue }],
      });

      if (investedAmount > 0) {
        const account = await resolveAccount(userId, payload.accountName || payload.account, 'Bank');
        if (account) {
          account.currentBalance -= investedAmount;
          await account.save();

          await Transaction.create({
            user: userId,
            type: 'Transfer',
            amount: investedAmount,
            date: new Date(),
            account: account._id,
            merchant: `Investment: ${name}`,
            notes: `Initial investment allocation into ${name} via Capise AI Copilot`,
            tags: ['investment', 'capital'],
          });
        }
      }

      await investment.save();
      resultData = investment;
      successMessage = `Added investment "${investment.name}" (${investment.type}) with value ₹${currentValue.toLocaleString('en-IN')}${isSip ? ` and ₹${sipAmount.toLocaleString('en-IN')}/mo SIP` : ''}!`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 9. LOG INVESTMENT TOPUP
    // ══════════════════════════════════════════════════════════════════════════
    case 'LOG_INVESTMENT_TOPUP': {
      const invIdentifier = payload.investmentId || payload.id;
      const invName = payload.investmentName || payload.name;
      const numAmount = cleanNumber(payload.amount);
      if (numAmount <= 0) throw new Error('Valid investment amount is required.');

      let investment;
      if (invIdentifier && mongoose.Types.ObjectId.isValid(invIdentifier)) {
        try { investment = await Investment.findOne({ _id: invIdentifier, user: userId }); } catch (e) {}
      }
      if (!investment && invName) {
        investment = await Investment.findOne({
          user: userId,
          name: { $regex: new RegExp(invName.trim(), 'i') },
        });
      }
      if (!investment) {
        investment = await Investment.findOne({ user: userId, isActive: true });
      }
      if (!investment) {
        investment = await Investment.create({
          user: userId,
          name: invName || 'Nifty 50 Index Fund',
          type: 'Mutual Fund',
          investedAmount: 0,
          currentValue: 0,
          platform: 'Direct',
          valueHistory: [],
        });
      }

      investment.investedAmount = (investment.investedAmount || 0) + numAmount;
      investment.currentValue = (investment.currentValue || 0) + numAmount;
      investment.valueHistory.push({ date: new Date(), value: investment.currentValue });
      await investment.save();

      const account = await resolveAccount(userId, payload.accountName || payload.account, 'Bank');
      if (account) {
        account.currentBalance -= numAmount;
        await account.save();

        await Transaction.create({
          user: userId,
          type: 'Transfer',
          amount: numAmount,
          date: new Date(),
          account: account._id,
          merchant: `Investment: ${investment.name}`,
          notes: 'Capital deployment via Capise AI Copilot',
          tags: ['investment', 'topup'],
        });
      }

      resultData = investment;
      successMessage = `Successfully deployed ₹${numAmount.toLocaleString('en-IN')} into "${investment.name}". New holding value: ₹${investment.currentValue.toLocaleString('en-IN')}.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 10. UPDATE INVESTMENT SIP
    // ══════════════════════════════════════════════════════════════════════════
    case 'UPDATE_INVESTMENT_SIP': {
      const invIdentifier = payload.investmentId || payload.id;
      const invName = payload.investmentName || payload.name;
      const sipAmount = cleanNumber(payload.sipAmount || payload.amount, 5000);
      const sipFrequency = payload.sipFrequency || 'monthly';
      const sipDay = cleanNumber(payload.sipDay, 1);

      let investment;
      if (invIdentifier && mongoose.Types.ObjectId.isValid(invIdentifier)) {
        try { investment = await Investment.findOne({ _id: invIdentifier, user: userId }); } catch (e) {}
      }
      if (!investment && invName) {
        investment = await Investment.findOne({
          user: userId,
          name: { $regex: new RegExp(invName.trim(), 'i') },
        });
      }
      if (!investment) {
        investment = await Investment.findOne({ user: userId, isActive: true });
      }
      if (!investment) {
        investment = await Investment.create({
          user: userId,
          name: invName || 'Index Mutual Fund',
          type: 'Mutual Fund',
          investedAmount: 0,
          currentValue: 0,
          platform: 'Direct',
          valueHistory: [],
        });
      }

      investment.isSip = true;
      investment.sipAmount = sipAmount;
      investment.sipFrequency = sipFrequency;
      investment.sipDay = sipDay;

      // Calculate next SIP date
      const now = new Date();
      let nextDate = new Date(now.getFullYear(), now.getMonth(), sipDay);
      if (nextDate <= now) {
        nextDate = new Date(now.getFullYear(), now.getMonth() + 1, sipDay);
      }
      investment.nextSipDate = nextDate;

      await investment.save();
      resultData = investment;
      successMessage = `Configured ₹${sipAmount.toLocaleString('en-IN')}/${sipFrequency} SIP for "${investment.name}" executing on day ${sipDay} of each period.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 11. CREATE RECURRING RULE (SUBSCRIPTION / BILL)
    // ══════════════════════════════════════════════════════════════════════════
    case 'CREATE_RECURRING_RULE': {
      const name = (payload.name || payload.title || payload.subscriptionName || 'Recurring Bill').trim();
      const amount = cleanNumber(payload.amount);
      if (amount <= 0) throw new Error('Valid recurring rule amount is required.');

      const type = payload.type || 'Expense';
      const frequency = ['daily', 'weekly', 'monthly', 'yearly'].includes(payload.frequency) ? payload.frequency : 'monthly';
      const account = await resolveAccount(userId, payload.accountName || payload.account);
      const category = await resolveCategory(userId, payload.categoryName || payload.category, type);

      const now = new Date();
      const nextRunDate = payload.nextRunDate ? new Date(payload.nextRunDate) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const time = payload.time || '09:00';
      if (time && time.includes(':')) {
        const [h, m] = time.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          nextRunDate.setHours(h, m, 0, 0);
        }
      }

      const rule = new RecurringRule({
        user: userId,
        name,
        type,
        amount,
        account: account._id,
        category: category?._id || null,
        frequency,
        time,
        nextRunDate,
        autoPost: payload.autoPost !== false,
        notes: payload.notes || 'Created via Capise AI Copilot',
      });

      await rule.save();
      resultData = rule;
      successMessage = `Created ${frequency} recurring rule "${name}" for ₹${amount.toLocaleString('en-IN')} (auto-post: ${rule.autoPost ? 'enabled' : 'disabled'}).`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 12. CANCEL SUBSCRIPTION
    // ══════════════════════════════════════════════════════════════════════════
    case 'CANCEL_SUBSCRIPTION': {
      const ruleId = payload.ruleId || payload.id;
      const subName = payload.subscriptionName || payload.name;
      let rule;
      if (ruleId && mongoose.Types.ObjectId.isValid(ruleId)) {
        try { rule = await RecurringRule.findOne({ _id: ruleId, user: userId }); } catch (e) {}
      }
      if (!rule && subName) {
        rule = await RecurringRule.findOne({
          user: userId,
          name: { $regex: new RegExp(subName.trim(), 'i') },
        });
      }
      if (!rule) {
        rule = await RecurringRule.findOne({ user: userId, isActive: true });
      }
      if (!rule) throw new Error('Subscription rule not found.');

      rule.isActive = false;
      await rule.save();

      const savings = rule.frequency === 'yearly' ? rule.amount : rule.amount * 12;
      resultData = rule;
      successMessage = `Cancelled subscription "${rule.name}". Unlocked ~₹${savings.toLocaleString('en-IN')}/yr in annual savings!`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 13. ACKNOWLEDGE PRICE HIKE
    // ══════════════════════════════════════════════════════════════════════════
    case 'ACKNOWLEDGE_PRICE_HIKE': {
      const ruleId = payload.ruleId || payload.id;
      const subName = payload.subscriptionName || payload.name;
      const newAmount = cleanNumber(payload.newAmount || payload.amount);

      let rule;
      if (ruleId && mongoose.Types.ObjectId.isValid(ruleId)) {
        try { rule = await RecurringRule.findOne({ _id: ruleId, user: userId }); } catch (e) {}
      }
      if (!rule && subName) {
        rule = await RecurringRule.findOne({
          user: userId,
          name: { $regex: new RegExp(subName.trim(), 'i') },
        });
      }
      if (!rule) throw new Error('Subscription rule not found.');

      if (newAmount > 0) rule.amount = newAmount;
      await rule.save();

      resultData = rule;
      successMessage = `Acknowledged new price for "${rule.name}" at ₹${rule.amount.toLocaleString('en-IN')}.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 14. CREATE LOAN
    // ══════════════════════════════════════════════════════════════════════════
    case 'CREATE_LOAN': {
      const name = (payload.name || payload.loanName || 'Personal Loan').trim();
      const principal = cleanNumber(payload.principal || payload.amount);
      const interestRate = cleanNumber(payload.interestRate, 9.5);
      const tenureMonths = cleanNumber(payload.tenureMonths, 36);

      if (principal <= 0) throw new Error('Loan principal must be greater than zero.');

      // Calculate EMI if not provided
      let emiAmount = cleanNumber(payload.emiAmount);
      if (emiAmount <= 0) {
        const monthlyRate = interestRate / 12 / 100;
        emiAmount = Math.round(
          (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1)
        );
      }

      const validLoanTypes = ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Gold Loan', 'Business Loan', 'Other'];
      const loanType = validLoanTypes.includes(payload.type) ? payload.type : 'Personal Loan';
      const debitAccount = await resolveAccount(userId, payload.debitAccount || payload.accountName, 'Bank');

      const loan = new Loan({
        user: userId,
        name,
        lender: payload.lender || 'Bank',
        type: loanType,
        principal,
        interestRate,
        tenureMonths,
        startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
        emiAmount,
        debitAccount: debitAccount?._id || null,
        autoDebit: Boolean(payload.autoDebit),
        debitDay: cleanNumber(payload.debitDay, 5),
        notes: payload.notes || 'Created via Capise AI Copilot',
        payments: [],
      });

      await loan.save();
      resultData = loan;
      successMessage = `Recorded ${loan.type} "${loan.name}" of ₹${principal.toLocaleString('en-IN')} with EMI ₹${emiAmount.toLocaleString('en-IN')}/mo at ${interestRate}%.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 15. PREPAY LOAN PRINCIPAL
    // ══════════════════════════════════════════════════════════════════════════
    case 'PREPAY_LOAN_PRINCIPAL': {
      const loanId = payload.loanId || payload.id;
      const loanName = payload.loanName || payload.name;
      const numAmount = cleanNumber(payload.amount);
      if (numAmount <= 0) throw new Error('Valid prepayment amount is required.');

      let loan;
      if (loanId && mongoose.Types.ObjectId.isValid(loanId)) {
        try { loan = await Loan.findOne({ _id: loanId, user: userId }); } catch (e) {}
      }
      if (!loan && loanName) {
        loan = await Loan.findOne({
          user: userId,
          name: { $regex: new RegExp(loanName.trim(), 'i') },
          isActive: true,
        });
      }
      if (!loan) loan = await Loan.findOne({ user: userId, isActive: true });
      if (!loan) throw new Error('No active loan found to prepay.');

      const account = await resolveAccount(userId, payload.accountName || payload.account, 'Bank');
      if (account) {
        account.currentBalance -= numAmount;
        await account.save();
      }

      const txn = await Transaction.create({
        user: userId,
        type: 'Expense',
        amount: numAmount,
        date: new Date(),
        account: account._id,
        merchant: `Prepayment: ${loan.name}`,
        notes: `Principal prepayment towards ${loan.name} via Capise AI Copilot`,
        tags: ['loan', 'prepayment'],
      });

      loan.payments.push({
        date: new Date(),
        amount: numAmount,
        principal: numAmount,
        interest: 0,
        note: 'Principal prepayment via Capise AI Copilot',
        transactionId: txn._id,
      });

      await loan.save();
      resultData = loan;
      successMessage = `Prepaid ₹${numAmount.toLocaleString('en-IN')} principal on "${loan.name}". Remaining principal: ₹${loan.remainingPrincipal.toLocaleString('en-IN')}.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 16. RECORD LOAN EMI PAYMENT
    // ══════════════════════════════════════════════════════════════════════════
    case 'RECORD_LOAN_EMI_PAYMENT': {
      const loanId = payload.loanId || payload.id;
      const loanName = payload.loanName || payload.name;

      let loan;
      if (loanId && mongoose.Types.ObjectId.isValid(loanId)) {
        try { loan = await Loan.findOne({ _id: loanId, user: userId }); } catch (e) {}
      }
      if (!loan && loanName) {
        loan = await Loan.findOne({
          user: userId,
          name: { $regex: new RegExp(loanName.trim(), 'i') },
          isActive: true,
        });
      }
      if (!loan) loan = await Loan.findOne({ user: userId, isActive: true });
      if (!loan) throw new Error('No active loan found.');

      const emiAmount = cleanNumber(payload.amount || payload.emiAmount, loan.emiAmount);
      if (emiAmount <= 0) throw new Error('Valid payment amount is required.');

      const account = await resolveAccount(userId, payload.accountName || payload.account, 'Bank');
      if (account) {
        account.currentBalance -= emiAmount;
        await account.save();
      }

      const txn = await Transaction.create({
        user: userId,
        type: 'Expense',
        amount: emiAmount,
        date: new Date(),
        account: account._id,
        merchant: `EMI: ${loan.name}`,
        notes: payload.note || `Monthly EMI payment for ${loan.name} via Capise AI Copilot`,
        tags: ['loan', 'emi'],
      });

      const interestPart = cleanNumber(payload.interest, Math.round(emiAmount * 0.3));
      const principalPart = emiAmount - interestPart;

      loan.payments.push({
        date: new Date(),
        amount: emiAmount,
        principal: principalPart,
        interest: interestPart,
        note: payload.note || 'EMI payment via Capise AI Copilot',
        transactionId: txn._id,
      });

      await loan.save();
      resultData = loan;
      successMessage = `Recorded EMI payment of ₹${emiAmount.toLocaleString('en-IN')} for "${loan.name}". Remaining principal: ₹${loan.remainingPrincipal.toLocaleString('en-IN')}.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 17. CREATE LENDING / BORROWING
    // ══════════════════════════════════════════════════════════════════════════
    case 'CREATE_LENDING': {
      const person = (payload.person || payload.personName || 'Contact').trim();
      const type = payload.type === 'borrowed' ? 'borrowed' : 'lent';
      const numAmount = cleanNumber(payload.amount);
      if (numAmount <= 0) throw new Error('Valid lending amount is required.');

      const account = await resolveAccount(userId, payload.accountName || payload.account);
      const txType = type === 'lent' ? 'Expense' : 'Income';
      const categoryName = type === 'lent' ? 'Lent Money' : 'Borrowed Money';
      const category = await resolveCategory(userId, categoryName, txType);

      let dueDate = null;
      if (payload.dueDate) {
        const d = new Date(payload.dueDate);
        if (!isNaN(d.getTime())) dueDate = d;
      }

      const lending = new Lending({
        user: userId,
        person,
        type,
        amount: numAmount,
        currency: 'INR',
        dueDate,
        notes: payload.notes || `Logged via Capise AI Copilot`,
        account: account._id,
        interestRate: cleanNumber(payload.interestRate, 0),
        repayments: [],
      });

      const txNote = `${type === 'lent' ? 'Lent to' : 'Borrowed from'} ${person}${payload.notes ? `: ${payload.notes}` : ''}`;
      const transaction = new Transaction({
        user: userId,
        type: txType,
        amount: numAmount,
        date: new Date(),
        account: account._id,
        category: category?._id || null,
        notes: txNote,
        tags: ['lending', type],
        lending: lending._id,
      });

      await transaction.save();
      lending.transactionId = transaction._id;
      await lending.save();

      // Synchronize account balance
      const balanceChange = txType === 'Income' ? numAmount : -numAmount;
      await Account.findByIdAndUpdate(account._id, { $inc: { currentBalance: balanceChange } });

      resultData = lending;
      successMessage = `Recorded ${type === 'lent' ? 'loan of' : 'borrowing of'} ₹${numAmount.toLocaleString('en-IN')} ${type === 'lent' ? 'to' : 'from'} ${person} (linked to ${account.name}).`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 18. RECORD LENDING REPAYMENT
    // ══════════════════════════════════════════════════════════════════════════
    case 'RECORD_LENDING_REPAYMENT': {
      const lendingId = payload.lendingId || payload.id;
      const personName = payload.personName || payload.person || payload.name;
      const numAmount = cleanNumber(payload.amount);
      if (numAmount <= 0) throw new Error('Valid repayment amount is required.');

      let lending;
      if (lendingId && mongoose.Types.ObjectId.isValid(lendingId)) {
        try { lending = await Lending.findOne({ _id: lendingId, user: userId }); } catch (e) {}
      }
      if (!lending && personName) {
        lending = await Lending.findOne({
          user: userId,
          person: { $regex: new RegExp(personName.trim(), 'i') },
          isSettled: false,
        });
      }
      if (!lending) {
        lending = await Lending.findOne({ user: userId, isSettled: false });
      }
      if (!lending) throw new Error('No active lending record found.');

      const account = await resolveAccount(userId, payload.accountName || payload.account);
      const isLent = lending.type === 'lent';
      // For lent, repayment is money coming in (Income / Collection)
      // For borrowed, repayment is money going out (Expense / Payoff)
      const txType = isLent ? 'Income' : 'Expense';
      const catName = isLent ? 'Lending Collection' : 'Debt Repayment';
      const category = await resolveCategory(userId, catName, txType);

      const txn = await Transaction.create({
        user: userId,
        type: txType,
        amount: numAmount,
        date: new Date(),
        account: account._id,
        category: category?._id || null,
        merchant: `${isLent ? 'Repayment from' : 'Payback to'} ${lending.person}`,
        notes: payload.note || `Repayment for ${lending.type} record via Capise AI Copilot`,
        tags: ['lending', 'repayment'],
      });

      lending.repayments.push({
        amount: numAmount,
        date: new Date(),
        note: payload.note || 'Recorded via Capise AI Copilot',
        transactionId: txn._id,
      });

      const totalRepaid = lending.repayments.reduce((s, r) => s + r.amount, 0);
      if (totalRepaid >= lending.amount) {
        lending.isSettled = true;
        lending.settledAt = new Date();
      }
      await lending.save();

      // Adjust account balance
      const balanceDelta = txType === 'Income' ? numAmount : -numAmount;
      await Account.findByIdAndUpdate(account._id, { $inc: { currentBalance: balanceDelta } });

      resultData = lending;
      successMessage = `Recorded ₹${numAmount.toLocaleString('en-IN')} repayment ${isLent ? 'from' : 'to'} ${lending.person}. Remaining balance: ₹${Math.max(0, lending.amount - totalRepaid).toLocaleString('en-IN')}.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 19. SETTLE LENDING
    // ══════════════════════════════════════════════════════════════════════════
    case 'SETTLE_LENDING': {
      const lendingId = payload.lendingId || payload.id;
      const personName = payload.personName || payload.person;

      let lending;
      if (lendingId && mongoose.Types.ObjectId.isValid(lendingId)) {
        try { lending = await Lending.findOne({ _id: lendingId, user: userId }); } catch (e) {}
      }
      if (!lending && personName) {
        lending = await Lending.findOne({
          user: userId,
          person: { $regex: new RegExp(personName.trim(), 'i') },
          isSettled: false,
        });
      }
      if (!lending) lending = await Lending.findOne({ user: userId, isSettled: false });
      if (!lending) throw new Error('No active lending record found to settle.');

      const currentRepaid = (lending.repayments || []).reduce((s, r) => s + r.amount, 0);
      const outstanding = Math.max(0, lending.amount - currentRepaid);

      if (outstanding > 0) {
        const account = await resolveAccount(userId, payload.accountName || payload.account);
        const isLent = lending.type === 'lent';
        const txType = isLent ? 'Income' : 'Expense';
        const catName = isLent ? 'Lending Collection' : 'Debt Repayment';
        const category = await resolveCategory(userId, catName, txType);

        const txn = await Transaction.create({
          user: userId,
          type: txType,
          amount: outstanding,
          date: new Date(),
          account: account._id,
          category: category?._id || null,
          merchant: `Full Settlement: ${lending.person}`,
          notes: `Settled entire balance for ${lending.type} record via Capise AI Copilot`,
          tags: ['lending', 'settlement'],
        });

        lending.repayments.push({
          amount: outstanding,
          date: new Date(),
          note: 'Full settlement via Capise AI Copilot',
          transactionId: txn._id,
        });

        const delta = txType === 'Income' ? outstanding : -outstanding;
        await Account.findByIdAndUpdate(account._id, { $inc: { currentBalance: delta } });
      }

      lending.isSettled = true;
      lending.settledAt = new Date();
      await lending.save();

      resultData = lending;
      successMessage = `Fully settled lending record with ${lending.person}! Account ledger reconciled.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 20. CREATE ACCOUNT
    // ══════════════════════════════════════════════════════════════════════════
    case 'CREATE_ACCOUNT': {
      const name = (payload.name || payload.accountName || 'Savings Account').trim();
      const validTypes = ['Bank', 'Cash', 'Credit Card', 'UPI', 'FD', 'Other'];
      const accType = validTypes.includes(payload.type) ? payload.type : 'Bank';
      const balance = cleanNumber(payload.openingBalance || payload.currentBalance || payload.balance, 0);

      const account = new Account({
        user: userId,
        name,
        type: accType,
        openingBalance: balance,
        currentBalance: balance,
        currency: payload.currency || 'INR',
        creditLimit: accType === 'Credit Card' ? cleanNumber(payload.creditLimit, 100000) : null,
        notes: payload.notes || 'Created via Capise AI Copilot',
      });

      await account.save();
      resultData = account;
      successMessage = `Created ${accType} account "${account.name}" with starting balance of ₹${balance.toLocaleString('en-IN')}.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 21. EXECUTE AUTO REBALANCE (OVERDRAFT SHIELD)
    // ══════════════════════════════════════════════════════════════════════════
    case 'EXECUTE_AUTO_REBALANCE': {
      const fromAccSearch = payload.fromAccountId || payload.fromAccountName || payload.fromAccount;
      const toAccSearch = payload.toAccountId || payload.toAccountName || payload.toAccount;
      const numAmount = cleanNumber(payload.amount);

      if (numAmount <= 0) throw new Error('Valid rebalance transfer amount is required.');

      const fromAccount = await resolveAccount(userId, fromAccSearch);
      let toAccount = await resolveAccount(userId, toAccSearch, 'Bank');

      if (fromAccount._id.toString() === toAccount._id.toString()) {
        const alt = await Account.findOne({ user: userId, _id: { $ne: fromAccount._id }, isArchived: false });
        if (alt) toAccount = alt;
        else throw new Error('Source and destination accounts must be different.');
      }

      if (fromAccount.currentBalance < numAmount) {
        throw new Error(`Insufficient funds in ${fromAccount.name} (Available: ₹${fromAccount.currentBalance.toLocaleString('en-IN')}).`);
      }

      fromAccount.currentBalance -= numAmount;
      toAccount.currentBalance += numAmount;

      const txn = new Transaction({
        user: userId,
        type: 'Transfer',
        amount: numAmount,
        date: new Date(),
        account: fromAccount._id,
        toAccount: toAccount._id,
        merchant: 'Overdraft Shield Auto-Rebalance',
        notes: payload.reason || `Auto-Rebalanced ₹${numAmount.toLocaleString('en-IN')} from ${fromAccount.name} to protect ${toAccount.name}`,
        tags: ['rebalance', 'overdraft-shield'],
      });

      await Promise.all([fromAccount.save(), toAccount.save(), txn.save()]);

      resultData = {
        fromAccount: { name: fromAccount.name, newBalance: fromAccount.currentBalance },
        toAccount: { name: toAccount.name, newBalance: toAccount.currentBalance },
        transactionId: txn._id,
      };
      successMessage = `Transferred ₹${numAmount.toLocaleString('en-IN')} from ${fromAccount.name} to ${toAccount.name}! Low-balance breach averted.`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 22. BUFFER RESERVE (EMERGENCY ALLOCATION)
    // ══════════════════════════════════════════════════════════════════════════
    case 'BUFFER_RESERVE': {
      const numAmount = cleanNumber(payload.amount, 25000);
      const fromAccount = await resolveAccount(userId, payload.fromAccount || payload.accountName, 'Bank');

      // Check if user has an Emergency Fund goal
      let goal = await Goal.findOne({
        user: userId,
        name: { $regex: /emergency|safety|rainy/i },
        isCompleted: false,
      });

      if (!goal) {
        goal = await Goal.create({
          user: userId,
          name: 'Emergency Buffer Reserve',
          targetAmount: Math.max(150000, numAmount * 4),
          currentAmount: 0,
          color: '#10b981',
          icon: 'Shield',
          notes: 'Emergency reserve cordoned off via Capise AI Copilot',
        });
      }

      fromAccount.currentBalance -= numAmount;
      await fromAccount.save();

      const txn = await Transaction.create({
        user: userId,
        type: 'Transfer',
        amount: numAmount,
        date: new Date(),
        account: fromAccount._id,
        merchant: `Reserve Buffer: ${goal.name}`,
        notes: payload.reason || `Allocated ₹${numAmount.toLocaleString('en-IN')} to liquid emergency buffer`,
        tags: ['reserve', 'emergency'],
      });

      goal.currentAmount = (goal.currentAmount || 0) + numAmount;
      goal.contributions.push({
        amount: numAmount,
        date: new Date(),
        note: payload.reason || 'Safety reserve buffer allocation',
        transactionId: txn._id,
      });
      await goal.save();

      resultData = goal;
      successMessage = `Allocated ₹${numAmount.toLocaleString('en-IN')} into "${goal.name}" from ${fromAccount.name}. Liquidity buffer protected!`;
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 23. GENERATE WHATSAPP REMINDER
    // ══════════════════════════════════════════════════════════════════════════
    case 'GENERATE_WHATSAPP_REMINDER': {
      const personName = payload.personName || payload.person || 'friend';
      const amount = cleanNumber(payload.amount);
      const dueDate = payload.dueDate || '';
      const reminderText =
        payload.customMessage ||
        `Hi ${personName}! Hope you are doing well. Just a gentle reminder regarding the friendly loan of ₹${amount.toLocaleString('en-IN')}${dueDate ? ` due by ${dueDate}` : ''}. Let me know whenever convenient!`;
      const encodedText = encodeURIComponent(reminderText);
      const whatsappUrl = `https://wa.me/?text=${encodedText}`;

      resultData = { whatsappUrl, reminderText };
      successMessage = `WhatsApp reminder link generated for ${personName}.`;
      break;
    }

    default:
      throw new Error(`Unsupported action type: "${actionType}". Supported actions: CREATE_GOAL, CONTRIBUTE_TO_GOAL, CREATE_BUDGET, UPDATE_BUDGET_LIMIT, LOG_TRANSACTION, TRANSFER_MONEY, CREATE_INVESTMENT, LOG_INVESTMENT_TOPUP, UPDATE_INVESTMENT_SIP, CREATE_RECURRING_RULE, CANCEL_SUBSCRIPTION, ACKNOWLEDGE_PRICE_HIKE, CREATE_LOAN, PREPAY_LOAN_PRINCIPAL, RECORD_LOAN_EMI_PAYMENT, CREATE_LENDING, RECORD_LENDING_REPAYMENT, SETTLE_LENDING, CREATE_ACCOUNT, EXECUTE_AUTO_REBALANCE, BUFFER_RESERVE, GENERATE_WHATSAPP_REMINDER.`);
  }

  // ⚡ Immediately invalidate cached user state so UI gets live data
  memoryCache.invalidateUser(userId);

  return {
    success: true,
    actionType: canonicalType,
    message: successMessage,
    data: resultData,
  };
};
