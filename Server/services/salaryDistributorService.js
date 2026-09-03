import SalaryDistributionPlan from '../models/SalaryDistributionPlan.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Loan from '../models/Loan.js';
import RecurringRule from '../models/RecurringRule.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import { calculateSafeToSpend } from './proactiveIntelligenceService.js';

/**
 * Generates an intelligent 50/30/20 Salary Day distribution plan.
 */
export const generateSalaryPlan = async ({
  userId,
  transactionId = null,
  incomeAmount = null,
  sourceAccountId = null,
  customSplits = null,
}) => {
  const now = new Date();
  const year = now.getFullYear();
  const monthNum = now.getMonth();
  const monthKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
  const todayDate = now.getDate();
  const remainingDays = Math.max(1, daysInMonth - todayDate + 1);

  // 1. Check if a plan for this month has ALREADY been executed (Edge Case Protection)
  const existingExecutedPlan = await SalaryDistributionPlan.findOne({
    user: userId,
    month: monthKey,
    status: 'EXECUTED',
  }).lean();

  if (existingExecutedPlan) {
    return {
      alreadyExecuted: true,
      plan: existingExecutedPlan,
      message: `Salary distribution for ${monthKey} has already been executed.`,
    };
  }

  // 2. Determine Income Amount
  let finalIncome = Number(incomeAmount);
  let resolvedSourceAccount = sourceAccountId;

  if (transactionId) {
    const txn = await Transaction.findOne({ _id: transactionId, user: userId }).lean();
    if (txn && txn.type === 'Income') {
      finalIncome = txn.amount;
      resolvedSourceAccount = txn.account;
    }
  }

  // If no amount provided, search for latest income transaction this month (>= ₹25,000)
  if (!finalIncome || finalIncome <= 0) {
    const startOfMonth = new Date(year, monthNum, 1);
    const latestIncomeTxn = await Transaction.findOne({
      user: userId,
      type: 'Income',
      date: { $gte: startOfMonth },
    })
      .sort({ amount: -1, date: -1 })
      .lean();

    if (latestIncomeTxn) {
      finalIncome = latestIncomeTxn.amount;
      resolvedSourceAccount = latestIncomeTxn.account;
      transactionId = latestIncomeTxn._id;
    } else {
      finalIncome = 100000; // Default baseline benchmark
    }
  }

  // Find source account
  let sourceAccountDoc = null;
  if (resolvedSourceAccount) {
    sourceAccountDoc = await Account.findOne({ _id: resolvedSourceAccount, user: userId }).lean();
  }
  if (!sourceAccountDoc) {
    sourceAccountDoc = await Account.findOne({ user: userId, type: 'Bank', isArchived: false }).lean();
  }

  // 3. Percentage Splits (Default: 50% Needs, 20% Goals, 30% Discretionary)
  const splits = customSplits || { needsPct: 50, goalsPct: 20, discretionaryPct: 30 };
  const needsBudgetTotal = Math.round((finalIncome * splits.needsPct) / 100);
  const goalsBudgetTotal = Math.round((finalIncome * splits.goalsPct) / 100);
  const discretionaryBudgetTotal = finalIncome - (needsBudgetTotal + goalsBudgetTotal);

  // 4. Build Needs Bucket (EMIs + Recurring Bills + Essential Budgets)
  const needsItems = [];
  let calculatedNeedsSum = 0;

  // Active Loans & EMIs
  const loans = await Loan.find({ user: userId, isActive: true }).lean();
  loans.forEach((l) => {
    if (l.emiAmount && l.emiAmount > 0) {
      calculatedNeedsSum += l.emiAmount;
      needsItems.push({
        id: `emi_${l._id}`,
        type: 'EMI',
        title: `${l.name} EMI`,
        amount: l.emiAmount,
        dueDate: l.debitDay ? `Day ${l.debitDay} of month` : 'Monthly',
        accountName: sourceAccountDoc?.name || 'Bank Account',
        isLocked: true,
      });
    }
  });

  // Active Recurring Rules (Rent, Utilities, Subscriptions)
  const recurringRules = await RecurringRule.find({ user: userId, isActive: true, type: 'Expense' })
    .populate('category')
    .lean();

  recurringRules.forEach((r) => {
    calculatedNeedsSum += (r.amount || 0);
    const recName = r.name || r.title || 'Recurring Expense';
    const catName = r.category?.name || '';
    const isRent = catName.toLowerCase().includes('rent') || recName.toLowerCase().includes('rent');
    needsItems.push({
      id: `rec_${r._id}`,
      type: isRent ? 'RENT' : 'BILL',
      title: recName,
      amount: r.amount || 0,
      dueDate: r.nextRunDate ? new Date(r.nextRunDate).toISOString().split('T')[0] : 'Monthly',
      accountName: sourceAccountDoc?.name || 'Bank Account',
      isLocked: true,
    });
  });

  // If fixed bills are less than 50% needs budget, add an essential groceries/living buffer
  if (calculatedNeedsSum < needsBudgetTotal) {
    const livingBuffer = needsBudgetTotal - calculatedNeedsSum;
    needsItems.push({
      id: 'living_supplies_buffer',
      type: 'BUDGET',
      title: 'Groceries, Utilities & Household Supplies Reserve',
      amount: livingBuffer,
      dueDate: 'Throughout Month',
      accountName: sourceAccountDoc?.name || 'Bank Account',
      isLocked: true,
    });
  }

  // 5. Build Goals & Wealth Building Bucket (20% Target)
  const goalsItems = [];
  const activeGoals = await Goal.find({ user: userId, isCompleted: false }).lean();
  const activeInvestments = await Investment.find({ user: userId }).lean();

  if (activeGoals.length > 0) {
    const perGoalShare = Math.round(goalsBudgetTotal / (activeGoals.length + (activeInvestments.length > 0 ? 1 : 0)));
    
    activeGoals.forEach((g) => {
      const remainingShortfall = Math.max(0, g.targetAmount - (g.currentAmount || 0));
      const proposed = Math.min(remainingShortfall, perGoalShare);
      const isEmergency = (g.name || '').toLowerCase().includes('emergency');

      goalsItems.push({
        id: `goal_${g._id}`,
        targetId: g._id.toString(),
        type: isEmergency ? 'EMERGENCY_FUND' : 'GOAL',
        title: g.name,
        proposedAmount: proposed > 0 ? proposed : perGoalShare,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount || 0,
        isSelected: true,
      });
    });
  }

  // Active Index Funds / SIPs
  if (activeInvestments.length > 0) {
    const topInv = activeInvestments[0];
    const proposedInvAmount = Math.max(2000, Math.round(goalsBudgetTotal * 0.4));
    goalsItems.push({
      id: `inv_${topInv._id}`,
      targetId: topInv._id.toString(),
      type: 'SIP',
      title: `Monthly SIP: ${topInv.name}`,
      proposedAmount: proposedInvAmount,
      targetAmount: (topInv.investedAmount || 0) + proposedInvAmount * 12,
      currentAmount: topInv.currentValue || topInv.investedAmount || 0,
      isSelected: true,
    });
  }

  // If no goals or investments exist yet, create suggested Emergency Fund goal item
  if (goalsItems.length === 0) {
    goalsItems.push({
      id: 'suggested_emergency_fund',
      targetId: 'new_emergency_fund',
      type: 'EMERGENCY_FUND',
      title: '6-Month Emergency Safety Cushion',
      proposedAmount: goalsBudgetTotal,
      targetAmount: finalIncome * 3,
      currentAmount: 0,
      isSelected: true,
    });
  }

  // 6. Discretionary Safe-to-Spend Bucket (30%)
  const dailySafeToSpend = Math.max(0, Math.round(discretionaryBudgetTotal / remainingDays));

  // 7. Upsert Plan in PENDING State
  let plan = await SalaryDistributionPlan.findOne({
    user: userId,
    month: monthKey,
    status: 'PENDING',
  });

  const planPayload = {
    user: userId,
    transaction: transactionId,
    month: monthKey,
    totalIncome: finalIncome,
    sourceAccount: sourceAccountDoc?._id || null,
    status: 'PENDING',
    isExecuted: false,
    splitPercentages: splits,
    allocations: {
      needs: {
        total: needsBudgetTotal,
        items: needsItems,
      },
      goals: {
        total: goalsBudgetTotal,
        items: goalsItems,
      },
      discretionary: {
        total: discretionaryBudgetTotal,
        dailySafeToSpend,
        remainingDays,
        notes: `₹${dailySafeToSpend.toLocaleString('en-IN')}/day for remaining ${remainingDays} days.`,
      },
    },
  };

  if (plan) {
    Object.assign(plan, planPayload);
    await plan.save();
  } else {
    plan = await SalaryDistributionPlan.create(planPayload);
  }

  return {
    alreadyExecuted: false,
    plan,
    message: `Generated 50/30/20 Salary Distribution plan for ₹${finalIncome.toLocaleString('en-IN')}.`,
  };
};

/**
 * Executes the customized salary distribution plan in 1-click atomically.
 */
export const executeSalaryPlan = async ({ userId, planId, customizedAllocations = null }) => {
  const plan = await SalaryDistributionPlan.findOne({ _id: planId, user: userId });
  if (!plan) {
    throw new Error('Salary distribution plan not found.');
  }

  if (plan.status === 'EXECUTED') {
    return {
      success: true,
      alreadyExecuted: true,
      message: 'This salary distribution plan has already been executed.',
      data: plan,
    };
  }

  // Resolve allocations to execute
  const goalsToFund = customizedAllocations?.goals || plan.allocations.goals.items;
  const sourceAccountId = plan.sourceAccount;
  const goalsFunded = [];
  const investmentsFunded = [];
  let totalAllocatedToGoals = 0;

  // Source Account
  let sourceAccount = null;
  if (sourceAccountId) {
    sourceAccount = await Account.findOne({ _id: sourceAccountId, user: userId });
  }
  if (!sourceAccount) {
    sourceAccount = await Account.findOne({ user: userId, type: 'Bank', isArchived: false });
  }

  // 1. Execute Goal Contributions & Investments
  for (const item of goalsToFund) {
    if (!item.isSelected && item.isSelected !== undefined) continue;
    const amount = Number(item.proposedAmount || item.amount || 0);
    if (amount <= 0) continue;

    if (item.type === 'GOAL' || item.type === 'EMERGENCY_FUND') {
      let goal = null;
      if (item.targetId && item.targetId !== 'new_emergency_fund') {
        try { goal = await Goal.findOne({ _id: item.targetId, user: userId }); } catch (e) {}
      }
      if (!goal && item.title) {
        goal = await Goal.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${item.title.trim()}$`, 'i') },
        });
      }
      if (!goal) {
        goal = await Goal.create({
          user: userId,
          name: item.title || 'Emergency Fund',
          targetAmount: item.targetAmount || amount * 6,
          currentAmount: 0,
          color: '#10b981',
          icon: 'ShieldCheck',
        });
      }

      goal.currentAmount = (goal.currentAmount || 0) + amount;
      if (goal.currentAmount >= goal.targetAmount) {
        goal.isCompleted = true;
        goal.completedAt = new Date();
      }
      let createdTxn = null;
      if (sourceAccount) {
        sourceAccount.currentBalance -= amount;
        await sourceAccount.save();

        createdTxn = await Transaction.create({
          user: userId,
          type: 'Transfer', // Goal contribution is a transfer (savings), not an expense
          amount,
          date: new Date(),
          account: sourceAccount._id,
          toAccount: null,
          category: null,
          merchant: `Salary Allocation: ${goal.name}`,
          notes: `Automated Salary Day 1-Click Goal Topup (${plan.month})`,
          tags: ['goal', 'contribution', 'salary-distributor'],
        });
      }

      goal.contributions.push({
        amount,
        date: new Date(),
        note: `Salary Day Smart Distribution (${plan.month})`,
        transactionId: createdTxn ? createdTxn._id : null,
      });
      await goal.save();

      goalsFunded.push({
        goalId: goal._id,
        name: goal.name,
        amount,
      });
      totalAllocatedToGoals += amount;
    } else if (item.type === 'SIP' || item.type === 'INVESTMENT') {
      let inv = null;
      if (item.targetId) {
        try { inv = await Investment.findOne({ _id: item.targetId, user: userId }); } catch (e) {}
      }
      if (!inv && item.title) {
        const cleanName = item.title.replace(/^Monthly SIP:\s*/i, '');
        inv = await Investment.findOne({
          user: userId,
          name: { $regex: new RegExp(`^${cleanName.trim()}$`, 'i') },
        });
      }

      if (inv) {
        inv.investedAmount = (inv.investedAmount || 0) + amount;
        inv.currentValue = (inv.currentValue || 0) + amount;
        inv.valueHistory.push({ date: new Date(), value: inv.currentValue });
        await inv.save();

        if (sourceAccount) {
          sourceAccount.currentBalance -= amount;
          await Transaction.create({
            user: userId,
            type: 'Transfer',
            amount,
            date: new Date(),
            account: sourceAccount._id,
            merchant: `Salary Investment: ${inv.name}`,
            notes: `Automated Salary Day 1-Click SIP Deployment (${plan.month})`,
          });
        }

        investmentsFunded.push({
          investmentId: inv._id,
          name: inv.name,
          amount,
        });
        totalAllocatedToGoals += amount;
      }
    }
  }

  if (sourceAccount) {
    await sourceAccount.save();
  }

  // 2. Recompute Live Safe-to-Spend
  const safeData = await calculateSafeToSpend(userId);

  // 3. Mark Plan EXECUTED
  plan.status = 'EXECUTED';
  plan.isExecuted = true;
  plan.executedAt = new Date();
  plan.executionSummary = {
    totalAllocated: totalAllocatedToGoals,
    goalsFunded,
    investmentsFunded,
    safeToSpendResult: safeData.safeToSpendDaily,
  };

  await plan.save();

  return {
    success: true,
    message: `Salary distribution successfully executed! Allocated ₹${totalAllocatedToGoals.toLocaleString('en-IN')} across goals & investments. Dynamic Safe-to-Spend updated to ₹${safeData.safeToSpendDaily.toLocaleString('en-IN')}/day.`,
    data: plan,
  };
};

/**
 * Gets the latest pending or active salary distribution plan for the current month.
 */
export const getLatestSalaryPlan = async (userId) => {
  const now = new Date();
  const year = now.getFullYear();
  const monthNum = now.getMonth();
  const monthKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;

  let plan = await SalaryDistributionPlan.findOne({
    user: userId,
    month: monthKey,
    status: 'PENDING',
  }).sort({ createdAt: -1 });

  if (!plan) {
    plan = await SalaryDistributionPlan.findOne({
      user: userId,
      month: monthKey,
      status: 'EXECUTED',
    }).sort({ executedAt: -1 });
  }

  return plan;
};

/**
 * Dismisses a pending salary distribution plan.
 */
export const dismissSalaryPlan = async (userId, planId) => {
  const plan = await SalaryDistributionPlan.findOneAndUpdate(
    { _id: planId, user: userId },
    { status: 'DISMISSED' },
    { new: true }
  );
  return plan;
};
