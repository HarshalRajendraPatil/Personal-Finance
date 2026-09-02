import api from './api';

const proactiveService = {
  getNudges: async () => {
    const res = await api.get('/proactive/nudges');
    return res.data;
  },

  dismissNudge: async (nudgeId) => {
    const res = await api.post(`/proactive/nudges/${nudgeId}/dismiss`);
    return res.data;
  },

  getSafeToSpend: async () => {
    const res = await api.get('/proactive/safe-to-spend');
    return res.data;
  },

  chatCopilot: async (message, history = []) => {
    const res = await api.post('/proactive/copilot/chat', { message, history });
    return res.data;
  },

  executeAction: async (actionType, payload) => {
    const res = await api.post('/proactive/copilot/execute-action', { actionType, payload });
    return res.data;
  },

  // 💰 Autonomous Salary Day Smart Distributor APIs
  getLatestSalaryPlan: async () => {
    const res = await api.get('/proactive/salary-distribution/latest');
    return res.data;
  },

  generateSalaryPlan: async (payload = {}) => {
    const res = await api.post('/proactive/salary-distribution/generate', payload);
    return res.data;
  },

  executeSalaryPlan: async (payload) => {
    const res = await api.post('/proactive/salary-distribution/execute', payload);
    return res.data;
  },

  dismissSalaryPlan: async (planId) => {
    const res = await api.post('/proactive/salary-distribution/dismiss', { planId });
    return res.data;
  },

  // 🕵️ Zombie Subscription & Price-Hike Detector APIs
  getSubscriptionAudit: async () => {
    const res = await api.get('/proactive/subscriptions/audit');
    return res.data;
  },

  cancelSubscription: async (ruleId) => {
    const res = await api.post('/proactive/subscriptions/cancel', { ruleId });
    return res.data;
  },

  acknowledgePriceHike: async (ruleId, acknowledgedAmount) => {
    const res = await api.post('/proactive/subscriptions/acknowledge-hike', {
      ruleId,
      acknowledgedAmount,
    });
    return res.data;
  },

  // 🛡️ Autonomous Overdraft & Low-Balance Shield APIs
  getOverdraftForecast: async (threshold = 5000) => {
    const res = await api.get(`/proactive/overdraft-shield/forecast?threshold=${threshold}`);
    return res.data;
  },

  executeAutoRebalance: async ({ fromAccountId, toAccountId, amount, reason }) => {
    const res = await api.post('/proactive/overdraft-shield/rebalance', {
      fromAccountId,
      toAccountId,
      amount,
      reason,
    });
    return res.data;
  },

  // 🔮 Predictive "What-If" Financial Time-Machine APIs
  simulateWhatIf: async ({ prompt, scenario, horizonYears = 3 }) => {
    const res = await api.post('/proactive/what-if/simulate', {
      prompt,
      scenario,
      horizonYears,
    });
    return res.data;
  },
};

export default proactiveService;
