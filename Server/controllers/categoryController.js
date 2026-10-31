import Category from '../models/Category.js';

export const RESERVED_CATEGORY_NAMES = [
  // Primary default expense categories
  'Housing',
  'Food',
  'Transportation',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Education',

  // Primary default income categories
  'Salary',
  'Investments',
  'Other Income',

  // Default subcategories
  'Rent',
  'Maintenance',
  'Property Tax',
  'Groceries',
  'Dining Out',
  'Snacks',
  'Delivery',
  'Fuel',
  'Public Transit',
  'Taxi',
  'Parking',
  'Electricity',
  'Water',
  'Internet',
  'Phone',
  'Gas',
  'Doctor',
  'Pharmacy',
  'Insurance',
  'Fitness',
  'Movies',
  'Games',
  'Subscriptions',
  'Hobbies',
  'Clothing',
  'Electronics',
  'Gifts',
  'Personal Care',
  'Tuition',
  'Books',
  'Courses',
  'Base Pay',
  'Bonus',
  'Commission',
  'Dividends',
  'Interest',
  'Capital Gains',
  'Refunds',
  'Side Hustle',

  // System & Compound default categories
  'Housing & Rent',
  'Groceries & Essentials',
  'Food & Dining Out',
  'Transportation & Fuel',
  'Utilities & Bills',
  'Shopping & Apparel',
  'Entertainment & OTT',
  'Health & Fitness',
  'Travel & Holidays',
  'Education & Learning',
  'Electronics & Gadgets',
  'Personal Care & Salon',
  'Subscriptions & Software',
  'Freelance & Consulting',
  'Investments & Dividends',
  'Cashback & Rewards',
  'Rental Income',
  'Lending / Borrowing',
  'Lending',
  'Borrowing',
  'Debt Repayment',
  'Cafes & Coffee',
  'Food Delivery',
  'Fine Dining',
  'Supermarket',
  'Quick Commerce (10-min)',
  'Internet / Wi-Fi',
];

export const isCategoryNameReserved = (name) => {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim().toLowerCase();
  return RESERVED_CATEGORY_NAMES.some((reserved) => reserved.toLowerCase() === clean);
};

export const DEFAULT_CATEGORY_DEFINITIONS = [
  // ── INCOME CATEGORIES ──
  {
    name: 'Salary',
    type: 'Income',
    icon: 'Briefcase',
    color: '#10b981',
    subcategories: ['Base Pay', 'Bonus', 'Commission'],
  },
  {
    name: 'Freelance & Consulting',
    type: 'Income',
    icon: 'Briefcase',
    color: '#059669',
    subcategories: ['Side Hustle'],
  },
  {
    name: 'Investments & Dividends',
    type: 'Income',
    icon: 'TrendingUp',
    color: '#047857',
    subcategories: ['Dividends', 'Interest', 'Capital Gains'],
  },
  {
    name: 'Investments',
    type: 'Income',
    icon: 'TrendingUp',
    color: '#3b82f6',
    subcategories: [],
  },
  {
    name: 'Cashback & Rewards',
    type: 'Income',
    icon: 'Gift',
    color: '#14b8a6',
    subcategories: ['Refunds', 'Gifts'],
  },
  {
    name: 'Rental Income',
    type: 'Income',
    icon: 'Home',
    color: '#0d9488',
    subcategories: [],
  },
  {
    name: 'Other Income',
    type: 'Income',
    icon: 'PlusCircle',
    color: '#10b981',
    subcategories: [],
  },

  // ── EXPENSE CATEGORIES ──
  {
    name: 'Housing & Rent',
    type: 'Expense',
    icon: 'Home',
    color: '#ef4444',
    subcategories: ['Rent', 'Maintenance', 'Property Tax'],
  },
  {
    name: 'Housing',
    type: 'Expense',
    icon: 'Home',
    color: '#ef4444',
    subcategories: [],
  },
  {
    name: 'Groceries & Essentials',
    type: 'Expense',
    icon: 'ShoppingCart',
    color: '#f97316',
    subcategories: ['Groceries', 'Supermarket', 'Quick Commerce (10-min)'],
  },
  {
    name: 'Food & Dining Out',
    type: 'Expense',
    icon: 'Utensils',
    color: '#f59e0b',
    subcategories: ['Dining Out', 'Cafes & Coffee', 'Food Delivery', 'Fine Dining', 'Snacks', 'Delivery'],
  },
  {
    name: 'Food',
    type: 'Expense',
    icon: 'Utensils',
    color: '#f97316',
    subcategories: [],
  },
  {
    name: 'Transportation & Fuel',
    type: 'Expense',
    icon: 'Car',
    color: '#3b82f6',
    subcategories: ['Fuel', 'Public Transit', 'Taxi', 'Parking'],
  },
  {
    name: 'Transportation',
    type: 'Expense',
    icon: 'Car',
    color: '#eab308',
    subcategories: [],
  },
  {
    name: 'Utilities & Bills',
    type: 'Expense',
    icon: 'Zap',
    color: '#6366f1',
    subcategories: ['Electricity', 'Water', 'Internet', 'Phone', 'Gas', 'Internet / Wi-Fi'],
  },
  {
    name: 'Utilities',
    type: 'Expense',
    icon: 'Zap',
    color: '#22c55e',
    subcategories: [],
  },
  {
    name: 'Shopping & Apparel',
    type: 'Expense',
    icon: 'ShoppingBag',
    color: '#8b5cf6',
    subcategories: ['Clothing', 'Electronics', 'Personal Care'],
  },
  {
    name: 'Shopping',
    type: 'Expense',
    icon: 'ShoppingBag',
    color: '#ec4899',
    subcategories: [],
  },
  {
    name: 'Entertainment & OTT',
    type: 'Expense',
    icon: 'Film',
    color: '#ec4899',
    subcategories: ['Movies', 'Games', 'Subscriptions', 'Hobbies'],
  },
  {
    name: 'Entertainment',
    type: 'Expense',
    icon: 'Film',
    color: '#8b5cf6',
    subcategories: [],
  },
  {
    name: 'Health & Fitness',
    type: 'Expense',
    icon: 'Activity',
    color: '#10b981',
    subcategories: ['Doctor', 'Pharmacy', 'Insurance', 'Fitness'],
  },
  {
    name: 'Healthcare',
    type: 'Expense',
    icon: 'Activity',
    color: '#06b6d4',
    subcategories: [],
  },
  {
    name: 'Travel & Holidays',
    type: 'Expense',
    icon: 'Plane',
    color: '#0ea5e9',
    subcategories: [],
  },
  {
    name: 'Education & Learning',
    type: 'Expense',
    icon: 'BookOpen',
    color: '#6366f1',
    subcategories: ['Tuition', 'Books', 'Courses'],
  },
  {
    name: 'Education',
    type: 'Expense',
    icon: 'BookOpen',
    color: '#6366f1',
    subcategories: [],
  },
  {
    name: 'Electronics & Gadgets',
    type: 'Expense',
    icon: 'Smartphone',
    color: '#64748b',
    subcategories: [],
  },
  {
    name: 'Personal Care & Salon',
    type: 'Expense',
    icon: 'Smile',
    color: '#a855f7',
    subcategories: [],
  },
  {
    name: 'Subscriptions & Software',
    type: 'Expense',
    icon: 'CreditCard',
    color: '#4f46e5',
    subcategories: [],
  },
  {
    name: 'Lending / Borrowing',
    type: 'Expense',
    icon: 'HandCoins',
    color: '#d97706',
    subcategories: ['Lending', 'Borrowing'],
  },
  {
    name: 'Debt Repayment',
    type: 'Expense',
    icon: 'CreditCard',
    color: '#e11d48',
    subcategories: [],
  },
];

/**
 * Ensures all default system categories and subcategories are present for a user.
 * Performs differential inserts only for missing entries to keep custom categories and references intact.
 */
export const ensureDefaultCategoriesForUser = async (userId) => {
  if (!userId) return;

  const existingCategories = await Category.find({ user: userId });
  const categoryMap = new Map();
  existingCategories.forEach((c) => {
    const parentKey = c.parent ? c.parent.toString() : 'root';
    const key = `${parentKey}:${c.name.trim().toLowerCase()}`;
    categoryMap.set(key, c);
  });

  for (const def of DEFAULT_CATEGORY_DEFINITIONS) {
    const parentKey = `root:${def.name.trim().toLowerCase()}`;
    let parentDoc = categoryMap.get(parentKey);

    if (!parentDoc) {
      parentDoc = await Category.create({
        user: userId,
        name: def.name,
        type: def.type,
        icon: def.icon,
        color: def.color,
        parent: null,
      });
      categoryMap.set(parentKey, parentDoc);
    }

    if (def.subcategories && def.subcategories.length > 0) {
      for (const subName of def.subcategories) {
        const subKey = `${parentDoc._id.toString()}:${subName.trim().toLowerCase()}`;
        if (!categoryMap.has(subKey)) {
          const subDoc = await Category.create({
            user: userId,
            name: subName,
            type: def.type,
            icon: def.icon,
            color: def.color,
            parent: parentDoc._id,
          });
          categoryMap.set(subKey, subDoc);
        }
      }
    }
  }
};

export const seedDefaultCategories = async (req, res, next) => {
  try {
    await ensureDefaultCategoriesForUser(req.user._id);
    const categories = await Category.find({ user: req.user._id }).sort({ name: 1 });
    res.status(200).json({ message: 'Default categories ensured successfully', categories });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    // Guarantees all default reserved categories are always present for the user
    await ensureDefaultCategoriesForUser(req.user._id);
    const categories = await Category.find({ user: req.user._id }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res) => {
  try {
    let { name, type, icon, color, parent } = req.body;
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    const cleanName = name.trim();

    if (isCategoryNameReserved(cleanName)) {
      return res.status(400).json({
        message: `"${cleanName}" is a reserved default category name. Please choose a different custom name.`,
      });
    }

    // Check if category with this name already exists for this user (case-insensitive) under same parent
    const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Category.findOne({
      user: req.user._id,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      parent: parent || null,
    });
    if (existing) {
      return res.status(400).json({
        message: `A category named "${cleanName}" already exists.`,
      });
    }

    // Validate parent type matches if providing a parent
    if (parent) {
      const parentCat = await Category.findById(parent);
      if (!parentCat || parentCat.type !== type) {
        return res.status(400).json({ message: 'Parent category must exist and be of the same type' });
      }
    }

    const category = await Category.create({
      user: req.user._id,
      name: cleanName,
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
    if (name) {
      const cleanName = name.trim();
      // If user is attempting to rename to a reserved category name
      if (cleanName.toLowerCase() !== category.name.trim().toLowerCase() && isCategoryNameReserved(cleanName)) {
        return res.status(400).json({
          message: `"${cleanName}" is a reserved default category name. Please choose a different name.`,
        });
      }

      // Check if duplicate exists for this user under same parent
      const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const duplicate = await Category.findOne({
        _id: { $ne: category._id },
        user: req.user._id,
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        parent: category.parent || null,
      });
      if (duplicate) {
        return res.status(400).json({ message: `A category named "${cleanName}" already exists.` });
      }

      category.name = cleanName;
    }

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

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (isCategoryNameReserved(category.name)) {
      return res.status(400).json({
        message: `"${category.name}" is a default system category and cannot be deleted.`,
      });
    }

    // Ensure we also delete subcategories if this is a parent
    if (!category.parent) {
      await Category.deleteMany({ parent: category._id });
    }

    await category.deleteOne();
    res.json({ message: 'Category removed' });
  } catch (error) {
    next(error);
  }
};
