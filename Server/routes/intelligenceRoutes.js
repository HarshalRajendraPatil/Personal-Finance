import express from 'express';
import {
  getHealthScore,
  getMonthlyReview,
  generateMonthlyReview,
  listMonthlyReviews,
  getSpendingInsights,
  getCashflowForecast,
  getLongtermProjection,
} from '../controllers/intelligenceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/health-score', protect, getHealthScore);
router.get('/monthly-review', protect, getMonthlyReview);
router.post('/generate-review', protect, generateMonthlyReview);
router.get('/monthly-reviews', protect, listMonthlyReviews);
router.get('/spending-insights', protect, getSpendingInsights);
router.get('/cashflow-forecast', protect, getCashflowForecast);
router.get('/longterm-projection', protect, getLongtermProjection);

export default router;

