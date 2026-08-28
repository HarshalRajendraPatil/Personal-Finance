import mongoose from 'mongoose';

const repaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
}, { _id: true });

const lendingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  person: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['lent', 'borrowed'], // lent = I gave money (owed to me), borrowed = I took money (I owe)
    required: true,
  },
  amount: { type: Number, required: true, min: 0.01 }, // Original principal
  currency: { type: String, default: 'INR' },
  dueDate: { type: Date, default: null },
  notes: { type: String, default: '' },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null }, // Account used for the original lending
  repayments: [repaymentSchema],
  isSettled: { type: Boolean, default: false },
  settledAt: { type: Date, default: null },
  // Optional interest
  interestRate: { type: Number, default: 0 }, // annual % rate, 0 = no interest
}, { timestamps: true });

// Virtual: total repaid
lendingSchema.virtual('totalRepaid').get(function () {
  return this.repayments.reduce((sum, r) => sum + r.amount, 0);
});

// Virtual: outstanding amount
lendingSchema.virtual('outstanding').get(function () {
  return Math.max(0, this.amount - this.repayments.reduce((sum, r) => sum + r.amount, 0));
});

lendingSchema.set('toJSON', { virtuals: true });
lendingSchema.set('toObject', { virtuals: true });

const Lending = mongoose.model('Lending', lendingSchema);
export default Lending;
