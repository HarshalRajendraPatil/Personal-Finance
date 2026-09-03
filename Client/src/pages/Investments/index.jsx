import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  updateCurrentValue,
  syncAllInvestments,
  syncInvestmentPrice,
  clearSyncMessage,
  clearSyncError,
} from '../../store/investmentSlice';
import { fetchAccounts } from '../../store/accountSlice';
import { fetchTransactions } from '../../store/transactionSlice';
import { validateInvestmentSymbol } from '../../services/investmentService';
import Pagination from '../../components/Pagination';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  RefreshCw,
  IndianRupee,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Globe,
  Sparkles,
  Info,
  BookOpen,
} from 'lucide-react';


const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(n || 0).toFixed(2)}%`;

const TYPES = ['Stocks', 'Mutual Fund', 'ETF', 'Fixed Deposit', 'PPF', 'EPF', 'NPS', 'Gold', 'Silver', 'Crypto', 'Bonds', 'Other'];
const TYPE_COLORS = {
  'Stocks': '#3b82f6', 'Mutual Fund': '#10b981', 'ETF': '#8b5cf6', 'Fixed Deposit': '#f59e0b',
  'PPF': '#ec4899', 'EPF': '#06b6d4', 'NPS': '#84cc16', 'Gold': '#f59e0b', 'Silver': '#94a3b8',
  'Crypto': '#ef4444', 'Bonds': '#6366f1', 'Other': '#64748b',
};

const ASSET_SYNC_GUIDANCE = {
  'Stocks': {
    canTrackLive: true,
    codeLabel: 'Stock ISIN Code (12 chars) or NSE/BSE Ticker',
    placeholder: 'e.g. INE002A01018 (ISIN), RELIANCE.NS, TCS.NS',
    examples: [
      { label: 'Reliance (ISIN)', code: 'INE002A01018' },
      { label: 'Tata Motors (ISIN)', code: 'INE155A01022' },
      { label: 'Infosys (ISIN)', code: 'INE009A01021' },
      { label: 'TCS (Ticker)', code: 'TCS.NS' },
    ],
    tip: 'Indian stocks support 12-character ISIN codes (e.g. INE002A01018) or NSE tickers with .NS suffix.',
  },
  'Gold': {
    canTrackLive: true,
    codeLabel: 'Gold ETF Ticker or SGB Symbol',
    placeholder: 'e.g. GOLDBEES.NS, HDFCGOLD.NS, SGBDE31III-GB.NS',
    examples: [
      { label: 'Nippon Gold ETF', code: 'GOLDBEES.NS' },
      { label: 'HDFC Gold ETF', code: 'HDFCGOLD.NS' },
      { label: 'SBI Gold ETF', code: 'SETFGOLD.NS' },
    ],
    tip: 'Track live gold prices through Gold ETFs like GOLDBEES.NS or traded Sovereign Gold Bond symbols.',
  },
  'Silver': {
    canTrackLive: true,
    codeLabel: 'Silver ETF Ticker',
    placeholder: 'e.g. SILVERBEES.NS, HDFCSILVER.NS, ICICISILVE.NS',
    examples: [
      { label: 'Nippon Silver ETF', code: 'SILVERBEES.NS' },
      { label: 'HDFC Silver ETF', code: 'HDFCSILVER.NS' },
      { label: 'ICICI Silver ETF', code: 'ICICISILVE.NS' },
    ],
    tip: 'Track real-time silver commodity prices using liquid Silver ETFs like SILVERBEES.NS on NSE.',
  },
  'Bonds': {
    canTrackLive: true,
    codeLabel: 'Bond ETF Ticker / G-Sec Ticker / Bond ISIN',
    placeholder: 'e.g. EBBETF0430.NS, GILT5YBEES.NS, LIQUIDBEES.NS',
    examples: [
      { label: 'Bharat Bond 2030', code: 'EBBETF0430.NS' },
      { label: '5-Year Govt G-Sec', code: 'GILT5YBEES.NS' },
      { label: 'Liquid Debt ETF', code: 'LIQUIDBEES.NS' },
    ],
    tip: 'Government G-Secs, Bharat Bonds, and debt securities trading on NSE can be tracked via their ETF ticker or bond ISIN.',
  },
  'ETF': {
    canTrackLive: true,
    codeLabel: 'Exchange Traded Fund (ETF) Ticker',
    placeholder: 'e.g. NIFTYBEES.NS, MON100.NS, SILVERBEES.NS',
    examples: [
      { label: 'Nifty 50 ETF', code: 'NIFTYBEES.NS' },
      { label: 'Nasdaq 100 ETF', code: 'MON100.NS' },
      { label: 'Silver ETF', code: 'SILVERBEES.NS' },
    ],
    tip: 'Enter the NSE ticker with .NS suffix for index, international, or thematic ETFs.',
  },
  'Mutual Fund': {
    canTrackLive: true,
    codeLabel: '6-Digit AMFI Scheme Code',
    placeholder: 'e.g. 120716 (UTI Nifty 50), 122639 (Parag Parikh)',
    examples: [
      { label: 'UTI Nifty 50 Direct', code: '120716' },
      { label: 'Parag Parikh Flexi Cap', code: '122639' },
    ],
    tip: 'Find the official 6-digit numeric scheme code on AMFI India or your fund mutual fund CAS statement.',
  },
  'Crypto': {
    canTrackLive: true,
    codeLabel: 'CoinGecko Token ID or Ticker',
    placeholder: 'e.g. bitcoin, ethereum, solana, btc, eth',
    examples: [
      { label: 'Bitcoin (BTC)', code: 'bitcoin' },
      { label: 'Ethereum (ETH)', code: 'ethereum' },
      { label: 'Solana (SOL)', code: 'solana' },
    ],
    tip: 'Enter the CoinGecko coin identifier (e.g. bitcoin, ethereum, solana) or standard token symbol.',
  },
  'Fixed Deposit': {
    canTrackLive: false,
    reason: 'Fixed Deposits are term deposits with banks/NBFCs that grow at a fixed contracted interest rate (e.g. 7.1% p.a.). They do not trade on live stock exchanges.',
    actionRequired: 'Update your current value manually or log interest income as it accrues. No exchange symbol is needed.',
  },
  'PPF': {
    canTrackLive: false,
    reason: 'Public Provident Fund (PPF) is a sovereign, non-market traded 15-year statutory savings scheme backed by the Government of India (current interest: ~7.1% p.a.).',
    actionRequired: 'Log manual periodic balance updates from your bank portal or annual interest credits.',
  },
  'EPF': {
    canTrackLive: false,
    reason: 'Employee Provident Fund (EPF/PF) is administered by EPFO with an annual statutory interest declaration (~8.25% p.a.). It has no public live market ticker.',
    actionRequired: 'Update your EPF balance periodically from your EPFO UAN passbook.',
  },
  'NPS': {
    canTrackLive: false,
    reason: 'National Pension System (NPS) units are managed across Tier-1/Tier-2 PFM accounts (Scheme E, C, G) held under your PRAN.',
    actionRequired: 'Update your portfolio balance periodically from your CRA (Protean/NSDL/KFintech) statement.',
  },
  'Other': {
    canTrackLive: true,
    codeLabel: 'Ticker, ISIN, or Asset Symbol',
    placeholder: 'e.g. SILVERBEES.NS, GOLDBEES.NS, or custom ticker',
    examples: [
      { label: 'Silver ETF', code: 'SILVERBEES.NS' },
      { label: 'Gold ETF', code: 'GOLDBEES.NS' },
    ],
    tip: 'For commodities like Silver, enter the corresponding ETF ticker (e.g. SILVERBEES.NS).',
  },
};


const InvestmentFormModal = ({ isOpen, onClose, investment = null, onOpenGuide }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector(s => s.accounts);
  const { isLoading } = useSelector(s => s.investments);
  const [form, setForm] = useState({
    name: '', type: 'Mutual Fund', platform: '', investedAmount: '', currentValue: '',
    quantity: '', buyPrice: '', purchaseDate: '', maturityDate: '', notes: '',
    isSip: false, sipAmount: '', sipFrequency: 'monthly', sipDay: 1, sipAccount: '',
    accountId: '', bookTransaction: true,
    symbol: '', autoSyncPrice: false
  });
  const [localError, setLocalError] = useState('');
  const [isValidatingSymbol, setIsValidatingSymbol] = useState(false);
  const [symbolValidationResult, setSymbolValidationResult] = useState(null);
  const [symbolValidationError, setSymbolValidationError] = useState('');

  useEffect(() => {
    setLocalError('');
    setSymbolValidationResult(null);
    setSymbolValidationError('');
    if (investment) {
      setForm({
        name: investment.name, type: investment.type, platform: investment.platform || '',
        investedAmount: investment.investedAmount, currentValue: investment.currentValue,
        quantity: investment.quantity || '', buyPrice: investment.buyPrice || '',
        purchaseDate: investment.purchaseDate ? new Date(investment.purchaseDate).toISOString().split('T')[0] : '',
        maturityDate: investment.maturityDate ? new Date(investment.maturityDate).toISOString().split('T')[0] : '',
        notes: investment.notes || '',
        isSip: investment.isSip || false,
        sipAmount: investment.sipAmount || '',
        sipFrequency: investment.sipFrequency || 'monthly',
        sipDay: investment.sipDay || 1,
        sipAccount: investment.sipAccount?._id || investment.sipAccount || '',
        accountId: investment.fundingAccount?._id || investment.fundingAccount || '',
        bookTransaction: false,
        symbol: investment.symbol || '',
        autoSyncPrice: investment.autoSyncPrice || false,
      });
    } else {
      const defaultBank = accounts.find(a => !a.isArchived && a.type === 'Bank')?._id || accounts[0]?._id || '';
      setForm({
        name: '', type: 'Mutual Fund', platform: '', investedAmount: '', currentValue: '',
        quantity: '', buyPrice: '', purchaseDate: new Date().toISOString().split('T')[0],
        maturityDate: '', notes: '', isSip: false, sipAmount: '', sipFrequency: 'monthly',
        sipDay: 1, sipAccount: defaultBank, accountId: defaultBank, bookTransaction: true,
        symbol: '', autoSyncPrice: false
      });
    }
  }, [investment, isOpen, accounts]);

  const handleValidateSymbol = async () => {
    if (!form.symbol.trim()) {
      setSymbolValidationError('Please enter an ISIN code or symbol to verify.');
      return;
    }
    setIsValidatingSymbol(true);
    setSymbolValidationResult(null);
    setSymbolValidationError('');
    try {
      const res = await validateInvestmentSymbol(form.symbol.trim(), form.type);
      setSymbolValidationResult(res.data);
      if (!form.buyPrice && res.data.price) {
        setForm(f => ({ ...f, buyPrice: res.data.price }));
      }
    } catch (err) {
      setSymbolValidationError(err.response?.data?.message || err.message || 'Could not track live price for this code/symbol.');
    } finally {
      setIsValidatingSymbol(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!investment && form.bookTransaction && !form.accountId) {
      setLocalError('Please select a funding bank account to record the transfer, or uncheck the transfer box.');
      return;
    }
    try {
      const payload = {
        ...form,
        investedAmount: parseFloat(form.investedAmount),
        currentValue: parseFloat(form.currentValue),
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        buyPrice: form.buyPrice ? parseFloat(form.buyPrice) : null,
        purchaseDate: form.purchaseDate || null,
        maturityDate: form.maturityDate || null,
        isSip: Boolean(form.isSip),
        sipAmount: form.isSip ? parseFloat(form.sipAmount || 0) : 0,
        sipFrequency: form.sipFrequency || 'monthly',
        sipDay: parseInt(form.sipDay || 1),
        sipAccount: form.isSip ? (form.sipAccount || form.accountId || null) : null,
        accountId: form.accountId || null,
        bookTransaction: Boolean(form.bookTransaction),
        symbol: form.symbol ? form.symbol.trim() : '',
        autoSyncPrice: Boolean(form.autoSyncPrice),
      };
      if (investment) {
        await dispatch(updateInvestment({ id: investment._id, data: payload })).unwrap();
      } else {
        await dispatch(createInvestment(payload)).unwrap();
        dispatch(fetchAccounts());
        dispatch(fetchTransactions());
      }
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-5">{investment ? 'Edit Investment' : 'Add Investment'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Investment Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Parag Parikh Flexi Cap, Reliance, Bitcoin" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Platform / Institution</label>
              <input value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} placeholder="Zerodha, Groww, Kuvera, SBI..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Invested Amount (₹)</label>
              <input required type="number" step="0.01" min="0" value={form.investedAmount} onChange={e => setForm(f => ({ ...f, investedAmount: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Value (₹)</label>
              <input required type="number" step="0.01" min="0" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity / Units (optional)</label>
              <input type="number" step="any" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Buy Price / Unit (optional)</label>
              <input type="number" step="0.01" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>

          {/* Funding Bank Account (Recorded as Transfer in Transactions) */}
          {!investment && (
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 space-y-3">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.bookTransaction}
                  onChange={e => setForm(f => ({ ...f, bookTransaction: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-semibold text-indigo-950">💸 Record as Transfer in Transactions Tab</span>
              </label>
              <p className="text-xs text-indigo-700/90 leading-relaxed">
                Automatically logs a <strong>Transfer</strong> transaction and deducts this capital from your selected bank account.
              </p>
              {form.bookTransaction && (
                <div>
                  <label className="block text-xs font-medium text-indigo-900 mb-1">
                    Funding Bank Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.accountId}
                    onChange={e => {
                      const accId = e.target.value;
                      setForm(f => ({
                        ...f,
                        accountId: accId,
                        sipAccount: f.sipAccount || accId,
                      }));
                    }}
                    className={`block w-full px-3 py-1.5 bg-white border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                      form.bookTransaction && !form.accountId ? 'border-amber-400 ring-1 ring-amber-300' : 'border-indigo-200'
                    }`}
                  >
                    <option value="">Select funding account</option>
                    {accounts.filter(a => !a.isArchived).map(a => (
                      <option key={a._id} value={a._id}>
                        {a.name} (Balance: ₹{a.currentBalance?.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                  {form.bookTransaction && !form.accountId && (
                    <p className="text-[11px] text-amber-700 mt-1 font-medium">
                      Please select which account funded this investment to record the transfer.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Automated SIP Section */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-3.5 space-y-3">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isSip}
                onChange={e => setForm(f => ({ ...f, isSip: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-sm font-semibold text-emerald-950">⚡ Enable Automated Recurring SIP</span>
            </label>
            <p className="text-xs text-emerald-700/90 leading-relaxed">
              When enabled, Capise will automatically post your scheduled SIP investment on the due date, deduct from your bank account, and update your invested amount.
            </p>
            {form.isSip && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-emerald-900">SIP Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required={form.isSip}
                    value={form.sipAmount}
                    onChange={e => setForm(f => ({ ...f, sipAmount: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-emerald-900">Frequency</label>
                  <select
                    value={form.sipFrequency}
                    onChange={e => setForm(f => ({ ...f, sipFrequency: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-emerald-900">Debit Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.sipDay}
                    onChange={e => setForm(f => ({ ...f, sipDay: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-xs font-medium text-emerald-900">Debit Bank Account</label>
                  <select
                    value={form.sipAccount}
                    onChange={e => setForm(f => ({ ...f, sipAccount: e.target.value }))}
                    className="mt-1 block w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.filter(a => !a.isArchived).map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Live Market Price Sync / Asset Guidance Section */}
          {(() => {
            const guidance = ASSET_SYNC_GUIDANCE[form.type] || ASSET_SYNC_GUIDANCE['Other'];
            if (!guidance.canTrackLive) {
              return (
                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Non-Market Traded Instrument (Fixed Interest)</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {guidance.reason}
                  </p>
                  <div className="p-2.5 bg-white/80 border border-amber-200/60 rounded-lg text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                    <span>📌</span>
                    <span>{guidance.actionRequired}</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 space-y-3">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoSyncPrice}
                    onChange={e => setForm(f => ({ ...f, autoSyncPrice: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-blue-950">⚡ Auto-Sync Live Market Price / NAV</span>
                </label>
                <p className="text-xs text-blue-700/90 leading-relaxed">
                  {guidance.tip}
                </p>

                {form.autoSyncPrice && (
                  <div className="pt-1 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-blue-900">
                        {guidance.codeLabel}
                      </label>
                      {onOpenGuide && (
                        <button
                          type="button"
                          onClick={onOpenGuide}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3" /> Symbol Guide
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.symbol}
                        onChange={e => {
                          setForm(f => ({ ...f, symbol: e.target.value }));
                          setSymbolValidationResult(null);
                          setSymbolValidationError('');
                        }}
                        placeholder={guidance.placeholder}
                        className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-md text-sm font-mono focus:ring-blue-500 focus:border-blue-500 uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleValidateSymbol}
                        disabled={isValidatingSymbol || !form.symbol.trim()}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-xs"
                      >
                        {isValidatingSymbol ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 fill-white" />
                        )}
                        {isValidatingSymbol ? 'Checking...' : 'Verify Code'}
                      </button>
                    </div>

                    {/* Quick-fill Example Badges */}
                    {guidance.examples?.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[11px] text-gray-500 font-medium">Quick Suggestions:</span>
                        {guidance.examples.map((ex, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setForm(f => ({ ...f, symbol: ex.code }));
                              setSymbolValidationResult(null);
                              setSymbolValidationError('');
                            }}
                            className="text-[10px] font-mono bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-100/50 text-blue-800 px-2 py-0.5 rounded-md transition-colors"
                            title={`Use ${ex.code}`}
                          >
                            {ex.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Validation Success Badge */}
                    {symbolValidationResult && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in-50">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            Verified: {symbolValidationResult.assetName} ({symbolValidationResult.isin || symbolValidationResult.symbol})
                          </span>
                          <span className="text-[11px] text-emerald-700">
                            Live Market Price: <strong>₹{symbolValidationResult.price.toLocaleString('en-IN')}</strong> ({symbolValidationResult.source})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Validation Error Badge */}
                    {symbolValidationError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2 animate-in fade-in-50">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Could not track price</span>
                          <span className="text-[11px] text-rose-700 leading-relaxed">{symbolValidationError}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Maturity Date (optional)</label>
              <input type="date" value={form.maturityDate} onChange={e => setForm(f => ({ ...f, maturityDate: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : investment ? 'Update' : 'Add Investment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Update Value Modal ─────────────────────────────────────────────────
const UpdateValueModal = ({ isOpen, onClose, investment }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector(s => s.investments);
  const [value, setValue] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isOpen && investment) setValue(investment.currentValue?.toString() || '');
    setLocalError('');
  }, [isOpen, investment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const v = parseFloat(value);
    if (!v || v < 0) { setLocalError('Enter a valid positive value.'); return; }
    try {
      await dispatch(updateCurrentValue({ id: investment._id, data: { currentValue: v } })).unwrap();
      onClose();
    } catch (err) {
      setLocalError(typeof err === 'string' ? err : err?.message || 'Something went wrong.');
    }
  };

  if (!isOpen || !investment) return null;
  const pl = parseFloat(value || 0) - investment.investedAmount;
  const plPct = investment.investedAmount ? (pl / investment.investedAmount) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Update Value</h2>
        <p className="text-sm text-gray-500 mb-4">{investment.name} · Invested: {fmt(investment.investedAmount)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Value (₹)</label>
            <input required type="number" step="0.01" min="0" value={value}
              onChange={e => { setLocalError(''); setValue(e.target.value); }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg font-mono" />
            {value && (
              <p className={`mt-2 text-sm font-medium ${pl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {pl >= 0 ? '▲' : '▼'} {fmt(Math.abs(pl))} ({fmtPct(plPct)})
              </p>
            )}
          </div>
          {localError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{localError}</p>}
          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Update Value'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Asset Code & Symbol Reference Modal ────────────────────────────────
const AssetCodeGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = [
    {
      title: '📈 Indian Stocks (Equities)',
      badge: '12-Char ISIN or NSE Ticker',
      description: 'Use the official 12-character ISIN code (recommended for 100% precision) or the NSE ticker symbol.',
      entries: [
        { name: 'Reliance Industries', code: 'INE002A01018', alt: 'RELIANCE.NS', note: '12-char ISIN or NSE ticker' },
        { name: 'Tata Motors', code: 'INE155A01022', alt: 'TATAMOTORS.NS', note: '12-char ISIN' },
        { name: 'Infosys Ltd', code: 'INE009A01021', alt: 'INFY.NS', note: '12-char ISIN' },
        { name: 'HDFC Bank', code: 'INE040A01034', alt: 'HDFCBANK.NS', note: '12-char ISIN' },
        { name: 'Tata Consultancy Services', code: 'INE467B01029', alt: 'TCS.NS', note: '12-char ISIN' },
      ],
      whereToFind: 'Found on Zerodha Kite, Groww, Upstox in "Security Overview", your holding statement, or search Google: "[Company Name] ISIN".',
    },
    {
      title: '📊 Mutual Funds (Direct & Regular)',
      badge: '6-Digit AMFI Code',
      description: 'Use the official 6-digit numeric AMFI Scheme Code for automated daily closing NAV sync.',
      entries: [
        { name: 'UTI Nifty 50 Index Fund Direct-Growth', code: '120716', note: 'Daily AMFI NAV' },
        { name: 'Parag Parikh Flexi Cap Fund Direct-Growth', code: '122639', note: 'Daily AMFI NAV' },
        { name: 'Mirae Asset Large Cap Fund Direct-Growth', code: '119598', note: 'Daily AMFI NAV' },
        { name: 'HDFC Mid-Cap Opportunities Direct-Growth', code: '118989', note: 'Daily AMFI NAV' },
        { name: 'Quant Small Cap Fund Direct-Growth', code: '120828', note: 'Daily AMFI NAV' },
      ],
      whereToFind: 'Found on your monthly CAS statement (CAMS / KFintech), fund factsheet, or search your fund at www.mfapi.in.',
    },
    {
      title: '🪙 Commodities (Gold & Silver)',
      badge: 'NSE Commodity ETF',
      description: 'Physical bullion tracking through liquid exchange-traded commodity funds (ETFs) on NSE.',
      entries: [
        { name: 'Nippon India Gold ETF (Gold BeES)', code: 'GOLDBEES.NS', alt: 'GOLD / GOLDBEES', note: 'Tracks 1/100th gram gold' },
        { name: 'HDFC Gold ETF', code: 'HDFCGOLD.NS', note: 'Physical gold backed' },
        { name: 'Nippon India Silver ETF (Silver BeES)', code: 'SILVERBEES.NS', alt: 'SILVER / SILVERBEES', note: 'Tracks 1 gram silver' },
        { name: 'HDFC Silver ETF', code: 'HDFCSILVER.NS', note: 'Physical silver backed' },
      ],
      whereToFind: 'Traded on NSE like any stock. Simply enter GOLDBEES.NS or SILVERBEES.NS.',
    },
    {
      title: '🏛️ Bonds & Government Securities (G-Sec)',
      badge: 'Debt ETF Ticker',
      description: 'Target-maturity PSU debt, sovereign government securities, and liquid debt ETFs trading on NSE.',
      entries: [
        { name: 'Bharat Bond ETF April 2030 (PSU AAA)', code: 'EBBETF0430.NS', alt: 'BHARATBOND', note: 'Target maturity bond' },
        { name: '5-Year Govt of India G-Sec Bond ETF', code: 'GILT5YBEES.NS', alt: 'GSEC / GILT', note: 'Sovereign debt' },
        { name: 'Nippon India Liquid BeES (Debt)', code: 'LIQUIDBEES.NS', note: 'Daily dividend reinvestment' },
      ],
      whereToFind: 'Traded on NSE debt segment. You can use the ETF ticker or aliases like BHARATBOND or GSEC.',
    },
    {
      title: '🌐 Exchange Traded Funds (ETFs)',
      badge: 'NSE Ticker (.NS)',
      description: 'Index, international, and sector ETFs traded on the National Stock Exchange (NSE).',
      entries: [
        { name: 'Nippon India Nifty 50 BeES', code: 'NIFTYBEES.NS', alt: 'NIFTY', note: 'Tracks Nifty 50 index' },
        { name: 'Motilal Oswal Nasdaq 100 ETF', code: 'MON100.NS', note: 'Tracks top 100 US Tech leaders' },
        { name: 'Nippon India Junior BeES', code: 'JUNIORBEES.NS', note: 'Tracks Nifty Next 50' },
      ],
      whereToFind: 'Search on your broker terminal with .NS suffix.',
    },
    {
      title: '⚡ Cryptocurrencies',
      badge: 'CoinGecko Token ID',
      description: 'Real-time cryptocurrency valuation in Indian Rupees (INR) via CoinGecko API.',
      entries: [
        { name: 'Bitcoin (BTC)', code: 'bitcoin', alt: 'btc', note: 'CoinGecko slug or ticker' },
        { name: 'Ethereum (ETH)', code: 'ethereum', alt: 'eth', note: 'CoinGecko slug or ticker' },
        { name: 'Solana (SOL)', code: 'solana', alt: 'sol', note: 'CoinGecko slug or ticker' },
        { name: 'Cardano (ADA)', code: 'cardano', alt: 'ada', note: 'CoinGecko slug or ticker' },
      ],
      whereToFind: 'Standard crypto token identifier or the URL slug on CoinGecko.com.',
    },
    {
      title: '🔒 Non-Market Traded Statutory Instruments',
      badge: 'Manual / Interest Accrual',
      description: 'Fixed Deposits, PPF, EPF, and NPS do NOT trade on stock exchanges because they accrue fixed guaranteed or statutory interest.',
      entries: [
        { name: 'Bank Fixed Deposit (FD)', code: 'Leave Blank', note: 'Grows at fixed contracted bank interest (e.g. 7.25% p.a.)' },
        { name: 'Public Provident Fund (PPF)', code: 'Leave Blank', note: 'Govt 15-year sovereign savings scheme (7.10% p.a.)' },
        { name: 'Employee Provident Fund (EPF)', code: 'Leave Blank', note: 'EPFO statutory retirement fund (8.25% p.a.)' },
        { name: 'National Pension System (NPS)', code: 'Leave Blank', note: 'PRAN retirement pension accounts (Scheme E/C/G)' },
      ],
      whereToFind: 'Uncheck "Auto-Sync Market Price" and update the current balance periodically from your passbook/statement.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-indigo-50/30">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" /> Asset Code & Symbol Quick Reference Guide
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Exact symbols, ISINs, and codes to enter for 100% automated live price tracking across all asset classes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-lg font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 divide-y divide-gray-100">
          {categories.map((cat, idx) => (
            <div key={idx} className={idx > 0 ? 'pt-4 space-y-2.5' : 'space-y-2.5'}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-gray-900">{cat.title}</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                  {cat.badge}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{cat.description}</p>

              {/* Table of examples */}
              <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[420px]">
                  <thead className="bg-gray-100/70 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2">Asset Name</th>
                      <th className="px-3 py-2">Code to Enter</th>
                      <th className="px-3 py-2">Alternative / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/60 font-mono">
                    {cat.entries.map((item, i) => (
                      <tr key={i} className="hover:bg-white transition-colors">
                        <td className="px-3 py-2 font-sans font-medium text-gray-800">{item.name}</td>
                        <td className="px-3 py-2 text-indigo-700 font-bold bg-indigo-50/40 select-all">{item.code}</td>
                        <td className="px-3 py-2 font-sans text-gray-500 text-[11px]">{item.alt ? `${item.alt} · ` : ''}{item.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {cat.whereToFind && (
                <div className="text-[11px] text-gray-500 flex items-start gap-1.5 pt-0.5">
                  <span className="font-semibold text-gray-700 shrink-0">💡 Where to find:</span>
                  <span>{cat.whereToFind}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-500">
            Tip: Click <strong>"Verify Code"</strong> when adding an investment to preview the live price before saving.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────
const Investments = () => {
  const dispatch = useDispatch();
  const { investments, isLoading, isSyncing, syncMessage, syncError } = useSelector(s => s.investments);
  const [modalOpen, setModalOpen] = useState(false);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [editingInv, setEditingInv] = useState(null);
  const [activeInv, setActiveInv] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    dispatch(fetchInvestments());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleSyncAll = async () => {
    dispatch(clearSyncMessage());
    await dispatch(syncAllInvestments());
    dispatch(fetchAccounts());
    setTimeout(() => { dispatch(clearSyncMessage()); }, 7000);
  };

  const handleSyncSinglePrice = async (invId) => {
    setSyncingId(invId);
    dispatch(clearSyncMessage());
    try {
      await dispatch(syncInvestmentPrice(invId)).unwrap();
      setTimeout(() => { dispatch(clearSyncMessage()); }, 5000);
    } catch (err) {
      setTimeout(() => { dispatch(clearSyncMessage()); }, 8000);
    }
    setSyncingId(null);
  };

  const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);
  const totalCurrent = investments.reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalPL = totalCurrent - totalInvested;
  const totalPLPct = totalInvested ? (totalPL / totalInvested) * 100 : 0;

  // Asset allocation breakdown
  const byType = investments.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + (i.currentValue || 0);
    return acc;
  }, {});

  const pagedInvestments = useMemo(() => {
    if (pageSize === 'all') return investments;
    const start = (currentPage - 1) * pageSize;
    return investments.slice(start, start + pageSize);
  }, [investments, currentPage, pageSize]);

  const handleDelete = async (id) => {
    if (window.confirm('Archive this investment?')) dispatch(deleteInvestment(id));
  };


  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Investments</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Autonomous SIP tracking, live market NAV revaluation, and portfolio analytics.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => setGuideOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-xs sm:text-sm font-medium border border-indigo-200 text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="View exact symbols and ISIN codes for all asset classes"
          >
            <BookOpen className="w-4 h-4 mr-1.5 text-indigo-600" />
            Code Guide
          </button>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex-1 sm:flex-none flex items-center justify-center px-3.5 py-2 text-xs sm:text-sm font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Execute due SIPs and fetch live market prices/NAVs"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 mr-1.5 animate-spin text-emerald-600" />
            ) : (
              <Zap className="w-4 h-4 mr-1.5 text-emerald-600 fill-emerald-600" />
            )}
            {isSyncing ? 'Syncing Portfolio...' : 'Sync Live Prices & SIPs'}
          </button>
          <button onClick={() => { setEditingInv(null); setModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer">
            <Plus className="w-4 h-4 mr-1.5" /> Add Investment
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="mb-4 sm:mb-6 flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm shadow-xs animate-in fade-in-50">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => dispatch(clearSyncMessage())} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs uppercase ml-4">Dismiss</button>
        </div>
      )}

      {syncError && (
        <div className="mb-4 sm:mb-6 flex items-start justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm shadow-xs animate-in fade-in-50">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-rose-900">Live Price Tracking Issue</span>
              <span className="text-xs sm:text-sm text-rose-700 leading-relaxed">{syncError}</span>
            </div>
          </div>
          <button onClick={() => dispatch(clearSyncMessage())} className="text-rose-700 hover:text-rose-900 font-bold text-xs uppercase ml-4">Dismiss</button>
        </div>
      )}

      {/* Summary Banner */}
      {investments.length > 0 && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-4 sm:p-6 text-white mb-6 sm:mb-8 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-violet-200 text-xs uppercase tracking-wider">Total Invested</p>
              <p className="text-2xl font-bold mt-1">{fmt(totalInvested)}</p>
            </div>
            <div>
              <p className="text-violet-200 text-xs uppercase tracking-wider">Current Value</p>
              <p className="text-2xl font-bold mt-1">{fmt(totalCurrent)}</p>
            </div>
            <div>
              <p className="text-violet-200 text-xs uppercase tracking-wider">Total P&amp;L</p>
              <p className={`text-2xl font-bold mt-1 ${totalPL >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
              </p>
            </div>
            <div>
              <p className="text-violet-200 text-xs uppercase tracking-wider">Overall Return</p>
              <p className={`text-2xl font-bold mt-1 ${totalPLPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {fmtPct(totalPLPct)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Asset Allocation */}
      {Object.keys(byType).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Asset Allocation</h3>
          <div className="space-y-2">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, value]) => {
              const pct = totalCurrent ? (value / totalCurrent) * 100 : 0;
              return (
                <div key={type} className="flex items-center space-x-3">
                  <div className="w-24 text-xs text-gray-500 truncate">{type}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[type] }} />
                  </div>
                  <div className="w-20 text-xs text-right text-gray-600 font-medium">{fmt(value)}</div>
                  <div className="w-10 text-xs text-right text-gray-400">{pct.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Investment Cards */}
      {isLoading && investments.length === 0 ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" /></div>
      ) : investments.length === 0 ? (
        <div className="text-center bg-white rounded-xl border border-dashed border-gray-200 py-16">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No investments yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add mutual funds, stocks, or crypto to track automated SIPs and live NAVs.</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Investment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedInvestments.map(inv => {
              const pl = (inv.currentValue || 0) - (inv.investedAmount || 0);
              const plPct = inv.investedAmount ? (pl / inv.investedAmount) * 100 : 0;
              const isPositive = pl >= 0;
              const isItemSyncing = syncingId === inv._id;

              return (
                <div key={inv._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[inv.type] || '#64748b' }} />
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TYPE_COLORS[inv.type]}15`, color: TYPE_COLORS[inv.type] }}>
                        {inv.type}
                      </span>
                      {inv.isSip && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Zap className="w-2.5 h-2.5 mr-0.5 fill-emerald-600 text-emerald-600" />
                          SIP: {fmt(inv.sipAmount)}/{inv.sipFrequency ? inv.sipFrequency.slice(0, 2) : 'mo'}
                        </span>
                      )}
                      {inv.autoSyncPrice && inv.symbol && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          <Globe className="w-2.5 h-2.5 mr-0.5 text-blue-600" />
                          Live
                        </span>
                      )}
                      {['Fixed Deposit', 'PPF', 'EPF', 'NPS'].includes(inv.type) && (
                        <span
                          className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60"
                          title="Non-market traded instrument. Accrues fixed interest rate."
                        >
                          <Info className="w-2.5 h-2.5 mr-0.5 text-amber-600" />
                          Fixed Rate
                        </span>
                      )}
                      {!['Fixed Deposit', 'PPF', 'EPF', 'NPS'].includes(inv.type) && (!inv.autoSyncPrice || !inv.symbol) && (
                        <span
                          className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200"
                          title="Auto-sync disabled. Add an ISIN, ticker, or scheme code to track live."
                        >
                          Manual Tracking
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {inv.autoSyncPrice && inv.symbol && (
                        <button
                          onClick={() => handleSyncSinglePrice(inv._id)}
                          disabled={isItemSyncing}
                          title={`Fetch latest price for ${inv.symbol}`}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isItemSyncing ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      <button onClick={() => { setActiveInv(inv); setValueModalOpen(true); }} title="Update value manually" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditingInv(inv); setModalOpen(true); }} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(inv._id)} title="Archive" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-0.5">{inv.name}</h3>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span>{inv.platform || 'Direct'}</span>
                    {inv.symbol && <span className="font-mono text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{inv.symbol}</span>}
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-400">Invested</p>
                      <p className="text-sm font-medium text-gray-700">{fmt(inv.investedAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Current</p>
                      <p className="text-lg font-bold text-gray-900">{fmt(inv.currentValue)}</p>
                    </div>
                  </div>

                  <div className={`mt-3 flex items-center justify-between p-2 rounded-lg ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                    <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                      {isPositive ? '+' : ''}{fmt(pl)}
                    </span>
                    <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtPct(plPct)}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                    {inv.isSip ? (
                      <span>Next SIP: {inv.nextSipDate ? new Date(inv.nextSipDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Scheduled'}</span>
                    ) : (
                      <span>{inv.quantity && inv.buyPrice ? `${inv.quantity} units @ ₹${inv.buyPrice}` : ''}</span>
                    )}
                    {inv.lastPriceSync && (
                      <span className="text-[10px]">Synced: {new Date(inv.lastPriceSync).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            className="rounded-xl border border-gray-100"
            currentPage={currentPage}
            totalItems={investments.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[3, 6, 12, 24, 'all']}
            itemLabel="investments"
          />
        </div>
      )}


      <InvestmentFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        investment={editingInv}
        onOpenGuide={() => setGuideOpen(true)}
      />
      <UpdateValueModal isOpen={valueModalOpen} onClose={() => setValueModalOpen(false)} investment={activeInv} />
      <AssetCodeGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
};

export default Investments;
