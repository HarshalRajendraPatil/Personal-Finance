import User from '../../models/User.js';
import { computeAndSaveMonthlyReview } from '../../services/monthlyReviewService.js';

/**
 * ⚡ Autonomous Monthly Financial Review Digest Generator Cron
 * Executes on the 1st of every month at 00:05 UTC.
 * Pre-computes the completed month's financial digest for all active users so viewing is instant (<10ms).
 */
export const generateMonthlyReviewDigests = async () => {
  try {
    console.log('[CRON-REVIEW] Starting Monthly Financial Review Digest generation...');

    const now = new Date();
    // Determine the completed previous month
    let targetYear = now.getFullYear();
    let targetMonthNumber = now.getMonth() - 1; // 0-indexed

    if (targetMonthNumber < 0) {
      targetMonthNumber = 11;
      targetYear -= 1;
    }

    const users = await User.find({}, '_id name email').lean();
    let generatedCount = 0;

    for (const user of users) {
      try {
        await computeAndSaveMonthlyReview(user._id, targetYear, targetMonthNumber, true);
        generatedCount++;
      } catch (userErr) {
        console.error(`[CRON-REVIEW] Error generating review for user ${user._id}:`, userErr.message);
      }
    }

    console.log(
      `[CRON-REVIEW] Completed Monthly Review Digests for ${generatedCount}/${users.length} users (${targetYear}-${targetMonthNumber + 1}).`
    );
  } catch (error) {
    console.error('[CRON-REVIEW] Fatal error generating monthly reviews:', error.message);
  }
};
