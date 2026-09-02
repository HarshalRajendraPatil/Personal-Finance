import { GoogleGenAI } from '@google/genai';
import Account from '../models/Account.js';
import Loan from '../models/Loan.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import RecurringRule from '../models/RecurringRule.js';
import Transaction from '../models/Transaction.js';

let genAIClient = null;
const getGenAI = () => {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found. NLP parsing will use rule-based fallback.');
      return null;
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
};

/**
 * Parses natural language prompt into structured simulation parameters using Gemini 2.5 Flash
 */
export const parseWhatIfQueryWithGemini = async (promptText) => {
  const ai = getGenAI();
  if (!ai || !promptText) {
    return parseQueryFallback(promptText);
  }

  try {
    const systemPrompt = `You are an elite financial simulation parser for an Indian personal finance application.
Parse the user's "What-If" scenario prompt into structured JSON.
Return strictly valid JSON without markdown wrapping.

Schema:
{
  "title": "Short descriptive scenario title (e.g., Buy Royal Enfield Hunter 350)",
  "scenarioType": "BIG_PURCHASE" | "VACATION_LUMPSUM" | "SIP_INCREASE" | "SALARY_CHANGE" | "DEBT_PREPAYMENT" | "CUSTOM",
  "lumpsumOutflow": number (one-time expense or down payment in INR, default 0),
  "lumpsumInflow": number (one-time bonus or windfall in INR, default 0),
  "monthlyExpenseDelta": number (new recurring monthly outflow like EMI or subscription in INR, default 0),
  "monthlyIncomeDelta": number (net change in monthly income/salary in INR, default 0),
  "monthlyInvestmentDelta": number (net change in monthly SIP or investments in INR, default 0),
  "durationMonths": number (duration of the monthly change, e.g. 24 for a 2-year EMI, 36 for 3 years, 60 for permanent/long-term, default 36),
  "startMonthOffset": number (0 for next month, 1 for in 2 months, default 0),
  "horizonYears": number (1 to 5, default 3)
}

Examples:
- "What happens if I buy a ₹1,80,000 motorcycle next month with 20% down payment and ₹5,000 EMI for 2 years?"
  -> { "title": "Buy Motorcycle (₹1.8L)", "scenarioType": "BIG_PURCHASE", "lumpsumOutflow": 36000, "monthlyExpenseDelta": 5000, "durationMonths": 24, "horizonYears": 3 }
- "How does taking a 10-day Europe vacation costing ₹2,50,000 affect my finances?"
  -> { "title": "Europe Vacation (₹2.5L)", "scenarioType": "VACATION_LUMPSUM", "lumpsumOutflow": 250000, "durationMonths": 1, "horizonYears": 3 }
- "If I increase my SIP from ₹15,000 to ₹25,000/mo, how will my wealth grow over 5 years?"
  -> { "title": "Boost Monthly SIP by ₹10,000", "scenarioType": "SIP_INCREASE", "monthlyInvestmentDelta": 10000, "durationMonths": 60, "horizonYears": 5 }
- "What if I get a 30% salary hike of ₹40,000/mo starting next month?"
  -> { "title": "Salary Hike (+₹40,000/mo)", "scenarioType": "SALARY_CHANGE", "monthlyIncomeDelta": 40000, "durationMonths": 60, "horizonYears": 3 }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Query: "${promptText}"` }] },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return parseQueryFallback(promptText);

    return JSON.parse(text);
  } catch (err) {
    console.warn('Gemini NLP What-If parsing failed, using fallback:', err.message);
    return parseQueryFallback(promptText);
  }
};

/**
 * Rule-based fallback parser for offline / keyless execution
 */
const parseQueryFallback = (promptText = '') => {
  const text = promptText.toLowerCase();
  let lumpsumOutflow = 0;
  let monthlyExpenseDelta = 0;
  let monthlyInvestmentDelta = 0;
  let monthlyIncomeDelta = 0;
  let scenarioType = 'CUSTOM';
  let title = promptText.slice(0, 40) || 'Custom What-If Scenario';

  const amounts = (promptText.match(/₹?\s*([\d,]+(?:\.\d+)?)\s*(?:l|lakh|k)?/gi) || []).map((m) => {
    let clean = m.replace(/[₹,\s]/g, '');
    let multiplier = 1;
    if (/lakh|l$/i.test(m)) multiplier = 100000;
    if (/k$/i.test(m)) multiplier = 1000;
    return parseFloat(clean) * multiplier;
  });

  if (text.includes('sip') || text.includes('invest')) {
    scenarioType = 'SIP_INCREASE';
    title = 'Boost Monthly SIP';
    monthlyInvestmentDelta = amounts[0] || 10000;
  } else if (text.includes('vacation') || text.includes('trip') || text.includes('travel')) {
    scenarioType = 'VACATION_LUMPSUM';
    title = 'Vacation & Travel';
    lumpsumOutflow = amounts[0] || 200000;
  } else if (text.includes('car') || text.includes('bike') || text.includes('motorcycle') || text.includes('buy')) {
    scenarioType = 'BIG_PURCHASE';
    title = 'Big-Ticket Purchase';
    const totalCost = amounts[0] || 180000;
    lumpsumOutflow = Math.round(totalCost * 0.2); // 20% down payment
    monthlyExpenseDelta = Math.round((totalCost * 0.8) / 24); // 2-year rough EMI
  } else if (text.includes('salary') || text.includes('hike') || text.includes('income')) {
    scenarioType = 'SALARY_CHANGE';
    title = 'Salary & Income Change';
    monthlyIncomeDelta = amounts[0] || 30000;
  }

  return {
    title,
    scenarioType,
    lumpsumOutflow,
    lumpsumInflow: 0,
    monthlyExpenseDelta,
    monthlyIncomeDelta,
    monthlyInvestmentDelta,
    durationMonths: 36,
    startMonthOffset: 0,
    horizonYears: 3,
  };
};

/**
 * 🔮 Mathematical Dual-Universe Simulation Engine
 */
export const runWhatIfSimulation = async (userId, { prompt, scenario, horizonYears = 3 }) => {
  let params = scenario;
  if (!params && prompt) {
    params = await parseWhatIfQueryWithGemini(prompt);
  } else if (!params) {
    params = parseQueryFallback('Custom Financial Simulation');
  }

  const hYears = Math.min(5, Math.max(1, params.horizonYears || horizonYears || 3));
  const totalMonths = hYears * 12;

  // 1. Gather live baseline user data
  const [accounts, loans, goals, investments, recurringRules, recentTxns] = await Promise.all([
    Account.find({ user: userId, isArchived: false }).lean(),
    Loan.find({ user: userId, isActive: true }).lean(),
    Goal.find({ user: userId, isCompleted: false }).lean(),
    Investment.find({ user: userId }).lean(),
    RecurringRule.find({ user: userId, isActive: true }).lean(),
    Transaction.find({
      user: userId,
      date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    }).lean(),
  ]);

  // Baseline balances
  const liquidAccounts = accounts.filter((a) => ['Bank', 'Cash', 'UPI'].includes(a.type));
  const startingLiquidBalance = liquidAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  const startingInvestments = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.amountInvested || 0), 0);
  const startingLoanDebt = loans.reduce((sum, l) => sum + (l.principal || 0), 0);
  const startingNetWorth = startingLiquidBalance + startingInvestments - startingLoanDebt;

  // Monthly Cash Flow baselines (analyzing 90 days avg)
  let pastIncome = 0;
  let pastExpense = 0;
  recentTxns.forEach((t) => {
    if (t.type === 'Income') pastIncome += t.amount;
    if (t.type === 'Expense') pastExpense += t.amount;
  });

  const baselineMonthlyIncome = pastIncome > 0 ? Math.round(pastIncome / 3) : 100000;
  const baselineMonthlyExpense = pastExpense > 0 ? Math.round(pastExpense / 3) : 55000;
  const baselineMonthlySIP = recurringRules
    .filter((r) => r.type === 'Expense' && /sip|fund|stock|invest/i.test(r.name))
    .reduce((sum, r) => sum + r.amount, 0) || 15000;

  const baselineMonthlySurplus = baselineMonthlyIncome - baselineMonthlyExpense;
  const baselineEmergencyRunwayMonths =
    baselineMonthlyExpense > 0 ? Number((startingLiquidBalance / baselineMonthlyExpense).toFixed(1)) : 12;

  // Scenario Adjustments
  const lumpsumOutflow = Number(params.lumpsumOutflow || 0);
  const lumpsumInflow = Number(params.lumpsumInflow || 0);
  const monthlyExpenseDelta = Number(params.monthlyExpenseDelta || 0);
  const monthlyIncomeDelta = Number(params.monthlyIncomeDelta || 0);
  const monthlyInvestmentDelta = Number(params.monthlyInvestmentDelta || 0);
  const durationMonths = Number(params.durationMonths || totalMonths);
  const startOffset = Number(params.startMonthOffset || 0);

  // Month-by-month trajectory arrays
  const baselineTrajectory = [];
  const simulatedTrajectory = [];

  let curLiquidBase = startingLiquidBalance;
  let curInvBase = startingInvestments;
  let curDebtBase = startingLoanDebt;

  let curLiquidSim = startingLiquidBalance;
  let curInvSim = startingInvestments;
  let curDebtSim = startingLoanDebt;

  let minLiquidSim = curLiquidSim;
  let minLiquidMonthIndex = 0;
  let bottleneckMonth = null;

  const annualInvReturn = 0.12; // 12% CAGR equity growth
  const monthlyInvMultiplier = Math.pow(1 + annualInvReturn, 1 / 12);

  const now = new Date();

  for (let m = 1; m <= totalMonths; m++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const monthLabel = monthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

    // --- 1. BASELINE UNIVERSE ---
    // Investments compound + baseline SIP
    curInvBase = curInvBase * monthlyInvMultiplier + baselineMonthlySIP;
    // Liquid cash adds net surplus minus SIP
    curLiquidBase = Math.max(0, curLiquidBase + (baselineMonthlySurplus - baselineMonthlySIP));
    // Debt reduces gradually
    curDebtBase = Math.max(0, curDebtBase - (startingLoanDebt > 0 ? startingLoanDebt / 48 : 0));
    const netWorthBase = Math.round(curLiquidBase + curInvBase - curDebtBase);

    baselineTrajectory.push({
      monthIndex: m,
      monthLabel,
      liquidSavings: Math.round(curLiquidBase),
      investments: Math.round(curInvBase),
      debt: Math.round(curDebtBase),
      netWorth: netWorthBase,
    });

    // --- 2. SIMULATED UNIVERSE ---
    // Apply one-time lumpsums on startOffset month
    if (m === startOffset + 1) {
      curLiquidSim = curLiquidSim - lumpsumOutflow + lumpsumInflow;
    }

    // Determine monthly deltas for this month
    const isWithinDeltaDuration = m > startOffset && m <= startOffset + durationMonths;
    const effectiveExpDelta = isWithinDeltaDuration ? monthlyExpenseDelta : 0;
    const effectiveIncDelta = isWithinDeltaDuration ? monthlyIncomeDelta : 0;
    const effectiveInvDelta = isWithinDeltaDuration ? monthlyInvestmentDelta : 0;

    const simSIP = baselineMonthlySIP + effectiveInvDelta;
    const simSurplus = (baselineMonthlyIncome + effectiveIncDelta) - (baselineMonthlyExpense + effectiveExpDelta);

    curInvSim = curInvSim * monthlyInvMultiplier + simSIP;
    curLiquidSim = curLiquidSim + (simSurplus - simSIP);
    curDebtSim = Math.max(0, curDebtSim - (startingLoanDebt > 0 ? startingLoanDebt / 48 : 0));

    if (curLiquidSim < minLiquidSim) {
      minLiquidSim = curLiquidSim;
      minLiquidMonthIndex = m;
      if (curLiquidSim < 15000 && !bottleneckMonth) {
        bottleneckMonth = { monthLabel, balance: Math.round(curLiquidSim) };
      }
    }

    const netWorthSim = Math.round(curLiquidSim + curInvSim - curDebtSim);

    simulatedTrajectory.push({
      monthIndex: m,
      monthLabel,
      liquidSavings: Math.round(curLiquidSim),
      investments: Math.round(curInvSim),
      debt: Math.round(curDebtSim),
      netWorth: netWorthSim,
      isBottleneck: curLiquidSim < 15000,
    });
  }

  // Final Horizon Comparison Stats
  const endBase = baselineTrajectory[totalMonths - 1];
  const endSim = simulatedTrajectory[totalMonths - 1];
  const netWorthDelta = endSim.netWorth - endBase.netWorth;

  const simMinRunwayMonths = baselineMonthlyExpense > 0
    ? Number((Math.max(0, minLiquidSim) / (baselineMonthlyExpense + monthlyExpenseDelta)).toFixed(1))
    : 12;

  // Goals completion impact calculation
  const goalsImpact = goals.map((g) => {
    const needed = Math.max(0, (g.targetAmount || 100000) - (g.currentAmount || 0));
    const baseMonths = baselineMonthlySurplus > 0 ? Math.ceil(needed / baselineMonthlySurplus) : 60;
    const simMonthlySurplus = baselineMonthlySurplus + monthlyIncomeDelta - monthlyExpenseDelta - monthlyInvestmentDelta;
    const simMonths = simMonthlySurplus > 0 ? Math.ceil(needed / simMonthlySurplus) : 99;
    const delayMonths = simMonths - baseMonths;

    return {
      goalId: g._id,
      title: g.title || g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      baselineMonthsToComplete: baseMonths,
      simulatedMonthsToComplete: Math.min(120, simMonths),
      shiftLabel:
        delayMonths === 0
          ? 'No Impact (On Schedule)'
          : delayMonths > 0
          ? `Delayed by ~${delayMonths} months`
          : `Accelerated by ~${Math.abs(delayMonths)} months faster!`,
      status: delayMonths > 3 ? 'DELAY_WARNING' : delayMonths < 0 ? 'ACCELERATED' : 'STABLE',
    };
  });

  // Safety Verdict Logic
  let verdict = 'HIGHLY_SAFE';
  let verdictTitle = 'Highly Safe & Financially Feasible ✅';
  let verdictDescription = 'Your liquid safety cushion remains strong with >6 months emergency buffer and zero cash flow bottlenecks.';

  if (minLiquidSim < 0 || simMinRunwayMonths < 2) {
    verdict = 'HIGH_RISK_BOTTLENECK';
    verdictTitle = 'High Risk of Cash Flow Deficit 🚨';
    verdictDescription = `Liquid reserves dip critically to ₹${Math.round(minLiquidSim).toLocaleString('en-IN')} in ${bottleneckMonth?.monthLabel || 'future months'}. Consider reducing the lumpsum or extending tenure.`;
  } else if (simMinRunwayMonths < 5 || minLiquidSim < 30000) {
    verdict = 'MODERATE_RISK';
    verdictTitle = 'Manageable with Caution ⚠️';
    verdictDescription = `Emergency runway temporarily tightens from ${baselineEmergencyRunwayMonths}mo to ${simMinRunwayMonths}mo. Discretionary spending should be guarded during this period.`;
  }

  // Generate AI Strategic Recommendations
  let strategicAdvice = [
    `Your projected Net Worth at Year ${hYears} will be ₹${endSim.netWorth.toLocaleString('en-IN')} (${netWorthDelta >= 0 ? '+' : ''}₹${netWorthDelta.toLocaleString('en-IN')} vs baseline).`,
    `Emergency runway shifts from ${baselineEmergencyRunwayMonths} months to ${simMinRunwayMonths} months.`,
    simMinRunwayMonths >= 6
      ? 'Your emergency buffer comfortably covers standard RBI 6-month safety guidelines.'
      : 'Consider staggering large purchases or building a ₹25,000 buffer prior to execution.',
  ];

  return {
    scenarioParams: params,
    horizonYears: hYears,
    baselineSummary: {
      startingLiquidBalance,
      startingInvestments,
      startingLoanDebt,
      startingNetWorth,
      monthlyIncome: baselineMonthlyIncome,
      monthlyExpense: baselineMonthlyExpense,
      monthlySIP: baselineMonthlySIP,
      emergencyRunwayMonths: baselineEmergencyRunwayMonths,
    },
    simulationSummary: {
      verdict,
      verdictTitle,
      verdictDescription,
      minProjectedLiquidSavings: Math.round(minLiquidSim),
      minRunwayMonths: simMinRunwayMonths,
      bottleneckMonth: bottleneckMonth?.monthLabel || null,
      baselineEndingNetWorth: endBase.netWorth,
      simulatedEndingNetWorth: endSim.netWorth,
      netWorthDifference: netWorthDelta,
      strategicAdvice,
    },
    goalsImpact,
    trajectories: {
      baseline: baselineTrajectory,
      simulated: simulatedTrajectory,
    },
    actionProposals: [
      {
        id: 'prop_adjust_safe_spend',
        type: 'ADJUST_SAFE_SPEND',
        title: 'Adjust Daily Safe-to-Spend Cap',
        description: `Temporarily lock ₹${Math.round(monthlyExpenseDelta || lumpsumOutflow / 12).toLocaleString('en-IN')}/mo from discretionary spending to protect emergency runway.`,
        actionLabel: 'Apply Budget Lock',
      },
      {
        id: 'prop_sinking_fund',
        type: 'CREATE_GOAL',
        title: `Create Sinking Fund Goal for "${params.title}"`,
        description: `Set up an automated monthly target of ₹${Math.round((lumpsumOutflow || 50000) / 6).toLocaleString('en-IN')}/mo over 6 months before purchase.`,
        actionLabel: 'Create Dedicated Goal',
      },
    ],
  };
};
