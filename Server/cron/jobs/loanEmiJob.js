import Loan from '../../models/Loan.js';
import Transaction from '../../models/Transaction.js';
import Account from '../../models/Account.js';
import Category from '../../models/Category.js';

// Helper to compute next EMI run date
export const calculateNextEmiDate = (currentDate, debitDay = 1) => {
  const date = new Date(currentDate || new Date());
  date.setMonth(date.getMonth() + 1);
  // Ensure valid day of month
  const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(debitDay || 1, maxDays));
  date.setHours(0, 0, 0, 0);
  return date;
};

// Process all due loan EMIs
export const processScheduledLoanEMIs = async (targetUserId = null) => {
  console.log('[CRON] Starting Loan EMI auto-debit engine...', new Date().toISOString());
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const query = {
      isActive: true,
      autoDebit: true,
      $or: [
        { nextEmiDate: { $lte: today } },
        { nextEmiDate: null },
      ],
    };
    if (targetUserId) query.user = targetUserId;

    const dueLoans = await Loan.find(query);
    console.log(`[CRON] Found ${dueLoans.length} loans due for EMI auto-debit.`);

    let processedCount = 0;

    for (const loan of dueLoans) {
      const emiAmount = loan.emiAmount;
      if (!emiAmount || emiAmount <= 0) continue;

      const paidPrincipal = loan.payments.reduce((s, p) => s + (p.principal || 0), 0);
      const remainingPrincipal = Math.max(0, loan.principal - paidPrincipal);

      if (remainingPrincipal <= 0) {
        loan.isActive = false;
        await loan.save();
        continue;
      }

      // Compute reducing-balance interest & principal component
      const r = (loan.interestRate || 0) / 100 / 12;
      const interest = parseFloat((remainingPrincipal * r).toFixed(2));
      const principal = parseFloat(Math.min(emiAmount - interest, remainingPrincipal).toFixed(2));

      // Resolve debit account
      const accountId = loan.debitAccount || loan.account;
      let transactionId = null;

      if (accountId) {
        const account = await Account.findById(accountId);
        if (account) {
          // Find or create Debt Repayment category
          let category = await Category.findOne({ user: loan.user, name: 'Debt Repayment' });
          if (!category) {
            category = await Category.create({
              user: loan.user,
              name: 'Debt Repayment',
              type: 'Expense',
              icon: 'Building2',
              color: '#f97316',
            });
          }

          // Create Expense Transaction
          const transaction = new Transaction({
            user: loan.user,
            type: 'Expense',
            amount: emiAmount,
            date: loan.nextEmiDate || new Date(),
            account: account._id,
            category: category._id,
            merchant: loan.lender || loan.name,
            notes: `[Auto-Debit EMI] ${loan.name} (Principal: ₹${principal}, Interest: ₹${interest})`,
            tags: ['loan', 'emi', 'auto-debit'],
          });
          await transaction.save();
          transactionId = transaction._id;

          // Atomically decrement account balance
          await Account.findByIdAndUpdate(account._id, { $inc: { currentBalance: -emiAmount } });
        }
      }

      // Record EMI payment in loan
      loan.payments.push({
        amount: emiAmount,
        date: loan.nextEmiDate || new Date(),
        principal,
        interest,
        note: `[Auto-Debit] Scheduled EMI installment`,
        transactionId,
      });

      // Check if loan is now fully paid off
      const totalPaidPrincipal = paidPrincipal + principal;
      if (totalPaidPrincipal >= loan.principal) {
        loan.isActive = false;
      }

      // Update next EMI run date to next month
      loan.nextEmiDate = calculateNextEmiDate(loan.nextEmiDate || new Date(), loan.debitDay || 1);
      await loan.save();

      processedCount++;
      console.log(`[CRON] Auto-debited EMI for loan: ${loan.name} (₹${emiAmount})`);
    }

    return { success: true, processedCount };
  } catch (error) {
    console.error('[CRON] Error processing loan EMIs:', error);
    return { success: false, error: error.message };
  }
};
