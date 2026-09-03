import express from 'express';
import {
  getProactiveNudges,
  dismissNudge,
  getSafeToSpendData,
  chatWithCopilot,
  executeCopilotAction,
  getLatestSalaryDistributionPlan,
  generateSalaryDistributionPlan,
  executeSalaryDistributionPlan,
  dismissSalaryDistributionPlan,
  getSubscriptionAudit,
  cancelSubscription,
  acknowledgePriceHike,
  getOverdraftForecast,
  executeAutoRebalance,
  simulateWhatIf,
} from '../controllers/proactiveController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/nudges', protect, getProactiveNudges);
router.post('/nudges/:nudgeId/dismiss', protect, dismissNudge);
router.get('/safe-to-spend', protect, getSafeToSpendData);
router.post('/copilot/chat', protect, chatWithCopilot);
router.post('/copilot/execute-action', protect, executeCopilotAction);

// 💰 Autonomous "Salary Day" Smart Distributor Routes
router.get('/salary-distribution/latest', protect, getLatestSalaryDistributionPlan);
router.post('/salary-distribution/generate', protect, generateSalaryDistributionPlan);
router.post('/salary-distribution/execute', protect, executeSalaryDistributionPlan);
router.post('/salary-distribution/dismiss', protect, dismissSalaryDistributionPlan);

// 🕵️ "Zombie Subscription" & Hidden Price-Hike Detector Routes
router.get('/subscriptions/audit', protect, getSubscriptionAudit);
router.post('/subscriptions/cancel', protect, cancelSubscription);
router.post('/subscriptions/acknowledge-hike', protect, acknowledgePriceHike);

// 🛡️ Autonomous "Overdraft & Low-Balance Shield" Routes
router.get('/overdraft-shield/forecast', protect, getOverdraftForecast);
router.post('/overdraft-shield/rebalance', protect, executeAutoRebalance);

// 🔮 Predictive "What-If" Financial Time-Machine Routes
router.post('/what-if/simulate', protect, simulateWhatIf);

export default router;
