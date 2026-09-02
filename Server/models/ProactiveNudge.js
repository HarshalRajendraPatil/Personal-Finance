import mongoose from 'mongoose';

const proactiveNudgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'PREDICTIVE_BUDGET_EXHAUSTION',
        'DUPLICATE_TRANSACTION_ALERT',
        'SAFE_TO_SPEND_NUDGE',
        'LIQUIDITY_BUFFER_WARNING',
        'IDLE_CASH_RECOMMENDATION',
        'ZOMBIE_SUBSCRIPTION_DETECTED',
        'ANOMALOUS_SPEND_ALERT',
        'CREDIT_UTILIZATION_WARNING',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL', 'SUCCESS'],
      default: 'INFO',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed, // Stores calculation details (e.g. burn rate, exhaustion date, accounts)
    },
    isDismissed: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionLabel: {
      type: String, // e.g. "Adjust Budget", "Verify Charge", "Transfer Funds"
    },
    actionUrl: {
      type: String, // e.g. "/budgets", "/transactions", "/accounts"
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true }
);

proactiveNudgeSchema.index({ user: 1, isDismissed: 1, createdAt: -1 });

export default mongoose.model('ProactiveNudge', proactiveNudgeSchema);
