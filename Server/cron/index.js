import cron from 'node-cron';
import { processRecurringTransactions } from './jobs/recurringJob.js';
import { processScheduledLoanEMIs } from './jobs/loanEmiJob.js';
import { processScheduledSIPs, syncInvestmentPrices } from './jobs/sipJob.js';
import { generateMonthlyNetWorthSnapshots } from './jobs/netWorthJob.js';
import { generateMonthlyReviewDigests } from './jobs/reviewJob.js';
import { runProactiveGuardianDaemon } from './jobs/proactiveGuardianJob.js';

export const initCronJobs = () => {
  // 1. Midnight Engine (00:00 AM daily) — Auto-Post Recurring Bills, Auto-Debit Loan EMIs, Auto-Execute SIPs, Run Proactive Guardian
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON MASTER] Running Daily Midnight Financial Automation Daemon...');
    try {
      await processRecurringTransactions();
      await processScheduledLoanEMIs();
      await processScheduledSIPs();
      await runProactiveGuardianDaemon();
    } catch (err) {
      console.error('[CRON MASTER] Error in daily midnight jobs:', err);
    }
  });

  // 2. Proactive Guardian Periodic Check (Every 6 hours)
  cron.schedule('0 */6 * * *', async () => {
    console.log('[CRON MASTER] Running 6-Hourly Proactive Financial Intelligence Evaluation...');
    try {
      await runProactiveGuardianDaemon();
    } catch (err) {
      console.error('[CRON MASTER] Error in proactive guardian periodic job:', err);
    }
  });

  // 3. Market Close Price Sync (16:00 PM daily on weekdays) — Live NAV / Price Portfolio Revaluation
  cron.schedule('0 16 * * 1-5', async () => {
    console.log('[CRON MASTER] Running Daily Market-Close Portfolio Revaluation...');
    try {
      await syncInvestmentPrices();
    } catch (err) {
      console.error('[CRON MASTER] Error in market close portfolio sync:', err);
    }
  });

  // 4. Autonomous Net Worth Snapshot & Monthly Review Digest (00:05 AM on 1st of every month)
  cron.schedule('5 0 1 * *', async () => {
    console.log('[CRON MASTER] Capturing Autonomous 1st-of-Month Net Worth Snapshots & Generating Review Digests...');
    try {
      await generateMonthlyNetWorthSnapshots();
      await generateMonthlyReviewDigests();
    } catch (err) {
      console.error('[CRON MASTER] Error running 1st-of-month daemons:', err);
    }
  });

  console.log('[CRON MASTER] All automation daemons scheduled successfully (Recurring, Loan EMI, SIP, Revaluation, Monthly Net Worth, Review Digest, Proactive Guardian).');
};

