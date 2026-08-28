import express from 'express';
import { getHealthScore, getMonthlyReview, getSpendingInsights, getCashflowForecast, getLongtermProjection } from '../controllers/intelligenceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/health-score', protect, getHealthScore);
router.get('/monthly-review', protect, getMonthlyReview);
router.get('/spending-insights', protect, getSpendingInsights);
router.get('/cashflow-forecast', protect, getCashflowForecast);
router.get('/longterm-projection', protect, getLongtermProjection);

export default router;
