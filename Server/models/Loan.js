import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  principal: { type: Number, default: 0 }, // principal component
  interest: { type: Number, default: 0 },  // interest component
  note: { type: String, default: '' },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
}, { _id: true });

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  lender: { type: String, default: '' }, // Bank / Person
  type: {
    type: String,
    enum: ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Gold Loan', 'Business Loan', 'Other'],
    default: 'Personal Loan',
  },
  principal: { type: Number, required: true, min: 0 },
  interestRate: { type: Number, required: true, min: 0 }, // annual %
  tenureMonths: { type: Number, required: true, min: 1 },
  startDate: { type: Date, required: true },
  emiAmount: { type: Number, default: 0 },   // stored for quick display
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  payments: [paymentSchema],
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual: total principal paid
loanSchema.virtual('paidPrincipal').get(function () {
  return this.payments.reduce((s, p) => s + (p.principal || 0), 0);
});

// Virtual: total interest paid
loanSchema.virtual('paidInterest').get(function () {
  return this.payments.reduce((s, p) => s + (p.interest || 0), 0);
});

// Virtual: remaining principal (for net worth liabilities)
loanSchema.virtual('remainingPrincipal').get(function () {
  return Math.max(0, this.principal - this.paidPrincipal);
});

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;
