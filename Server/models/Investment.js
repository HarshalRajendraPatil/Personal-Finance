import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['Stocks', 'Mutual Fund', 'ETF', 'Fixed Deposit', 'PPF', 'EPF', 'NPS', 'Gold', 'Silver', 'Crypto', 'Bonds', 'Other'],
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
  // Automated SIP configuration
  isSip: { type: Boolean, default: false },
  sipAmount: { type: Number, default: 0, min: 0 },
  sipFrequency: { type: String, enum: ['monthly', 'weekly', 'quarterly'], default: 'monthly' },
  sipDay: { type: Number, default: 1, min: 1, max: 31 },
  nextSipDate: { type: Date, default: null },
  sipAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  fundingAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  // Live market price auto-sync
  symbol: { type: String, default: '', trim: true }, // AMFI scheme code (e.g. 120503) or crypto/stock ID
  autoSyncPrice: { type: Boolean, default: false },
  lastPriceSync: { type: Date, default: null },
  valueHistory: [{
    date: { type: Date, default: Date.now },
    value: { type: Number, required: true },
  }],
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Compound indexes for fast lookups and cron batch processing
investmentSchema.index({ user: 1, isActive: 1 });
investmentSchema.index({ user: 1, isSip: 1, nextSipDate: 1 });
investmentSchema.index({ user: 1, autoSyncPrice: 1 });

investmentSchema.virtual('profitLoss').get(function () {
  return this.currentValue - this.investedAmount;
});

investmentSchema.virtual('returnPct').get(function () {
  if (!this.investedAmount) return 0;
  return ((this.currentValue - this.investedAmount) / this.investedAmount) * 100;
});

const Investment = mongoose.model('Investment', investmentSchema);
export default Investment;
