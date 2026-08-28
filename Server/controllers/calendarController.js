import Transaction from '../models/Transaction.js';
import RecurringRule from '../models/RecurringRule.js';
import Loan from '../models/Loan.js';

export const getCalendarEvents = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 1. Fetch Past/Present Transactions
    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: start, $lte: end }
    }).populate('category').populate('account');

    // 2. Fetch Active Recurring Rules for Future events
    const recurring = await RecurringRule.find({
      user: req.user._id,
      isActive: true
    }).populate('category').populate('account');

    // 3. Fetch Active Loans for Future EMIs
    const loans = await Loan.find({
      user: req.user._id,
      isActive: true
    }).populate('account');

    // Transform Transactions
    const events = transactions.map(t => ({
      id: t._id.toString(),
      title: t.merchant || t.description || 'Transaction',
      date: t.date, // ISO String
      amount: t.amount,
      type: t.type,
      status: t.status || 'Completed',
      category: t.category ? t.category.name : null,
      account: t.account ? t.account.name : null,
      source: 'Transaction',
      isFuture: false
    }));

    // Helper to add future recurring events
    recurring.forEach(rule => {
      let current = new Date(rule.nextRunDate || start);
      
      while (current <= end) {
        // Stop if we surpass the rule's end date
        if (rule.endDate && current > new Date(rule.endDate)) {
          break;
        }

        if (current >= start) {
          events.push({
            id: `rec_${rule._id}_${current.getTime()}`,
            title: rule.name || 'Recurring Payment',
            date: current.toISOString(),
            amount: rule.amount,
            type: rule.type,
            status: 'Scheduled',
            category: rule.category ? rule.category.name : null,
            account: rule.account ? rule.account.name : null,
            source: 'Recurring',
            isFuture: true
          });
        }
        
        // Advance 'current' based on frequency
        const freq = rule.frequency ? rule.frequency.toLowerCase() : '';
        if (freq === 'monthly') {
          current.setMonth(current.getMonth() + 1);
        } else if (freq === 'weekly') {
          current.setDate(current.getDate() + 7);
        } else if (freq === 'daily') {
          current.setDate(current.getDate() + 1);
        } else if (freq === 'yearly') {
          current.setFullYear(current.getFullYear() + 1);
        } else {
          break; // Avoid infinite loop
        }
      }
    });

    // Helper to add future EMI events
    loans.forEach(loan => {
      if (loan.emiAmount) {
        let loanStart = new Date(loan.startDate);
        let emiDate = new Date(start.getFullYear(), start.getMonth(), loanStart.getDate(), 0, 0, 0);
        
        if (emiDate < start) emiDate.setMonth(emiDate.getMonth() + 1);

        while (emiDate <= end) {
          events.push({
            id: `emi_${loan._id}_${emiDate.getTime()}`,
            title: `EMI: ${loan.name}`,
            date: emiDate.toISOString(),
            amount: loan.emiAmount,
            type: 'Expense',
            status: 'Scheduled',
            category: 'Debt Repayment',
            account: loan.account ? loan.account.name : null,
            source: 'Loan',
            isFuture: true
          });
          emiDate.setMonth(emiDate.getMonth() + 1);
        }
      }
    });

    // Sort all events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
