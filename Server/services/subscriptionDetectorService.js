import RecurringRule from '../models/RecurringRule.js';
import Transaction from '../models/Transaction.js';

// Pre-mapped direct cancellation portals for major Indian and global services
const CANCELLATION_PORTALS = {
  netflix: 'https://www.netflix.com/youraccount',
  spotify: 'https://www.spotify.com/account/overview/',
  prime: 'https://www.amazon.in/mc/manage',
  amazon: 'https://www.amazon.in/mc/manage',
  hotstar: 'https://www.hotstar.com/in/my-account',
  disney: 'https://www.hotstar.com/in/my-account',
  cult: 'https://www.cult.fit/me/memberships',
  'cult.fit': 'https://www.cult.fit/me/memberships',
  apple: 'https://support.apple.com/HT202039',
  youtube: 'https://www.youtube.com/paid_memberships',
  google: 'https://one.google.com/settings',
  chatgpt: 'https://chatgpt.com/#settings',
  openai: 'https://chatgpt.com/#settings',
  airtel: 'https://www.airtel.in/airtel-thanks-app',
  jio: 'https://www.jio.com/selfcare',
};

const getDirectCancelUrl = (name = '') => {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, url] of Object.entries(CANCELLATION_PORTALS)) {
    if (clean.includes(key)) return url;
  }
  return `https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(name)}+subscription`;
};

/**
 * Runs a comprehensive "Subscription Clean-Up Audit"
 * Detecting hidden price hikes and zombie (60+ days inactive) subscriptions.
 */
export const runSubscriptionCleanUpAudit = async (userId) => {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // 1. Fetch all expense recurring rules
  const recurringRules = await RecurringRule.find({
    user: userId,
    type: 'Expense',
  })
    .populate('category', 'name icon color type')
    .populate('account', 'name type currency')
    .lean();

  // 2. Fetch past 12 months transactions for price history and activity tracking
  const allPastTxns = await Transaction.find({
    user: userId,
    date: { $gte: oneYearAgo },
  })
    .sort({ date: 1 })
    .lean();

  const auditedSubscriptions = [];
  let totalMonthlyRunRate = 0;
  let totalPotentialAnnualSavings = 0;
  let totalHikesCount = 0;
  let totalZombiesCount = 0;
  let totalExtraAnnualCostFromHikes = 0;

  for (const rule of recurringRules) {
    const monthlyCost =
      rule.frequency === 'yearly'
        ? Math.round(rule.amount / 12)
        : rule.frequency === 'weekly'
        ? Math.round(rule.amount * 4.33)
        : rule.amount;

    if (rule.isActive) {
      totalMonthlyRunRate += monthlyCost;
    }

    // Match historical transactions for this subscription
    const ruleName = (rule.name || '').toLowerCase();
    const merchantName = (rule.merchant || '').toLowerCase();
    const categoryName = (rule.category?.name || '').toLowerCase();

    const matchingTxns = allPastTxns.filter((t) => {
      const tMerchant = (t.merchant || '').toLowerCase();
      const tNotes = (t.notes || '').toLowerCase();
      return (
        (ruleName && (tMerchant.includes(ruleName) || tNotes.includes(ruleName))) ||
        (merchantName && (tMerchant.includes(merchantName) || tNotes.includes(merchantName))) ||
        (rule.category && t.category?.toString() === rule.category?._id?.toString() && tNotes.includes(ruleName))
      );
    });

    // -------------------------------------------------------------
    // 🕵️ 1. HIDDEN PRICE-HIKE DETECTION
    // -------------------------------------------------------------
    let hasPriceHike = false;
    let previousPrice = rule.amount;
    let currentPrice = rule.amount;
    let hikeAmount = 0;
    let hikePercentage = 0;
    let extraAnnualCost = 0;
    let firstHikeDate = null;

    if (matchingTxns.length >= 2) {
      // Analyze price progression over time
      const amountsOverTime = matchingTxns.map((t) => ({ amount: t.amount, date: t.date }));
      const earliestAmount = amountsOverTime[0].amount;
      const latestTxnAmount = amountsOverTime[amountsOverTime.length - 1].amount;
      const effectiveCurrentAmount = Math.max(rule.amount, latestTxnAmount);

      if (effectiveCurrentAmount > earliestAmount && earliestAmount > 0) {
        hasPriceHike = true;
        previousPrice = earliestAmount;
        currentPrice = effectiveCurrentAmount;
        hikeAmount = currentPrice - previousPrice;
        hikePercentage = Math.round(((currentPrice - previousPrice) / previousPrice) * 100);
        extraAnnualCost = hikeAmount * (rule.frequency === 'yearly' ? 1 : 12);
        
        // Find when the hike first occurred
        const hikeTxn = amountsOverTime.find((t) => t.amount > earliestAmount);
        firstHikeDate = hikeTxn ? hikeTxn.date : matchingTxns[matchingTxns.length - 1].date;

        if (rule.isActive) {
          totalHikesCount += 1;
          totalExtraAnnualCostFromHikes += extraAnnualCost;
        }
      }
    }

    // -------------------------------------------------------------
    // 🧟 2. "ZOMBIE" INACTIVE SUBSCRIPTION DETECTION (60+ Days Inactivity)
    // -------------------------------------------------------------
    let isZombie = false;
    let daysInactive = 0;
    let inactivityReason = '';

    // Check for wellness / gym / SaaS / duplicate streaming with low engagement
    const isGymOrWellness =
      ruleName.includes('gym') ||
      ruleName.includes('cult') ||
      ruleName.includes('fitness') ||
      categoryName.includes('health') ||
      categoryName.includes('wellness');

    const isDigitalSubscription =
      ruleName.includes('netflix') ||
      ruleName.includes('prime') ||
      ruleName.includes('hotstar') ||
      ruleName.includes('spotify') ||
      categoryName.includes('subscription') ||
      categoryName.includes('entertainment');

    // Find non-auto-recurring active engagement in this category or merchant
    const manualActivityTxns = allPastTxns.filter((t) => {
      const isSameCategory = rule.category && t.category?.toString() === rule.category?._id?.toString();
      const isSameMerchant = ruleName && (t.merchant || '').toLowerCase().includes(ruleName);
      const isNotThisAutoBill = t.notes !== `Auto-run recurring rule: ${rule.name}`;
      return (isSameCategory || isSameMerchant) && isNotThisAutoBill;
    });

    if (manualActivityTxns.length === 0) {
      // If zero related manual transactions in whole year, check rule creation / last run date
      const refDate = rule.createdAt ? new Date(rule.createdAt) : oneYearAgo;
      daysInactive = Math.round((now - refDate) / (1000 * 60 * 60 * 24));
    } else {
      const latestActivityDate = new Date(manualActivityTxns[manualActivityTxns.length - 1].date);
      daysInactive = Math.round((now - latestActivityDate) / (1000 * 60 * 60 * 24));
    }

    // Flag as zombie if active and 60+ days without manual engagement or flagged service
    if (rule.isActive && (daysInactive >= 60 || isGymOrWellness)) {
      isZombie = true;
      inactivityReason = isGymOrWellness
        ? `Zero recorded gym visits or wellness activity in ${Math.max(60, daysInactive)} days.`
        : `No related user activity or engagement recorded for ${daysInactive} days.`;

      const annualWaste = monthlyCost * 12;
      totalZombiesCount += 1;
      totalPotentialAnnualSavings += annualWaste;
    }

    const cancelUrl = getDirectCancelUrl(rule.name);

    auditedSubscriptions.push({
      ruleId: rule._id,
      name: rule.name,
      amount: rule.amount,
      monthlyCost,
      annualCost: monthlyCost * 12,
      frequency: rule.frequency,
      nextRunDate: rule.nextRunDate,
      isActive: rule.isActive,
      category: rule.category,
      account: rule.account,
      directCancelUrl: cancelUrl,
      // Status Flags
      status: !rule.isActive
        ? 'PAUSED'
        : hasPriceHike
        ? 'PRICE_HIKE'
        : isZombie
        ? 'ZOMBIE_INACTIVE'
        : 'HEALTHY',
      // Price Hike Details
      hasPriceHike,
      priceHike: hasPriceHike
        ? {
            previousPrice,
            currentPrice,
            hikeAmount,
            hikePercentage,
            extraAnnualCost,
            detectedAt: firstHikeDate,
          }
        : null,
      // Zombie Inactivity Details
      isZombie,
      zombieDetails: isZombie
        ? {
            daysInactive: Math.max(60, daysInactive),
            reason: inactivityReason,
            potentialAnnualSavings: monthlyCost * 12,
          }
        : null,
    });
  }

  // Calculate Subscription Health Score (0-100)
  const healthScore = Math.max(
    30,
    100 - totalZombiesCount * 15 - totalHikesCount * 10
  );

  return {
    summary: {
      totalSubscriptionsCount: recurringRules.length,
      activeSubscriptionsCount: recurringRules.filter((r) => r.isActive).length,
      totalMonthlyRunRate,
      totalAnnualRunRate: totalMonthlyRunRate * 12,
      totalHikesCount,
      totalExtraAnnualCostFromHikes,
      totalZombiesCount,
      totalPotentialAnnualSavings,
      healthScore,
    },
    subscriptions: auditedSubscriptions,
  };
};

/**
 * 1-Click Cancel / Pause Subscription Rule
 */
export const cancelSubscriptionRule = async ({ userId, ruleId }) => {
  const rule = await RecurringRule.findOne({ _id: ruleId, user: userId });
  if (!rule) {
    throw new Error('Subscription rule not found.');
  }

  rule.isActive = false;
  await rule.save();

  const annualSavings = (rule.frequency === 'yearly' ? rule.amount : rule.amount * 12);

  return {
    success: true,
    message: `Successfully cancelled/paused "${rule.name}". You will save ~₹${annualSavings.toLocaleString('en-IN')}/year!`,
    data: rule,
  };
};

/**
 * Acknowledge Price Hike and accept the updated plan amount
 */
export const acknowledgeSubscriptionPriceHike = async ({ userId, ruleId, acknowledgedAmount }) => {
  const rule = await RecurringRule.findOne({ _id: ruleId, user: userId });
  if (!rule) {
    throw new Error('Subscription rule not found.');
  }

  if (acknowledgedAmount && Number(acknowledgedAmount) > 0) {
    rule.amount = Number(acknowledgedAmount);
  }
  await rule.save();

  return {
    success: true,
    message: `Acknowledged price update for "${rule.name}" at ₹${rule.amount.toLocaleString('en-IN')}.`,
    data: rule,
  };
};
