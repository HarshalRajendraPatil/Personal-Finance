import mongoose from 'mongoose';

const taxRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  financialYear: {
    type: String,
    required: true,
  },
  salaryIncome: { type: Number, default: 0 },
  businessIncome: { type: Number, default: 0 },
  capitalGains: { type: Number, default: 0 },
  otherIncome: { type: Number, default: 0 },
  standardDeduction: { type: Number, default: 50000 },
  deduction80C: { type: Number, default: 0 },
  deduction80D: { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },
  tdsPaid: { type: Number, default: 0 },
  advanceTaxPaid: { type: Number, default: 0 },
  calculatedTaxLiability: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

taxRecordSchema.index({ user: 1, financialYear: 1 }, { unique: true });
const TaxRecord = mongoose.model('TaxRecord', taxRecordSchema);
export default TaxRecord;
