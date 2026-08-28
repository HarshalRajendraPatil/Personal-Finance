import Category from '../models/Category.js';

const defaultCategories = [
  { name: 'Housing', type: 'Expense', icon: 'Home', color: '#ef4444', subcategories: ['Rent', 'Maintenance', 'Property Tax'] },
  { name: 'Food', type: 'Expense', icon: 'Utensils', color: '#f97316', subcategories: ['Groceries', 'Dining Out', 'Snacks', 'Delivery'] },
  { name: 'Transportation', type: 'Expense', icon: 'Car', color: '#eab308', subcategories: ['Fuel', 'Public Transit', 'Taxi', 'Maintenance', 'Parking'] },
  { name: 'Utilities', type: 'Expense', icon: 'Zap', color: '#22c55e', subcategories: ['Electricity', 'Water', 'Internet', 'Phone', 'Gas'] },
  { name: 'Healthcare', type: 'Expense', icon: 'Activity', color: '#06b6d4', subcategories: ['Doctor', 'Pharmacy', 'Insurance', 'Fitness'] },
  { name: 'Entertainment', type: 'Expense', icon: 'Film', color: '#8b5cf6', subcategories: ['Movies', 'Games', 'Subscriptions', 'Hobbies'] },
  { name: 'Shopping', type: 'Expense', icon: 'ShoppingBag', color: '#ec4899', subcategories: ['Clothing', 'Electronics', 'Gifts', 'Personal Care'] },
  { name: 'Education', type: 'Expense', icon: 'BookOpen', color: '#6366f1', subcategories: ['Tuition', 'Books', 'Courses'] },
  { name: 'Salary', type: 'Income', icon: 'Briefcase', color: '#10b981', subcategories: ['Base Pay', 'Bonus', 'Commission'] },
  { name: 'Investments', type: 'Income', icon: 'TrendingUp', color: '#3b82f6', subcategories: ['Dividends', 'Interest', 'Capital Gains'] },
  { name: 'Other Income', type: 'Income', icon: 'PlusCircle', color: '#14b8a6', subcategories: ['Gifts', 'Refunds', 'Side Hustle'] },
];

export const seedDefaultCategories = async (req, res) => {
  try {
    const existing = await Category.countDocuments({ user: req.user._id });
    if (existing > 0) {
      return res.status(400).json({ message: 'Categories already exist for this user' });
    }

    for (const cat of defaultCategories) {
      const parent = await Category.create({
        user: req.user._id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        parent: null,
      });

      if (cat.subcategories && cat.subcategories.length > 0) {
        const subs = cat.subcategories.map(sub => ({
          user: req.user._id,
          name: sub,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          parent: parent._id,
        }));
        await Category.insertMany(subs);
      }
    }

    res.status(201).json({ message: 'Default categories seeded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user._id }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, type, icon, color, parent } = req.body;
    
    // Validate parent type matches if providing a parent
    if (parent) {
      const parentCat = await Category.findById(parent);
      if (!parentCat || parentCat.type !== type) {
        return res.status(400).json({ message: 'Parent category must exist and be of the same type' });
      }
    }

    const category = await Category.create({
      user: req.user._id,
      name,
      type,
      icon,
      color,
      parent: parent || null,
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const { name, icon, color } = req.body;
    if (name) category.name = name;
    if (icon) category.icon = icon;
    if (color) category.color = color;

    const updated = await category.save();

    // Optionally update color/icon of subcategories if it's a parent
    if (!category.parent) {
      await Category.updateMany(
        { parent: category._id },
        { $set: { icon: updated.icon, color: updated.color } }
      );
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Ensure we also delete subcategories if this is a parent
    if (!category.parent) {
      await Category.deleteMany({ parent: category._id });
    }

    await category.deleteOne();
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
