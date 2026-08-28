import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
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
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  // Budget period
  period: {
    type: String,
    enum: ['monthly', 'weekly', 'yearly', 'custom'],
    default: 'monthly',
  },
  // For custom period
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
  // Budget limit
  limit: {
    type: Number,
    required: true,
    min: 0.01,
  },
  // Alert threshold as a percentage (e.g. 80 means alert at 80% spent)
  alertThreshold: {
    type: Number,
    default: 80,
    min: 1,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // rollover: carry unused budget to next month
  rollover: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;
