import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { previewCSV, importCSV, fetchTransactions } from '../store/transactionSlice';
import { fetchAccounts } from '../store/accountSlice';
import { fetchBudgets } from '../store/budgetSlice';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  RefreshCw,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

const CSVImporterModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector((s) => s.accounts);
  const { categories } = useSelector((s) => s.categories);

  const [step, setStep] = useState(1); // 1 = Upload, 2 = Mapping, 3 = Preview & Review, 4 = Complete
  const [csvRawText, setCsvRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    date: '',
    description: '',
    debit: '',
    credit: '',
    amount: '',
    type: '',
    refNo: '',
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [editableEntries, setEditableEntries] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrorMsg('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvRawText(text);

      const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
      const hdrs = firstLine
        .split(',')
        .map((h) => h.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);

      setHeaders(hdrs);

      // Auto-detect columns
      const normalized = hdrs.map((h) => h.toLowerCase().replace(/[_\s-]+/g, ' '));
      const findCol = (patterns) => {
        for (let i = 0; i < normalized.length; i++) {
          const col = normalized[i];
          for (const p of patterns) {
            if (col === p || col.includes(p)) return hdrs[i];
          }
        }
        return '';
      };

      setMapping({
        date: findCol(['transaction date', 'txn date', 'txndate', 'value date', 'date']),
        description: findCol(['narration', 'particulars', 'description', 'remarks', 'payee', 'details']),
        debit: findCol(['debit amount', 'withdrawal amount', 'dr amount', 'debit', 'withdrawal', 'dr']),
        credit: findCol(['credit amount', 'deposit amount', 'cr amount', 'credit', 'deposit', 'cr']),
        amount: findCol(['net amount', 'txn amount', 'amount', 'total']),
        type: findCol(['type', 'dr/cr', 'cr/dr', 'transaction type']),
        refNo: findCol(['chq/ref no', 'ref no', 'reference no', 'cheque no', 'utr', 'txn id']),
      });

      if (!selectedAccount && activeAccounts.length > 0) {
        setSelectedAccount(activeAccounts[0]._id);
      }

      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleAnalyzeStatement = async () => {
    if (!selectedAccount) {
      setErrorMsg('Please select the target bank or card account.');
      return;
    }
    if (!mapping.date || (!mapping.description && !mapping.amount && !mapping.debit)) {
      setErrorMsg('Please ensure at least Date and Description/Amount columns are mapped.');
      return;
    }

    setAnalyzing(true);
    setErrorMsg('');

    try {
      const res = await dispatch(
        previewCSV({
          csvContent: csvRawText,
          accountId: selectedAccount,
          customMapping: mapping,
        })
      ).unwrap();

      setPreviewData(res);
      setEditableEntries(res.entries || []);
      setStep(3);
    } catch (err) {
      setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to parse CSV statement.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRowCategoryChange = (rowId, categoryId) => {
    const catObj = categories.find((c) => c._id === categoryId);
    setEditableEntries((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              categoryId,
              categoryName: catObj ? catObj.name : r.categoryName,
              isAutoCategorized: false,
            }
          : r
      )
    );
  };

  const handleToggleSkipDuplicate = (rowId) => {
    setEditableEntries((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, isDuplicate: !r.isDuplicate } : r))
    );
  };

  const handleCommitImport = async () => {
    setImporting(true);
    setErrorMsg('');

    try {
      const res = await dispatch(
        importCSV({
          accountId: selectedAccount,
          transactions: editableEntries,
        })
      ).unwrap();

      setImportResult(res);
      dispatch(fetchTransactions());
      dispatch(fetchAccounts());
      dispatch(fetchBudgets());
      setStep(4);
    } catch (err) {
      setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to complete transaction import.');
    } finally {
      setImporting(false);
    }
  };

  const parentCategories = categories.filter((c) => !c.parent);
  const readyToImportCount = editableEntries.filter((r) => !r.isDuplicate).length;
  const skippedCount = editableEntries.filter((r) => r.isDuplicate).length;
  const autoCatCount = editableEntries.filter((r) => r.isAutoCategorized && !r.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        {/* Header Title & Steps Indicator */}
        <div className="mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Smart Bank Statement Ingestion Studio
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Auto-detect columns, deduplicate transactions with AI heuristics, and auto-categorize instantly.
          </p>

          {/* Stepper */}
          <div className="flex items-center space-x-2 sm:space-x-4 mt-4 text-xs font-medium border-b pb-3">
            <span className={`flex items-center ${step >= 1 ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full border flex items-center justify-center mr-1 text-[11px]">1</span>
              Upload
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
            <span className={`flex items-center ${step >= 2 ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full border flex items-center justify-center mr-1 text-[11px]">2</span>
              Map Columns
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
            <span className={`flex items-center ${step >= 3 ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full border flex items-center justify-center mr-1 text-[11px]">3</span>
              Review & Deduplicate
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
            <span className={`flex items-center ${step >= 4 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full border flex items-center justify-center mr-1 text-[11px]">4</span>
              Complete
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/80 transition-all group">
              <UploadCloud className="w-12 h-12 text-indigo-500 mb-2 group-hover:scale-105 transition-transform" />
              <span className="text-sm font-semibold text-indigo-900">
                Click or drag &amp; drop your Bank Statement CSV
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Supports HDFC, SBI, ICICI, Axis, Kotak, Chase, Standard Bank CSVs
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-600 space-y-1.5">
              <p className="font-semibold text-gray-800 flex items-center">
                <Info className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
                Smart Ingestion Features:
              </p>
              <p>• <strong>Deduplication:</strong> Automatically detects existing transactions in your account to avoid double counting.</p>
              <p>• <strong>Auto-Categorization:</strong> Identifies merchants like Swiggy, Uber, Netflix, Amazon, Petrol, and Salary automatically.</p>
              <p>• <strong>Atomic Sync:</strong> Linked account balance is updated in a single atomic operation.</p>
            </div>
          </div>
        )}

        {/* STEP 2: MAP COLUMNS */}
        {step === 2 && (
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-indigo-950">File: {fileName}</p>
                <p className="text-[11px] text-indigo-700">Detected {headers.length} columns in header row</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Choose another file
              </button>
            </div>

            {/* Target Account Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Target Bank Account / Card *
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Account</option>
                {activeAccounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.type} · {fmt(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Column Mappings Grid */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Column Mapping (Auto-Detected)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ['date', 'Date Column *'],
                  ['description', 'Narration / Description Column *'],
                  ['debit', 'Debit / Withdrawal (Optional)'],
                  ['credit', 'Credit / Deposit (Optional)'],
                  ['amount', 'Net Amount (if single column)'],
                  ['refNo', 'Cheque / Ref / UTR No (Optional)'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <select
                      value={mapping[key] || ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                      className="block w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">— Skip / None —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleAnalyzeStatement}
                disabled={analyzing}
                className="flex items-center px-5 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing Statement...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Scan &amp; Deduplicate
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & DEDUPLICATE */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-[11px] text-gray-500 uppercase font-semibold">Total Rows</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{editableEntries.length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-[11px] text-emerald-700 uppercase font-semibold">Ready to Import</p>
                <p className="text-xl font-bold text-emerald-800 mt-0.5">{readyToImportCount}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <p className="text-[11px] text-amber-700 uppercase font-semibold">Duplicates (Skipped)</p>
                <p className="text-xl font-bold text-amber-800 mt-0.5">{skippedCount}</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                <p className="text-[11px] text-indigo-700 uppercase font-semibold">Auto-Categorized</p>
                <p className="text-xl font-bold text-indigo-800 mt-0.5">{autoCatCount}</p>
              </div>
            </div>

            {/* Interactive Preview Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[40vh] overflow-y-auto">
              <table className="min-w-full text-xs divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Merchant / Narration</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Type</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Amount</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Category</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {editableEntries.map((row) => (
                    <tr
                      key={row.rowId}
                      className={row.isDuplicate ? 'bg-amber-50/40 text-gray-400' : 'hover:bg-gray-50'}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-mono text-[11px]">
                        {row.formattedDate}
                      </td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={row.rawDescription}>
                        <p className="font-medium text-gray-800 truncate">{row.merchant}</p>
                        <p className="text-[10px] text-gray-400 truncate">{row.rawDescription}</p>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            row.type === 'Income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-gray-900">
                        {fmt(row.amount)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.isDuplicate ? (
                          <span className="text-[11px] text-gray-400">{row.categoryName || 'Other'}</span>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <select
                              value={row.categoryId || ''}
                              onChange={(e) => handleRowCategoryChange(row.rowId, e.target.value)}
                              className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:ring-indigo-500 focus:border-indigo-500 max-w-[130px]"
                            >
                              <option value="">Select Category</option>
                              {parentCategories
                                .filter((c) => c.type === row.type)
                                .map((c) => (
                                  <option key={c._id} value={c._id}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                            {row.isAutoCategorized && (
                              <Zap className="w-3 h-3 text-indigo-600 fill-indigo-600" title="Auto-categorized by AI rule" />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        {row.isDuplicate ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSkipDuplicate(row.rowId)}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200"
                            title={row.duplicateReason || 'Click to force include'}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Duplicate (Skip)
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back to Mapping
              </button>
              <button
                onClick={handleCommitImport}
                disabled={importing || readyToImportCount === 0}
                className="flex items-center px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 transition-colors"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Ingesting Transactions...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-1.5 fill-white" /> Import {readyToImportCount} Verified Transactions
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: COMPLETE */}
        {step === 4 && importResult && (
          <div className="space-y-5 py-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Statement Ingestion Complete!</h3>
              <p className="text-sm text-gray-600 mt-1">{importResult.message}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
              <div>
                <p className="text-gray-500 font-medium">Imported</p>
                <p className="text-lg font-bold text-emerald-700">{importResult.importedCount}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Duplicates Prevented</p>
                <p className="text-lg font-bold text-amber-600">{importResult.skippedCount}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Net Balance Impact</p>
                <p className="text-lg font-bold text-gray-900">{fmt(importResult.netBalanceDelta)}</p>
              </div>
            </div>

            {/* Budget Alerts Triggered (if any) */}
            {importResult.budgetAlerts && importResult.budgetAlerts.length > 0 && (
              <div className="max-w-lg mx-auto space-y-2 text-left">
                <p className="text-xs font-semibold text-gray-800 flex items-center">
                  <Zap className="w-3.5 h-3.5 text-amber-600 mr-1 fill-amber-600" />
                  Budget Guardrails Triggered:
                </p>
                {importResult.budgetAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs ${
                      alert.level === 'critical'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {alert.message}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                View Updated Ledger
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSVImporterModal;
