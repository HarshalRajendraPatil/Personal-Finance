import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import recurringRoutes from './routes/recurringRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import lendingRoutes from './routes/lendingRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import netWorthRoutes from './routes/netWorthRoutes.js';
import taxRoutes from './routes/taxRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import intelligenceRoutes from './routes/intelligenceRoutes.js';
import proactiveRoutes from './routes/proactiveRoutes.js';
import { initCronJobs } from './cron/index.js';

dotenv.config();

connectDB();
initCronJobs();

const app = express();

// ⚡ High-Throughput Response Compression (Gzip / Brotli)
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    level: 6, // Optimal throughput & compression balance
  })
);

app.use(cors({

  origin: true, // Allow requests from web client, Expo web, and mobile app
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/lending', lendingRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/networth', netWorthRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/proactive', proactiveRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on http://0.0.0.0:${PORT} (LAN: http://192.168.29.192:${PORT})`);
});
