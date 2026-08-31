import mongoose from 'mongoose';

const monthlyReviewDigestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    month: {
      type: String, // 'YYYY-MM', e.g. '2026-08'
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    monthNumber: {
      type: Number, // 0-11 or 1-12
      required: true,
    },
    monthName: {
      type: String, // e.g. 'August 2026'
      required: true,
    },
    summary: {
      totalIncome: { type: Number, default: 0 },
      totalExpense: { type: Number, default: 0 },
      netCashFlow: { type: Number, default: 0 },
      savingsRate: { type: Number, default: 0 }, // in %
    },
    financialHealthScore: {
      score: { type: Number, default: 75 }, // 0-100
      grade: { type: String, default: 'B+' }, // A+, A, B, C, D
      status: { type: String, default: 'Good' },
    },
    topCategories: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        percentage: { type: Number, required: true },
        color: { type: String, default: '#4f46e5' },
        icon: { type: String, default: 'Tag' },
      },
    ],
    anomalies: [
      {
        category: { type: String, required: true },
        current: { type: Number, required: true },
        average: { type: Number, required: true },
        increase: { type: Number, required: true },
      },
    ],
    budgetPerformance: [
      {
        name: { type: String, required: true },
        limit: { type: Number, required: true },
        spent: { type: Number, required: true },
        percentage: { type: Number, required: true },
        status: { type: String, enum: ['safe', 'near_limit', 'exceeded'], default: 'safe' },
      },
    ],
    netWorthChange: {
      startNetWorth: { type: Number, default: 0 },
      endNetWorth: { type: Number, default: 0 },
      delta: { type: Number, default: 0 },
      deltaPercentage: { type: Number, default: 0 },
    },
    largestTransactions: [
      {
        merchant: { type: String },
        amount: { type: Number },
        date: { type: Date },
        categoryName: { type: String },
      },
    ],
    insights: [{ type: String }],
    recommendations: [{ type: String }],
    transactionCount: { type: Number, default: 0 },
    isAutomated: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound Unique Index: One digest per user per month
monthlyReviewDigestSchema.index({ user: 1, month: 1 }, { unique: true });
monthlyReviewDigestSchema.index({ user: 1, year: -1, monthNumber: -1 });

const MonthlyReviewDigest = mongoose.model('MonthlyReviewDigest', monthlyReviewDigestSchema);
export default MonthlyReviewDigest;
