import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

import User from '../models/User.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import RecurringRule from '../models/RecurringRule.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import Loan from '../models/Loan.js';
import Lending from '../models/Lending.js';
import TaxRecord from '../models/TaxRecord.js';
import NetWorthSnapshot from '../models/NetWorthSnapshot.js';
import MonthlyReviewDigest from '../models/MonthlyReviewDigest.js';
import SalaryDistributionPlan from '../models/SalaryDistributionPlan.js';
import ProactiveNudge from '../models/ProactiveNudge.js';

dotenv.config();

const DEMO_EMAIL = 'demo@capise.app';
const DEMO_PASSWORD = 'Demo@1234';

async function seedData() {
  try {
    console.log('🚀 Starting Capise Test Account Seeding...');
    await connectDB();

    // 1. Clean up existing demo user data if any
    const existingUser = await User.findOne({ email: DEMO_EMAIL });
    if (existingUser) {
      console.log('🧹 Purging prior demo user data for clean test state...');
      const userId = existingUser._id;
      await Promise.all([
        Account.deleteMany({ user: userId }),
        Category.deleteMany({ user: userId }),
        Transaction.deleteMany({ user: userId }),
        Budget.deleteMany({ user: userId }),
        RecurringRule.deleteMany({ user: userId }),
        Goal.deleteMany({ user: userId }),
        Investment.deleteMany({ user: userId }),
        Loan.deleteMany({ user: userId }),
        Lending.deleteMany({ user: userId }),
        TaxRecord.deleteMany({ user: userId }),
        NetWorthSnapshot.deleteMany({ user: userId }),
        MonthlyReviewDigest.deleteMany({ user: userId }),
        SalaryDistributionPlan.deleteMany({ user: userId }),
        ProactiveNudge.deleteMany({ user: userId }),
        User.deleteOne({ _id: userId }),
      ]);
      console.log('✅ Prior demo data successfully wiped.');
    }

    // 2. Create the Test User
    console.log('👤 Creating verified dummy user account...');
    const user = await User.create({
      name: 'Harshal Patil (Demo)',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      isEmailVerified: true,
      profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    });
    console.log(`✅ User created: ${user.name} (${user.email})`);

    const userId = user._id;

    // 3. Create Diverse Accounts
    console.log('💳 Creating financial accounts...');
    const accountsData = [
      {
        user: userId,
        name: 'HDFC Salary Account',
        type: 'Bank',
        currency: 'INR',
        openingBalance: 125000,
        currentBalance: 148500,
        notes: 'Primary corporate salary credit account',
      },
      {
        user: userId,
        name: 'ICICI Emergency Savings',
        type: 'Bank',
        currency: 'INR',
        openingBalance: 250000,
        currentBalance: 320000,
        notes: 'Dedicated 6-month emergency reserve',
      },
      {
        user: userId,
        name: 'Cash in Hand',
        type: 'Cash',
        currency: 'INR',
        openingBalance: 15000,
        currentBalance: 8200,
        notes: 'Physical cash wallet',
      },
      {
        user: userId,
        name: 'Axis Magnus Credit Card',
        type: 'Credit Card',
        currency: 'INR',
        creditLimit: 300000,
        issuer: 'Axis Bank',
        last4Digits: '4589',
        billingCycleDay: 15,
        paymentDueDay: 5,
        openingBalance: 0,
        currentBalance: 42500,
        notes: 'Travel rewards & flight perks card',
      },
      {
        user: userId,
        name: 'SBI Cashback Credit Card',
        type: 'Credit Card',
        currency: 'INR',
        creditLimit: 150000,
        issuer: 'State Bank of India',
        last4Digits: '8821',
        billingCycleDay: 20,
        paymentDueDay: 10,
        openingBalance: 0,
        currentBalance: 18400,
        notes: '5% online cashback card for shopping & utilities',
      },
      {
        user: userId,
        name: 'Paytm / PhonePe UPI Wallet',
        type: 'UPI',
        currency: 'INR',
        openingBalance: 10000,
        currentBalance: 4650,
        notes: 'Quick day-to-day scanning wallet',
      },
      {
        user: userId,
        name: 'HDFC Fixed Deposit (1 Year)',
        type: 'FD',
        currency: 'INR',
        openingBalance: 200000,
        currentBalance: 213500,
        notes: '7.1% p.a. Cumulative FD compounding quarterly',
      },
    ];

    const accounts = await Account.insertMany(accountsData);
    const accMap = {};
    accounts.forEach((a) => {
      accMap[a.name] = a;
    });
    console.log(`✅ Created ${accounts.length} accounts.`);

    // 4. Create Income & Expense Categories (with parent-child hierarchy)
    console.log('🏷️ Creating categories & subcategories...');
    const incomeCats = [
      { name: 'Salary', type: 'Income', icon: 'Briefcase', color: '#10b981' },
      { name: 'Freelance & Consulting', type: 'Income', icon: 'Laptop', color: '#059669' },
      { name: 'Investments & Dividends', type: 'Income', icon: 'TrendingUp', color: '#047857' },
      { name: 'Cashback & Rewards', type: 'Income', icon: 'Gift', color: '#14b8a6' },
      { name: 'Rental Income', type: 'Income', icon: 'Home', color: '#0d9488' },
    ];

    const expenseCats = [
      { name: 'Housing & Rent', type: 'Expense', icon: 'Home', color: '#ef4444' },
      { name: 'Groceries & Essentials', type: 'Expense', icon: 'ShoppingCart', color: '#f97316' },
      { name: 'Food & Dining Out', type: 'Expense', icon: 'Utensils', color: '#f59e0b' },
      { name: 'Transportation & Fuel', type: 'Expense', icon: 'Car', color: '#3b82f6' },
      { name: 'Utilities & Bills', type: 'Expense', icon: 'Zap', color: '#6366f1' },
      { name: 'Shopping & Apparel', type: 'Expense', icon: 'ShoppingBag', color: '#8b5cf6' },
      { name: 'Entertainment & OTT', type: 'Expense', icon: 'Film', color: '#ec4899' },
      { name: 'Health & Fitness', type: 'Expense', icon: 'HeartPulse', color: '#10b981' },
      { name: 'Travel & Holidays', type: 'Expense', icon: 'Plane', color: '#06b6d4' },
      { name: 'Education & Learning', type: 'Expense', icon: 'BookOpen', color: '#6366f1' },
      { name: 'Electronics & Gadgets', type: 'Expense', icon: 'Smartphone', color: '#64748b' },
      { name: 'Personal Care & Salon', type: 'Expense', icon: 'Smile', color: '#a855f7' },
      { name: 'Subscriptions & Software', type: 'Expense', icon: 'CreditCard', color: '#4f46e5' },
    ];

    const createdCategories = await Category.insertMany(
      [...incomeCats, ...expenseCats].map((c) => ({ ...c, user: userId }))
    );

    const catMap = {};
    createdCategories.forEach((c) => {
      catMap[c.name] = c;
    });

    // Create handy Subcategories
    const subCats = [
      { user: userId, name: 'Cafes & Coffee', type: 'Expense', icon: 'Coffee', color: '#f59e0b', parent: catMap['Food & Dining Out']._id },
      { user: userId, name: 'Food Delivery', type: 'Expense', icon: 'Package', color: '#f59e0b', parent: catMap['Food & Dining Out']._id },
      { user: userId, name: 'Fine Dining', type: 'Expense', icon: 'Utensils', color: '#f59e0b', parent: catMap['Food & Dining Out']._id },
      { user: userId, name: 'Supermarket', type: 'Expense', icon: 'ShoppingCart', color: '#f97316', parent: catMap['Groceries & Essentials']._id },
      { user: userId, name: 'Quick Commerce (10-min)', type: 'Expense', icon: 'Zap', color: '#f97316', parent: catMap['Groceries & Essentials']._id },
      { user: userId, name: 'Electricity', type: 'Expense', icon: 'Zap', color: '#6366f1', parent: catMap['Utilities & Bills']._id },
      { user: userId, name: 'Internet / Wi-Fi', type: 'Expense', icon: 'Wifi', color: '#6366f1', parent: catMap['Utilities & Bills']._id },
    ];
    const createdSubCats = await Category.insertMany(subCats);
    createdSubCats.forEach((s) => {
      catMap[s.name] = s;
    });
    console.log(`✅ Created ${createdCategories.length + createdSubCats.length} categories & subcategories.`);

    // 5. Seed Transactions spanning past 6 months (May 2026 to Oct 2026)
    console.log('💸 Generating 100+ comprehensive transactions over last 6 months...');
    const transactionsList = [];

    // Helper date generator: month 4 = May, 5 = June, 6 = July, 7 = Aug, 8 = Sep, 9 = Oct (0-indexed)
    const d = (month, day, hours = 12) => new Date(2026, month, day, hours, 0, 0);

    // Monthly recurrent salaries on 1st of May, June, July, Aug, Sep, Oct
    for (let m = 4; m <= 9; m++) {
      transactionsList.push({
        user: userId,
        type: 'Income',
        amount: 145000,
        date: d(m, 1, 9),
        account: accMap['HDFC Salary Account']._id,
        category: catMap['Salary']._id,
        merchant: 'Google India Pvt Ltd',
        notes: 'Monthly Net Take-Home Salary Credit',
        tags: ['salary', 'income', 'primary'],
      });

      // Monthly Rent on 3rd
      transactionsList.push({
        user: userId,
        type: 'Expense',
        amount: 32000,
        date: d(m, 3, 11),
        account: accMap['HDFC Salary Account']._id,
        category: catMap['Housing & Rent']._id,
        merchant: 'Sobha Dream Acres Society',
        notes: '2BHK Apartment Rent & Maintenance transfer',
        tags: ['rent', 'fixed-needs', 'housing'],
      });

      // Monthly Utilities
      transactionsList.push({
        user: userId,
        type: 'Expense',
        amount: 2350 + Math.floor(Math.random() * 400),
        date: d(m, 12, 14),
        account: accMap['SBI Cashback Credit Card']._id,
        category: catMap['Utilities & Bills']._id,
        subcategory: catMap['Electricity']?._id,
        merchant: 'BESCOM Electricity Bangalore',
        notes: 'Electricity bill via BBPS',
        tags: ['utilities', 'electricity'],
      });

      transactionsList.push({
        user: userId,
        type: 'Expense',
        amount: 1199,
        date: d(m, 10, 10),
        account: accMap['SBI Cashback Credit Card']._id,
        category: catMap['Utilities & Bills']._id,
        subcategory: catMap['Internet / Wi-Fi']?._id,
        merchant: 'ACT Fibernet Broadband',
        notes: '300 Mbps unlimited optical fiber plan',
        tags: ['utilities', 'internet', 'wfh'],
      });

      // Subscriptions
      transactionsList.push({
        user: userId,
        type: 'Expense',
        amount: 649,
        date: d(m, 18, 20),
        account: accMap['Axis Magnus Credit Card']._id,
        category: catMap['Subscriptions & Software']._id,
        merchant: 'Netflix 4K UHD Plan',
        notes: 'Monthly recurring entertainment stream',
        tags: ['entertainment', 'ott', 'subscription'],
      });

      transactionsList.push({
        user: userId,
        type: 'Expense',
        amount: 149,
        date: d(m, 22, 18),
        account: accMap['Paytm / PhonePe UPI Wallet']._id,
        category: catMap['Subscriptions & Software']._id,
        merchant: 'Spotify Premium Duo',
        notes: 'High fidelity audio streaming',
        tags: ['music', 'subscription'],
      });

      transactionsList.push({
        user: userId,
        type: 'Expense',
        amount: 1850,
        date: d(m, 28, 7),
        account: accMap['Axis Magnus Credit Card']._id,
        category: catMap['Health & Fitness']._id,
        merchant: 'Cult.fit Gym & Fitness Club',
        notes: 'Elite pass monthly membership',
        tags: ['fitness', 'health', 'cult'],
      });

      // Monthly ATM Cash Withdrawal (Transfer)
      transactionsList.push({
        user: userId,
        type: 'Transfer',
        amount: 10000,
        date: d(m, 4, 17),
        account: accMap['HDFC Salary Account']._id,
        toAccount: accMap['Cash in Hand']._id,
        merchant: 'HDFC Bank ATM Cash Withdrawal',
        notes: 'Pocket cash replenishment',
        tags: ['cash', 'atm', 'transfer'],
      });

      // Monthly Credit Card Bill Settlement Transfer
      transactionsList.push({
        user: userId,
        type: 'Transfer',
        amount: 35000 + Math.floor(Math.random() * 8000),
        date: d(m, 6, 16),
        account: accMap['HDFC Salary Account']._id,
        toAccount: accMap['Axis Magnus Credit Card']._id,
        merchant: 'Axis Credit Card Bill Auto-Debit',
        notes: 'Full statement balance cleared to avoid interest',
        tags: ['credit-card', 'bill-payment'],
      });
    }

    // Additional periodic & variable transactions
    const variableTx = [
      // May 2026
      { m: 4, d: 5, type: 'Expense', amt: 3450, acc: 'Axis Magnus Credit Card', cat: 'Groceries & Essentials', sub: 'Supermarket', merch: "Nature's Basket Organic", notes: 'Weekly gourmet grocery run', tags: ['groceries'] },
      { m: 4, d: 8, type: 'Expense', amt: 850, acc: 'Paytm / PhonePe UPI Wallet', cat: 'Food & Dining Out', sub: 'Cafes & Coffee', merch: 'Blue Tokai Coffee Roasters', notes: 'Flat white + croissant with laptop', tags: ['coffee', 'cafe'] },
      { m: 4, d: 11, type: 'Expense', amt: 2650, acc: 'Axis Magnus Credit Card', cat: 'Food & Dining Out', sub: 'Fine Dining', merch: 'Toit Brewpub Indiranagar', notes: 'Team dinner & craft beer celebration', tags: ['dining', 'weekend'] },
      { m: 4, d: 15, type: 'Expense', amt: 4800, acc: 'SBI Cashback Credit Card', cat: 'Shopping & Apparel', merch: 'Uniqlo Airism T-Shirts', notes: 'Summer wardrobe refresh', tags: ['shopping', 'clothing'] },
      { m: 4, d: 20, type: 'Expense', amt: 2800, acc: 'Axis Magnus Credit Card', cat: 'Transportation & Fuel', merch: 'Shell Petrol Pump Indiranagar', notes: 'Full tank fuel for car', tags: ['fuel', 'car'] },
      { m: 4, d: 25, type: 'Expense', amt: 1250, acc: 'Paytm / PhonePe UPI Wallet', cat: 'Food & Dining Out', sub: 'Food Delivery', merch: 'Swiggy Gourmet Delivery', notes: 'Weekend pizza & wings dinner', tags: ['swiggy', 'food'] },

      // June 2026
      { m: 5, d: 2, type: 'Income', amt: 35000, acc: 'HDFC Salary Account', cat: 'Freelance & Consulting', merch: 'Fintech Corp Singapore', notes: 'UI Architecture consulting milestone payout', tags: ['freelance', 'consulting'] },
      { m: 5, d: 7, type: 'Expense', amt: 4200, acc: 'Axis Magnus Credit Card', cat: 'Groceries & Essentials', sub: 'Supermarket', merch: 'D-Mart Superstore', notes: 'Monthly household staples & cleaning supplies', tags: ['groceries'] },
      { m: 5, d: 12, type: 'Expense', amt: 640, acc: 'Paytm / PhonePe UPI Wallet', cat: 'Transportation & Fuel', merch: 'Uber Premier Bangalore', notes: 'Cab to Kempegowda Airport for day trip', tags: ['uber', 'commute'] },
      { m: 5, d: 14, type: 'Expense', amt: 3890, acc: 'SBI Cashback Credit Card', cat: 'Shopping & Apparel', merch: 'Zara High Street Fashion', notes: 'Linen casual shirt', tags: ['shopping'] },
      { m: 5, d: 19, type: 'Expense', amt: 1450, acc: 'Paytm / PhonePe UPI Wallet', cat: 'Personal Care & Salon', merch: 'Truefitt & Hill Barber', notes: 'Grooming & haircut session', tags: ['personal-care'] },
      { m: 5, d: 24, type: 'Expense', amt: 2950, acc: 'Axis Magnus Credit Card', cat: 'Health & Fitness', merch: 'Apollo Pharmacy Medicines', notes: 'Annual multivitamin & omega 3 stock', tags: ['health', 'pharma'] },

      // July 2026
      { m: 6, d: 5, type: 'Income', amt: 4850, acc: 'HDFC Salary Account', cat: 'Investments & Dividends', merch: 'TCS Q1 Dividend Credit', notes: 'TCS quarterly dividend payout directly in bank', tags: ['dividend', 'passive-income'] },
      { m: 6, d: 9, type: 'Expense', amt: 1850, acc: 'Paytm / PhonePe UPI Wallet', cat: 'Food & Dining Out', sub: 'Cafes & Coffee', merch: 'Third Wave Coffee Roasters', notes: 'Cold brew and sandwiches', tags: ['coffee'] },
      { m: 6, d: 13, type: 'Expense', amt: 5200, acc: 'SBI Cashback Credit Card', cat: 'Groceries & Essentials', sub: 'Quick Commerce (10-min)', merch: 'Blinkit Instant Delivery', notes: 'Weekly fruits, avocados, imported cheese', tags: ['groceries', 'blinkit'] },
      { m: 6, d: 17, type: 'Expense', amt: 18500, acc: 'Axis Magnus Credit Card', cat: 'Travel & Holidays', merch: 'MakeMyTrip Taj Goa Resort', notes: 'Weekend monsoon getaway booking', tags: ['travel', 'vacation', 'holiday'] },
      { m: 6, d: 21, type: 'Expense', amt: 4200, acc: 'Axis Magnus Credit Card', cat: 'Food & Dining Out', sub: 'Fine Dining', merch: "Fisherman's Wharf Goa", notes: 'Seafood dinner on holiday', tags: ['travel', 'dining'] },
      { m: 6, d: 27, type: 'Expense', amt: 1999, acc: 'Axis Magnus Credit Card', cat: 'Subscriptions & Software', merch: 'OpenAI ChatGPT Plus Subscription', notes: 'AI research assistant monthly plan', tags: ['software', 'ai'] },

      // August 2026
      { m: 7, d: 4, type: 'Income', amt: 28000, acc: 'HDFC Salary Account', cat: 'Freelance & Consulting', merch: 'TechStartup AI Labs', notes: 'Advisory retainer for August', tags: ['freelance'] },
      { m: 7, d: 8, type: 'Expense', amt: 3200, acc: 'Axis Magnus Credit Card', cat: 'Groceries & Essentials', sub: 'Supermarket', merch: 'Nature Basket Koramangala', notes: 'Fresh groceries & snacks', tags: ['groceries'] },
      { m: 7, d: 14, type: 'Expense', amt: 7800, acc: 'SBI Cashback Credit Card', cat: 'Electronics & Gadgets', merch: 'Amazon India Great Freedom Sale', notes: 'Logitech MX Master 3S Mouse', tags: ['electronics', 'gadgets'] },
      { m: 7, d: 18, type: 'Expense', amt: 1450, acc: 'Paytm / PhonePe UPI Wallet', cat: 'Food & Dining Out', sub: 'Food Delivery', merch: 'Zomato Biryani Order', notes: 'Meghana Foods boneless biryani box', tags: ['zomato', 'food'] },
      { m: 7, d: 23, type: 'Expense', amt: 3500, acc: 'Axis Magnus Credit Card', cat: 'Education & Learning', merch: 'Coursera / DeepLearning.AI', notes: 'Advanced LLM Specialization certification', tags: ['education', 'upskilling'] },
      { m: 7, d: 29, type: 'Income', amt: 1250, acc: 'SBI Cashback Credit Card', cat: 'Cashback & Rewards', merch: 'SBI Card 5% Cashback Credit', notes: 'Cashback reward for monthly online spends', tags: ['cashback', 'reward'] },

      // September 2026
      { m: 8, d: 6, type: 'Expense', amt: 4500, acc: 'Axis Magnus Credit Card', cat: 'Groceries & Essentials', sub: 'Supermarket', merch: 'D-Mart Supermarket Mega Run', notes: 'Pantry items, nuts, cold pressed oils', tags: ['groceries'] },
      { m: 8, d: 11, type: 'Expense', amt: 2400, acc: 'Axis Magnus Credit Card', cat: 'Transportation & Fuel', merch: 'Indian Oil Petrol Pump', notes: 'Fuel replenishment', tags: ['fuel'] },
      { m: 8, d: 16, type: 'Expense', amt: 3200, acc: 'Axis Magnus Credit Card', cat: 'Food & Dining Out', sub: 'Fine Dining', merch: 'Smoke House Deli Lavelle Road', notes: 'Sunday brunch with family', tags: ['dining', 'brunch'] },
      { m: 8, d: 20, type: 'Expense', amt: 16500, acc: 'SBI Cashback Credit Card', cat: 'Shopping & Apparel', merch: 'Myntra Big Fashion Festival', notes: 'Festive ethnic wear and shoes', tags: ['shopping', 'festive'] },
      { m: 8, d: 24, type: 'Expense', amt: 950, acc: 'Paytm / PhonePe UPI Wallet', cat: 'Food & Dining Out', sub: 'Cafes & Coffee', merch: 'Starbucks Reserve Coffee', notes: 'Iced caramel macchiato and bagel', tags: ['starbucks', 'coffee'] },
      { m: 8, d: 28, type: 'Income', amt: 45000, acc: 'HDFC Salary Account', cat: 'Freelance & Consulting', merch: 'NextGen SaaS Corp', notes: 'Cloud infrastructure optimization consulting project', tags: ['freelance', 'tech'] },

      // October 2026 (Current Month)
      { m: 9, d: 2, type: 'Expense', amt: 2800, acc: 'Axis Magnus Credit Card', cat: 'Groceries & Essentials', sub: 'Quick Commerce (10-min)', merch: 'Zepto 10-Minute Grocery Delivery', notes: 'Weekly fresh dairy, vegetables & bakery', tags: ['groceries', 'zepto'] },
      { m: 9, d: 5, type: 'Expense', amt: 1850, acc: 'Paytm / PhonePe UPI Wallet', cat: 'Food & Dining Out', sub: 'Cafes & Coffee', merch: 'Blue Tokai Indiranagar', notes: 'Pour-over coffee and meeting', tags: ['coffee'] },
      { m: 9, d: 8, type: 'Expense', amt: 12500, acc: 'SBI Cashback Credit Card', cat: 'Shopping & Apparel', merch: 'Amazon Great Indian Festival', notes: 'Smart home LED setup and gifts', tags: ['shopping', 'amazon'] },
      { m: 9, d: 12, type: 'Expense', amt: 3400, acc: 'Axis Magnus Credit Card', cat: 'Food & Dining Out', sub: 'Fine Dining', merch: 'Windmills Craftworks Whitefield', notes: 'Jazz night dinner and microbrewery', tags: ['dining', 'weekend'] },
      { m: 9, d: 15, type: 'Expense', amt: 2900, acc: 'Axis Magnus Credit Card', cat: 'Transportation & Fuel', merch: 'Shell Petrol V-Power', notes: 'Highway fuel refill', tags: ['fuel'] },
      { m: 9, d: 17, type: 'Expense', amt: 1250, acc: 'Paytm / PhonePe UPI Wallet', cat: 'Food & Dining Out', sub: 'Food Delivery', merch: 'Swiggy Dinner Order', notes: 'Artisan sushi bowl', tags: ['swiggy'] },
    ];

    variableTx.forEach((tx) => {
      transactionsList.push({
        user: userId,
        type: tx.type,
        amount: tx.amt,
        date: d(tx.m, tx.d, 13),
        account: accMap[tx.acc]._id,
        category: catMap[tx.cat]._id,
        subcategory: tx.sub && catMap[tx.sub] ? catMap[tx.sub]._id : null,
        merchant: tx.merch,
        notes: tx.notes,
        tags: tx.tags,
      });
    });

    const insertedTransactions = await Transaction.insertMany(transactionsList);
    console.log(`✅ Inserted ${insertedTransactions.length} rich transactions.`);

    // 6. Create Active Budgets with thresholds
    console.log('📊 Configuring monthly budgets...');
    const budgetsData = [
      {
        user: userId,
        name: 'Food & Dining Budget',
        category: catMap['Food & Dining Out']._id,
        period: 'monthly',
        limit: 15000,
        alertThreshold: 80,
        isActive: true,
        rollover: false,
      },
      {
        user: userId,
        name: 'Groceries & Essentials Budget',
        category: catMap['Groceries & Essentials']._id,
        period: 'monthly',
        limit: 18000,
        alertThreshold: 85,
        isActive: true,
        rollover: true,
      },
      {
        user: userId,
        name: 'Shopping & Apparel Budget',
        category: catMap['Shopping & Apparel']._id,
        period: 'monthly',
        limit: 12000,
        alertThreshold: 75,
        isActive: true,
        rollover: false,
      },
      {
        user: userId,
        name: 'Entertainment & OTT Budget',
        category: catMap['Entertainment & OTT']._id,
        period: 'monthly',
        limit: 5000,
        alertThreshold: 80,
        isActive: true,
        rollover: false,
      },
      {
        user: userId,
        name: 'Transportation & Fuel Budget',
        category: catMap['Transportation & Fuel']._id,
        period: 'monthly',
        limit: 10000,
        alertThreshold: 80,
        isActive: true,
        rollover: false,
      },
      {
        user: userId,
        name: 'Utilities & Bills Budget',
        category: catMap['Utilities & Bills']._id,
        period: 'monthly',
        limit: 8000,
        alertThreshold: 90,
        isActive: true,
        rollover: false,
      },
    ];
    await Budget.insertMany(budgetsData);
    console.log(`✅ Created ${budgetsData.length} active budgets.`);

    // 7. Create Recurring Rules (Upcoming Bills & Rules)
    console.log('⏰ Creating automated recurring rules & bills...');
    const recurringData = [
      {
        user: userId,
        name: 'Monthly Salary Credit',
        type: 'Income',
        amount: 145000,
        account: accMap['HDFC Salary Account']._id,
        category: catMap['Salary']._id,
        merchant: 'Google India Pvt Ltd',
        frequency: 'monthly',
        nextRunDate: new Date(2026, 10, 1),
        isActive: true,
        autoPost: true,
        notes: 'Primary salary income recurring stream',
      },
      {
        user: userId,
        name: 'Apartment Rent Transfer',
        type: 'Expense',
        amount: 32000,
        account: accMap['HDFC Salary Account']._id,
        category: catMap['Housing & Rent']._id,
        merchant: 'Sobha Dream Acres Society',
        frequency: 'monthly',
        nextRunDate: new Date(2026, 10, 3),
        isActive: true,
        autoPost: true,
        notes: 'Society maintenance and apartment rent',
      },
      {
        user: userId,
        name: 'ACT Fibernet Broadband',
        type: 'Expense',
        amount: 1199,
        account: accMap['SBI Cashback Credit Card']._id,
        category: catMap['Utilities & Bills']._id,
        merchant: 'ACT Fibernet',
        frequency: 'monthly',
        nextRunDate: new Date(2026, 10, 10),
        isActive: true,
        autoPost: false,
        notes: '300 Mbps unlimited plan',
      },
      {
        user: userId,
        name: 'BESCOM Electricity Bill',
        type: 'Expense',
        amount: 2450,
        account: accMap['SBI Cashback Credit Card']._id,
        category: catMap['Utilities & Bills']._id,
        merchant: 'BESCOM Bangalore',
        frequency: 'monthly',
        nextRunDate: new Date(2026, 10, 12),
        isActive: true,
        autoPost: false,
      },
      {
        user: userId,
        name: 'Netflix 4K UHD Plan',
        type: 'Expense',
        amount: 649,
        account: accMap['Axis Magnus Credit Card']._id,
        category: catMap['Subscriptions & Software']._id,
        merchant: 'Netflix',
        frequency: 'monthly',
        nextRunDate: new Date(2026, 10, 18),
        isActive: true,
        autoPost: true,
      },
      {
        user: userId,
        name: 'Spotify Premium Duo',
        type: 'Expense',
        amount: 149,
        account: accMap['Paytm / PhonePe UPI Wallet']._id,
        category: catMap['Subscriptions & Software']._id,
        merchant: 'Spotify',
        frequency: 'monthly',
        nextRunDate: new Date(2026, 10, 22),
        isActive: true,
        autoPost: true,
      },
      {
        user: userId,
        name: 'Cult.fit Gym Membership',
        type: 'Expense',
        amount: 1850,
        account: accMap['Axis Magnus Credit Card']._id,
        category: catMap['Health & Fitness']._id,
        merchant: 'Cult.fit',
        frequency: 'monthly',
        nextRunDate: new Date(2026, 10, 28),
        isActive: true,
        autoPost: false,
      },
    ];
    await RecurringRule.insertMany(recurringData);
    console.log(`✅ Created ${recurringData.length} recurring rules.`);

    // 8. Create Financial Goals with Contribution histories
    console.log('🎯 Setting up financial goals with milestone contributions...');
    const goalsData = [
      {
        user: userId,
        name: 'Emergency Fund (6 Months Reserve)',
        targetAmount: 450000,
        currentAmount: 320000,
        deadline: new Date(2027, 2, 31),
        icon: 'ShieldCheck',
        color: '#10b981',
        notes: 'Safe liquid buffer covering rent, EMIs, and essential household expenses',
        isCompleted: false,
        contributions: [
          { amount: 80000, date: new Date(2026, 4, 15), note: 'Initial foundation allocation' },
          { amount: 80000, date: new Date(2026, 6, 15), note: 'Q2 bonus sweep' },
          { amount: 80000, date: new Date(2026, 7, 20), note: 'Freelance surplus contribution' },
          { amount: 80000, date: new Date(2026, 9, 10), note: 'October milestone deposit' },
        ],
      },
      {
        user: userId,
        name: 'Japan Cherry Blossom Trip 2027',
        targetAmount: 250000,
        currentAmount: 110000,
        deadline: new Date(2027, 3, 1),
        icon: 'Plane',
        color: '#06b6d4',
        notes: '2-week Tokyo, Kyoto & Osaka vacation for Sakura festival',
        isCompleted: false,
        contributions: [
          { amount: 40000, date: new Date(2026, 5, 20), note: 'Initial vacation fund set aside' },
          { amount: 35000, date: new Date(2026, 7, 10), note: 'Flight savings' },
          { amount: 35000, date: new Date(2026, 8, 25), note: 'Hotel booking allocation' },
        ],
      },
      {
        user: userId,
        name: 'MacBook Pro M4 Max (Workstation)',
        targetAmount: 180000,
        currentAmount: 140000,
        deadline: new Date(2026, 11, 25),
        icon: 'Laptop',
        color: '#8b5cf6',
        notes: 'High-performance developer machine for AI & local LLM experimentation',
        isCompleted: false,
        contributions: [
          { amount: 70000, date: new Date(2026, 6, 28), note: 'Freelance project savings' },
          { amount: 70000, date: new Date(2026, 8, 30), note: 'Q3 tech fund allocation' },
        ],
      },
      {
        user: userId,
        name: 'Down Payment for Dream Home',
        targetAmount: 2000000,
        currentAmount: 650000,
        deadline: new Date(2028, 11, 31),
        icon: 'Home',
        color: '#f59e0b',
        notes: 'Target 20% down payment fund for 3BHK luxury apartment',
        isCompleted: false,
        contributions: [
          { amount: 200000, date: new Date(2026, 4, 1), note: 'Initial FD liquidation deposit' },
          { amount: 150000, date: new Date(2026, 6, 1), note: 'Mid-year savings accumulation' },
          { amount: 150000, date: new Date(2026, 7, 15), note: 'Bonus allocation' },
          { amount: 150000, date: new Date(2026, 9, 1), note: 'Q3 savings addition' },
        ],
      },
    ];
    await Goal.insertMany(goalsData);
    console.log(`✅ Created ${goalsData.length} goals with contribution logs.`);

    // 9. Create Investments (Stocks, Mutual Funds with SIP, PPF, Gold, NPS, Crypto)
    console.log('📈 Setting up investment portfolio with valuation timelines & SIPs...');
    const investmentsData = [
      {
        user: userId,
        name: 'UTI Nifty 50 Index Fund Direct Growth',
        type: 'Mutual Fund',
        platform: 'Groww',
        investedAmount: 180000,
        currentValue: 216400,
        color: '#10b981',
        isSip: true,
        sipAmount: 15000,
        sipFrequency: 'monthly',
        sipDay: 5,
        nextSipDate: new Date(2026, 10, 5),
        sipAccount: accMap['HDFC Salary Account']._id,
        fundingAccount: accMap['HDFC Salary Account']._id,
        symbol: '120716',
        autoSyncPrice: true,
        notes: 'Large-cap core index foundation. Low expense ratio 0.20%',
        valueHistory: [
          { date: new Date(2026, 4, 1), value: 182000 },
          { date: new Date(2026, 5, 1), value: 189500 },
          { date: new Date(2026, 6, 1), value: 197000 },
          { date: new Date(2026, 7, 1), value: 203500 },
          { date: new Date(2026, 8, 1), value: 210200 },
          { date: new Date(2026, 9, 15), value: 216400 },
        ],
      },
      {
        user: userId,
        name: 'Parag Parikh Flexi Cap Fund Direct Growth',
        type: 'Mutual Fund',
        platform: 'Zerodha Coin',
        investedAmount: 120000,
        currentValue: 148200,
        color: '#3b82f6',
        isSip: true,
        sipAmount: 10000,
        sipFrequency: 'monthly',
        sipDay: 10,
        nextSipDate: new Date(2026, 10, 10),
        sipAccount: accMap['HDFC Salary Account']._id,
        fundingAccount: accMap['HDFC Salary Account']._id,
        symbol: '122639',
        autoSyncPrice: true,
        notes: 'Diversified equity with US technology stock allocation (Alphabet, Meta, Microsoft)',
        valueHistory: [
          { date: new Date(2026, 4, 1), value: 123000 },
          { date: new Date(2026, 5, 1), value: 128500 },
          { date: new Date(2026, 6, 1), value: 134200 },
          { date: new Date(2026, 7, 1), value: 139800 },
          { date: new Date(2026, 8, 1), value: 144500 },
          { date: new Date(2026, 9, 15), value: 148200 },
        ],
      },
      {
        user: userId,
        name: 'Reliance Industries Ltd (RELIANCE)',
        type: 'Stocks',
        platform: 'Zerodha Kite',
        quantity: 40,
        buyPrice: 2750,
        investedAmount: 110000,
        currentValue: 124800,
        color: '#6366f1',
        symbol: 'RELIANCE',
        notes: 'Bluechip energy, retail & telecommunications conglomerate',
        valueHistory: [
          { date: new Date(2026, 4, 1), value: 111000 },
          { date: new Date(2026, 6, 1), value: 116500 },
          { date: new Date(2026, 8, 1), value: 121000 },
          { date: new Date(2026, 9, 15), value: 124800 },
        ],
      },
      {
        user: userId,
        name: 'Tata Consultancy Services (TCS)',
        type: 'Stocks',
        platform: 'Zerodha Kite',
        quantity: 25,
        buyPrice: 3800,
        investedAmount: 95000,
        currentValue: 108500,
        color: '#8b5cf6',
        symbol: 'TCS',
        notes: 'Top Tier-1 IT services exporter with consistent dividend yield',
        valueHistory: [
          { date: new Date(2026, 4, 1), value: 96000 },
          { date: new Date(2026, 6, 1), value: 101000 },
          { date: new Date(2026, 8, 1), value: 105200 },
          { date: new Date(2026, 9, 15), value: 108500 },
        ],
      },
      {
        user: userId,
        name: 'Public Provident Fund (PPF)',
        type: 'PPF',
        platform: 'State Bank of India',
        investedAmount: 150000,
        currentValue: 168200,
        color: '#f59e0b',
        notes: 'Tax-exempt Section 80C EEE government backed fixed return asset',
        valueHistory: [
          { date: new Date(2026, 4, 1), value: 155000 },
          { date: new Date(2026, 7, 1), value: 161200 },
          { date: new Date(2026, 9, 15), value: 168200 },
        ],
      },
      {
        user: userId,
        name: 'Sovereign Gold Bonds (SGB 2028 Series)',
        type: 'Gold',
        platform: 'RBI / Demat',
        investedAmount: 100000,
        currentValue: 134500,
        color: '#eab308',
        notes: '2.5% semi-annual coupon + sovereign gold appreciation, tax-free upon maturity',
        valueHistory: [
          { date: new Date(2026, 4, 1), value: 112000 },
          { date: new Date(2026, 6, 1), value: 120500 },
          { date: new Date(2026, 8, 1), value: 129000 },
          { date: new Date(2026, 9, 15), value: 134500 },
        ],
      },
      {
        user: userId,
        name: 'Bitcoin (BTC)',
        type: 'Crypto',
        platform: 'CoinDCX',
        quantity: 0.02,
        buyPrice: 4800000,
        investedAmount: 96000,
        currentValue: 118000,
        color: '#f97316',
        notes: 'High beta asymmetric digital asset reserve',
        valueHistory: [
          { date: new Date(2026, 4, 1), value: 92000 },
          { date: new Date(2026, 6, 1), value: 104000 },
          { date: new Date(2026, 8, 1), value: 111500 },
          { date: new Date(2026, 9, 15), value: 118000 },
        ],
      },
    ];
    await Investment.insertMany(investmentsData);
    console.log(`✅ Created ${investmentsData.length} investments with historical value graphs.`);

    // 10. Create Loans with complete payment histories
    console.log('🏦 Recording loans & amortized EMI payment records...');
    const loansData = [
      {
        user: userId,
        name: 'HDFC Home Loan (3BHK Flat)',
        lender: 'HDFC Bank Ltd',
        type: 'Home Loan',
        principal: 4500000,
        interestRate: 8.45,
        tenureMonths: 240,
        startDate: new Date(2025, 0, 10),
        emiAmount: 38912,
        account: accMap['HDFC Salary Account']._id,
        debitAccount: accMap['HDFC Salary Account']._id,
        autoDebit: true,
        debitDay: 5,
        nextEmiDate: new Date(2026, 10, 5),
        notes: 'Primary residence mortgage. Loan Account #HL-98210384',
        isActive: true,
        payments: [
          { date: new Date(2026, 4, 5), amount: 38912, principal: 7200, interest: 31712, note: 'May EMI debited' },
          { date: new Date(2026, 5, 5), amount: 38912, principal: 7250, interest: 31662, note: 'June EMI debited' },
          { date: new Date(2026, 6, 5), amount: 38912, principal: 7300, interest: 31612, note: 'July EMI debited' },
          { date: new Date(2026, 7, 5), amount: 38912, principal: 7350, interest: 31562, note: 'August EMI debited' },
          { date: new Date(2026, 8, 5), amount: 38912, principal: 7400, interest: 31512, note: 'September EMI debited' },
          { date: new Date(2026, 9, 5), amount: 38912, principal: 7450, interest: 31462, note: 'October EMI debited' },
        ],
      },
      {
        user: userId,
        name: 'HDFC Car Loan (Hyundai Creta SX)',
        lender: 'HDFC Bank Ltd',
        type: 'Car Loan',
        principal: 800000,
        interestRate: 8.9,
        tenureMonths: 60,
        startDate: new Date(2025, 6, 7),
        emiAmount: 16560,
        account: accMap['HDFC Salary Account']._id,
        debitAccount: accMap['HDFC Salary Account']._id,
        autoDebit: true,
        debitDay: 7,
        nextEmiDate: new Date(2026, 10, 7),
        notes: '5-year fixed vehicle loan',
        isActive: true,
        payments: [
          { date: new Date(2026, 4, 7), amount: 16560, principal: 11200, interest: 5360, note: 'May Car EMI' },
          { date: new Date(2026, 5, 7), amount: 16560, principal: 11280, interest: 5280, note: 'June Car EMI' },
          { date: new Date(2026, 6, 7), amount: 16560, principal: 11360, interest: 5200, note: 'July Car EMI' },
          { date: new Date(2026, 7, 7), amount: 16560, principal: 11440, interest: 5120, note: 'August Car EMI' },
          { date: new Date(2026, 8, 7), amount: 16560, principal: 11520, interest: 5040, note: 'September Car EMI' },
          { date: new Date(2026, 9, 7), amount: 16560, principal: 11600, interest: 4960, note: 'October Car EMI' },
        ],
      },
    ];
    await Loan.insertMany(loansData);
    console.log(`✅ Created ${loansData.length} loans with EMI repayment records.`);

    // 11. Create Lending & Borrowing records (Splitwise style)
    console.log('🤝 Creating peer lending & borrowing records...');
    const lendingData = [
      {
        user: userId,
        person: 'Rohit Sharma (Colleague)',
        type: 'lent',
        amount: 15000,
        currency: 'INR',
        dueDate: new Date(2026, 10, 20),
        notes: 'Short term loan for flight bookings reimbursement',
        account: accMap['HDFC Salary Account']._id,
        isSettled: false,
        repayments: [
          { amount: 5000, date: new Date(2026, 8, 15), note: 'Part payment via UPI' },
        ],
      },
      {
        user: userId,
        person: 'Ananya Patil (Sister)',
        type: 'lent',
        amount: 8000,
        currency: 'INR',
        notes: 'Semester college course books assistance',
        account: accMap['Paytm / PhonePe UPI Wallet']._id,
        isSettled: true,
        settledAt: new Date(2026, 8, 18),
        repayments: [
          { amount: 8000, date: new Date(2026, 8, 18), note: 'Fully repaid via Google Pay' },
        ],
      },
      {
        user: userId,
        person: 'Vikram Mehta (Friend)',
        type: 'borrowed',
        amount: 5000,
        currency: 'INR',
        dueDate: new Date(2026, 10, 30),
        notes: 'Split concert ticket cost for Coldplay concert Mumbai',
        account: accMap['Paytm / PhonePe UPI Wallet']._id,
        isSettled: false,
        repayments: [],
      },
    ];
    await Lending.insertMany(lendingData);
    console.log(`✅ Created ${lendingData.length} lending/borrowing records.`);

    // 12. Create Tax Record for FY 2026-27
    console.log('📑 Filing official Tax Record for FY 2026-27...');
    await TaxRecord.create({
      user: userId,
      financialYear: '2026-27',
      salaryIncome: 1740000,
      businessIncome: 180000,
      capitalGains: 65000,
      otherIncome: 24000,
      standardDeduction: 50000,
      deduction80C: 150000,
      deduction80D: 25000,
      otherDeductions: 50000,
      tdsPaid: 185000,
      advanceTaxPaid: 20000,
      calculatedTaxLiability: 195400,
      notes: 'New Tax Regime benchmark. Section 80C maximized with PPF & ELSS. Advance tax installment Q1 & Q2 verified.',
    });
    console.log('✅ Created FY 2026-27 Tax Record.');

    // 13. Create Historical Net Worth Snapshots (May to October 2026)
    console.log('📈 Generating monthly Net Worth progression snapshots...');
    const netWorthData = [
      {
        user: userId,
        date: new Date(2026, 4, 31),
        cashAndBankBalances: 390000,
        investmentValue: 840000,
        otherAssets: 200000,
        totalAssets: 1430000,
        loanBalances: 5240000,
        creditCardBalances: 38000,
        otherLiabilities: 0,
        totalLiabilities: 5278000,
        netWorth: 1430000 - 5278000,
        notes: 'May 2026 Monthly Close',
        isAutomated: true,
      },
      {
        user: userId,
        date: new Date(2026, 5, 30),
        cashAndBankBalances: 415000,
        investmentValue: 885000,
        otherAssets: 200000,
        totalAssets: 1500000,
        loanBalances: 5202000,
        creditCardBalances: 42000,
        otherLiabilities: 0,
        totalLiabilities: 5244000,
        netWorth: 1500000 - 5244000,
        notes: 'June 2026 Monthly Close',
        isAutomated: true,
      },
      {
        user: userId,
        date: new Date(2026, 6, 31),
        cashAndBankBalances: 442000,
        investmentValue: 935000,
        otherAssets: 200000,
        totalAssets: 1577000,
        loanBalances: 5164000,
        creditCardBalances: 45000,
        otherLiabilities: 0,
        totalLiabilities: 5209000,
        netWorth: 1577000 - 5209000,
        notes: 'July 2026 Monthly Close',
        isAutomated: true,
      },
      {
        user: userId,
        date: new Date(2026, 7, 31),
        cashAndBankBalances: 468000,
        investmentValue: 980000,
        otherAssets: 200000,
        totalAssets: 1648000,
        loanBalances: 5125000,
        creditCardBalances: 49000,
        otherLiabilities: 0,
        totalLiabilities: 5174000,
        netWorth: 1648000 - 5174000,
        notes: 'August 2026 Monthly Close',
        isAutomated: true,
      },
      {
        user: userId,
        date: new Date(2026, 8, 30),
        cashAndBankBalances: 495000,
        investmentValue: 1045000,
        otherAssets: 200000,
        totalAssets: 1740000,
        loanBalances: 5086000,
        creditCardBalances: 52000,
        otherLiabilities: 0,
        totalLiabilities: 5138000,
        netWorth: 1740000 - 5138000,
        notes: 'September 2026 Monthly Close',
        isAutomated: true,
      },
      {
        user: userId,
        date: new Date(2026, 9, 18),
        cashAndBankBalances: 521700,
        investmentValue: 1128600,
        otherAssets: 213500,
        totalAssets: 1863800,
        loanBalances: 5047000,
        creditCardBalances: 60900,
        otherLiabilities: 5000,
        totalLiabilities: 5112900,
        netWorth: 1863800 - 5112900,
        notes: 'Current October 2026 Portfolio Snapshot',
        isAutomated: true,
      },
    ];
    await NetWorthSnapshot.insertMany(netWorthData);
    console.log(`✅ Inserted ${netWorthData.length} monthly Net Worth snapshots.`);

    // 14. Create Monthly Review Digests for August & September 2026
    console.log('📑 Creating AI Monthly Review Digests...');
    const digestsData = [
      {
        user: userId,
        month: '2026-08',
        year: 2026,
        monthNumber: 8,
        monthName: 'August 2026',
        summary: {
          totalIncome: 174250,
          totalExpense: 68450,
          netCashFlow: 105800,
          savingsRate: 60.7,
        },
        financialHealthScore: {
          score: 88,
          grade: 'A',
          status: 'Excellent',
        },
        topCategories: [
          { name: 'Housing & Rent', amount: 32000, percentage: 46.7, color: '#ef4444', icon: 'Home' },
          { name: 'Electronics & Gadgets', amount: 7800, percentage: 11.4, color: '#64748b', icon: 'Smartphone' },
          { name: 'Transportation & Fuel', amount: 5600, percentage: 8.2, color: '#3b82f6', icon: 'Car' },
          { name: 'Groceries & Essentials', amount: 5200, percentage: 7.6, color: '#f97316', icon: 'ShoppingCart' },
          { name: 'Education & Learning', amount: 3500, percentage: 5.1, color: '#6366f1', icon: 'BookOpen' },
        ],
        anomalies: [
          { category: 'Electronics & Gadgets', current: 7800, average: 2100, increase: 271 },
        ],
        budgetPerformance: [
          { name: 'Food & Dining Budget', limit: 15000, spent: 8950, percentage: 59.7, status: 'safe' },
          { name: 'Groceries & Essentials Budget', limit: 18000, spent: 12400, percentage: 68.9, status: 'safe' },
          { name: 'Shopping & Apparel Budget', limit: 12000, spent: 4800, percentage: 40.0, status: 'safe' },
        ],
        netWorthChange: {
          startNetWorth: -3535000,
          endNetWorth: -3378000,
          delta: 157000,
          deltaPercentage: 4.4,
        },
        largestTransactions: [
          { merchant: 'Sobha Dream Acres Society', amount: 32000, date: new Date(2026, 7, 3), categoryName: 'Housing & Rent' },
          { merchant: 'Amazon India Great Freedom Sale', amount: 7800, date: new Date(2026, 7, 14), categoryName: 'Electronics & Gadgets' },
        ],
        insights: [
          'Exceptional savings rate of 60.7% achieved due to auxiliary freelance income.',
          'All active budgets remained strictly within guardrails.',
          'Discretionary spending was disciplined with no high-cost credit interest incurred.',
        ],
        recommendations: [
          'Consider boosting SIP investments into Nifty 50 Index fund with surplus cash.',
          'Review the electronics warranty for the recent Logitech mouse purchase.',
        ],
        transactionCount: 22,
        isAutomated: true,
      },
      {
        user: userId,
        month: '2026-09',
        year: 2026,
        monthNumber: 9,
        monthName: 'September 2026',
        summary: {
          totalIncome: 194500,
          totalExpense: 84200,
          netCashFlow: 110300,
          savingsRate: 56.7,
        },
        financialHealthScore: {
          score: 85,
          grade: 'A',
          status: 'Very Healthy',
        },
        topCategories: [
          { name: 'Housing & Rent', amount: 32000, percentage: 38.0, color: '#ef4444', icon: 'Home' },
          { name: 'Shopping & Apparel', amount: 16500, percentage: 19.6, color: '#8b5cf6', icon: 'ShoppingBag' },
          { name: 'Groceries & Essentials', amount: 7800, percentage: 9.3, color: '#f97316', icon: 'ShoppingCart' },
          { name: 'Food & Dining Out', amount: 6450, percentage: 7.7, color: '#f59e0b', icon: 'Utensils' },
          { name: 'Transportation & Fuel', amount: 4800, percentage: 5.7, color: '#3b82f6', icon: 'Car' },
        ],
        anomalies: [
          { category: 'Shopping & Apparel', current: 16500, average: 6200, increase: 166 },
        ],
        budgetPerformance: [
          { name: 'Shopping & Apparel Budget', limit: 12000, spent: 16500, percentage: 137.5, status: 'exceeded' },
          { name: 'Food & Dining Budget', limit: 15000, spent: 6450, percentage: 43.0, status: 'safe' },
          { name: 'Groceries & Essentials Budget', limit: 18000, spent: 7800, percentage: 43.3, status: 'safe' },
        ],
        netWorthChange: {
          startNetWorth: -3378000,
          endNetWorth: -3210000,
          delta: 168000,
          deltaPercentage: 5.0,
        },
        largestTransactions: [
          { merchant: 'Sobha Dream Acres Society', amount: 32000, date: new Date(2026, 8, 3), categoryName: 'Housing & Rent' },
          { merchant: 'Myntra Big Fashion Festival', amount: 16500, date: new Date(2026, 8, 20), categoryName: 'Shopping & Apparel' },
        ],
        insights: [
          'Festive season shopping caused an overrun in the Shopping & Apparel budget (+37.5%).',
          'Healthy net cash flow of ₹1,10,300 cushioned the shopping excursion safely without impacting savings.',
        ],
        recommendations: [
          'Rebalance October shopping limit to prevent recurrent festive spikes.',
        ],
        transactionCount: 26,
        isAutomated: true,
      },
    ];
    await MonthlyReviewDigest.insertMany(digestsData);
    console.log(`✅ Created ${digestsData.length} monthly review digests.`);

    // 15. Create Salary Distribution Plan for current month (2026-10)
    console.log('💰 Crafting 50/30/20 Smart Salary Distribution Plan for October...');
    await SalaryDistributionPlan.create({
      user: userId,
      month: '2026-10',
      totalIncome: 145000,
      sourceAccount: accMap['HDFC Salary Account']._id,
      status: 'PENDING',
      isExecuted: false,
      splitPercentages: {
        needsPct: 50,
        goalsPct: 20,
        discretionaryPct: 30,
      },
      allocations: {
        needs: {
          total: 72500,
          items: [
            { id: 'item-1', type: 'RENT', title: 'Apartment Rent (Sobha)', amount: 32000, dueDate: '2026-10-03', accountName: 'HDFC Salary Account', isLocked: true },
            { id: 'item-2', type: 'EMI', title: 'HDFC Home Loan EMI', amount: 25000, dueDate: '2026-10-05', accountName: 'HDFC Salary Account', isLocked: true },
            { id: 'item-3', type: 'BILL', title: 'Electricity & High-speed Internet', amount: 4500, dueDate: '2026-10-10', accountName: 'SBI Cashback Credit Card', isLocked: false },
            { id: 'item-4', type: 'BUDGET', title: 'Pantry & Groceries Essentials', amount: 11000, dueDate: '2026-10-15', accountName: 'Axis Magnus Credit Card', isLocked: false },
          ],
        },
        goals: {
          total: 29000,
          items: [
            { id: 'goal-item-1', targetId: 'goal-emergency', type: 'EMERGENCY_FUND', title: 'Emergency Liquid Buffer Sweep', proposedAmount: 10000, targetAmount: 450000, currentAmount: 320000, isSelected: true },
            { id: 'goal-item-2', targetId: 'inv-sip-nifty', type: 'SIP', title: 'UTI Nifty 50 Index Fund SIP', proposedAmount: 15000, targetAmount: 250000, currentAmount: 216400, isSelected: true },
            { id: 'goal-item-3', targetId: 'inv-gold', type: 'INVESTMENT', title: 'Sovereign Gold Bond allocation', proposedAmount: 4000, targetAmount: 150000, currentAmount: 134500, isSelected: true },
          ],
        },
        discretionary: {
          total: 43500,
          dailySafeToSpend: 1450,
          remainingDays: 30,
          notes: 'Safe to spend ₹1,450 daily on coffee, dining out, and weekend leisure.',
        },
      },
    });
    console.log('✅ Created October 2026 Salary Distribution Plan.');

    // 16. Create Proactive AI Nudges
    console.log('🤖 Generating AI Proactive Nudges & Recommendations...');
    const nudgesData = [
      {
        user: userId,
        type: 'SAFE_TO_SPEND_NUDGE',
        severity: 'SUCCESS',
        title: 'Daily Safe-to-Spend: ₹2,450',
        message: 'Your discretionary burn rate is 18% lower than last month. You have ample cushion for upcoming festivities.',
        actionLabel: 'View Plan',
        actionUrl: '/dashboard',
        data: { safeToSpendDaily: 2450, bufferDays: 14 },
      },
      {
        user: userId,
        type: 'CREDIT_UTILIZATION_WARNING',
        severity: 'INFO',
        title: 'Credit Utilization at 20.3% (Healthy)',
        message: 'Your Axis Magnus card utilization is currently at ₹42,500 of ₹3,00,000 limit. Statement generation is in 8 days.',
        actionLabel: 'Check Cards',
        actionUrl: '/accounts',
        data: { utilizationRate: 20.3, limit: 300000, spent: 42500 },
      },
      {
        user: userId,
        type: 'IDLE_CASH_RECOMMENDATION',
        severity: 'WARNING',
        title: 'Idle Cash Opportunity: ₹80,000',
        message: 'You have ₹1,48,500 in your primary checking account. Moving ₹80,000 into a liquid mutual fund could earn an extra 7.1% APY.',
        actionLabel: 'Invest Now',
        actionUrl: '/investments',
        data: { idleCash: 80000, currentYield: 3.0, targetYield: 7.1 },
      },
      {
        user: userId,
        type: 'PREDICTIVE_BUDGET_EXHAUSTION',
        severity: 'INFO',
        title: 'Budget on Track: Groceries & Essentials',
        message: 'At current velocity of ₹280/day, you are projected to spend ₹14,200 of your ₹18,000 limit (78% utilization).',
        actionLabel: 'View Budgets',
        actionUrl: '/budgets',
        data: { category: 'Groceries & Essentials', projectedSpend: 14200, limit: 18000 },
      },
    ];
    await ProactiveNudge.insertMany(nudgesData);
    console.log(`✅ Created ${nudgesData.length} intelligent proactive nudges.`);

    console.log('\n======================================================');
    console.log('🎉 ALL DUMMY DATA SEEDED SUCCESSFULLY!');
    console.log('======================================================');
    console.log(`📧 Test Email    : ${DEMO_EMAIL}`);
    console.log(`🔑 Test Password : ${DEMO_PASSWORD}`);
    console.log(`👤 Name          : Harshal Patil (Demo)`);
    console.log('------------------------------------------------------');
    console.log('Loaded datasets across all modules:');
    console.log(`• 7 Bank, Cash, Credit Card, UPI & FD Accounts`);
    console.log(`• 20 Categorized Income & Expense classifications`);
    console.log(`• ${insertedTransactions.length} Realistic historical & recent transactions`);
    console.log(`• 6 Active budgets with threshold alerts`);
    console.log(`• 7 Recurring payment rules & subscriptions`);
    console.log(`• 4 Milestone-tracked financial goals`);
    console.log(`• 7 Investment assets (Stocks, MFs with SIP, Gold, PPF, Crypto)`);
    console.log(`• 2 Amortized Loans (Home Loan & Car Loan with 12 EMI logs)`);
    console.log(`• 3 Peer lending & borrowing records`);
    console.log(`• 1 FY 2026-27 complete Tax Record`);
    console.log(`• 6 Months of Net Worth progression snapshots`);
    console.log(`• 2 Complete AI Monthly Review Digests`);
    console.log(`• 1 50/30/20 Smart Salary Distribution Plan`);
    console.log(`• 4 Proactive AI Intelligence Nudges`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

seedData();
