import Investment from '../models/Investment.js';
import { processScheduledSIPs, syncInvestmentPrices, calculateNextSipDate, fetchLiveAssetPrice } from '../cron/jobs/sipJob.js';

export const getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id, isActive: true })
      .populate('sipAccount', 'name currency')
      .sort({ createdAt: -1 });
    res.json(investments);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createInvestment = async (req, res) => {
  try {
    const { isSip, sipFrequency, sipDay, purchaseDate } = req.body;
    
    // Auto-calculate initial nextSipDate if SIP is active
    let nextSipDate = null;
    if (isSip) {
      nextSipDate = calculateNextSipDate(new Date(), sipFrequency || 'monthly', sipDay || 1);
    }

    const inv = await Investment.create({
      ...req.body,
      user: req.user._id,
      nextSipDate: nextSipDate || req.body.nextSipDate,
    });

    // Seed initial value history entry
    inv.valueHistory.push({ date: inv.purchaseDate || new Date(), value: inv.currentValue });
    await inv.save();
    await inv.populate('sipAccount', 'name currency');
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

    res.json({
      message: `Processed ${sipResult.processedCount || 0} SIPs, updated prices for ${valuationResult.updatedCount || 0} assets.`,
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
    if (!inv.symbol) return res.status(400).json({ message: 'No symbol/code provided for this investment' });

    const assetData = await fetchLiveAssetPrice(inv.symbol, inv.type);
    if (!assetData || !assetData.price) {
      return res.status(400).json({ message: `Could not fetch live price for symbol: ${inv.symbol}` });
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
      message: `Updated price to ₹${latestPrice} via ${assetData.source}`,
      latestPrice,
      investment: inv,
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
