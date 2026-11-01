import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import Transaction from '../models/Transaction.js';
import RecurringRule from '../models/RecurringRule.js';
import TaxRecord from '../models/TaxRecord.js';
import { processRecurringTransactions } from '../cron/jobs/recurringJob.js';
import { getNextRunDate } from '../controllers/recurringController.js';
import { calculateNewRegimeTax, calculateOldRegimeTax } from '../controllers/taxController.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTests() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🧪 RUNNING BILLS EXACT-TIME & TAX COMPUTATION VERIFICATION SUITE');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Connect to DB
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const demoUser = await User.findOne({ email: 'demo@capise.app' });
  if (!demoUser) throw new Error('Demo user not found!');

  let checkingAccount = await Account.findOne({ user: demoUser._id, name: /checking|primary|salary|bank/i });
  if (!checkingAccount) {
    checkingAccount = await Account.findOne({ user: demoUser._id });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 1: TAX COMPUTATION ENGINE (NEW & OLD REGIME)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST SUITE 1: TAX CALCULATION ENGINE ---');

  // 1.1 New Regime <= 7L is 0 tax (87A Rebate)
  const tax5L = calculateNewRegimeTax(500000, '2024-2025');
  assert(tax5L.totalTax === 0 && tax5L.rebate > 0, 'New Regime: ₹5,00,000 taxable income yields ₹0 tax (87A Rebate)');

  const tax7L = calculateNewRegimeTax(700000, '2024-2025');
  assert(tax7L.totalTax === 0 && tax7L.rebate === 20000, 'New Regime: ₹7,00,000 taxable income yields ₹0 tax (Rebate = ₹20,000)');

  // 1.2 Section 87A Marginal Relief for income slightly exceeding 7L
  // For ₹7,10,000: Normal tax before rebate = (4L * 5%) + (10k * 10%) = 20,000 + 1,000 = 21,000
  // Excess income over 7L = 10,000
  // Under marginal relief, tax before cess cannot exceed 10,000! Cess is 4% on 10,000 = 400. Total = 10,400.
  const tax710k = calculateNewRegimeTax(710000, '2024-2025');
  assert(tax710k.marginalRelief > 0 && tax710k.taxAfterRebate === 10000 && tax710k.totalTax === 10400, 'New Regime: Marginal Relief caps tax to excess income over ₹7L (₹7.1L -> ₹10,400 with cess)');

  // 1.3 Normal higher bracket calculation
  // ₹10,00,000: (4L * 5%) + (3L * 10%) = 20,000 + 30,000 = 50,000. Cess (4%) = 2,000. Total = 52,000.
  const tax10L = calculateNewRegimeTax(1000000, '2024-2025');
  assert(tax10L.totalTax === 52000, 'New Regime: ₹10,00,000 taxable income yields exactly ₹52,000 total tax');

  // ₹15,00,000: 20k + 30k + 30k (10-12L) + 60k (12-15L) = 140,000. Cess = 5,600. Total = 1,45,600.
  const tax15L = calculateNewRegimeTax(1500000, '2024-2025');
  assert(tax15L.totalTax === 145600, 'New Regime: ₹15,00,000 taxable income yields exactly ₹1,45,600 total tax');

  // 1.4 Old Regime Calculation
  // ₹5,00,000 in Old Regime: (2.5L * 5%) = 12,500. Rebate 12,500 -> 0 tax.
  const old5L = calculateOldRegimeTax(500000);
  assert(old5L.totalTax === 0 && old5L.rebate === 12500, 'Old Regime: ₹5,00,000 taxable income yields ₹0 tax (87A rebate)');

  // ₹10,00,000 in Old Regime: 12,500 + (5L * 20% = 100,000) = 112,500. Cess = 4,500. Total = 1,17,000.
  const old10L = calculateOldRegimeTax(1000000);
  assert(old10L.totalTax === 117000, 'Old Regime: ₹10,00,000 taxable income yields ₹1,17,000 total tax');

  console.log('\n--- TEST SUITE 2: RECURRING BILLS EXACT TIME & ADVANCE LOGIC ---');

  // 2.1 Next Run Date helper preserving exact time
  const testDate = new Date(2026, 10, 1, 14, 30, 0);
  const nextMonthDate = getNextRunDate(testDate, 'monthly', '14:30');
  assert(
    nextMonthDate.getMonth() === 11 && nextMonthDate.getHours() === 14 && nextMonthDate.getMinutes() === 30,
    'getNextRunDate advances month while preserving exact scheduled hour and minute'
  );

  // 2.2 Create a rule scheduled for right now - 1 minute with autoPost: true
  const pastDue = new Date(Date.now() - 60000); // 1 minute ago
  const timeStr = `${String(pastDue.getHours()).padStart(2, '0')}:${String(pastDue.getMinutes()).padStart(2, '0')}`;

  const initialBalance = checkingAccount.currentBalance;
  const testRule = new RecurringRule({
    user: demoUser._id,
    name: 'TEST_AUTOMATED_BROADBAND_BILL',
    type: 'Expense',
    amount: 1499,
    account: checkingAccount._id,
    frequency: 'monthly',
    time: timeStr,
    nextRunDate: pastDue,
    autoPost: true,
    isActive: true,
  });
  await testRule.save();

  // 2.3 Run processRecurringTransactions daemon
  const cronResult = await processRecurringTransactions(demoUser._id);
  assert(cronResult.success === true, 'Cron processRecurringTransactions executes successfully');

  // Verify transaction was auto-created
  const autoPostedTx = await Transaction.findOne({
    user: demoUser._id,
    notes: /TEST_AUTOMATED_BROADBAND_BILL/,
  });
  assert(!!autoPostedTx && autoPostedTx.amount === 1499, 'Auto-posted transaction was created with exact amount');

  // Verify account balance was deducted
  const updatedAccount = await Account.findById(checkingAccount._id);
  assert(
    Math.round(updatedAccount.currentBalance) === Math.round(initialBalance - 1499),
    `Account balance updated atomically by -₹1499 (Prev: ${initialBalance}, New: ${updatedAccount.currentBalance})`
  );

  // Verify rule's nextRunDate was advanced preserving the exact time
  const updatedRule = await RecurringRule.findById(testRule._id);
  assert(
    updatedRule.nextRunDate > new Date(),
    'Recurring rule nextRunDate was advanced to the future'
  );
  assert(
    updatedRule.time === timeStr,
    `Recurring rule preserved exact scheduled time (${timeStr})`
  );

  // Clean up test rule & transaction and restore account balance
  await testRule.deleteOne();
  if (autoPostedTx) await autoPostedTx.deleteOne();
  await Account.findByIdAndUpdate(checkingAccount._id, { $inc: { currentBalance: 1499 } });

  console.log('\n--- TEST SUITE 3: TAX RECORD UPSERT & COMPARISON ---');

  // 3.1 Create / Update Tax Record for demo user
  const taxRecord = await TaxRecord.findOneAndUpdate(
    { user: demoUser._id, financialYear: '2024-2025' },
    {
      salaryIncome: 1200000,
      businessIncome: 0,
      capitalGains: 50000,
      otherIncome: 25000,
      standardDeduction: 75000,
      deduction80C: 150000,
      deduction80D: 25000,
      tdsPaid: 65000,
      advanceTaxPaid: 10000,
      regime: 'new',
    },
    { new: true, upsert: true }
  );

  // Calculate under new regime
  // Gross = 12,75,000. Std Deduction = 75,000. Taxable = 12,00,000.
  // 3L @ 0%, 4L @ 5% (20k), 3L @ 10% (30k), 2L @ 15% (30k) = 80,000. Cess = 3,200. Total = 83,200.
  const newCalc = calculateNewRegimeTax(1200000, '2024-2025');
  assert(newCalc.totalTax === 83200, 'New Regime tax on ₹12L taxable income is ₹83,200');

  // Under Old Regime: Gross = 12,75,000. Std = 50,000. 80C = 1,50,000. 80D = 25,000. Total Deductions = 2,25,000.
  // Taxable = 10,50,000.
  // 2.5L @ 0%, 2.5L @ 5% (12.5k), 5L @ 20% (100k), 50k @ 30% (15k) = 1,27,500. Cess = 5,100. Total = 1,32,600.
  const oldCalc = calculateOldRegimeTax(1050000);
  assert(oldCalc.totalTax === 132600, 'Old Regime tax on ₹10.5L taxable income is ₹1,32,600');

  // Verify New Regime saves ₹49,400 compared to Old Regime
  const savings = Math.abs(oldCalc.totalTax - newCalc.totalTax);
  assert(savings === 49400, 'New Regime saves exactly ₹49,400 over Old Regime for this taxpayer');

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED!`);
  console.log('════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
