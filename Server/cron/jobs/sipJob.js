import Investment from '../../models/Investment.js';
import Transaction from '../../models/Transaction.js';
import Account from '../../models/Account.js';
import Category from '../../models/Category.js';

// Calculate next run date for SIP frequency
export const calculateNextSipDate = (currentDate, frequency = 'monthly', sipDay = 1) => {
  const date = new Date(currentDate || new Date());
  switch (frequency?.toLowerCase()) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'monthly':
    default:
      date.setMonth(date.getMonth() + 1);
      const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(sipDay || 1, maxDays));
      break;
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

// 1. Process Scheduled SIP Contributions
export const processScheduledSIPs = async (targetUserId = null) => {
  console.log('[CRON] Starting SIP execution engine...', new Date().toISOString());
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const query = {
      isActive: true,
      isSip: true,
      $or: [
        { nextSipDate: { $lte: today } },
        { nextSipDate: null },
      ],
    };
    if (targetUserId) query.user = targetUserId;

    const dueInvestments = await Investment.find(query);
    console.log(`[CRON] Found ${dueInvestments.length} SIP investments due for processing.`);

    let processedCount = 0;

    for (const inv of dueInvestments) {
      const amount = inv.sipAmount;
      if (!amount || amount <= 0) continue;

      let transactionId = null;

      // Handle debit from linked bank account
      if (inv.sipAccount) {
        const account = await Account.findById(inv.sipAccount);
        if (account) {
          // Find or create Investment category
          let category = await Category.findOne({ user: inv.user, name: 'Investments' });
          if (!category) {
            category = await Category.create({
              user: inv.user,
              name: 'Investments',
              type: 'Expense',
              icon: 'TrendingUp',
              color: '#3b82f6',
            });
          }

          // Create Transaction
          const transaction = new Transaction({
            user: inv.user,
            type: 'Expense',
            amount,
            date: inv.nextSipDate || new Date(),
            account: account._id,
            category: category._id,
            merchant: inv.platform || inv.name,
            notes: `[Auto-SIP] Installment for ${inv.name}`,
            tags: ['investment', 'sip', 'auto-posted'],
          });
          await transaction.save();
          transactionId = transaction._id;

          // Deduct from account balance atomically
          await Account.findByIdAndUpdate(account._id, { $inc: { currentBalance: -amount } });
        }
      }

      // Update investment totals
      inv.investedAmount = (inv.investedAmount || 0) + amount;
      inv.currentValue = (inv.currentValue || 0) + amount;

      // Append data point in value history
      inv.valueHistory.push({
        date: inv.nextSipDate || new Date(),
        value: inv.currentValue,
      });

      // Update next SIP run date
      inv.nextSipDate = calculateNextSipDate(inv.nextSipDate || new Date(), inv.sipFrequency || 'monthly', inv.sipDay || 1);
      await inv.save();

      processedCount++;
      console.log(`[CRON] Auto-posted SIP for ${inv.name}: ₹${amount}`);
    }

    return { success: true, processedCount };
  } catch (error) {
    console.error('[CRON] Error processing SIPs:', error);
    return { success: false, error: error.message };
  }
};

// 2. Fetch Live Price/NAV for automated revaluation
export const fetchLiveAssetPrice = async (symbol, type) => {
  if (!symbol) return null;
  const cleanSymbol = symbol.trim();

  try {
    // A. Indian Mutual Funds via AMFI API (6-digit numeric scheme code, e.g. 120503)
    if (type === 'Mutual Fund' || /^\d{5,7}$/.test(cleanSymbol)) {
      const res = await fetch(`https://api.mfapi.in/mf/${cleanSymbol}/latest`);
      if (res.ok) {
        const json = await res.json();
        if (json?.status === 'SUCCESS' && json?.data?.[0]?.nav) {
          return {
            price: parseFloat(json.data[0].nav),
            date: json.data[0].date,
            source: 'AMFI (MFAPI)',
            schemeName: json.meta?.scheme_name,
          };
        }
      }
    }

    // B. Crypto via CoinGecko Public API
    if (type === 'Crypto' || ['bitcoin', 'ethereum', 'solana', 'cardano', 'ripple', 'dogecoin', 'matic-network'].includes(cleanSymbol.toLowerCase())) {
      const coinId = cleanSymbol.toLowerCase();
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=inr`);
      if (res.ok) {
        const json = await res.json();
        if (json?.[coinId]?.inr) {
          return {
            price: parseFloat(json[coinId].inr),
            date: new Date().toISOString(),
            source: 'CoinGecko',
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.warn(`[Asset Revaluation] Failed to fetch price for ${symbol}:`, err.message);
    return null;
  }
};

// 3. Automated Investment Portfolio Revaluation Engine
export const syncInvestmentPrices = async (targetUserId = null) => {
  console.log('[CRON] Starting Portfolio Revaluation Engine...', new Date().toISOString());
  try {
    const query = { isActive: true, autoSyncPrice: true, symbol: { $exists: true, $ne: '' } };
    if (targetUserId) query.user = targetUserId;

    const syncableInvestments = await Investment.find(query);
    console.log(`[CRON] Found ${syncableInvestments.length} investments configured for live price sync.`);

    let updatedCount = 0;
    const results = [];

    for (const inv of syncableInvestments) {
      const assetData = await fetchLiveAssetPrice(inv.symbol, inv.type);
      if (!assetData || !assetData.price) continue;

      const latestPrice = assetData.price;
      let newCurrentValue = inv.currentValue;

      if (inv.quantity && inv.quantity > 0) {
        newCurrentValue = parseFloat((inv.quantity * latestPrice).toFixed(2));
      } else if (inv.buyPrice && inv.buyPrice > 0 && inv.investedAmount > 0) {
        const calculatedUnits = inv.investedAmount / inv.buyPrice;
        newCurrentValue = parseFloat((calculatedUnits * latestPrice).toFixed(2));
      }

      const oldValue = inv.currentValue;
      inv.currentValue = newCurrentValue;
      inv.lastPriceSync = new Date();

      // Only push to valueHistory if price actually changed or last entry is older than 24h
      const lastHistory = inv.valueHistory?.[inv.valueHistory.length - 1];
      const isDifferent = !lastHistory || Math.abs(lastHistory.value - newCurrentValue) > 0.01;
      if (isDifferent) {
        inv.valueHistory.push({
          date: new Date(),
          value: newCurrentValue,
        });
      }

      await inv.save();
      updatedCount++;
      results.push({
        id: inv._id,
        name: inv.name,
        symbol: inv.symbol,
        latestPrice,
        oldValue,
        newValue: newCurrentValue,
        source: assetData.source,
      });

      console.log(`[CRON] Revalued ${inv.name} (${inv.symbol}): ₹${oldValue} -> ₹${newCurrentValue}`);
    }

    return { success: true, updatedCount, results };
  } catch (error) {
    console.error('[CRON] Error during portfolio revaluation:', error);
    return { success: false, error: error.message };
  }
};
