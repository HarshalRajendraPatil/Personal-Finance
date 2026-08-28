import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['Stocks', 'Mutual Fund', 'ETF', 'Fixed Deposit', 'PPF', 'EPF', 'NPS', 'Gold', 'Crypto', 'Bonds', 'Other'],
    required: true,
  },
  platform: { type: String, default: '' },
  quantity: { type: Number, default: null },
  buyPrice: { type: Number, default: null },
  investedAmount: { type: Number, required: true, min: 0 },
  currentValue: { type: Number, required: true, min: 0 },
  purchaseDate: { type: Date, default: null },
  maturityDate: { type: Date, default: null },
  notes: { type: String, default: '' },
  color: { type: String, default: '#3b82f6' },
  isActive: { type: Boolean, default: true },
  valueHistory: [{
    date: { type: Date, default: Date.now },
    value: { type: Number, required: true },
  }],
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

investmentSchema.virtual('profitLoss').get(function () {
  return this.currentValue - this.investedAmount;
});

investmentSchema.virtual('returnPct').get(function () {
  if (!this.investedAmount) return 0;
  return ((this.currentValue - this.investedAmount) / this.investedAmount) * 100;
});

const Investment = mongoose.model('Investment', investmentSchema);
export default Investment;
