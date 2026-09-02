import User from '../../models/User.js';
import { runProactiveIntelligenceCheck } from '../../services/proactiveIntelligenceService.js';

/**
 * Proactive Guardian Cron Daemon
 * Runs every 6 hours to analyze spending velocity, upcoming EMIs, and buffer shortfalls for all active users.
 */
export const runProactiveGuardianDaemon = async () => {
  console.log('🛡️ [PROACTIVE GUARDIAN] Starting scheduled financial intelligence evaluation...');
  try {
    const users = await User.find({}).select('_id email name');
    let evaluatedCount = 0;

    for (const user of users) {
      try {
        await runProactiveIntelligenceCheck(user._id);
        evaluatedCount++;
      } catch (err) {
        console.error(`Error running proactive intelligence for user ${user._id}:`, err.message);
      }
    }

    console.log(`🛡️ [PROACTIVE GUARDIAN] Completed evaluation for ${evaluatedCount} active users.`);
  } catch (err) {
    console.error('🛡️ [PROACTIVE GUARDIAN] Daemon execution error:', err.message);
  }
};
