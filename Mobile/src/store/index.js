import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import accountReducer from './accountSlice';
import categoryReducer from './categorySlice';
import transactionReducer from './transactionSlice';
import recurringReducer from './recurringSlice';
import budgetReducer from './budgetSlice';
import lendingReducer from './lendingSlice';
import goalReducer from './goalSlice';
import netWorthReducer from './netWorthSlice';
import investmentReducer from './investmentSlice';
import loanReducer from './loanSlice';
import taxReducer from './taxSlice';
import calendarReducer from './calendarSlice';
import intelligenceReducer from './intelligenceSlice';

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
    netWorth: netWorthReducer,
    investments: investmentReducer,
    loans: loanReducer,
    taxes: taxReducer,
    calendar: calendarReducer,
    intelligence: intelligenceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
