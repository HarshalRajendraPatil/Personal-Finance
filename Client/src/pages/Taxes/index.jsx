import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTaxRecordByYear, updateTaxRecord } from '../../store/taxSlice';
import { Calculator, AlertCircle, Save } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const FY_OPTIONS = [
  '2024-2025',
  '2023-2024',
];

const Taxes = () => {
  const dispatch = useDispatch();
  const { currentRecord, isLoading } = useSelector(s => s.taxes);
  
  const [year, setYear] = useState(FY_OPTIONS[0]);
  const [form, setForm] = useState({
    salaryIncome: '',
    businessIncome: '',
    capitalGains: '',
    otherIncome: '',
    standardDeduction: '50000',
    tdsPaid: '',
    advanceTaxPaid: ''
  });
  
  useEffect(() => {
    dispatch(fetchTaxRecordByYear(year));
  }, [dispatch, year]);

  useEffect(() => {
    if (currentRecord && currentRecord.financialYear === year) {
      setForm({
        salaryIncome: currentRecord.salaryIncome || '',
        businessIncome: currentRecord.businessIncome || '',
        capitalGains: currentRecord.capitalGains || '',
        otherIncome: currentRecord.otherIncome || '',
        standardDeduction: currentRecord.standardDeduction || '50000',
        tdsPaid: currentRecord.tdsPaid || '',
        advanceTaxPaid: currentRecord.advanceTaxPaid || ''
      });
    }
  }, [currentRecord, year]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const payload = {
      salaryIncome: Number(form.salaryIncome) || 0,
      businessIncome: Number(form.businessIncome) || 0,
      capitalGains: Number(form.capitalGains) || 0,
      otherIncome: Number(form.otherIncome) || 0,
      standardDeduction: Number(form.standardDeduction) || 0,
      tdsPaid: Number(form.tdsPaid) || 0,
      advanceTaxPaid: Number(form.advanceTaxPaid) || 0
    };
    dispatch(updateTaxRecord({ year, data: payload }));
  };

  const totalIncome = (Number(form.salaryIncome)||0) + (Number(form.businessIncome)||0) + (Number(form.capitalGains)||0) + (Number(form.otherIncome)||0);
  const totalDeductions = (Number(form.standardDeduction)||0);
  const taxableIncome = Math.max(0, totalIncome - totalDeductions);
  const taxLiability = currentRecord?.calculatedTaxLiability || 0;
  const taxPaid = (Number(form.tdsPaid)||0) + (Number(form.advanceTaxPaid)||0);
  const taxDue = taxLiability - taxPaid;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">Estimate your tax liability (New Regime) and track TDS.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <select value={year} onChange={e => setYear(e.target.value)} className="block w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-medium">
            {FY_OPTIONS.map(y => <option key={y} value={y}>FY {y}</option>)}
          </select>
          <button onClick={handleSave} disabled={isLoading} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4 mr-2" /> {isLoading ? 'Saving...' : 'Save & Calculate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Income Sources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Salary Income (₹)</label>
                <input name="salaryIncome" type="number" value={form.salaryIncome} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Income (₹)</label>
                <input name="businessIncome" type="number" value={form.businessIncome} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capital Gains (₹)</label>
                <input name="capitalGains" type="number" value={form.capitalGains} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Other Income (₹)</label>
                <input name="otherIncome" type="number" value={form.otherIncome} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between font-semibold">
              <span className="text-gray-700">Total Gross Income</span>
              <span className="text-gray-900 text-lg">{fmt(totalIncome)}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Deductions (New Regime)</h2>
            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm mb-4 flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <p>Under the New Tax Regime, most standard deductions like 80C and 80D are not applicable. The Standard Deduction of ₹50,000 is automatically applied for salaried individuals.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Standard Deduction (₹)</label>
                <input name="standardDeduction" type="number" value={form.standardDeduction} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between font-semibold">
              <span className="text-gray-700">Net Taxable Income</span>
              <span className="text-gray-900 text-lg">{fmt(taxableIncome)}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Taxes Already Paid</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">TDS Deducted (₹)</label>
                <input name="tdsPaid" type="number" value={form.tdsPaid} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Advance Tax Paid (₹)</label>
                <input name="advanceTaxPaid" type="number" value={form.advanceTaxPaid} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Calculation */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-b from-indigo-50 to-white rounded-xl shadow-sm border border-indigo-100 p-6 sticky top-6">
            <div className="flex items-center space-x-2 text-indigo-800 mb-6">
              <Calculator className="w-5 h-5" />
              <h2 className="text-lg font-bold">Tax Summary</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Net Taxable Income</span>
                <span className="font-medium text-gray-900">{fmt(taxableIncome)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Calculated Tax Liability</span>
                <span className="font-medium text-gray-900">{fmt(taxLiability)}</span>
              </div>
              
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Taxes Paid (TDS + Adv)</span>
                <span>-{fmt(taxPaid)}</span>
              </div>
              
              <div className="pt-4 border-t border-indigo-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Final Liability</p>
                <div className={`text-3xl font-black ${taxDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {taxDue > 0 ? fmt(taxDue) : `${fmt(Math.abs(taxDue))} (Refund)`}
                </div>
                {taxDue > 0 && <p className="text-xs text-red-500 mt-1">You owe this amount to the government.</p>}
                {taxDue < 0 && <p className="text-xs text-emerald-600 mt-1">You can claim a refund for this amount.</p>}
                {taxDue === 0 && <p className="text-xs text-gray-500 mt-1">No pending tax dues.</p>}
              </div>
            </div>

            <button onClick={handleSave} className="mt-8 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
              Recalculate
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Taxes;
