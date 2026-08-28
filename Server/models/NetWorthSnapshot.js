import mongoose from 'mongoose';

const netWorthSnapshotSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, default: Date.now },
  // Asset components
  cashAndBankBalances: { type: Number, default: 0 },
  investmentValue: { type: Number, default: 0 },
  otherAssets: { type: Number, default: 0 },
  totalAssets: { type: Number, default: 0 },
  // Liability components
  loanBalances: { type: Number, default: 0 },
  creditCardBalances: { type: Number, default: 0 },
  otherLiabilities: { type: Number, default: 0 },
  totalLiabilities: { type: Number, default: 0 },
  // Final
  netWorth: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true });

const NetWorthSnapshot = mongoose.model('NetWorthSnapshot', netWorthSnapshotSchema);
export default NetWorthSnapshot;
