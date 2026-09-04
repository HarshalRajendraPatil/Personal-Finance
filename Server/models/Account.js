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
  creditLimit: {
    type: Number,
    default: null,
  },
  issuer: {
    type: String,
    default: '',
  },
  last4Digits: {
    type: String,
    default: '',
  },
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

accountSchema.index({ user: 1, isArchived: 1 });
accountSchema.index({ user: 1, type: 1 });

// Ensure creditLimit and card-specific fields are strictly applied to Credit Cards only
accountSchema.pre('validate', function() {
  if (this.type !== 'Credit Card') {
    this.creditLimit = null;
    this.issuer = '';
    this.last4Digits = '';
    this.billingCycleDay = null;
    this.paymentDueDay = null;
  } else {
    if (this.creditLimit !== null && this.creditLimit !== undefined) {
      const num = Number(this.creditLimit);
      this.creditLimit = !isNaN(num) && num >= 0 ? num : null;
    }
    if (this.billingCycleDay !== null && this.billingCycleDay !== undefined) {
      const day = parseInt(this.billingCycleDay, 10);
      this.billingCycleDay = !isNaN(day) && day >= 1 && day <= 31 ? day : null;
    }
    if (this.paymentDueDay !== null && this.paymentDueDay !== undefined) {
      const day = parseInt(this.paymentDueDay, 10);
      this.paymentDueDay = !isNaN(day) && day >= 1 && day <= 31 ? day : null;
    }
  }
});

const Account = mongoose.model('Account', accountSchema);
export default Account;

