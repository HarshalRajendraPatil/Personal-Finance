import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import accountReducer from './accountSlice';
import categoryReducer from './categorySlice';
import transactionReducer from './transactionSlice';
import recurringReducer from './recurringSlice';
import budgetReducer from './budgetSlice';
import lendingReducer from './lendingSlice';
import goalReducer from './goalSlice';
import investmentReducer from './investmentSlice';
import loanReducer from './loanSlice';
import netWorthReducer from './netWorthSlice';

import taxReducer from './taxSlice';
import calendarReducer from './calendarSlice';
import dashboardReducer from './dashboardSlice';
import intelligenceReducer from './intelligenceSlice';
import proactiveReducer from './proactiveSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountReducer,
    categories: categoryReducer,
    transactions: transactionReducer,
    recurring: recurringReducer,
    budgets: budgetReducer,
    lending: lendingReducer,
    goals: goalReducer,
    investments: investmentReducer,
    loans: loanReducer,
    netWorth: netWorthReducer,
    taxes: taxReducer,
    calendar: calendarReducer,
    dashboard: dashboardReducer,
    intelligence: intelligenceReducer,
    proactive: proactiveReducer,
  },
});

