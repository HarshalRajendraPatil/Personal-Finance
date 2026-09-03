import { GoogleGenAI } from '@google/genai';
import Account from '../models/Account.js';
import Loan from '../models/Loan.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import RecurringRule from '../models/RecurringRule.js';
import Transaction from '../models/Transaction.js';
import memoryCache from '../utils/cache.js';

let genAIClient = null;
const getGenAI = () => {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found in environment.');
      return null;
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
};

/**
 * 🤖 Robust Gemini caller with multi-model fallback and transient retry
 */
const callGeminiWithFallback = async (userPrompt, systemInstruction = '', maxRetries = 2) => {
  const ai = getGenAI();
  if (!ai) return null;

  // Prioritize gemini-2.5-flash with automatic fallback to gemini-3.5-flash-lite
  const models = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const model of models) {
      try {
        const fullPrompt = systemInstruction
          ? `${systemInstruction}\n\nTask:\n${userPrompt}`
          : userPrompt;

        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          config: {
            temperature: 0.1, // Low temperature for high deterministic consistency
            responseMimeType: 'application/json',
          },
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return JSON.parse(text);
        }
      } catch (err) {
        console.warn(`⚠️ [What-If AI] Model ${model} attempt ${attempt + 1} failed: ${err.message?.slice(0, 100)}`);
        // Brief pause before trying next model
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  return null;
};

/**
 * 📊 Gathers rich, verified baseline financial context from the user's database records
 */
export const buildUserFinancialContext = async (userId) => {
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

  // Liquid Balances
  const liquidAccounts = accounts.filter((a) => ['Bank', 'Cash', 'UPI'].includes(a.type));
  const startingLiquidBalance = liquidAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  const fdAccounts = accounts.filter((a) => a.type === 'FD');
  const startingFDBalance = fdAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  // Investments & Debts
  const startingInvestments = investments.reduce(
    (sum, inv) => sum + (inv.currentValue || inv.investedAmount || inv.amountInvested || 0),
    0
  );
  const startingLoanDebt = loans.reduce((sum, l) => sum + (l.principal || 0), 0);
  const startingNetWorth = startingLiquidBalance + startingFDBalance + startingInvestments - startingLoanDebt;

  // Monthly Income: Prioritize active recurring salary rule for rock-solid stability
  const salaryRule = recurringRules.find((r) => r.type === 'Income' && /salary|payroll|stipend|wages/i.test(r.name));
  let pastIncome = 0;
  let pastExpense = 0;
  recentTxns.forEach((t) => {
    if (t.type === 'Income') pastIncome += t.amount;
    if (t.type === 'Expense') pastExpense += t.amount;
  });

  const baselineMonthlyIncome = salaryRule?.amount || (pastIncome > 0 ? Math.round(pastIncome / 3) : 115000);

  // Monthly Commitments
  const loanMonthlyEMI = loans.reduce((sum, l) => sum + (l.emiAmount || 0), 0);
  const recurringBillsMonthly = recurringRules
    .filter((r) => r.type === 'Expense' && !/sip|fund|invest/i.test(r.name))
    .reduce((sum, r) => sum + r.amount, 0);
  const recurringSIPMonthly = recurringRules
    .filter((r) => r.type === 'Expense' && /sip|fund|stock|invest/i.test(r.name))
    .reduce((sum, r) => sum + r.amount, 0) || 15000;

  // Discretionary living buffer
  const averageRecentMonthlyExpense = pastExpense > 0 ? Math.round(pastExpense / 3) : 65000;
  const baselineMonthlyExpense = Math.max(averageRecentMonthlyExpense, recurringBillsMonthly + loanMonthlyEMI + 20000);
  const baselineMonthlySurplus = baselineMonthlyIncome - baselineMonthlyExpense;
  const baselineEmergencyRunwayMonths =
    baselineMonthlyExpense > 0 ? Number((startingLiquidBalance / baselineMonthlyExpense).toFixed(1)) : 6.0;

  const formattedContextString = `
User Financial Standing in Database:
- User Liquid Savings: ₹${startingLiquidBalance.toLocaleString('en-IN')} (Accounts: ${liquidAccounts.map((a) => `${a.name}: ₹${a.currentBalance?.toLocaleString('en-IN')}`).join(', ')})
- User Fixed Deposits: ₹${startingFDBalance.toLocaleString('en-IN')}
- Total Portfolio Investments: ₹${startingInvestments.toLocaleString('en-IN')}
- Verified Monthly Net Income (Salary): ₹${baselineMonthlyIncome.toLocaleString('en-IN')}
- Average Monthly Outflows: ₹${baselineMonthlyExpense.toLocaleString('en-IN')} (Fixed Bills: ₹${recurringBillsMonthly.toLocaleString('en-IN')}, Loan EMIs: ₹${loanMonthlyEMI.toLocaleString('en-IN')})
- Active Loan EMIs: ${loans.map((l) => `${l.name} (EMI: ₹${l.emiAmount?.toLocaleString('en-IN')}, Balance: ₹${l.principal?.toLocaleString('en-IN')})`).join('; ') || 'None'}
- Active Monthly SIPs: ₹${recurringSIPMonthly.toLocaleString('en-IN')}/month
- Active Financial Goals: ${goals.map((g) => `"${g.name || g.title}" (Target: ₹${g.targetAmount?.toLocaleString('en-IN')}, Saved: ₹${g.currentAmount?.toLocaleString('en-IN')})`).join('; ') || 'None'}
- Current Net Monthly Surplus: ~₹${baselineMonthlySurplus.toLocaleString('en-IN')}/month
- Current Emergency Buffer Runway: ${baselineEmergencyRunwayMonths} months
`;

  return {
    accounts,
    loans,
    goals,
    investments,
    recurringRules,
    startingLiquidBalance,
    startingFDBalance,
    startingInvestments,
    startingLoanDebt,
    startingNetWorth,
    baselineMonthlyIncome,
    baselineMonthlyExpense,
    loanMonthlyEMI,
    recurringBillsMonthly,
    recurringSIPMonthly,
    baselineMonthlySurplus,
    baselineEmergencyRunwayMonths,
    formattedContextString,
  };
};

/**
 * 🧠 Parses natural language prompt into structured simulation parameters grounded in user's DB profile
 */
export const parseWhatIfQueryWithGemini = async (promptText, userContext, selectedHorizon = 3) => {
  const systemPrompt = `You are an elite financial simulation parser for an Indian personal finance platform.
Analyze the user's "What-If" scenario prompt in the exact context of their real financial standing in the database.
Extract precise, realistic mathematical simulation parameters grounded in their actual data.

${userContext?.formattedContextString || ''}

Important Grounding Guidelines:
1. If the user refers to a goal (e.g., "vacation", "MacBook", "emergency fund"), reference the exact target amount and details from their active goals list.
2. If the user refers to existing debts or car/home loans, reference their actual loan principal and EMI amounts.
3. If the user mentions sabbatical or taking time off, set monthlyIncomeDelta = -user's monthly salary (e.g. -${userContext?.baselineMonthlyIncome || 115000}).
4. If the user mentions increasing SIP, calculate delta relative to their current ₹${userContext?.recurringSIPMonthly || 15000} SIP.
5. Horizon Years: Strictly anchor to ${selectedHorizon} unless the user query explicitly states a specific duration like "over 5 years" or "in 2 years".
6. Return strictly valid JSON without markdown wrapping.

Schema:
{
  "title": "Descriptive scenario title",
  "scenarioType": "BIG_PURCHASE" | "VACATION_LUMPSUM" | "SIP_INCREASE" | "SALARY_CHANGE" | "DEBT_PREPAYMENT" | "CUSTOM",
  "lumpsumOutflow": number (one-time outflow in INR, default 0),
  "lumpsumInflow": number (one-time bonus or windfall in INR, default 0),
  "monthlyExpenseDelta": number (new recurring monthly outflow like EMI or subscription in INR, default 0),
  "monthlyIncomeDelta": number (net change in monthly income/salary in INR, default 0),
  "monthlyInvestmentDelta": number (net change in monthly SIP or investments in INR, default 0),
  "durationMonths": number (duration of the change in months, e.g. 24 for 2-year EMI, 6 for 6-month sabbatical, 36 for permanent/long-term),
  "startMonthOffset": number (0 for next month, 1 for in 2 months, default 0),
  "horizonYears": number (1 to 5, default ${selectedHorizon}),
  "rationale": "Short 1-sentence explanation of why these parameters match user context"
}`;

  const parsed = await callGeminiWithFallback(`User Scenario: "${promptText}"`, systemPrompt);
  if (parsed && parsed.title && parsed.scenarioType) {
    // Enforce selected horizon anchor if not explicit
    if (!/1\s*year|2\s*year|5\s*year/i.test(promptText)) {
      parsed.horizonYears = selectedHorizon;
    }
    return parsed;
  }

  return parseQueryFallback(promptText, userContext, selectedHorizon);
};

/**
 * 🛡️ Smart Rule-Based Fallback using User's Real DB Standing
 */
const parseQueryFallback = (promptText = '', userContext = null, selectedHorizon = 3) => {
  const text = promptText.toLowerCase();
  let lumpsumOutflow = 0;
  let lumpsumInflow = 0;
  let monthlyExpenseDelta = 0;
  let monthlyInvestmentDelta = 0;
  let monthlyIncomeDelta = 0;
  let durationMonths = selectedHorizon * 12;
  let scenarioType = 'CUSTOM';
  let title = promptText.slice(0, 40) || 'Custom What-If Scenario';

  const amounts = (promptText.match(/₹?\s*([\d,]+(?:\.\d+)?)\s*(?:l|lakh|k)?/gi) || []).map((m) => {
    let clean = m.replace(/[₹,\s]/g, '');
    let multiplier = 1;
    if (/lakh|l$/i.test(m)) multiplier = 100000;
    if (/k$/i.test(m)) multiplier = 1000;
    return parseFloat(clean) * multiplier;
  });

  if (text.includes('sabbatical') || text.includes('quit') || text.includes('break')) {
    scenarioType = 'SALARY_CHANGE';
    title = 'Career Sabbatical';
    monthlyIncomeDelta = -(userContext?.baselineMonthlyIncome || 115000);
    durationMonths = 6;
  } else if (text.includes('sip') || text.includes('invest')) {
    scenarioType = 'SIP_INCREASE';
    title = 'Boost Monthly SIP';
    monthlyInvestmentDelta = amounts[0] || 10000;
  } else if (text.includes('vacation') || text.includes('trip') || text.includes('europe')) {
    scenarioType = 'VACATION_LUMPSUM';
    title = 'Vacation & Travel';
    const vacationGoal = userContext?.goals?.find((g) => /vacation|travel|trip/i.test(g.name || g.title));
    lumpsumOutflow = vacationGoal ? vacationGoal.targetAmount : (amounts[0] || 250000);
    durationMonths = 1;
  } else if (text.includes('car') || text.includes('bike') || text.includes('motorcycle') || text.includes('buy')) {
    scenarioType = 'BIG_PURCHASE';
    title = 'Big-Ticket Purchase';
    const totalCost = amounts[0] || 180000;
    lumpsumOutflow = Math.round(totalCost * 0.2); // 20% down payment
    monthlyExpenseDelta = Math.round((totalCost * 0.8) / 24); // 2-year EMI
    durationMonths = 24;
  } else if (text.includes('prepay') || text.includes('loan')) {
    scenarioType = 'DEBT_PREPAYMENT';
    title = 'Loan Prepayment';
    lumpsumOutflow = amounts[0] || 100000;
    durationMonths = 1;
  } else if (text.includes('salary') || text.includes('hike') || text.includes('income')) {
    scenarioType = 'SALARY_CHANGE';
    title = 'Salary Hike';
    monthlyIncomeDelta = amounts[0] || 30000;
  }

  return {
    title,
    scenarioType,
    lumpsumOutflow,
    lumpsumInflow,
    monthlyExpenseDelta,
    monthlyIncomeDelta,
    monthlyInvestmentDelta,
    durationMonths,
    startMonthOffset: 0,
    horizonYears: selectedHorizon,
    rationale: 'Parameters derived deterministically from your database profile and query keywords.',
  };
};

/**
 * 🔮 Synthesizes deep, personalized AI financial intelligence from mathematical results
 */
export const synthesizeSimulationWithGemini = async ({
  userContext,
  scenarioParams,
  mathResults,
}) => {
  const prompt = `You are an elite personal wealth advisor analyzing the mathematical output of a multi-year What-If simulation for an Indian client.

User Standing:
- Liquid Savings: ₹${userContext.startingLiquidBalance.toLocaleString('en-IN')}
- Monthly Salary: ₹${userContext.baselineMonthlyIncome.toLocaleString('en-IN')}
- Monthly Baseline Expenses: ₹${userContext.baselineMonthlyExpense.toLocaleString('en-IN')}
- Active Loans: ${userContext.loans.map((l) => `${l.name} (EMI ₹${l.emiAmount?.toLocaleString('en-IN')})`).join(', ') || 'None'}

Scenario Evaluated:
- Title: "${scenarioParams.title}" (${scenarioParams.scenarioType})
- Lumpsum Outflow: ₹${scenarioParams.lumpsumOutflow?.toLocaleString('en-IN') || 0}
- Monthly Outflow Delta: ₹${scenarioParams.monthlyExpenseDelta?.toLocaleString('en-IN') || 0}
- Monthly Income Delta: ₹${scenarioParams.monthlyIncomeDelta?.toLocaleString('en-IN') || 0}
- Monthly SIP Delta: ₹${scenarioParams.monthlyInvestmentDelta?.toLocaleString('en-IN') || 0}
- Horizon: ${mathResults.horizonYears} Years

Mathematical Projections:
- Baseline Ending Net Worth: ₹${mathResults.endBaseNetWorth.toLocaleString('en-IN')}
- Simulated Ending Net Worth: ₹${mathResults.endSimNetWorth.toLocaleString('en-IN')} (Net Difference: ${mathResults.netWorthDelta >= 0 ? '+' : ''}₹${mathResults.netWorthDelta.toLocaleString('en-IN')})
- Baseline Emergency Runway: ${userContext.baselineEmergencyRunwayMonths} months
- Simulated Minimum Emergency Runway: ${mathResults.simMinRunwayMonths} months (Lowest balance: ₹${mathResults.minLiquidSim.toLocaleString('en-IN')} ${mathResults.bottleneckMonth ? `in ${mathResults.bottleneckMonth}` : ''})
- Goal Timeline Impact:
${mathResults.goalsImpact.map((g) => `  * ${g.title}: ${g.shiftLabel}`).join('\n')}

Synthesize professional, deeply personalized financial intelligence strictly in this JSON schema:
{
  "verdict": "HIGHLY_SAFE" | "MODERATE_RISK" | "HIGH_RISK_BOTTLENECK",
  "verdictTitle": "Sharp, punchy headline referencing the specific scenario",
  "verdictDescription": "2-3 sentences explaining exactly how liquid runway, compounding, and goals are affected. Reference exact numbers.",
  "strategicAdvice": [
    "Advice point 1 specifically referencing user accounts or cash flow",
    "Advice point 2 specifically addressing emergency buffer or goal trade-offs",
    "Advice point 3 proposing a concrete optimization"
  ],
  "actionProposals": [
    {
      "id": "prop_1",
      "type": "BUDGET_GUARD" | "ADJUST_SIP" | "CREATE_GOAL" | "STAGGER_PURCHASE",
      "title": "Action title",
      "description": "Short actionable description",
      "actionLabel": "Executable button label"
    },
    {
      "id": "prop_2",
      "type": "BUFFER_RESERVE",
      "title": "Second Action title",
      "description": "Short actionable description",
      "actionLabel": "Executable button label"
    }
  ]
}`;

  const aiSynthesis = await callGeminiWithFallback(prompt);
  if (aiSynthesis && aiSynthesis.verdict && aiSynthesis.verdictTitle) {
    return aiSynthesis;
  }

  // Deterministic rule-based synthesis fallback
  let verdict = 'HIGHLY_SAFE';
  let verdictTitle = 'Highly Safe & Financially Feasible ✅';
  let verdictDescription = `Your liquid reserves remain cushioned at ${mathResults.simMinRunwayMonths} months of living expenses, comfortably exceeding standard safety guidelines.`;

  if (mathResults.minLiquidSim < 15000 || mathResults.simMinRunwayMonths < 2) {
    verdict = 'HIGH_RISK_BOTTLENECK';
    verdictTitle = 'High Liquidity Bottleneck Risk 🚨';
    verdictDescription = `Liquid cash drops to ₹${mathResults.minLiquidSim.toLocaleString('en-IN')} in ${mathResults.bottleneckMonth || 'future months'}, threatening upcoming EMI and fixed obligations.`;
  } else if (mathResults.simMinRunwayMonths < 4.5 || mathResults.minLiquidSim < 40000) {
    verdict = 'MODERATE_RISK';
    verdictTitle = 'Feasible with Guarded Cash Flow ⚠️';
    verdictDescription = `Emergency runway temporarily tightens from ${userContext.baselineEmergencyRunwayMonths}mo to ${mathResults.simMinRunwayMonths}mo. Consider keeping an extra liquidity buffer.`;
  }

  return {
    verdict,
    verdictTitle,
    verdictDescription,
    strategicAdvice: [
      `Your projected Net Worth at Year ${mathResults.horizonYears} will be ₹${mathResults.endSimNetWorth.toLocaleString('en-IN')} (${mathResults.netWorthDelta >= 0 ? '+' : ''}₹${mathResults.netWorthDelta.toLocaleString('en-IN')} vs baseline).`,
      `Liquid emergency runway shifts from ${userContext.baselineEmergencyRunwayMonths} months to ${mathResults.simMinRunwayMonths} months.`,
      mathResults.simMinRunwayMonths >= 6
        ? 'Your liquid cushion comfortably satisfies RBI 6-month safety recommendations.'
        : 'Stagger large one-time expenses or maintain a ₹30,000 liquid safety buffer in savings.',
    ],
    actionProposals: [
      {
        id: 'prop_safe_spend',
        type: 'BUDGET_GUARD',
        title: 'Calibrate Discretionary Spending',
        description: `Temporarily reduce non-essential daily allowance by ₹${Math.round((scenarioParams.monthlyExpenseDelta || scenarioParams.lumpsumOutflow / 12) * 0.5).toLocaleString('en-IN')}/mo.`,
        actionLabel: 'Calibrate Budget',
      },
      {
        id: 'prop_sinking_fund',
        type: 'CREATE_GOAL',
        title: `Create Sinking Fund for "${scenarioParams.title}"`,
        description: `Automate monthly savings of ₹${Math.round((scenarioParams.lumpsumOutflow || 50000) / 6).toLocaleString('en-IN')}/mo prior to executing.`,
        actionLabel: 'Set Up Goal',
      },
    ],
  };
};

/**
 * 🔮 Complete Autonomous Dual-Universe Simulation Engine
 */
export const runWhatIfSimulation = async (userId, { prompt, scenario, horizonYears = 3 }) => {
  const selectedHorizon = Math.min(5, Math.max(1, Number(horizonYears) || 3));

  // 1. Check in-memory cache to guarantee identical, deterministic results on rapid repeated clicks
  const cacheKey = `user_${userId}_whatif_${prompt ? prompt.trim().toLowerCase() : JSON.stringify(scenario)}_${selectedHorizon}`;
  const cachedResult = memoryCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // 2. Gather verified user financial standing from database
  const userContext = await buildUserFinancialContext(userId);

  // 3. Resolve scenario parameters
  let params = scenario;
  if (!params && prompt) {
    params = await parseWhatIfQueryWithGemini(prompt, userContext, selectedHorizon);
  } else if (!params) {
    params = parseQueryFallback('Custom Financial Simulation', userContext, selectedHorizon);
  }

  const hYears = Math.min(5, Math.max(1, params.horizonYears || selectedHorizon));
  const totalMonths = hYears * 12;

  // 4. Mathematical Simulation Setup
  const lumpsumOutflow = Number(params.lumpsumOutflow || 0);
  const lumpsumInflow = Number(params.lumpsumInflow || 0);
  const monthlyExpenseDelta = Number(params.monthlyExpenseDelta || 0);
  const monthlyIncomeDelta = Number(params.monthlyIncomeDelta || 0);
  const monthlyInvestmentDelta = Number(params.monthlyInvestmentDelta || 0);
  const durationMonths = Number(params.durationMonths || totalMonths);
  const startOffset = Number(params.startMonthOffset || 0);

  const baselineTrajectory = [];
  const simulatedTrajectory = [];

  let curLiquidBase = userContext.startingLiquidBalance;
  let curInvBase = userContext.startingInvestments + userContext.startingFDBalance;
  let curDebtBase = userContext.startingLoanDebt;

  let curLiquidSim = userContext.startingLiquidBalance;
  let curInvSim = userContext.startingInvestments + userContext.startingFDBalance;
  let curDebtSim = userContext.startingLoanDebt;

  let minLiquidSim = curLiquidSim;
  let bottleneckMonth = null;

  const annualInvReturn = 0.12; // 12% blended CAGR for long-term Indian equities & SIPs
  const monthlyInvMultiplier = Math.pow(1 + annualInvReturn, 1 / 12);
  const now = new Date();

  for (let m = 1; m <= totalMonths; m++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const monthLabel = monthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

    // --- BASELINE UNIVERSE ---
    curInvBase = curInvBase * monthlyInvMultiplier + userContext.recurringSIPMonthly;
    curLiquidBase = Math.max(0, curLiquidBase + (userContext.baselineMonthlySurplus - userContext.recurringSIPMonthly));
    curDebtBase = Math.max(0, curDebtBase - (userContext.startingLoanDebt > 0 ? userContext.startingLoanDebt / 48 : 0));
    const netWorthBase = Math.round(curLiquidBase + curInvBase - curDebtBase);

    baselineTrajectory.push({
      monthIndex: m,
      monthLabel,
      liquidSavings: Math.round(curLiquidBase),
      investments: Math.round(curInvBase),
      debt: Math.round(curDebtBase),
      netWorth: netWorthBase,
    });

    // --- SIMULATED UNIVERSE ---
    // Apply one-time lumpsums on designated month
    if (m === startOffset + 1) {
      curLiquidSim = curLiquidSim - lumpsumOutflow + lumpsumInflow;
    }

    // Apply active duration deltas
    const isWithinDelta = m > startOffset && m <= startOffset + durationMonths;
    const effExpDelta = isWithinDelta ? monthlyExpenseDelta : 0;
    const effIncDelta = isWithinDelta ? monthlyIncomeDelta : 0;
    const effInvDelta = isWithinDelta ? monthlyInvestmentDelta : 0;

    const simSIP = userContext.recurringSIPMonthly + effInvDelta;
    const simSurplus = (userContext.baselineMonthlyIncome + effIncDelta) - (userContext.baselineMonthlyExpense + effExpDelta);

    curInvSim = Math.max(0, curInvSim * monthlyInvMultiplier + simSIP);
    curLiquidSim = curLiquidSim + (simSurplus - simSIP);
    curDebtSim = Math.max(0, curDebtSim - (userContext.startingLoanDebt > 0 ? userContext.startingLoanDebt / 48 : 0));

    if (curLiquidSim < minLiquidSim) {
      minLiquidSim = curLiquidSim;
      if (curLiquidSim < 25000 && !bottleneckMonth) {
        bottleneckMonth = monthLabel;
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
      isBottleneck: curLiquidSim < 25000,
    });
  }

  // 5. Ending Comparison Stats
  const endBase = baselineTrajectory[totalMonths - 1];
  const endSim = simulatedTrajectory[totalMonths - 1];
  const netWorthDelta = endSim.netWorth - endBase.netWorth;

  const simMinRunwayMonths = userContext.baselineMonthlyExpense > 0
    ? Number((Math.max(0, minLiquidSim) / (userContext.baselineMonthlyExpense + monthlyExpenseDelta)).toFixed(1))
    : 6.0;

  // 6. Impact on Active Goals
  const goalsImpact = userContext.goals.map((g) => {
    const needed = Math.max(0, (g.targetAmount || 100000) - (g.currentAmount || 0));
    const baseMonths = userContext.baselineMonthlySurplus > 0 ? Math.ceil(needed / userContext.baselineMonthlySurplus) : 60;
    const simMonthlySurplus = userContext.baselineMonthlySurplus + monthlyIncomeDelta - monthlyExpenseDelta - monthlyInvestmentDelta;
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
          ? 'On Schedule (Zero Impact)'
          : delayMonths > 0
            ? `Delayed by ~${delayMonths} months`
            : `Accelerated by ~${Math.abs(delayMonths)} months faster!`,
      status: delayMonths > 3 ? 'DELAY_WARNING' : delayMonths < 0 ? 'ACCELERATED' : 'STABLE',
    };
  });

  // 7. Synthesize Deep Financial Intelligence with Gemini
  const mathResults = {
    horizonYears: hYears,
    endBaseNetWorth: endBase.netWorth,
    endSimNetWorth: endSim.netWorth,
    netWorthDelta,
    minLiquidSim: Math.round(minLiquidSim),
    simMinRunwayMonths,
    bottleneckMonth,
    goalsImpact,
  };

  const aiSynthesis = await synthesizeSimulationWithGemini({
    userContext,
    scenarioParams: params,
    mathResults,
  });

  const finalResult = {
    scenarioParams: params,
    horizonYears: hYears,
    baselineSummary: {
      startingLiquidBalance: userContext.startingLiquidBalance,
      startingInvestments: userContext.startingInvestments,
      startingFDBalance: userContext.startingFDBalance,
      startingLoanDebt: userContext.startingLoanDebt,
      startingNetWorth: userContext.startingNetWorth,
      monthlyIncome: userContext.baselineMonthlyIncome,
      monthlyExpense: userContext.baselineMonthlyExpense,
      monthlySIP: userContext.recurringSIPMonthly,
      emergencyRunwayMonths: userContext.baselineEmergencyRunwayMonths,
    },
    simulationSummary: {
      verdict: aiSynthesis.verdict,
      verdictTitle: aiSynthesis.verdictTitle,
      verdictDescription: aiSynthesis.verdictDescription,
      minProjectedLiquidSavings: Math.round(minLiquidSim),
      minRunwayMonths: simMinRunwayMonths,
      bottleneckMonth,
      baselineEndingNetWorth: endBase.netWorth,
      simulatedEndingNetWorth: endSim.netWorth,
      netWorthDifference: netWorthDelta,
      strategicAdvice: aiSynthesis.strategicAdvice,
    },
    goalsImpact,
    trajectories: {
      baseline: baselineTrajectory,
      simulated: simulatedTrajectory,
    },
    actionProposals: aiSynthesis.actionProposals,
  };

  // Cache result for 60 seconds to ensure 100% deterministic consistency on rapid re-queries
  memoryCache.set(cacheKey, finalResult, 60);

  return finalResult;
};
