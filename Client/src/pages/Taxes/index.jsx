import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTaxRecordByYear, updateTaxRecord, fetchTaxAutoSummary } from '../../store/taxSlice';
import CapiseLoader from '../../components/ui/CapiseLoader';
import {
  Calculator, AlertCircle, Save, RefreshCw, Sparkles,
  ShieldCheck, HelpCircle, CheckCircle2, AlertTriangle, ArrowRight,
  TrendingDown, TrendingUp, Calendar, Info, ChevronDown, ChevronUp, Zap
} from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const FY_OPTIONS = [
  '2025-2026',
  '2024-2025',
  '2023-2024',
];

/**
 * Client-side calculation helper to provide immediate, instant reactivity as user types
 */
const computeTaxEngine = (form, year) => {
  const grossIncome = (Number(form.salaryIncome) || 0) +
                      (Number(form.businessIncome) || 0) +
                      (Number(form.capitalGains) || 0) +
                      (Number(form.otherIncome) || 0);

  const isPreBudget24 = year === '2023-2024';
  const defaultStdDeduction = isPreBudget24 ? 50000 : 75000;
  const userStdDeduction = form.standardDeduction !== '' ? Number(form.standardDeduction) : defaultStdDeduction;

  // 1. NEW REGIME
  const effectiveNewStd = Math.min(userStdDeduction, Number(form.salaryIncome) || grossIncome);
  const newTaxableIncome = Math.max(0, grossIncome - effectiveNewStd);

  let newTaxBeforeRebate = 0;
  const newSlabs = [];

  if (isPreBudget24) {
    const brackets = [
      { min: 0, max: 300000, rate: 0, label: 'Up to ₹3,00,000 (0%)' },
      { min: 300000, max: 600000, rate: 0.05, label: '₹3,00,001 - ₹6,00,000 (5%)' },
      { min: 600000, max: 900000, rate: 0.10, label: '₹6,00,001 - ₹9,00,000 (10%)' },
      { min: 900000, max: 1200000, rate: 0.15, label: '₹9,00,001 - ₹12,00,000 (15%)' },
      { min: 1200000, max: 1500000, rate: 0.20, label: '₹12,00,001 - ₹15,00,000 (20%)' },
      { min: 1500000, max: Infinity, rate: 0.30, label: 'Above ₹15,00,000 (30%)' }
    ];
    for (const b of brackets) {
      if (newTaxableIncome > b.min) {
        const amt = Math.min(newTaxableIncome, b.max) - b.min;
        const tax = amt * b.rate;
        newTaxBeforeRebate += tax;
        newSlabs.push({ label: b.label, amt, rate: b.rate, tax });
      }
    }
  } else {
    const brackets = [
      { min: 0, max: 300000, rate: 0, label: 'Up to ₹3,00,000 (0%)' },
      { min: 300000, max: 700000, rate: 0.05, label: '₹3,00,001 - ₹7,00,000 (5%)' },
      { min: 700000, max: 1000000, rate: 0.10, label: '₹7,00,001 - ₹10,00,000 (10%)' },
      { min: 1000000, max: 1200000, rate: 0.15, label: '₹10,00,001 - ₹12,00,000 (15%)' },
      { min: 1200000, max: 1500000, rate: 0.20, label: '₹12,00,001 - ₹15,00,000 (20%)' },
      { min: 1500000, max: Infinity, rate: 0.30, label: 'Above ₹15,00,000 (30%)' }
    ];
    for (const b of brackets) {
      if (newTaxableIncome > b.min) {
        const amt = Math.min(newTaxableIncome, b.max) - b.min;
        const tax = amt * b.rate;
        newTaxBeforeRebate += tax;
        newSlabs.push({ label: b.label, amt, rate: b.rate, tax });
      }
    }
  }

  let newRebate = 0;
  let newMarginalRelief = 0;
  let newTaxAfterRebate = newTaxBeforeRebate;

  if (newTaxableIncome <= 700000) {
    newRebate = newTaxBeforeRebate;
    newTaxAfterRebate = 0;
  } else {
    const excess = newTaxableIncome - 700000;
    if (newTaxBeforeRebate > excess) {
      newMarginalRelief = newTaxBeforeRebate - excess;
      newTaxAfterRebate = excess;
    }
  }

  const newCess = Math.round(newTaxAfterRebate * 0.04);
  const newTotalTax = Math.round(newTaxAfterRebate + newCess);

  // 2. OLD REGIME
  const oldStd = Math.min(50000, Number(form.salaryIncome) || grossIncome);
  const capped80C = Math.min(Number(form.deduction80C) || 0, 150000);
  const capped80D = Math.min(Number(form.deduction80D) || 0, 100000);
  const capped80CCD = Math.min(Number(form.deduction80CCD) || 0, 50000);
  const cappedHomeLoan = Math.min(Number(form.homeLoanInterest) || 0, 200000);
  const hraExemption = Math.max(0, Number(form.hraExemption) || 0);
  const otherDeductions = Math.max(0, Number(form.otherDeductions) || 0);

  const oldTotalDeductions = oldStd + capped80C + capped80D + capped80CCD + cappedHomeLoan + hraExemption + otherDeductions;
  const oldTaxableIncome = Math.max(0, grossIncome - oldTotalDeductions);

  let oldTaxBeforeRebate = 0;
  const oldSlabs = [];
  const oldBrackets = [
    { min: 0, max: 250000, rate: 0, label: 'Up to ₹2,50,000 (0%)' },
    { min: 250000, max: 500000, rate: 0.05, label: '₹2,50,001 - ₹5,00,000 (5%)' },
    { min: 500000, max: 1000000, rate: 0.20, label: '₹5,00,001 - ₹10,00,000 (20%)' },
    { min: 1000000, max: Infinity, rate: 0.30, label: 'Above ₹10,00,000 (30%)' }
  ];
  for (const b of oldBrackets) {
    if (oldTaxableIncome > b.min) {
      const amt = Math.min(oldTaxableIncome, b.max) - b.min;
      const tax = amt * b.rate;
      oldTaxBeforeRebate += tax;
      oldSlabs.push({ label: b.label, amt, rate: b.rate, tax });
    }
  }

  let oldRebate = 0;
  let oldTaxAfterRebate = oldTaxBeforeRebate;
  if (oldTaxableIncome <= 500000) {
    oldRebate = Math.min(oldTaxBeforeRebate, 12500);
    oldTaxAfterRebate = Math.max(0, oldTaxBeforeRebate - oldRebate);
  }

  const oldCess = Math.round(oldTaxAfterRebate * 0.04);
  const oldTotalTax = Math.round(oldTaxAfterRebate + oldCess);

  const bestRegime = newTotalTax <= oldTotalTax ? 'new' : 'old';
  const taxSavings = Math.abs(newTotalTax - oldTotalTax);

  return {
    grossIncome,
    new: {
      standardDeduction: effectiveNewStd,
      taxableIncome: newTaxableIncome,
      taxBeforeRebate: Math.round(newTaxBeforeRebate),
      rebate: Math.round(newRebate),
      marginalRelief: Math.round(newMarginalRelief),
      taxAfterRebate: Math.round(newTaxAfterRebate),
      cess: newCess,
      totalTax: newTotalTax,
      slabs: newSlabs,
    },
    old: {
      totalDeductions: oldTotalDeductions,
      taxableIncome: oldTaxableIncome,
      taxBeforeRebate: Math.round(oldTaxBeforeRebate),
      rebate: Math.round(oldRebate),
      taxAfterRebate: Math.round(oldTaxAfterRebate),
      cess: oldCess,
      totalTax: oldTotalTax,
      slabs: oldSlabs,
    },
    bestRegime,
    taxSavings,
  };
};

const Taxes = () => {
  const dispatch = useDispatch();
  const { currentRecord, isLoading, isSyncing, autoSummary } = useSelector(s => s.taxes);

  const [year, setYear] = useState(FY_OPTIONS[1]); // default FY 2024-2025
  const [regime, setRegime] = useState('new');
  const [showOldRegimeInputs, setShowOldRegimeInputs] = useState(false);
  const [showAdvanceTaxSchedule, setShowAdvanceTaxSchedule] = useState(false);
  const [showSlabBreakdown, setShowSlabBreakdown] = useState(false);
  const [syncAppliedBanner, setSyncAppliedBanner] = useState(null);

  const defaultStd = year === '2023-2024' ? '50000' : '75000';

  const [form, setForm] = useState({
    salaryIncome: '',
    businessIncome: '',
    capitalGains: '',
    otherIncome: '',
    standardDeduction: defaultStd,
    deduction80C: '',
    deduction80D: '',
    deduction80CCD: '',
    homeLoanInterest: '',
    hraExemption: '',
    otherDeductions: '',
    tdsPaid: '',
    advanceTaxPaid: '',
    notes: '',
  });

  useEffect(() => {
    dispatch(fetchTaxRecordByYear(year));
  }, [dispatch, year]);

  useEffect(() => {
    if (currentRecord && currentRecord.financialYear === year) {
      setRegime(currentRecord.regime || 'new');
      setForm({
        salaryIncome: currentRecord.salaryIncome ?? '',
        businessIncome: currentRecord.businessIncome ?? '',
        capitalGains: currentRecord.capitalGains ?? '',
        otherIncome: currentRecord.otherIncome ?? '',
        standardDeduction: currentRecord.standardDeduction ?? (year === '2023-2024' ? 50000 : 75000),
        deduction80C: currentRecord.deduction80C ?? '',
        deduction80D: currentRecord.deduction80D ?? '',
        deduction80CCD: currentRecord.deduction80CCD ?? '',
        homeLoanInterest: currentRecord.homeLoanInterest ?? '',
        hraExemption: currentRecord.hraExemption ?? '',
        otherDeductions: currentRecord.otherDeductions ?? '',
        tdsPaid: currentRecord.tdsPaid ?? '',
        advanceTaxPaid: currentRecord.advanceTaxPaid ?? '',
        notes: currentRecord.notes ?? '',
      });
      if (currentRecord.regime === 'old' || Number(currentRecord.deduction80C) > 0) {
        setShowOldRegimeInputs(true);
      }
    }
  }, [currentRecord, year]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    const payload = {
      regime,
      salaryIncome: Number(form.salaryIncome) || 0,
      businessIncome: Number(form.businessIncome) || 0,
      capitalGains: Number(form.capitalGains) || 0,
      otherIncome: Number(form.otherIncome) || 0,
      standardDeduction: Number(form.standardDeduction) || (year === '2023-2024' ? 50000 : 75000),
      deduction80C: Number(form.deduction80C) || 0,
      deduction80D: Number(form.deduction80D) || 0,
      deduction80CCD: Number(form.deduction80CCD) || 0,
      homeLoanInterest: Number(form.homeLoanInterest) || 0,
      hraExemption: Number(form.hraExemption) || 0,
      otherDeductions: Number(form.otherDeductions) || 0,
      tdsPaid: Number(form.tdsPaid) || 0,
      advanceTaxPaid: Number(form.advanceTaxPaid) || 0,
      notes: form.notes || '',
    };
    dispatch(updateTaxRecord({ year, data: payload }));
  };

  const handleAutoSync = async () => {
    try {
      const res = await dispatch(fetchTaxAutoSummary(year)).unwrap();
      if (res && res.summary) {
        const s = res.summary;
        setForm(prev => ({
          ...prev,
          salaryIncome: s.salaryIncome || prev.salaryIncome,
          businessIncome: s.businessIncome || prev.businessIncome,
          capitalGains: s.capitalGains || prev.capitalGains,
          otherIncome: s.otherIncome || prev.otherIncome,
          tdsPaid: s.tdsPaid || prev.tdsPaid,
          advanceTaxPaid: s.advanceTaxPaid || prev.advanceTaxPaid,
          deduction80C: s.deduction80C || prev.deduction80C,
          deduction80D: s.deduction80D || prev.deduction80D,
        }));
        setSyncAppliedBanner(`Successfully synced ${res.transactionCount} transactions for FY ${year}!`);
        setTimeout(() => setSyncAppliedBanner(null), 6000);
      }
    } catch (err) {
      console.error('Failed to sync taxes:', err);
    }
  };

  // Instant reactive computation
  const calc = useMemo(() => computeTaxEngine(form, year), [form, year]);
  const activeTaxObj = regime === 'new' ? calc.new : calc.old;
  const taxableIncome = activeTaxObj.taxableIncome;
  const taxLiability = activeTaxObj.totalTax;
  const taxPaid = (Number(form.tdsPaid) || 0) + (Number(form.advanceTaxPaid) || 0);
  const taxDue = taxLiability - taxPaid;

  // Advance tax schedule (if net liability after TDS > 10,000)
  const netAdvanceTaxRequired = Math.max(0, taxLiability - (Number(form.tdsPaid) || 0));
  const requiresAdvanceTax = netAdvanceTaxRequired > 10000;

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tax Tracking & Intelligence</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              India Income Tax
            </span>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
            Estimate liability under New (Sec 115BAC) & Old Regimes, track TDS/Advance tax, and identify tax-saving headroom.
          </p>
        </div>

        <div className="flex flex-wrap items-center w-full sm:w-auto gap-2">
          <select
            value={year}
            onChange={(e) => {
              const newY = e.target.value;
              setYear(newY);
              setForm(prev => ({
                ...prev,
                standardDeduction: newY === '2023-2024' ? '50000' : '75000'
              }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500 font-semibold bg-white shadow-2xs"
          >
            {FY_OPTIONS.map(y => <option key={y} value={y}>FY {y}</option>)}
          </select>

          <button
            type="button"
            onClick={handleAutoSync}
            disabled={isSyncing}
            className="flex items-center px-3.5 py-2 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            title="Auto-scan transactions for this FY and pre-fill income and taxes"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-purple-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Scanning...' : 'Sync from Transactions'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-2xs"
          >
            <Save className="w-4 h-4 mr-1.5" />
            <span>{isLoading ? 'Saving...' : 'Save Record'}</span>
          </button>
        </div>
      </div>

      {/* Sync Success Banner */}
      {syncAppliedBanner && (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncAppliedBanner}</span>
          </div>
          <button onClick={() => setSyncAppliedBanner(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">✕</button>
        </div>
      )}

      {/* 🌟 New vs Old Regime Optimization Card */}
      <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-2xl border border-indigo-500/30 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-400/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Regime Comparison & Recommendation (FY {year})
              </p>
            </div>
            <p className="text-sm sm:text-base font-semibold text-white">
              {calc.bestRegime === 'new' ? (
                <>
                  The <strong className="text-emerald-300">New Tax Regime</strong> is optimal for you. It saves you <strong className="text-emerald-300 font-mono">{fmt(calc.taxSavings)}</strong> in income tax!
                </>
              ) : (
                <>
                  The <strong className="text-emerald-300">Old Tax Regime</strong> is optimal for you due to your Section 80C/80D deductions. It saves you <strong className="text-emerald-300 font-mono">{fmt(calc.taxSavings)}</strong>!
                </>
              )}
            </p>
          </div>

          {/* Side by side pills */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => { setRegime('new'); }}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl border transition-all text-left ${regime === 'new' ? 'bg-indigo-600/90 border-indigo-400 shadow-md ring-2 ring-indigo-400/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-indigo-200 font-medium">New Regime</span>
                {calc.bestRegime === 'new' && <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded">Recommended</span>}
              </div>
              <p className="text-lg font-bold font-mono text-white mt-0.5">{fmt(calc.new.totalTax)}</p>
            </button>

            <button
              type="button"
              onClick={() => { setRegime('old'); setShowOldRegimeInputs(true); }}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl border transition-all text-left ${regime === 'old' ? 'bg-purple-600/90 border-purple-400 shadow-md ring-2 ring-purple-400/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-purple-200 font-medium">Old Regime</span>
                {calc.bestRegime === 'old' && <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded">Recommended</span>}
              </div>
              <p className="text-lg font-bold font-mono text-white mt-0.5">{fmt(calc.old.totalTax)}</p>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Income Sources */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Gross Income Sources</span>
              </h2>
              <span className="text-xs text-gray-500 font-medium">All figures in ₹ INR</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Salary Income (Form 16)</label>
                <input
                  name="salaryIncome"
                  type="number"
                  placeholder="0"
                  value={form.salaryIncome}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Business / Freelance Profits</label>
                <input
                  name="businessIncome"
                  type="number"
                  placeholder="0"
                  value={form.businessIncome}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Capital Gains (Equity / Real Estate)</label>
                <input
                  name="capitalGains"
                  type="number"
                  placeholder="0"
                  value={form.capitalGains}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Other Income (FD Interest, Dividends, Rent)</label>
                <input
                  name="otherIncome"
                  type="number"
                  placeholder="0"
                  value={form.otherIncome}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Total Gross Income</span>
              <span className="text-base font-bold text-gray-900 font-mono">{fmt(calc.grossIncome)}</span>
            </div>
          </div>

          {/* Section 2: Deductions & Exemptions */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Deductions & Exemptions</span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  {regime === 'new' ? 'New Regime (Section 115BAC)' : 'Old Tax Regime'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowOldRegimeInputs(!showOldRegimeInputs)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 ml-2"
                >
                  <span>{showOldRegimeInputs ? 'Hide Old Regime Fields' : 'Compare Old Regime Deductions'}</span>
                  {showOldRegimeInputs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Standard deduction row */}
            <div className="bg-indigo-50/60 text-indigo-900 p-3 rounded-xl text-xs mb-4 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-950">
                  Standard Deduction: {year === '2023-2024' ? '₹50,000' : '₹75,000 (New Regime Finance Act 2024) / ₹50,000 (Old Regime)'}
                </p>
                <p className="text-indigo-800/90 mt-0.5">
                  Automatically deducted from salary income for all salaried individuals.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Standard Deduction (₹)</label>
                <input
                  name="standardDeduction"
                  type="number"
                  value={form.standardDeduction}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono bg-gray-50"
                />
              </div>
            </div>

            {/* Old Regime deduction fields (80C, 80D, 80CCD, Home Loan, HRA) */}
            {showOldRegimeInputs && (
              <div className="mt-5 pt-4 border-t border-gray-200/80 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                    Old Regime Specific Deductions
                  </p>
                  <span className="text-[11px] text-gray-500">Applicable when filing under Old Regime</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Section 80C (EPF, PPF, ELSS, LIC) <span className="text-gray-400 font-normal">· Max ₹1.5L</span>
                    </label>
                    <input
                      name="deduction80C"
                      type="number"
                      placeholder="0"
                      value={form.deduction80C}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Section 80D (Health Insurance / Mediclaim) <span className="text-gray-400 font-normal">· Max ₹1L</span>
                    </label>
                    <input
                      name="deduction80D"
                      type="number"
                      placeholder="0"
                      value={form.deduction80D}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Section 80CCD(1B) (National Pension Scheme - NPS) <span className="text-gray-400 font-normal">· Max ₹50k</span>
                    </label>
                    <input
                      name="deduction80CCD"
                      type="number"
                      placeholder="0"
                      value={form.deduction80CCD}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Section 24(b) (Home Loan Interest - Self Occupied) <span className="text-gray-400 font-normal">· Max ₹2L</span>
                    </label>
                    <input
                      name="homeLoanInterest"
                      type="number"
                      placeholder="0"
                      value={form.homeLoanInterest}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      HRA Exemption (House Rent Allowance Section 10(13A))
                    </label>
                    <input
                      name="hraExemption"
                      type="number"
                      placeholder="0"
                      value={form.hraExemption}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Other Deductions (80G, 80TTA, 80E Education Loan)
                    </label>
                    <input
                      name="otherDeductions"
                      type="number"
                      placeholder="0"
                      value={form.otherDeductions}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">
                Net Taxable Income ({regime === 'new' ? 'New Regime' : 'Old Regime'})
              </span>
              <span className="text-base font-bold text-gray-900 font-mono">{fmt(taxableIncome)}</span>
            </div>
          </div>

          {/* Section 3: Taxes Already Paid (TDS & Advance Tax) */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Taxes Already Paid / Deducted</span>
              </h2>
              <span className="text-xs text-gray-500">Reflected in Form 26AS / AIS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">TDS Deducted (₹)</label>
                <input
                  name="tdsPaid"
                  type="number"
                  placeholder="0"
                  value={form.tdsPaid}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Advance Tax Paid (Challan 280)</label>
                <input
                  name="advanceTaxPaid"
                  type="number"
                  placeholder="0"
                  value={form.advanceTaxPaid}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Total Taxes Pre-Paid</span>
              <span className="text-base font-bold text-emerald-700 font-mono">{fmt(taxPaid)}</span>
            </div>
          </div>

        </div>

        {/* Right Col: Calculation Summary & Slabs */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-b from-indigo-50/70 to-white rounded-2xl shadow-xs border border-indigo-100 p-5 sm:p-6 sticky top-6">
            <div className="flex items-center justify-between text-indigo-900 mb-5">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold">Tax Summary</h2>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                {regime === 'new' ? 'New Regime' : 'Old Regime'}
              </span>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-gray-600">
                <span>Gross Income</span>
                <span className="font-semibold text-gray-900 font-mono">{fmt(calc.grossIncome)}</span>
              </div>

              <div className="flex justify-between items-center text-gray-600">
                <span>Total Deductions</span>
                <span className="font-semibold text-indigo-700 font-mono">
                  -{fmt(regime === 'new' ? activeTaxObj.standardDeduction : activeTaxObj.totalDeductions)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-gray-800">
                <span className="font-medium">Net Taxable Income</span>
                <span className="font-bold text-gray-900 font-mono">{fmt(taxableIncome)}</span>
              </div>

              <div className="flex justify-between items-center text-gray-600">
                <span>Tax Before Rebate</span>
                <span className="font-medium text-gray-900 font-mono">{fmt(activeTaxObj.taxBeforeRebate)}</span>
              </div>

              {activeTaxObj.rebate > 0 && (
                <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                  <span className="flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Section 87A Rebate
                  </span>
                  <span className="font-bold font-mono">-{fmt(activeTaxObj.rebate)}</span>
                </div>
              )}

              {activeTaxObj.marginalRelief > 0 && (
                <div className="flex justify-between items-center text-indigo-700 bg-indigo-50/70 p-2 rounded-lg">
                  <span className="flex items-center gap-1 font-medium">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    Marginal Relief (Sec 87A)
                  </span>
                  <span className="font-bold font-mono">-{fmt(activeTaxObj.marginalRelief)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-gray-600">
                <span>Health & Edu Cess (4%)</span>
                <span className="font-medium text-gray-900 font-mono">{fmt(activeTaxObj.cess)}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-900">Calculated Tax Liability</span>
                <span className="font-black text-gray-900 font-mono text-base">{fmt(taxLiability)}</span>
              </div>

              <div className="flex justify-between items-center text-emerald-700">
                <span>Taxes Paid (TDS + Adv)</span>
                <span className="font-bold font-mono">-{fmt(taxPaid)}</span>
              </div>

              {/* Final Net Liability Callout */}
              <div className="pt-4 border-t border-indigo-200">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                  Final Status / Balance
                </p>
                <div className={`text-2xl sm:text-3xl font-black font-mono ${taxDue > 0 ? 'text-red-600' : taxDue < 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                  {taxDue > 0 ? fmt(taxDue) : taxDue < 0 ? `${fmt(Math.abs(taxDue))} (Refund)` : '₹0 (Nil Due)'}
                </div>
                {taxDue > 0 && (
                  <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Outstanding tax due to Income Tax Department.
                  </p>
                )}
                {taxDue < 0 && (
                  <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Eligible for refund upon ITR filing!
                  </p>
                )}
                {taxDue === 0 && (
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    No pending dues or refund.
                  </p>
                )}
              </div>
            </div>

            {/* Slab breakdown toggle */}
            <div className="mt-5 pt-3 border-t border-indigo-100">
              <button
                type="button"
                onClick={() => setShowSlabBreakdown(!showSlabBreakdown)}
                className="w-full text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center justify-between py-1"
              >
                <span>Tax Breakdown by Slab</span>
                {showSlabBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showSlabBreakdown && (
                <div className="mt-2 space-y-2 text-xs bg-white p-3 rounded-xl border border-indigo-100/80 animate-fadeIn font-mono">
                  {activeTaxObj.slabs.length === 0 ? (
                    <p className="text-gray-500 italic text-[11px]">No taxable income in brackets.</p>
                  ) : (
                    activeTaxObj.slabs.map((slab, i) => (
                      <div key={i} className="flex justify-between items-center text-gray-700 border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                        <span className="text-[11px] truncate max-w-[150px]">{slab.label}</span>
                        <span className="font-semibold text-gray-900">{fmt(slab.tax)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Advance Tax schedule banner */}
            {requiresAdvanceTax && (
              <div className="mt-4 pt-3 border-t border-indigo-100">
                <button
                  type="button"
                  onClick={() => setShowAdvanceTaxSchedule(!showAdvanceTaxSchedule)}
                  className="w-full text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center justify-between py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    Advance Tax Schedule (Due &gt; ₹10k)
                  </span>
                  {showAdvanceTaxSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvanceTaxSchedule && (
                  <div className="mt-2 text-xs space-y-1.5 bg-amber-50/70 border border-amber-200/70 p-3 rounded-xl text-amber-950 font-mono">
                    <div className="flex justify-between">
                      <span>15% by 15 Jun:</span>
                      <span className="font-semibold">{fmt(netAdvanceTaxRequired * 0.15)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>45% by 15 Sep:</span>
                      <span className="font-semibold">{fmt(netAdvanceTaxRequired * 0.45)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>75% by 15 Dec:</span>
                      <span className="font-semibold">{fmt(netAdvanceTaxRequired * 0.75)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>100% by 15 Mar:</span>
                      <span className="font-semibold">{fmt(netAdvanceTaxRequired)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="mt-6 w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4 mr-1.5" />
              <span>Save &amp; Recalculate</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Taxes;
