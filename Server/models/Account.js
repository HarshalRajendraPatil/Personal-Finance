import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Bank', 'Cash', 'Credit Card', 'UPI', 'FD', 'Other'],
    default: 'Bank',
  },
  openingBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  currentBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  },
  // Credit Card specific fields
  billingCycleDay: {
    type: Number, // Day of month statement generates (e.g. 15)
    default: null,
  },
  paymentDueDay: {
    type: Number, // Day of month payment is due (e.g. 5 of next month)
    default: null,
  },
}, {
  timestamps: true,
});

const Account = mongoose.model('Account', accountSchema);
export default Account;
