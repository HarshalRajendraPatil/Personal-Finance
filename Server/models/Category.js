import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
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
    enum: ['Income', 'Expense'],
    required: true,
  },
  icon: {
    type: String, // lucide icon name or emoji
    default: 'Tag',
  },
  color: {
    type: String, // hex code
    default: '#3b82f6',
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
}, {
  timestamps: true,
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
