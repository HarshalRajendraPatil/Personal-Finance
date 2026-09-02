import mongoose from 'mongoose';

const salaryDistributionPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    month: {
      type: String, // 'YYYY-MM', e.g. '2026-09'
      required: true,
      index: true,
    },
    totalIncome: {
      type: Number,
      required: true,
      min: 0,
    },
    sourceAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'EXECUTED', 'DISMISSED'],
      default: 'PENDING',
      index: true,
    },
    isExecuted: {
      type: Boolean,
      default: false,
    },
    executedAt: {
      type: Date,
      default: null,
    },
    splitPercentages: {
      needsPct: { type: Number, default: 50, min: 0, max: 100 },
      goalsPct: { type: Number, default: 20, min: 0, max: 100 },
      discretionaryPct: { type: Number, default: 30, min: 0, max: 100 },
    },
    allocations: {
      needs: {
        total: { type: Number, default: 0 },
        items: [
          {
            id: { type: String },
            type: { type: String, enum: ['RENT', 'EMI', 'BILL', 'BUDGET', 'OTHER'], default: 'BILL' },
            title: { type: String, required: true },
            amount: { type: Number, required: true },
            dueDate: { type: String, default: null },
            accountName: { type: String, default: 'Default Account' },
            isLocked: { type: Boolean, default: true },
          },
        ],
      },
      goals: {
        total: { type: Number, default: 0 },
        items: [
          {
            id: { type: String },
            targetId: { type: String }, // Goal ID or Investment ID
            type: { type: String, enum: ['EMERGENCY_FUND', 'GOAL', 'SIP', 'INVESTMENT'], default: 'GOAL' },
            title: { type: String, required: true },
            proposedAmount: { type: Number, required: true },
            targetAmount: { type: Number, default: 0 },
            currentAmount: { type: Number, default: 0 },
            isSelected: { type: Boolean, default: true },
          },
        ],
      },
      discretionary: {
        total: { type: Number, default: 0 },
        dailySafeToSpend: { type: Number, default: 0 },
        remainingDays: { type: Number, default: 30 },
        notes: { type: String, default: '' },
      },
    },
    executionSummary: {
      totalAllocated: { type: Number, default: 0 },
      goalsFunded: [
        {
          goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
          name: { type: String },
          amount: { type: Number },
        },
      ],
      investmentsFunded: [
        {
          investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment' },
          name: { type: String },
          amount: { type: Number },
        },
      ],
      safeToSpendResult: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

salaryDistributionPlanSchema.index({ user: 1, month: 1, status: 1 });

const SalaryDistributionPlan = mongoose.model('SalaryDistributionPlan', salaryDistributionPlanSchema);
export default SalaryDistributionPlan;
