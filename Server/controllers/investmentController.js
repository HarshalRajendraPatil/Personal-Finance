import Investment from '../models/Investment.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { processScheduledSIPs, syncInvestmentPrices, calculateNextSipDate, fetchLiveAssetPrice } from '../cron/jobs/sipJob.js';

export const getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id, isActive: true })
      .populate('sipAccount', 'name currency')
      .populate('fundingAccount', 'name currency')
      .sort({ createdAt: -1 });
    res.json(investments);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createInvestment = async (req, res) => {
  try {
    const {
      isSip,
      sipFrequency,
      sipDay,
      purchaseDate,
      accountId,
      fundingAccount,
      sipAccount,
      bookTransaction,
      investedAmount,
    } = req.body;
    
    // Auto-calculate initial nextSipDate if SIP is active
    let nextSipDate = null;
    if (isSip) {
      nextSipDate = calculateNextSipDate(new Date(), sipFrequency || 'monthly', sipDay || 1);
    }

    const selectedAccountId = accountId || fundingAccount || (isSip ? sipAccount : null);

    const inv = new Investment({
      ...req.body,
      user: req.user._id,
      nextSipDate: nextSipDate || req.body.nextSipDate,
      fundingAccount: selectedAccountId || null,
      sipAccount: sipAccount || (isSip ? selectedAccountId : null),
    });

    // Seed initial value history entry
    inv.valueHistory.push({ date: inv.purchaseDate || new Date(), value: inv.currentValue });

    // If funding account is provided and bookTransaction is true and investedAmount > 0, book transfer transaction
    const numInvested = Number(investedAmount != null ? investedAmount : inv.investedAmount);
    if (selectedAccountId && bookTransaction !== false && numInvested > 0) {
      const account = await Account.findOne({ _id: selectedAccountId, user: req.user._id });
      if (account) {
        account.currentBalance -= numInvested;
        await account.save();

        const isToday = purchaseDate && new Date(purchaseDate).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
        const txDate = isToday || !purchaseDate ? new Date() : new Date(purchaseDate);
        const merchantTitle = inv.name.toLowerCase().startsWith('investment') ? inv.name : `Investment: ${inv.name}`;

        const transaction = new Transaction({
          user: req.user._id,
          type: 'Transfer', // Investment acquisition is a Transfer from bank to assets
          amount: numInvested,
          date: txDate,
          account: account._id,
          toAccount: null,
          category: null,
          merchant: merchantTitle,
          notes: inv.notes || `Initial investment in ${inv.name} (${inv.type}) via ${inv.platform || 'Direct'}`,
          tags: ['investment', 'transfer', inv.type ? inv.type.toLowerCase().replace(/\s+/g, '-') : 'manual'],
        });
        await transaction.save();
        inv.transactionId = transaction._id;
      }
    }

    await inv.save();
    await inv.populate('sipAccount', 'name currency');
    await inv.populate('fundingAccount', 'name currency');
    res.status(201).json(inv);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateInvestment = async (req, res) => {
  try {
    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Investment not found' });

    if (req.body.isSip && (!inv.nextSipDate || req.body.sipDay !== inv.sipDay || req.body.sipFrequency !== inv.sipFrequency)) {
      req.body.nextSipDate = calculateNextSipDate(new Date(), req.body.sipFrequency || 'monthly', req.body.sipDay || 1);
    }

    Object.assign(inv, req.body);
    await inv.save();
    await inv.populate('sipAccount', 'name currency');
    res.json(inv);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteInvestment = async (req, res) => {
  try {
    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Investment not found' });
    inv.isActive = false;
    await inv.save();
    res.json({ message: 'Investment archived' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// PUT /:id/value — update the current value manually (records history)
export const updateCurrentValue = async (req, res) => {
  try {
    const { currentValue, note } = req.body;
    if (currentValue == null || currentValue < 0)
      return res.status(400).json({ message: 'Valid currentValue is required' });

    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Investment not found' });

    inv.currentValue = currentValue;
    inv.valueHistory.push({ date: new Date(), value: currentValue });
    await inv.save();
    await inv.populate('sipAccount', 'name currency');
    res.json(inv);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// POST /sync-all — trigger immediate execution of due SIPs & live asset revaluation
export const syncAllInvestments = async (req, res) => {
  try {
    const sipResult = await processScheduledSIPs(req.user._id);
    const valuationResult = await syncInvestmentPrices(req.user._id);
    const updatedInvestments = await Investment.find({ user: req.user._id, isActive: true })
      .populate('sipAccount', 'name currency')
      .sort({ createdAt: -1 });

    const failures = valuationResult.failures || [];
    let message = `Processed ${sipResult.processedCount || 0} SIPs, updated prices for ${valuationResult.updatedCount || 0} assets.`;
    let failureMessage = null;

    if (failures.length > 0) {
      failureMessage = `Could not track ${failures.length} asset${failures.length > 1 ? 's' : ''}: ${failures.map((f) => `"${f.name}" (${f.error})`).join('; ')}`;
    }

    res.json({
      message,
      failureMessage,
      failures,
      sipCount: sipResult.processedCount,
      valuationCount: valuationResult.updatedCount,
      investments: updatedInvestments,
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// POST /:id/sync-price — fetch live price for a single investment
export const syncSingleInvestmentPrice = async (req, res) => {
  try {
    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Investment not found' });
    if (!inv.symbol) {
      return res.status(400).json({
        message: 'No ISIN code or symbol provided for this investment. Please edit and provide a valid ISIN code or ticker.',
      });
    }

    const assetData = await fetchLiveAssetPrice(inv.symbol, inv.type);
    if (!assetData || !assetData.success || !assetData.price) {
      const errorMsg =
        assetData?.error ||
        `Could not track live price for "${inv.symbol}". The code/symbol was invalid or market data is currently unavailable.`;
      return res.status(400).json({
        message: errorMsg,
        error: errorMsg,
        symbol: inv.symbol,
      });
    }

    const latestPrice = assetData.price;
    let newCurrentValue = inv.currentValue;

    if (inv.quantity && inv.quantity > 0) {
      newCurrentValue = parseFloat((inv.quantity * latestPrice).toFixed(2));
    } else if (inv.buyPrice && inv.buyPrice > 0 && inv.investedAmount > 0) {
      const units = inv.investedAmount / inv.buyPrice;
      newCurrentValue = parseFloat((units * latestPrice).toFixed(2));
    }

    inv.currentValue = newCurrentValue;
    inv.lastPriceSync = new Date();
    inv.valueHistory.push({ date: new Date(), value: newCurrentValue });
    await inv.save();
    await inv.populate('sipAccount', 'name currency');

    res.json({
      message: `Updated price for ${inv.name} to ₹${latestPrice.toLocaleString('en-IN')} via ${assetData.source}`,
      latestPrice,
      investment: inv,
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// GET /validate-symbol — validate and preview live price for an ISIN code, stock symbol, AMFI code, or crypto ID
export const validateInvestmentSymbol = async (req, res) => {
  try {
    const { symbol, type } = req.query;
    if (!symbol || !symbol.trim()) {
      return res.status(400).json({ success: false, message: 'Symbol or ISIN code is required' });
    }

    const result = await fetchLiveAssetPrice(symbol.trim(), type);
    if (!result || !result.success || !result.price) {
      return res.status(400).json({
        success: false,
        message:
          result?.error ||
          `Could not track price for "${symbol}". The code/symbol was invalid or market data is unavailable.`,
      });
    }

    res.json({
      success: true,
      price: result.price,
      currency: result.currency || 'INR',
      symbol: result.symbol,
      isin: result.isin,
      assetName: result.assetName,
      source: result.source,
      message: `Verified! Current price: ₹${result.price.toLocaleString('en-IN')} (${result.assetName || result.symbol}) via ${result.source}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

