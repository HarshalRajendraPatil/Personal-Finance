import mongoose from 'mongoose';

const recurringRuleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['Income', 'Expense', 'Transfer'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  merchant: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
  },
  nextRunDate: {
    type: Date,
    required: true,
  },
  // endDate: optional — after this date, rule becomes inactive
  endDate: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  autoPost: {
    // If true, auto-creates transaction on due date via cron
    // If false, user must manually confirm / "Mark as Paid"
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

recurringRuleSchema.index({ user: 1, isActive: 1, nextRunDate: 1 });

const RecurringRule = mongoose.model('RecurringRule', recurringRuleSchema);
export default RecurringRule;

