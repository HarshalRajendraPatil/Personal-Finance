import TaxRecord from '../models/TaxRecord.js';

// Helper to calculate tax based on New Tax Regime (India)
const calculateNewRegimeTax = (taxableIncome) => {
  const rebateLimit = Number(process.env.TAX_REBATE_LIMIT) || 700000;
  
  if (taxableIncome <= rebateLimit) {
    return 0;
  }

  const b1 = Number(process.env.TAX_BRACKET_1) || 300000; // 0%
  const b2 = Number(process.env.TAX_BRACKET_2) || 600000; // 5%
  const b3 = Number(process.env.TAX_BRACKET_3) || 900000; // 10%
  const b4 = Number(process.env.TAX_BRACKET_4) || 1200000; // 15%
  const b5 = Number(process.env.TAX_BRACKET_5) || 1500000; // 20%

  let tax = 0;
  let remaining = taxableIncome;

  if (remaining > b5) {
    tax += (remaining - b5) * 0.30;
    remaining = b5;
  }
  if (remaining > b4) {
    tax += (remaining - b4) * 0.20;
    remaining = b4;
  }
  if (remaining > b3) {
    tax += (remaining - b3) * 0.15;
    remaining = b3;
  }
  if (remaining > b2) {
    tax += (remaining - b2) * 0.10;
    remaining = b2;
  }
  if (remaining > b1) {
    tax += (remaining - b1) * 0.05;
    remaining = b1;
  }

  tax = tax + (tax * 0.04);
  return Math.round(tax);
};

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
    let record = await TaxRecord.findOne({ user: req.user._id, financialYear: req.params.year });
    if (!record) {
      record = new TaxRecord({ user: req.user._id, financialYear: req.params.year });
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
      record = new TaxRecord({ user: req.user._id, financialYear: year });
    }

    Object.keys(updateData).forEach(key => {
      if (record[key] !== undefined) {
        record[key] = updateData[key];
      }
    });

    const totalIncome = (record.salaryIncome || 0) + 
                        (record.businessIncome || 0) + 
                        (record.capitalGains || 0) + 
                        (record.otherIncome || 0);

    const deductions = (record.standardDeduction || 0);
    const taxableIncome = Math.max(0, totalIncome - deductions);
    
    record.calculatedTaxLiability = calculateNewRegimeTax(taxableIncome);

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
