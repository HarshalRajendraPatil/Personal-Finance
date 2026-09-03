import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import proactiveService from '../services/proactiveService';

export const fetchProactiveNudges = createAsyncThunk('proactive/fetchNudges', async (_, thunkAPI) => {
  try {
    return await proactiveService.getNudges();
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const dismissNudge = createAsyncThunk('proactive/dismissNudge', async (nudgeId, thunkAPI) => {
  try {
    await proactiveService.dismissNudge(nudgeId);
    return nudgeId;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const fetchSafeToSpend = createAsyncThunk('proactive/fetchSafeToSpend', async (_, thunkAPI) => {
  try {
    return await proactiveService.getSafeToSpend();
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const askCopilot = createAsyncThunk('proactive/askCopilot', async ({ message, history }, thunkAPI) => {
  try {
    return await proactiveService.chatCopilot(message, history);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const executeCopilotAction = createAsyncThunk(
  'proactive/executeCopilotAction',
  async ({ actionId, actionType, payload }, thunkAPI) => {
    try {
      const res = await proactiveService.executeAction(actionType, payload);
      return { actionId, actionType, result: res };
    } catch (error) {
      return thunkAPI.rejectWithValue({
        actionId,
        message: error.response?.data?.message || error.message,
      });
    }
  }
);

// 💰 Salary Day Smart Distributor Thunks
export const fetchSalaryPlan = createAsyncThunk('proactive/fetchSalaryPlan', async (_, thunkAPI) => {
  try {
    return await proactiveService.getLatestSalaryPlan();
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const generateSalaryPlan = createAsyncThunk('proactive/generateSalaryPlan', async (payload, thunkAPI) => {
  try {
    const res = await proactiveService.generateSalaryPlan(payload);
    return res.plan;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const executeSalaryPlan = createAsyncThunk(
  'proactive/executeSalaryPlan',
  async ({ planId, customizedAllocations }, thunkAPI) => {
    try {
      const res = await proactiveService.executeSalaryPlan({ planId, customizedAllocations });
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const dismissSalaryPlan = createAsyncThunk('proactive/dismissSalaryPlan', async (planId, thunkAPI) => {
  try {
    await proactiveService.dismissSalaryPlan(planId);
    return planId;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

// 🕵️ Zombie Subscription & Price-Hike Audit Thunks
export const fetchSubscriptionAudit = createAsyncThunk(
  'proactive/fetchSubscriptionAudit',
  async (_, thunkAPI) => {
    try {
      return await proactiveService.getSubscriptionAudit();
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'proactive/cancelSubscription',
  async (ruleId, thunkAPI) => {
    try {
      const res = await proactiveService.cancelSubscription(ruleId);
      return { ruleId, res };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const acknowledgePriceHike = createAsyncThunk(
  'proactive/acknowledgePriceHike',
  async ({ ruleId, acknowledgedAmount }, thunkAPI) => {
    try {
      const res = await proactiveService.acknowledgePriceHike(ruleId, acknowledgedAmount);
      return { ruleId, acknowledgedAmount, res };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 🛡️ Autonomous Overdraft & Low-Balance Shield Thunks
export const fetchOverdraftForecast = createAsyncThunk(
  'proactive/fetchOverdraftForecast',
  async (threshold = 5000, thunkAPI) => {
    try {
      return await proactiveService.getOverdraftForecast(threshold);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const executeAutoRebalance = createAsyncThunk(
  'proactive/executeAutoRebalance',
  async ({ fromAccountId, toAccountId, amount, reason }, thunkAPI) => {
    try {
      const res = await proactiveService.executeAutoRebalance({
        fromAccountId,
        toAccountId,
        amount,
        reason,
      });
      return res;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 🔮 Predictive "What-If" Financial Time-Machine Thunks
export const runWhatIfSimulation = createAsyncThunk(
  'proactive/runWhatIfSimulation',
  async ({ prompt, scenario, horizonYears }, thunkAPI) => {
    try {
      return await proactiveService.simulateWhatIf({ prompt, scenario, horizonYears });
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const proactiveSlice = createSlice({
  name: 'proactive',
  initialState: {
    nudges: [],
    safeToSpendData: null,
    salaryPlan: null,
    isSalaryModalOpen: false,
    isLoadingSalaryPlan: false,
    isExecutingSalaryPlan: false,
    subscriptionAudit: null,
    isLoadingSubscriptionAudit: false,
    isSubscriptionModalOpen: false,
    overdraftForecast: null,
    isLoadingOverdraftForecast: false,
    isExecutingRebalance: false,
    isOverdraftModalOpen: false,
    whatIfResult: null,
    isLoadingWhatIf: false,
    isWhatIfModalOpen: false,
    copilotMessages: [
      {
        sender: 'copilot',
        text: 'Hello! I am your **Capise AI Copilot** powered by Google Gemini. I have real-time visibility into your Indian bank accounts, net worth, budgets, and cash flow. How can I help you optimize your wealth today?',
      },
    ],
    isLoadingNudges: false,
    isLoadingSafeToSpend: false,
    isCopilotThinking: false,
    executingActionId: null,
    executedActions: {},
    error: null,
  },
  reducers: {
    addUserCopilotMessage: (state, action) => {
      state.copilotMessages.push({
        sender: 'user',
        text: action.payload,
      });
    },
    clearCopilotHistory: (state) => {
      state.copilotMessages = [
        {
          sender: 'copilot',
          text: 'Conversation reset. How can I assist with your personal finances?',
        },
      ];
      state.executedActions = {};
    },
    openSalaryModal: (state) => {
      state.isSalaryModalOpen = true;
    },
    closeSalaryModal: (state) => {
      state.isSalaryModalOpen = false;
    },
    setSalaryModalPlan: (state, action) => {
      state.salaryPlan = action.payload;
      state.isSalaryModalOpen = true;
    },
    openSubscriptionAuditModal: (state) => {
      state.isSubscriptionModalOpen = true;
    },
    closeSubscriptionAuditModal: (state) => {
      state.isSubscriptionModalOpen = false;
    },
    openOverdraftModal: (state) => {
      state.isOverdraftModalOpen = true;
    },
    closeOverdraftModal: (state) => {
      state.isOverdraftModalOpen = false;
    },
    openWhatIfModal: (state) => {
      state.isWhatIfModalOpen = true;
    },
    closeWhatIfModal: (state) => {
      state.isWhatIfModalOpen = false;
    },
    clearWhatIfResult: (state) => {
      state.whatIfResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Nudges
      .addCase(fetchProactiveNudges.pending, (state) => {
        state.isLoadingNudges = true;
      })
      .addCase(fetchProactiveNudges.fulfilled, (state, action) => {
        state.isLoadingNudges = false;
        state.nudges = action.payload || [];
      })
      .addCase(fetchProactiveNudges.rejected, (state, action) => {
        state.isLoadingNudges = false;
        state.error = action.payload;
      })
      // Dismiss Nudge
      .addCase(dismissNudge.fulfilled, (state, action) => {
        state.nudges = state.nudges.filter((n) => n._id !== action.payload);
      })
      // Safe to Spend
      .addCase(fetchSafeToSpend.pending, (state) => {
        state.isLoadingSafeToSpend = true;
      })
      .addCase(fetchSafeToSpend.fulfilled, (state, action) => {
        state.isLoadingSafeToSpend = false;
        state.safeToSpendData = action.payload;
      })
      .addCase(fetchSafeToSpend.rejected, (state) => {
        state.isLoadingSafeToSpend = false;
      })
      // Copilot Chat
      .addCase(askCopilot.pending, (state) => {
        state.isCopilotThinking = true;
      })
      .addCase(askCopilot.fulfilled, (state, action) => {
        state.isCopilotThinking = false;
        state.copilotMessages.push({
          sender: 'copilot',
          text: action.payload.reply,
          actions: action.payload.actions || [],
          contextUsed: action.payload.contextUsed,
        });
      })
      .addCase(askCopilot.rejected, (state, action) => {
        state.isCopilotThinking = false;
        state.copilotMessages.push({
          sender: 'copilot',
          text: `⚠️ Error: ${action.payload || 'Failed to process request with Copilot.'}`,
        });
      })
      // Action Execution
      .addCase(executeCopilotAction.pending, (state, action) => {
        state.executingActionId = action.meta.arg.actionId;
      })
      .addCase(executeCopilotAction.fulfilled, (state, action) => {
        state.executingActionId = null;
        const { actionId, result } = action.payload;
        state.executedActions[actionId] = {
          success: true,
          message: result.message,
          data: result.data,
        };
        state.copilotMessages.push({
          sender: 'copilot',
          text: `✅ **Action Executed Successfully!**\n\n${result.message}`,
        });
      })
      .addCase(executeCopilotAction.rejected, (state, action) => {
        state.executingActionId = null;
        const actionId = action.payload?.actionId || action.meta.arg.actionId;
        const errorMsg = action.payload?.message || 'Failed to execute action.';
        state.executedActions[actionId] = {
          success: false,
          message: errorMsg,
        };
        state.copilotMessages.push({
          sender: 'copilot',
          text: `❌ **Action Failed:** ${errorMsg}`,
        });
      })
      // Salary Plan Thunks
      .addCase(fetchSalaryPlan.pending, (state) => {
        state.isLoadingSalaryPlan = true;
      })
      .addCase(fetchSalaryPlan.fulfilled, (state, action) => {
        state.isLoadingSalaryPlan = false;
        state.salaryPlan = action.payload;
      })
      .addCase(fetchSalaryPlan.rejected, (state) => {
        state.isLoadingSalaryPlan = false;
      })
      .addCase(generateSalaryPlan.fulfilled, (state, action) => {
        state.salaryPlan = action.payload;
        state.isSalaryModalOpen = true;
      })
      .addCase(executeSalaryPlan.pending, (state) => {
        state.isExecutingSalaryPlan = true;
      })
      .addCase(executeSalaryPlan.fulfilled, (state, action) => {
        state.isExecutingSalaryPlan = false;
        state.salaryPlan = action.payload.data;
      })
      .addCase(executeSalaryPlan.rejected, (state, action) => {
        state.isExecutingSalaryPlan = false;
        state.error = action.payload;
      })
      .addCase(dismissSalaryPlan.fulfilled, (state) => {
        state.salaryPlan = null;
        state.isSalaryModalOpen = false;
      })
      // Subscription Audit Thunks
      .addCase(fetchSubscriptionAudit.pending, (state) => {
        state.isLoadingSubscriptionAudit = true;
      })
      .addCase(fetchSubscriptionAudit.fulfilled, (state, action) => {
        state.isLoadingSubscriptionAudit = false;
        state.subscriptionAudit = action.payload;
      })
      .addCase(fetchSubscriptionAudit.rejected, (state) => {
        state.isLoadingSubscriptionAudit = false;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        if (state.subscriptionAudit?.subscriptions) {
          state.subscriptionAudit.subscriptions = state.subscriptionAudit.subscriptions.map((s) =>
            s.ruleId === action.payload.ruleId ? { ...s, isActive: false, status: 'PAUSED' } : s
          );
        }
      })
      .addCase(acknowledgePriceHike.fulfilled, (state, action) => {
        if (state.subscriptionAudit?.subscriptions) {
          state.subscriptionAudit.subscriptions = state.subscriptionAudit.subscriptions.map((s) =>
            s.ruleId === action.payload.ruleId
              ? { ...s, hasPriceHike: false, status: 'HEALTHY' }
              : s
          );
        }
      })
      // Overdraft Shield Thunks
      .addCase(fetchOverdraftForecast.pending, (state) => {
        state.isLoadingOverdraftForecast = true;
      })
      .addCase(fetchOverdraftForecast.fulfilled, (state, action) => {
        state.isLoadingOverdraftForecast = false;
        state.overdraftForecast = action.payload;
      })
      .addCase(fetchOverdraftForecast.rejected, (state) => {
        state.isLoadingOverdraftForecast = false;
      })
      .addCase(executeAutoRebalance.pending, (state) => {
        state.isExecutingRebalance = true;
      })
      .addCase(executeAutoRebalance.fulfilled, (state) => {
        state.isExecutingRebalance = false;
      })
      .addCase(executeAutoRebalance.rejected, (state, action) => {
        state.isExecutingRebalance = false;
        state.error = action.payload;
      })
      // What-If Simulation Thunks
      .addCase(runWhatIfSimulation.pending, (state) => {
        state.isLoadingWhatIf = true;
      })
      .addCase(runWhatIfSimulation.fulfilled, (state, action) => {
        state.isLoadingWhatIf = false;
        state.whatIfResult = action.payload;
      })
      .addCase(runWhatIfSimulation.rejected, (state, action) => {
        state.isLoadingWhatIf = false;
        state.error = action.payload;
      });
  },
});

export const {
  addUserCopilotMessage,
  clearCopilotHistory,
  openSalaryModal,
  closeSalaryModal,
  setSalaryModalPlan,
  openSubscriptionAuditModal,
  closeSubscriptionAuditModal,
  openOverdraftModal,
  closeOverdraftModal,
  openWhatIfModal,
  closeWhatIfModal,
  clearWhatIfResult,
} = proactiveSlice.actions;

export default proactiveSlice.reducer;
