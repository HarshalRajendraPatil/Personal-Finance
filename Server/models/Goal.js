import mongoose from 'mongoose';

const contributionSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
}, { _id: true });

const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true, min: 0.01 },
  currentAmount: { type: Number, default: 0 },
  deadline: { type: Date, default: null },
  icon: { type: String, default: 'Target' },
  color: { type: String, default: '#3b82f6' },
  notes: { type: String, default: '' },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  contributions: [contributionSchema],
}, { timestamps: true });

goalSchema.virtual('percentage').get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

goalSchema.virtual('remaining').get(function () {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

goalSchema.set('toJSON', { virtuals: true });
goalSchema.set('toObject', { virtuals: true });

goalSchema.index({ user: 1, isCompleted: 1 });

const Goal = mongoose.model('Goal', goalSchema);
export default Goal;

