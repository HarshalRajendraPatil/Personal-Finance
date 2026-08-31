import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';

// GET /api/reports/summary?startDate=&endDate=
export const getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const result = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: start, $lte: end },
          type: { $in: ['Income', 'Expense'] },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const income = result.find((r) => r._id === 'Income')?.total || 0;
    const expenses = result.find((r) => r._id === 'Expense')?.total || 0;
    const incomeCount = result.find((r) => r._id === 'Income')?.count || 0;
    const expenseCount = result.find((r) => r._id === 'Expense')?.count || 0;
    const net = income - expenses;
    const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

    res.json({ income, expenses, net, savingsRate, incomeCount, expenseCount, startDate: start, endDate: end });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reports/by-category?startDate=&endDate=&type=Expense
export const getByCategory = async (req, res) => {
  try {
    const { startDate, endDate, type = 'Expense' } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const result = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: start, $lte: end },
          type,
          category: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDoc',
        },
      },
      { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          total: 1,
          count: 1,
          category: {
            _id: '$categoryDoc._id',
            name: '$categoryDoc.name',
            icon: '$categoryDoc.icon',
            color: '$categoryDoc.color',
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = result.reduce((s, i) => s + i.total, 0);
    const withPercent = result.map((item) => ({
      ...item,
      percentage: grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0,
    }));

    res.json(withPercent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reports/monthly-trend?months=6
export const getMonthlyTrend = async (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const result = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate },
          type: { $in: ['Income', 'Expense'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build a structured monthly array
    const monthsMap = {};
    result.forEach((item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthsMap[key]) monthsMap[key] = { month: key, income: 0, expenses: 0 };
      if (item._id.type === 'Income') monthsMap[key].income = item.total;
      else monthsMap[key].expenses = item.total;
    });

    res.json(Object.values(monthsMap));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reports/export-csv?startDate=&endDate=&type=&account=
export const exportCSV = async (req, res) => {
  try {
    const { startDate, endDate, type, account } = req.query;

    const query = { user: req.user._id };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        query.date.$lte = new Date(endDate);
        query.date.$lte.setHours(23, 59, 59, 999);
      }
    }
    if (type) query.type = type;
    if (account) query.account = account;

    const transactions = await Transaction.find(query)
      .populate('account', 'name')
      .populate('toAccount', 'name')
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .sort({ date: -1 })
      .lean();

    const headers = ['Date', 'Type', 'Amount', 'Account', 'To Account', 'Category', 'Subcategory', 'Merchant', 'Notes', 'Tags'];
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleDateString('en-IN'),
      t.type,
      t.amount,
      t.account?.name || '',
      t.toAccount?.name || '',
      t.category?.name || '',
      t.subcategory?.name || '',
      t.merchant || '',
      (t.notes || '').replace(/,/g, ';'),
      (t.tags || []).join('; '),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
