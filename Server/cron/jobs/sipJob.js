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

          // Create Transaction (SIP is a Transfer from bank account to investment holdings)
          const transaction = new Transaction({
            user: inv.user,
            type: 'Transfer',
            amount,
            date: inv.nextSipDate || new Date(),
            account: account._id,
            toAccount: null,
            category: null,
            merchant: inv.name,
            notes: `[Auto-SIP] Installment for ${inv.name} via ${inv.platform || 'Direct'}`,
            tags: ['investment', 'sip', 'transfer', 'auto-posted'],
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

// 2. Fetch Live Price/NAV for automated revaluation (Supports ISIN codes, Stocks, AMFI Mutual Funds, & Crypto)
export const fetchLiveAssetPrice = async (symbol, type) => {
  if (!symbol || typeof symbol !== 'string') {
    return { success: false, error: 'No symbol or ISIN code provided.' };
  }
  const cleanSymbol = symbol.trim();
  const upperSymbol = cleanSymbol.toUpperCase();

  try {
    // -------------------------------------------------------------
    // A. ISIN Code Detection & Live Stock Resolution (e.g. INE002A01018, INE009A01021)
    // -------------------------------------------------------------
    const isISIN = /^[A-Z]{2}[A-Z0-9]{9}\d$/i.test(upperSymbol);
    if (isISIN) {
      try {
        const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(upperSymbol)}`;
        const searchRes = await fetch(searchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        });

        if (!searchRes.ok) {
          return {
            success: false,
            error: `ISIN lookup service returned HTTP ${searchRes.status}. Could not resolve "${upperSymbol}".`,
          };
        }

        const searchData = await searchRes.json();
        const quotes = (searchData?.quotes || []).filter(
          (q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND'
        );

        if (!quotes.length) {
          return {
            success: false,
            error: `Invalid ISIN code: No listed security found matching "${upperSymbol}". Please verify the ISIN.`,
          };
        }

        // Prefer NSE (.NS), then BSE (.BO), or primary quote
        const preferredQuote =
          quotes.find((q) => q.symbol?.endsWith('.NS')) ||
          quotes.find((q) => q.symbol?.endsWith('.BO')) ||
          quotes[0];

        const ticker = preferredQuote.symbol;
        const resolvedName = preferredQuote.shortname || preferredQuote.longname || ticker;

        // Fetch live quote from Yahoo Chart API
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
        const chartRes = await fetch(chartUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        });

        if (!chartRes.ok) {
          return {
            success: false,
            error: `Could not fetch live price for ISIN "${upperSymbol}" (Resolved to ticker ${ticker}, HTTP ${chartRes.status}).`,
          };
        }

        const chartData = await chartRes.json();
        const meta = chartData?.chart?.result?.[0]?.meta;
        if (!meta || meta.regularMarketPrice == null) {
          return {
            success: false,
            error: `Live price is currently unavailable for ISIN "${upperSymbol}" (${ticker}). Market may be closed.`,
          };
        }

        return {
          success: true,
          price: parseFloat(meta.regularMarketPrice.toFixed(2)),
          currency: meta.currency || 'INR',
          symbol: ticker,
          isin: upperSymbol,
          assetName: meta.shortName || resolvedName,
          source: `NSE/BSE (ISIN: ${upperSymbol})`,
        };
      } catch (err) {
        return {
          success: false,
          error: `Error resolving ISIN "${upperSymbol}": ${err.message}`,
        };
      }
    }

    // -------------------------------------------------------------
    // B. Indian Mutual Funds via AMFI API (5-7 digit numeric scheme code, e.g. 120503, 122639)
    // -------------------------------------------------------------
    if (type === 'Mutual Fund' || /^\d{5,7}$/.test(cleanSymbol)) {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${cleanSymbol}/latest`);
        if (res.ok) {
          const json = await res.json();
          if (json?.status === 'SUCCESS' && json?.data?.[0]?.nav) {
            return {
              success: true,
              price: parseFloat(json.data[0].nav),
              date: json.data[0].date,
              source: 'AMFI (MFAPI)',
              assetName: json.meta?.scheme_name,
            };
          }
        }
        if (/^\d{5,7}$/.test(cleanSymbol)) {
          return {
            success: false,
            error: `Invalid AMFI Scheme Code: Could not find active mutual fund matching code "${cleanSymbol}".`,
          };
        }
      } catch (e) {
        if (/^\d{5,7}$/.test(cleanSymbol)) {
          return {
            success: false,
            error: `Failed to query AMFI API for scheme code "${cleanSymbol}": ${e.message}`,
          };
        }
      }
    }

    // -------------------------------------------------------------
    // C. Crypto via CoinGecko Public API
    // -------------------------------------------------------------
    const CRYPTO_MAP = {
      eth: 'ethereum',
      btc: 'bitcoin',
      sol: 'solana',
      doge: 'dogecoin',
      ada: 'cardano',
      xrp: 'ripple',
      matic: 'matic-network',
      dot: 'polkadot',
      shib: 'shiba-inu',
      avax: 'avalanche-2',
      link: 'chainlink',
    };
    const lowerSymbol = cleanSymbol.toLowerCase();
    const isCrypto =
      type === 'Crypto' ||
      CRYPTO_MAP[lowerSymbol] ||
      ['bitcoin', 'ethereum', 'solana', 'cardano', 'ripple', 'dogecoin', 'matic-network'].includes(lowerSymbol);

    if (isCrypto) {
      const coinId = CRYPTO_MAP[lowerSymbol] || lowerSymbol;
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=inr`);
        if (res.ok) {
          const json = await res.json();
          if (json?.[coinId]?.inr) {
            return {
              success: true,
              price: parseFloat(json[coinId].inr),
              date: new Date().toISOString(),
              source: 'CoinGecko',
              assetName: coinId.toUpperCase(),
            };
          }
        }
        return {
          success: false,
          error: `Invalid Crypto ID: Could not fetch price for "${cleanSymbol}". Use valid CoinGecko IDs like "bitcoin", "ethereum", "solana".`,
        };
      } catch (e) {
        return {
          success: false,
          error: `CoinGecko API error for crypto "${cleanSymbol}": ${e.message}`,
        };
      }
    }

    // -------------------------------------------------------------
    // D. Non-Market Assets Check (Fixed Deposit, PPF, EPF, NPS)
    // -------------------------------------------------------------
    if (['Fixed Deposit', 'PPF', 'EPF', 'NPS'].includes(type)) {
      return {
        success: false,
        error: `${type} is an interest-bearing statutory or bank deposit and does not trade on live stock exchanges. Update its value manually or through interest accrual.`,
        isNonMarketAsset: true,
      };
    }

    // -------------------------------------------------------------
    // E. Stock, Commodity (Gold/Silver), ETF & Bond Ticker Lookup
    // -------------------------------------------------------------
    const COMMODITY_BOND_MAP = {
      'GOLDBEES': 'GOLDBEES.NS',
      'GOLD': 'GOLDBEES.NS',
      'HDFCGOLD': 'HDFCGOLD.NS',
      'SILVERBEES': 'SILVERBEES.NS',
      'SILVER': 'SILVERBEES.NS',
      'HDFCSILVER': 'HDFCSILVER.NS',
      'BHARATBOND': 'EBBETF0430.NS',
      'GILT': 'GILT5YBEES.NS',
      'GSEC': 'GILT5YBEES.NS',
      'LIQUIDBEES': 'LIQUIDBEES.NS',
      'NIFTYBEES': 'NIFTYBEES.NS',
      'MON100': 'MON100.NS',
    };

    let ticker = COMMODITY_BOND_MAP[upperSymbol] || upperSymbol;

    // If type is Silver and ticker is without suffix, try SILVERBEES.NS
    if (type === 'Silver' && ticker === 'SILVER') {
      ticker = 'SILVERBEES.NS';
    }

    // If Indian equity/commodity without exchange suffix, test .NS
    if (!ticker.includes('.') && !ticker.includes('^')) {
      try {
        const testRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.NS?interval=1d&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        });
        if (testRes.ok) {
          ticker = `${ticker}.NS`;
        }
      } catch (e) {}
    }

    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const chartRes = await fetch(chartUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    });

    if (chartRes.ok) {
      const chartData = await chartRes.json();
      const meta = chartData?.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice != null) {
        return {
          success: true,
          price: parseFloat(meta.regularMarketPrice.toFixed(2)),
          currency: meta.currency || 'INR',
          symbol: ticker,
          assetName: meta.shortName || ticker,
          source: `Yahoo Finance (${ticker})`,
        };
      }
    }

    // If direct ticker failed, try searching by query keyword
    try {
      const sUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanSymbol)}`;
      const sRes = await fetch(sUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      });
      if (sRes.ok) {
        const sData = await sRes.json();
        const quotes = (sData?.quotes || []).filter(
          (q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND'
        );
        if (quotes.length > 0) {
          const preferredQuote =
            quotes.find((q) => q.symbol?.endsWith('.NS')) ||
            quotes.find((q) => q.symbol?.endsWith('.BO')) ||
            quotes[0];

          const matchedTicker = preferredQuote.symbol;
          const matchedChartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(matchedTicker)}?interval=1d&range=1d`;
          const matchedChartRes = await fetch(matchedChartUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
          });

          if (matchedChartRes.ok) {
            const mData = await matchedChartRes.json();
            const meta = mData?.chart?.result?.[0]?.meta;
            if (meta && meta.regularMarketPrice != null) {
              return {
                success: true,
                price: parseFloat(meta.regularMarketPrice.toFixed(2)),
                currency: meta.currency || 'INR',
                symbol: matchedTicker,
                assetName: meta.shortName || preferredQuote.shortname || matchedTicker,
                source: `Yahoo Finance (${matchedTicker})`,
              };
            }
          }
        }
      }
    } catch (e) {}

    return {
      success: false,
      error: `Could not fetch live price for "${cleanSymbol}". The code/symbol was invalid or market data is unavailable.`,
    };
  } catch (err) {
    console.warn(`[Asset Revaluation] Failed to fetch price for ${symbol}:`, err.message);
    return {
      success: false,
      error: `Failed to fetch price for "${cleanSymbol}": ${err.message}`,
    };
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
    const failures = [];

    for (const inv of syncableInvestments) {
      const assetData = await fetchLiveAssetPrice(inv.symbol, inv.type);
      if (!assetData || !assetData.success || !assetData.price) {
        failures.push({
          id: inv._id,
          name: inv.name,
          symbol: inv.symbol,
          error: assetData?.error || `Could not track price for "${inv.symbol}". The code/symbol was invalid.`,
        });
        continue;
      }

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

    return {
      success: true,
      updatedCount,
      results,
      failures,
    };
  } catch (error) {
    console.error('[CRON] Error during portfolio revaluation:', error);
    return { success: false, error: error.message };
  }
};
