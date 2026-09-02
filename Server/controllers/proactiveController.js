import {
  calculateSafeToSpend,
  runProactiveIntelligenceCheck,
} from '../services/proactiveIntelligenceService.js';
import { askFinancialCopilot } from '../services/aiCopilotService.js';
import { executeCopilotAction as executeActionService } from '../services/copilotActionExecutionService.js';
import {
  generateSalaryPlan,
  executeSalaryPlan,
  getLatestSalaryPlan,
  dismissSalaryPlan,
} from '../services/salaryDistributorService.js';
import {
  runSubscriptionCleanUpAudit,
  cancelSubscriptionRule,
  acknowledgeSubscriptionPriceHike,
} from '../services/subscriptionDetectorService.js';
import {
  get14DayOverdraftForecast,
  executeAutoRebalanceTransfer,
} from '../services/overdraftShieldService.js';
import {
  runWhatIfSimulation,
} from '../services/whatIfSimulationService.js';
import ProactiveNudge from '../models/ProactiveNudge.js';

/**
 * Returns all active proactive intelligence nudges for the user.
 */
export const getProactiveNudges = async (req, res) => {
  try {
    const nudges = await runProactiveIntelligenceCheck(req.user._id);
    res.json(nudges);
  } catch (err) {
    res.status(500).json({ message: 'Failed to run proactive intelligence check', error: err.message });
  }
};

/**
 * Dismisses an active proactive nudge.
 */
export const dismissNudge = async (req, res) => {
  try {
    const { nudgeId } = req.params;
    await ProactiveNudge.findOneAndUpdate(
      { _id: nudgeId, user: req.user._id },
      { isDismissed: true }
    );

    res.json({ success: true, message: 'Nudge dismissed.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to dismiss nudge', error: err.message });
  }
};

/**
 * Returns the live Safe-to-Spend daily allowance calculation.
 */
export const getSafeToSpendData = async (req, res) => {
  try {
    const data = await calculateSafeToSpend(req.user._id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate Safe-to-Spend', error: err.message });
  }
};

/**
 * Handles conversational queries with Capise AI Copilot.
 */
export const chatWithCopilot = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const response = await askFinancialCopilot({
      userId: req.user._id,
      message,
      conversationHistory: history || [],
    });

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: 'Failed to chat with AI Copilot', error: err.message });
  }
};

/**
 * Executes an actionable 1-click in-chat proposal.
 */
export const executeCopilotAction = async (req, res) => {
  try {
    const { actionType, payload } = req.body;
    if (!actionType || !payload) {
      return res.status(400).json({ message: 'actionType and payload are required.' });
    }

    const result = await executeActionService({
      userId: req.user._id,
      actionType,
      payload,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to execute Copilot action', error: err.message });
  }
};

// 💰 Salary Day Distribution Handlers
export const getLatestSalaryDistributionPlan = async (req, res) => {
  try {
    const plan = await getLatestSalaryPlan(req.user._id);
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch salary distribution plan', error: err.message });
  }
};

export const generateSalaryDistributionPlan = async (req, res) => {
  try {
    const { transactionId, incomeAmount, sourceAccountId, customSplits } = req.body;
    const result = await generateSalaryPlan({
      userId: req.user._id,
      transactionId,
      incomeAmount,
      sourceAccountId,
      customSplits,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate salary distribution plan', error: err.message });
  }
};

export const executeSalaryDistributionPlan = async (req, res) => {
  try {
    const { planId, customizedAllocations } = req.body;
    if (!planId) {
      return res.status(400).json({ message: 'planId is required.' });
    }

    const result = await executeSalaryPlan({
      userId: req.user._id,
      planId,
      customizedAllocations,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to execute salary distribution', error: err.message });
  }
};

export const dismissSalaryDistributionPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await dismissSalaryPlan(req.user._id, planId);
    res.json({ success: true, message: 'Plan dismissed', data: plan });
  } catch (err) {
    res.status(500).json({ message: 'Failed to dismiss salary plan', error: err.message });
  }
};

// 🕵️ Zombie Subscription & Price-Hike Audit Handlers
export const getSubscriptionAudit = async (req, res) => {
  try {
    const auditData = await runSubscriptionCleanUpAudit(req.user._id);
    res.json(auditData);
  } catch (err) {
    res.status(500).json({ message: 'Failed to run subscription clean-up audit', error: err.message });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const { ruleId } = req.body;
    if (!ruleId) {
      return res.status(400).json({ message: 'ruleId is required.' });
    }
    const result = await cancelSubscriptionRule({
      userId: req.user._id,
      ruleId,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel subscription', error: err.message });
  }
};

export const acknowledgePriceHike = async (req, res) => {
  try {
    const { ruleId, acknowledgedAmount } = req.body;
    if (!ruleId) {
      return res.status(400).json({ message: 'ruleId is required.' });
    }
    const result = await acknowledgeSubscriptionPriceHike({
      userId: req.user._id,
      ruleId,
      acknowledgedAmount,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to acknowledge price hike', error: err.message });
  }
};

// 🛡️ Autonomous Overdraft & Low-Balance Shield Handlers
export const getOverdraftForecast = async (req, res) => {
  try {
    const threshold = req.query.threshold ? Number(req.query.threshold) : 5000;
    const forecast = await get14DayOverdraftForecast(req.user._id, threshold);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get overdraft forecast', error: err.message });
  }
};

export const executeAutoRebalance = async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, reason } = req.body;
    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({ message: 'fromAccountId, toAccountId, and amount are required.' });
    }

    const result = await executeAutoRebalanceTransfer({
      userId: req.user._id,
      fromAccountId,
      toAccountId,
      amount,
      reason,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to execute auto-rebalance', error: err.message });
  }
};

// 🔮 Predictive "What-If" Financial Time-Machine Handlers
export const simulateWhatIf = async (req, res) => {
  try {
    const { prompt, scenario, horizonYears } = req.body;
    const simulationResult = await runWhatIfSimulation(req.user._id, {
      prompt,
      scenario,
      horizonYears,
    });
    res.json(simulationResult);
  } catch (err) {
    res.status(500).json({ message: 'Failed to run what-if simulation', error: err.message });
  }
};
