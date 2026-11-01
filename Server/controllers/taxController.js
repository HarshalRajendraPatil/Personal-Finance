import TaxRecord from '../models/TaxRecord.js';
import Transaction from '../models/Transaction.js';

// ══════════════════════════════════════════════════════════════════════════
// 1. INDIAN INCOME TAX COMPUTATION ENGINE
// ══════════════════════════════════════════════════════════════════════════

/**
 * Calculates tax liability under New Tax Regime (Section 115BAC)
 * - FY 2024-25 & FY 2025-26 (Finance Act 2024 revised slabs)
 * - FY 2023-24 (Previous slabs)
 * - Section 87A Rebate (up to ₹7,00,000 taxable income -> ₹0 tax)
 * - Section 87A Marginal Relief (for income slightly exceeding ₹7,00,000)
 * - 4% Health & Education Cess
 */
export const calculateNewRegimeTax = (taxableIncome, financialYear = '2024-2025') => {
  const income = Math.max(0, Math.round(taxableIncome));
  if (income <= 0) {
    return { taxBeforeRebate: 0, rebate: 0, marginalRelief: 0, taxAfterRebate: 0, cess: 0, totalTax: 0, slabBreakdown: [] };
  }

  const isPreBudget24 = financialYear === '2023-2024';
  let taxBeforeRebate = 0;
  const slabBreakdown = [];

  if (isPreBudget24) {
    // FY 2023-24 Slabs
    const brackets = [
      { min: 0, max: 300000, rate: 0, label: 'Up to ₹3,00,000 (0%)' },
      { min: 300000, max: 600000, rate: 0.05, label: '₹3,00,001 - ₹6,00,000 (5%)' },
      { min: 600000, max: 900000, rate: 0.10, label: '₹6,00,001 - ₹9,00,000 (10%)' },
      { min: 900000, max: 1200000, rate: 0.15, label: '₹9,00,001 - ₹12,00,000 (15%)' },
      { min: 1200000, max: 1500000, rate: 0.20, label: '₹12,00,001 - ₹15,00,000 (20%)' },
      { min: 1500000, max: Infinity, rate: 0.30, label: 'Above ₹15,00,000 (30%)' }
    ];
    for (const b of brackets) {
      if (income > b.min) {
        const taxableAmount = Math.min(income, b.max) - b.min;
        const slabTax = taxableAmount * b.rate;
        taxBeforeRebate += slabTax;
        slabBreakdown.push({ label: b.label, taxableAmount, rate: b.rate, tax: slabTax });
      }
    }
  } else {
    // FY 2024-25 & FY 2025-26 Slabs (Finance Act 2024)
    const brackets = [
      { min: 0, max: 300000, rate: 0, label: 'Up to ₹3,00,000 (0%)' },
      { min: 300000, max: 700000, rate: 0.05, label: '₹3,00,001 - ₹7,00,000 (5%)' },
      { min: 700000, max: 1000000, rate: 0.10, label: '₹7,00,001 - ₹10,00,000 (10%)' },
      { min: 1000000, max: 1200000, rate: 0.15, label: '₹10,00,001 - ₹12,00,000 (15%)' },
      { min: 1200000, max: 1500000, rate: 0.20, label: '₹12,00,001 - ₹15,00,000 (20%)' },
      { min: 1500000, max: Infinity, rate: 0.30, label: 'Above ₹15,00,000 (30%)' }
    ];
    for (const b of brackets) {
      if (income > b.min) {
        const taxableAmount = Math.min(income, b.max) - b.min;
        const slabTax = taxableAmount * b.rate;
        taxBeforeRebate += slabTax;
        slabBreakdown.push({ label: b.label, taxableAmount, rate: b.rate, tax: slabTax });
      }
    }
  }

  // Section 87A Rebate & Marginal Relief
  let rebate = 0;
  let marginalRelief = 0;
  let taxAfterRebate = taxBeforeRebate;

  if (income <= 700000) {
    rebate = taxBeforeRebate;
    taxAfterRebate = 0;
  } else {
    // Section 87A Marginal Relief:
    // Tax payable cannot exceed (Taxable Income - 7,00,000)
    const excessIncome = income - 700000;
    if (taxBeforeRebate > excessIncome) {
      marginalRelief = taxBeforeRebate - excessIncome;
      taxAfterRebate = excessIncome;
    }
  }

  const cess = Math.round(taxAfterRebate * 0.04);
  const totalTax = Math.round(taxAfterRebate + cess);

  return {
    taxBeforeRebate: Math.round(taxBeforeRebate),
    rebate: Math.round(rebate),
    marginalRelief: Math.round(marginalRelief),
    taxAfterRebate: Math.round(taxAfterRebate),
    cess,
    totalTax,
    slabBreakdown
  };
};

/**
 * Calculates tax liability under Old Tax Regime
 * - Slabs: 0-2.5L (0%), 2.5L-5L (5%), 5L-10L (20%), >10L (30%)
 * - Section 87A Rebate (up to ₹5,00,000 taxable income -> max ₹12,500 rebate)
 * - 4% Health & Education Cess
 */
export const calculateOldRegimeTax = (taxableIncome) => {
  const income = Math.max(0, Math.round(taxableIncome));
  if (income <= 0) {
    return { taxBeforeRebate: 0, rebate: 0, taxAfterRebate: 0, cess: 0, totalTax: 0, slabBreakdown: [] };
  }

  const brackets = [
    { min: 0, max: 250000, rate: 0, label: 'Up to ₹2,50,000 (0%)' },
    { min: 250000, max: 500000, rate: 0.05, label: '₹2,50,001 - ₹5,00,000 (5%)' },
    { min: 500000, max: 1000000, rate: 0.20, label: '₹5,00,001 - ₹10,00,000 (20%)' },
    { min: 1000000, max: Infinity, rate: 0.30, label: 'Above ₹10,00,000 (30%)' }
  ];

  let taxBeforeRebate = 0;
  const slabBreakdown = [];

  for (const b of brackets) {
    if (income > b.min) {
      const taxableAmount = Math.min(income, b.max) - b.min;
      const slabTax = taxableAmount * b.rate;
      taxBeforeRebate += slabTax;
      slabBreakdown.push({ label: b.label, taxableAmount, rate: b.rate, tax: slabTax });
    }
  }

  let rebate = 0;
  let taxAfterRebate = taxBeforeRebate;

  if (income <= 500000) {
    rebate = Math.min(taxBeforeRebate, 12500);
    taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);
  }

  const cess = Math.round(taxAfterRebate * 0.04);
  const totalTax = Math.round(taxAfterRebate + cess);

  return {
    taxBeforeRebate: Math.round(taxBeforeRebate),
    rebate: Math.round(rebate),
    taxAfterRebate: Math.round(taxAfterRebate),
    cess,
    totalTax,
    slabBreakdown
  };
};

// ══════════════════════════════════════════════════════════════════════════
// 2. CONTROLLER ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

export const getTaxRecords = async (req, res) => {
  try {
    const records = await TaxRecord.find({ user: req.user._id }).sort({ financialYear: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getTaxRecordByYear = async (req, res) => {
  try {
    const { year } = req.params;
    let record = await TaxRecord.findOne({ user: req.user._id, financialYear: year });
    if (!record) {
      const isPre2024 = year === '2023-2024';
      record = new TaxRecord({
        user: req.user._id,
        financialYear: year,
        standardDeduction: isPre2024 ? 50000 : 75000,
        regime: 'new',
      });
      await record.save();
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateTaxRecord = async (req, res) => {
  try {
    const { year } = req.params;
    const updateData = { ...req.body };
    delete updateData.user;
    delete updateData.financialYear;

    let record = await TaxRecord.findOne({ user: req.user._id, financialYear: year });
    if (!record) {
      const isPre2024 = year === '2023-2024';
      record = new TaxRecord({
        user: req.user._id,
        financialYear: year,
        standardDeduction: isPre2024 ? 50000 : 75000,
        regime: updateData.regime || 'new',
      });
    }

    Object.keys(updateData).forEach(key => {
      if (record[key] !== undefined) {
        record[key] = updateData[key];
      }
    });

    const grossIncome = (record.salaryIncome || 0) +
                        (record.businessIncome || 0) +
                        (record.capitalGains || 0) +
                        (record.otherIncome || 0);

    // 1. Calculate New Tax Regime Liability
    const defaultNewStdDeduction = year === '2023-2024' ? 50000 : 75000;
    const userStdDeduction = record.standardDeduction !== undefined ? record.standardDeduction : defaultNewStdDeduction;
    const effectiveNewStdDeduction = Math.min(userStdDeduction, record.salaryIncome || grossIncome);
    const newTaxableIncome = Math.max(0, grossIncome - effectiveNewStdDeduction);
    const newRegimeResult = calculateNewRegimeTax(newTaxableIncome, year);

    // 2. Calculate Old Tax Regime Liability
    const oldStdDeduction = Math.min(50000, record.salaryIncome || grossIncome);
    const capped80C = Math.min(record.deduction80C || 0, 150000);
    const capped80D = Math.min(record.deduction80D || 0, 100000);
    const capped80CCD = Math.min(record.deduction80CCD || 0, 50000);
    const cappedHomeLoan = Math.min(record.homeLoanInterest || 0, 200000);
    const hraExemption = Math.max(0, record.hraExemption || 0);
    const otherDeductions = Math.max(0, record.otherDeductions || 0);

    const oldTotalDeductions = oldStdDeduction + capped80C + capped80D + capped80CCD + cappedHomeLoan + hraExemption + otherDeductions;
    const oldTaxableIncome = Math.max(0, grossIncome - oldTotalDeductions);
    const oldRegimeResult = calculateOldRegimeTax(oldTaxableIncome);

    // 3. Compare Regimes and Recommend Best Choice
    record.calculatedNewRegimeTax = newRegimeResult.totalTax;
    record.calculatedOldRegimeTax = oldRegimeResult.totalTax;
    record.recommendedRegime = newRegimeResult.totalTax <= oldRegimeResult.totalTax ? 'new' : 'old';
    record.taxSavings = Math.abs(newRegimeResult.totalTax - oldRegimeResult.totalTax);

    // Chosen regime determines liability
    record.calculatedTaxLiability = record.regime === 'old' ? oldRegimeResult.totalTax : newRegimeResult.totalTax;

    await record.save();

    res.json({
      ...record.toObject(),
      newRegimeDetails: newRegimeResult,
      oldRegimeDetails: oldRegimeResult,
      grossIncome,
      newTaxableIncome,
      oldTaxableIncome,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Auto-aggregates actual user income, investments, and taxes from recorded transactions
 * for the selected Financial Year (1 April YYYY to 31 March YYYY+1)
 */
export const getTaxAutoSummary = async (req, res) => {
  try {
    const { year } = req.params;
    const parts = (year || '2024-2025').split('-');
    const startYear = parseInt(parts[0], 10);
    const endYear = parts.length > 1 ? parseInt(parts[1], 10) : startYear + 1;

    const startDate = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)); // 1 April
    const endDate = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)); // 31 March

    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate },
    }).populate('category subcategory');

    let salaryIncome = 0;
    let businessIncome = 0;
    let capitalGains = 0;
    let otherIncome = 0;
    let tdsPaid = 0;
    let advanceTaxPaid = 0;
    let deduction80C = 0;
    let deduction80D = 0;

    let transactionCount = 0;

    for (const tx of transactions) {
      transactionCount++;
      const catName = (tx.category?.name || '').toLowerCase();
      const subName = (tx.subcategory?.name || '').toLowerCase();
      const notes = (tx.notes || '').toLowerCase();
      const text = `${catName} ${subName} ${notes}`;

      if (tx.type === 'Income') {
        if (/salary|paycheck|payroll|stipend|wages/.test(text)) {
          salaryIncome += tx.amount;
        } else if (/business|freelance|consult|client|invoice|sales/.test(text)) {
          businessIncome += tx.amount;
        } else if (/capital|dividend|interest|stock|trading|mutual|crypto|gain/.test(text)) {
          capitalGains += tx.amount;
        } else {
          otherIncome += tx.amount;
        }
      } else if (tx.type === 'Expense') {
        if (/advance\s*tax/.test(text)) {
          advanceTaxPaid += tx.amount;
        } else if (/tds|tax\s*deducted|withholding/.test(text)) {
          tdsPaid += tx.amount;
        } else if (/tax|income\s*tax|government/.test(text)) {
          tdsPaid += tx.amount;
        }

        // Potential 80C & 80D investments detected
        if (/ppf|elss|epf|life\s*insurance|term\s*insurance|lic|nps/.test(text)) {
          deduction80C += tx.amount;
        } else if (/health\s*insurance|mediclaim|medical\s*insurance/.test(text)) {
          deduction80D += tx.amount;
        }
      }
    }

    res.json({
      financialYear: year,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      transactionCount,
      summary: {
        salaryIncome: Math.round(salaryIncome),
        businessIncome: Math.round(businessIncome),
        capitalGains: Math.round(capitalGains),
        otherIncome: Math.round(otherIncome),
        tdsPaid: Math.round(tdsPaid),
        advanceTaxPaid: Math.round(advanceTaxPaid),
        deduction80C: Math.min(150000, Math.round(deduction80C)),
        deduction80D: Math.min(100000, Math.round(deduction80D)),
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error aggregating tax summary', error: error.message });
  }
};

export const deleteTaxRecord = async (req, res) => {
  try {
    const record = await TaxRecord.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!record) return res.status(404).json({ message: 'Tax record not found' });
    res.json({ message: 'Tax record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
