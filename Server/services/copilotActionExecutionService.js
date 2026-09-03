import Budget from '../models/Budget.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import Lending from '../models/Lending.js';
import Loan from '../models/Loan.js';
import RecurringRule from '../models/RecurringRule.js';

/**
 * Ultra-resilient executor for AI-generated proactive action proposals.
 */
export const executeCopilotAction = async ({ userId, actionType, payload }) => {
  if (!userId || !actionType || !payload) {
    throw new Error('User ID, Action Type, and Payload are required.');
  }

  switch (actionType) {
    // 1. UPDATE BUDGET LIMIT
    case 'UPDATE_BUDGET_LIMIT': {
      const budgetIdentifier = payload.budgetId || payload.categoryId || payload.id || payload._id;
      const categoryName = payload.categoryName || payload.category || payload.name;
      const newLimit = payload.newLimit || payload.limit || payload.amount;

      const limitVal = Number(newLimit);
      if (isNaN(limitVal) || limitVal <= 0) {
        throw new Error('Valid budget limit amount is required.');
      }

      let budget = null;

      // 1. Try finding by direct budget ID
      if (budgetIdentifier) {
        try {
          budget = await Budget.findOne({ _id: budgetIdentifier, user: userId });
        } catch (e) {
          // not a valid ObjectId, continue
        }
      }

      // 2. Try finding by category ObjectId
      if (!budget && budgetIdentifier) {
        try {
          budget = await Budget.findOne({ category: budgetIdentifier, user: userId });
        } catch (e) {
          // not a valid ObjectId, continue
        }
      }

      // 3. Try finding by category name or budget name
      if (!budget && categoryName) {
        const category = await Category.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${categoryName.trim()}$`, 'i') },
        });

        if (category) {
          budget = await Budget.findOne({ user: userId, category: category._id });
        }

        if (!budget) {
          budget = await Budget.findOne({
            user: userId,
            name: { $regex: new RegExp(`^${categoryName.trim()}`, 'i') },
          });
        }

        // If category exists but no budget doc yet, create it
        if (!budget && category) {
          budget = new Budget({
            user: userId,
            name: `${category.name} Budget`,
            category: category._id,
            limit: limitVal,
            alertThreshold: 80,
            isActive: true,
          });
        }
      }

      // 4. Fallback: update the first active budget if available
      if (!budget) {
        budget = await Budget.findOne({ user: userId, isActive: true });
      }

      if (!budget) {
        throw new Error(`Could not find a budget to update for ${categoryName || budgetIdentifier}`);
      }

      const oldLimit = budget.limit;
      budget.limit = limitVal;
      await budget.save();

      return {
        success: true,
        actionType,
        message: `Updated budget for "${budget.name}" from ₹${(oldLimit || 0).toLocaleString('en-IN')} to ₹${limitVal.toLocaleString('en-IN')}.`,
        data: budget,
      };
    }

    // 2. LOG TRANSACTION
    case 'LOG_TRANSACTION': {
      const { type = 'Expense', amount, categoryName, category, accountName, account: accId, merchant, notes } = payload;
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Valid transaction amount is required.');
      }

      // Find account
      let account;
      if (accId) {
        try { account = await Account.findOne({ _id: accId, user: userId }); } catch (e) {}
      }
      if (!account && accountName) {
        account = await Account.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${accountName.trim()}$`, 'i') },
          isArchived: false,
        });
      }
      if (!account) {
        account = await Account.findOne({ user: userId, isArchived: false }).sort({ currentBalance: -1 });
      }
      if (!account) {
        throw new Error('No active account found to log transaction against.');
      }

      // Find category
      let catDoc;
      const catSearch = categoryName || category;
      if (catSearch) {
        catDoc = await Category.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${catSearch.trim()}$`, 'i') },
        });
      }

      const txn = new Transaction({
        user: userId,
        type,
        amount: numAmount,
        date: new Date(),
        account: account._id,
        category: catDoc?._id || null,
        merchant: merchant || 'AI Copilot Action',
        notes: notes || 'Logged via Capise AI Copilot 1-Click Action',
      });
      await txn.save();

      // Update account balance
      if (type === 'Expense') {
        account.currentBalance -= numAmount;
      } else if (type === 'Income') {
        account.currentBalance += numAmount;
      }
      await account.save();

      return {
        success: true,
        actionType,
        message: `Successfully logged ${type} of ₹${numAmount.toLocaleString('en-IN')} (${catDoc?.name || 'General'}) from ${account.name}.`,
        data: txn,
      };
    }

    // 3. CONTRIBUTE TO GOAL
    case 'CONTRIBUTE_TO_GOAL': {
      const goalIdentifier = payload.goalId || payload.id;
      const goalName = payload.goalName || payload.name || payload.title;
      const numAmount = Number(payload.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Valid contribution amount is required.');
      }

      let goal;
      if (goalIdentifier) {
        try { goal = await Goal.findOne({ _id: goalIdentifier, user: userId }); } catch (e) {}
      }
      if (!goal && goalName) {
        goal = await Goal.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${goalName.trim()}$`, 'i') },
        });
      }
      if (!goal) {
        goal = await Goal.findOne({ user: userId, isCompleted: false });
      }
      if (!goal) {
        throw new Error('No active goal found.');
      }

      // Find funding account
      let account;
      const accName = payload.accountName || payload.account;
      if (accName) {
        account = await Account.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${accName.trim()}$`, 'i') },
          isArchived: false,
        });
      }
      if (!account) {
        account = await Account.findOne({ user: userId, isArchived: false, type: 'Bank' });
      }

      // Add contribution to goal
      goal.currentAmount = (goal.currentAmount || 0) + numAmount;
      if (goal.currentAmount >= goal.targetAmount) {
        goal.isCompleted = true;
        goal.completedAt = new Date();
      }

      let createdTransaction = null;
      // Deduct balance from funding account and book Transfer transaction
      if (account) {
        account.currentBalance -= numAmount;
        await account.save();

        createdTransaction = await Transaction.create({
          user: userId,
          type: 'Transfer', // Goal contribution is a transfer (savings), not an expense
          amount: numAmount,
          date: new Date(),
          account: account._id,
          toAccount: null,
          category: null,
          merchant: `Goal Savings: ${goal.name}`,
          notes: payload.note || `Goal contribution to "${goal.name}" via Capise AI Copilot`,
          tags: ['goal', 'contribution'],
        });
      }

      goal.contributions.push({
        amount: numAmount,
        date: new Date(),
        note: payload.note || 'Contributed via Capise AI Copilot',
        transactionId: createdTransaction ? createdTransaction._id : null,
      });
      await goal.save();

      return {
        success: true,
        actionType,
        message: `Successfully contributed ₹${numAmount.toLocaleString('en-IN')} to "${goal.name}". New balance: ₹${goal.currentAmount.toLocaleString('en-IN')}.`,
        data: goal,
      };
    }

    // 4. LOG INVESTMENT TOPUP / DEPLOY IDLE CASH
    case 'LOG_INVESTMENT_TOPUP': {
      const invIdentifier = payload.investmentId || payload.id;
      const invName = payload.investmentName || payload.name;
      const numAmount = Number(payload.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Valid investment amount is required.');
      }

      let investment;
      if (invIdentifier) {
        try { investment = await Investment.findOne({ _id: invIdentifier, user: userId }); } catch (e) {}
      }
      if (!investment && invName) {
        investment = await Investment.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${invName.trim()}$`, 'i') },
        });
      }
      if (!investment) {
        // Fallback: use first investment holding
        investment = await Investment.findOne({ user: userId });
      }
      if (!investment) {
        throw new Error(`Investment holding not found.`);
      }

      // Update investment values
      investment.investedAmount = (investment.investedAmount || 0) + numAmount;
      investment.currentValue = (investment.currentValue || 0) + numAmount;
      investment.valueHistory.push({
        date: new Date(),
        value: investment.currentValue,
      });
      await investment.save();

      // Deduct from source bank account
      let account;
      const accSearch = payload.accountName || payload.account;
      if (accSearch) {
        account = await Account.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${accSearch.trim()}$`, 'i') },
          isArchived: false,
        });
      }
      if (!account) {
        account = await Account.findOne({ user: userId, type: 'Bank', isArchived: false });
      }

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
        });
      }

      return {
        success: true,
        actionType,
        message: `Successfully deployed ₹${numAmount.toLocaleString('en-IN')} into "${investment.name}". Portfolio updated!`,
        data: investment,
      };
    }

    // 5. RECORD LENDING REPAYMENT
    case 'RECORD_LENDING_REPAYMENT': {
      const lendingId = payload.lendingId || payload.id;
      const personName = payload.personName || payload.person || payload.name;
      const numAmount = Number(payload.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Valid repayment amount is required.');
      }

      let lending;
      if (lendingId) {
        try { lending = await Lending.findOne({ _id: lendingId, user: userId }); } catch (e) {}
      }
      if (!lending && personName) {
        lending = await Lending.findOne({
          user: userId,
          person: { $regex: new RegExp(`^${personName.trim()}$`, 'i') },
          isSettled: false,
        });
      }
      if (!lending) {
        lending = await Lending.findOne({ user: userId, isSettled: false });
      }
      if (!lending) {
        throw new Error('No active lending record found.');
      }

      lending.repayments.push({
        amount: numAmount,
        date: new Date(),
        note: 'Recorded via Capise AI Copilot',
      });

      const totalRepaid = lending.repayments.reduce((s, r) => s + r.amount, 0);
      if (totalRepaid >= lending.amount) {
        lending.isSettled = true;
        lending.settledAt = new Date();
      }
      await lending.save();

      // Credit destination account
      let account = await Account.findOne({ user: userId, type: 'Bank', isArchived: false });
      if (account) {
        account.currentBalance += numAmount;
        await account.save();
      }

      return {
        success: true,
        actionType,
        message: `Recorded ₹${numAmount.toLocaleString('en-IN')} repayment from ${lending.person}. Remaining balance: ₹${Math.max(0, lending.amount - totalRepaid).toLocaleString('en-IN')}.`,
        data: lending,
      };
    }

    // 6. PREPAY LOAN PRINCIPAL
    case 'PREPAY_LOAN_PRINCIPAL': {
      const loanId = payload.loanId || payload.id;
      const loanName = payload.loanName || payload.name;
      const numAmount = Number(payload.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Valid prepayment amount is required.');
      }

      let loan;
      if (loanId) {
        try { loan = await Loan.findOne({ _id: loanId, user: userId }); } catch (e) {}
      }
      if (!loan && loanName) {
        loan = await Loan.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${loanName.trim()}$`, 'i') },
          isActive: true,
        });
      }
      if (!loan) {
        loan = await Loan.findOne({ user: userId, isActive: true });
      }
      if (!loan) {
        throw new Error('No active loan found to prepay.');
      }

      loan.payments.push({
        date: new Date(),
        amount: numAmount,
        principal: numAmount,
        interest: 0,
        note: 'Principal prepayment via Capise AI Copilot',
      });
      await loan.save();

      // Deduct from account
      let account = await Account.findOne({ user: userId, type: 'Bank', isArchived: false });
      if (account) {
        account.currentBalance -= numAmount;
        await account.save();
      }

      return {
        success: true,
        actionType,
        message: `Prepaid ₹${numAmount.toLocaleString('en-IN')} principal on "${loan.name}". Outstanding principal reduced!`,
        data: loan,
      };
    }

    // 7. GENERATE WHATSAPP REMINDER
    case 'GENERATE_WHATSAPP_REMINDER': {
      const personName = payload.personName || payload.person || 'friend';
      const amount = payload.amount || 0;
      const dueDate = payload.dueDate || '';
      const reminderText = payload.customMessage || `Hi ${personName}! Hope you are doing well. Just a gentle reminder regarding the friendly loan of ₹${Number(amount || 0).toLocaleString('en-IN')}${dueDate ? ` due by ${dueDate}` : ''}. Let me know whenever convenient!`;
      const encodedText = encodeURIComponent(reminderText);
      const whatsappUrl = `https://wa.me/?text=${encodedText}`;

      return {
        success: true,
        actionType,
        message: `WhatsApp reminder link generated for ${personName}.`,
        data: {
          whatsappUrl,
          reminderText,
        },
      };
    }

    // 8. CANCEL / PAUSE ZOMBIE SUBSCRIPTION
    case 'CANCEL_SUBSCRIPTION': {
      const ruleId = payload.ruleId || payload.id;
      const subName = payload.subscriptionName || payload.name;
      let rule;
      if (ruleId) {
        try { rule = await RecurringRule.findOne({ _id: ruleId, user: userId }); } catch (e) {}
      }
      if (!rule && subName) {
        rule = await RecurringRule.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${subName.trim()}$`, 'i') },
        });
      }
      if (!rule) {
        rule = await RecurringRule.findOne({ user: userId, isActive: true });
      }
      if (!rule) {
        throw new Error('Subscription rule not found.');
      }

      rule.isActive = false;
      await rule.save();

      const savings = rule.frequency === 'yearly' ? rule.amount : rule.amount * 12;

      return {
        success: true,
        actionType,
        message: `Cancelled/Paused subscription "${rule.name}". Unlocked ~₹${savings.toLocaleString('en-IN')}/yr in annual savings!`,
        data: rule,
      };
    }

    // 9. ACKNOWLEDGE PRICE HIKE
    case 'ACKNOWLEDGE_PRICE_HIKE': {
      const ruleId = payload.ruleId || payload.id;
      const subName = payload.subscriptionName || payload.name;
      const newAmount = Number(payload.newAmount || payload.amount);

      let rule;
      if (ruleId) {
        try { rule = await RecurringRule.findOne({ _id: ruleId, user: userId }); } catch (e) {}
      }
      if (!rule && subName) {
        rule = await RecurringRule.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${subName.trim()}$`, 'i') },
        });
      }
      if (!rule) {
        throw new Error('Subscription rule not found.');
      }

      if (newAmount && newAmount > 0) {
        rule.amount = newAmount;
      }
      await rule.save();

      return {
        success: true,
        actionType,
        message: `Acknowledged new price for "${rule.name}" at ₹${rule.amount.toLocaleString('en-IN')}.`,
        data: rule,
      };
    }

    // 10. EXECUTE AUTO-REBALANCE TRANSFER (OVERDRAFT SHIELD)
    case 'EXECUTE_AUTO_REBALANCE': {
      const fromAccSearch = payload.fromAccountId || payload.fromAccountName || payload.fromAccount;
      const toAccSearch = payload.toAccountId || payload.toAccountName || payload.toAccount;
      const numAmount = Number(payload.amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Valid rebalance transfer amount is required.');
      }

      let fromAccount = null;
      let toAccount = null;

      if (fromAccSearch) {
        try { fromAccount = await Account.findOne({ _id: fromAccSearch, user: userId }); } catch (e) {}
        if (!fromAccount) {
          fromAccount = await Account.findOne({
            user: userId,
            name: { $regex: new RegExp(`^${fromAccSearch.trim()}$`, 'i') },
            isArchived: false,
          });
        }
      }
      if (!fromAccount) {
        fromAccount = await Account.findOne({ user: userId, isArchived: false }).sort({ currentBalance: -1 });
      }

      if (toAccSearch) {
        try { toAccount = await Account.findOne({ _id: toAccSearch, user: userId }); } catch (e) {}
        if (!toAccount) {
          toAccount = await Account.findOne({
            user: userId,
            name: { $regex: new RegExp(`^${toAccSearch.trim()}$`, 'i') },
            isArchived: false,
          });
        }
      }
      if (!toAccount) {
        toAccount = await Account.findOne({ user: userId, type: 'Bank', isArchived: false }).sort({ currentBalance: 1 });
      }

      if (!fromAccount || !toAccount) {
        throw new Error('Source or Destination account could not be found.');
      }

      if (fromAccount._id.toString() === toAccount._id.toString()) {
        throw new Error('Source and destination accounts must be different.');
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
      });

      await Promise.all([fromAccount.save(), toAccount.save(), txn.save()]);

      return {
        success: true,
        actionType,
        message: `Transferred ₹${numAmount.toLocaleString('en-IN')} from ${fromAccount.name} to ${toAccount.name}! Low-balance breach averted.`,
        data: {
          fromAccount: { name: fromAccount.name, newBalance: fromAccount.currentBalance },
          toAccount: { name: toAccount.name, newBalance: toAccount.currentBalance },
          transactionId: txn._id,
        },
      };
    }

    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
};
